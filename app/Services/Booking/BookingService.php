<?php

declare(strict_types=1);

namespace App\Services\Booking;

use App\Actions\CalculateSurgePrice;
use App\Actions\CheckBookingEligibility;
use App\Events\BookingCancelled;
use App\Events\BookingConfirmed;
use App\Events\BookingRescheduled;
use App\Exceptions\CafeNotActiveException;
use App\Exceptions\CancellationTimeExpiredException;
use App\Exceptions\SlotNotAvailableException;
use App\Models\Booking;
use App\Models\Table;
use App\Services\Payment\CommissionService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

readonly class BookingService
{
    public function __construct(
        private LockService $lockService,
        private AvailabilityService $availabilityService,
        private CommissionService $commissionService,
        private CheckBookingEligibility $checkEligibilityAction,
        private CalculateSurgePrice $calculateSurgePrice,
    ) {}

    private function checkEligibility(string $date, string $startTime): void
    {
        ($this->checkEligibilityAction)($date, $startTime);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data, int $customerId): Booking
    {
        $this->checkEligibility($data['booking_date'], $data['start_time']);

        /** @var Table $table */
        $table = Table::findOrFail($data['table_id']);

        if (! $table->cafe->isActive()) {
            throw new CafeNotActiveException('Cafe tidak tersedia untuk pemesanan saat ini');
        }

        if (! $this->availabilityService->isWithinOperationalHours(
            $table->cafe,
            $data['booking_date'],
            $data['start_time'],
            $data['duration_minutes'],
        )) {
            throw new SlotNotAvailableException('Waktu booking di luar jam operasional cafe');
        }

        $slotKey = "{$data['booking_date']}:{$data['start_time']}";
        if (! $this->availabilityService->isAvailable($table->id, $data['booking_date'], $data['start_time'])) {
            throw new SlotNotAvailableException;
        }

        if (! $this->lockService->acquire($table->id, $data['booking_date'], $data['start_time'])) {
            throw new SlotNotAvailableException('Meja sedang dikunci oleh pengguna lain');
        }

        $duration = $data['duration_minutes'];
        $start = Carbon::parse($data['start_time']);
        $end = $start->copy()->addMinutes($duration);

        $price = $this->calculatePrice($table, $data, $duration);
        $commission = $this->commissionService->calculateBookingCommission($price);

        $booking = DB::transaction(function () use ($data, $customerId, $table, $start, $end, $duration, $price, $commission) {
            $booking = Booking::create([
                'cafe_id' => $table->cafe_id,
                'table_id' => $table->id,
                'customer_id' => $customerId,
                'booking_rule_id' => $data['booking_rule_id'] ?? null,
                'booking_date' => $data['booking_date'],
                'start_time' => $start,
                'end_time' => $end,
                'duration_minutes' => $duration,
                'guest_count' => $data['guest_count'],
                'status' => 'pending',
                'table_price' => $price,
                'menu_subtotal' => 0,
                'total_price' => $price,
                'commission' => $commission,
                'cafe_receives' => $price - $commission,
                'payment_status' => 'unpaid',
                'booking_reference' => $this->generateReference(),
                'lock_expires_at' => Carbon::now()->addMinutes(15),
                'customer_notes' => $data['customer_notes'] ?? null,
            ]);

            return $booking;
        });

        return $booking;
    }

    public function confirmPayment(Booking $booking): void
    {
        $booking->update([
            'status' => 'confirmed',
            'payment_status' => 'paid',
        ]);

        $booking->menuOrders()->where('payment_status', 'unpaid')->update([
            'payment_status' => 'paid',
            'status' => 'confirmed',
        ]);

        $this->lockService->releaseForBooking($booking);

        BookingConfirmed::dispatch(
            $booking->id,
            $booking->customer_id,
            $booking->cafe_id,
            $booking->table_id,
            $booking->booking_reference,
        );
    }

    public function cancel(Booking $booking, string $cancelledBy, ?string $reason = null): void
    {
        if ($cancelledBy === 'customer') {
            $startTime = Carbon::parse($booking->booking_date->format('Y-m-d').' '.$booking->start_time->format('H:i'));
            if (Carbon::now()->diffInHours($startTime, false) < 3) {
                throw new CancellationTimeExpiredException;
            }
        }

        $booking->update([
            'status' => 'cancelled',
            'cancelled_by' => $cancelledBy,
            'cancellation_reason' => $reason,
        ]);

        $this->lockService->releaseForBooking($booking);

        BookingCancelled::dispatch($booking->id, $cancelledBy, $reason);
    }

    /**
     * @param array<string, mixed> $newSchedule
     */
    public function reschedule(Booking $booking, array $newSchedule): Booking
    {
        $this->checkEligibility($newSchedule['booking_date'], $newSchedule['start_time']);

        if (! $booking->cafe->isActive()) {
            throw new CafeNotActiveException('Cafe tidak tersedia untuk pemesanan saat ini');
        }

        if (! $this->availabilityService->isWithinOperationalHours(
            $booking->cafe,
            $newSchedule['booking_date'],
            $newSchedule['start_time'],
            $newSchedule['duration_minutes'],
        )) {
            throw new SlotNotAvailableException('Waktu booking di luar jam operasional cafe');
        }

        if (! $this->availabilityService->isAvailable($booking->table_id, $newSchedule['booking_date'], $newSchedule['start_time'])) {
            throw new SlotNotAvailableException;
        }

        $oldDate = $booking->booking_date->format('Y-m-d');
        $oldStart = $booking->start_time->format('H:i');

        $booking->update([
            'booking_date' => $newSchedule['booking_date'],
            'start_time' => $newSchedule['start_time'],
            'end_time' => Carbon::parse($newSchedule['start_time'])->addMinutes($newSchedule['duration_minutes']),
            'duration_minutes' => $newSchedule['duration_minutes'],
        ]);

        BookingRescheduled::dispatch(
            $booking->id,
            $oldDate,
            $newSchedule['booking_date'],
            $oldStart,
            $newSchedule['start_time'],
        );

        return $booking;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function calculatePrice(Table $table, array $data, int $duration): float
    {
        $rule = $table->bookingRule;

        if (! $rule) {
            return 0;
        }

        return match ($rule->rule_type) {
            'fixed' => (float) $rule->price,
            'custom' => ($this->calculateSurgePrice)($rule, $data['booking_date'], $data['start_time'], $duration),
            default => 0,
        };
    }

    private function generateReference(): string
    {
        return 'BKG-'.now()->format('Ymd').'-'.strtoupper(Str::random(5));
    }
}
