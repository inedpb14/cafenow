<?php

declare(strict_types=1);

namespace App\Services\Booking;

use App\Models\Booking;
use App\Models\Cafe;
use Carbon\Carbon;
use Illuminate\Support\Collection;

readonly class AvailabilityService
{
    public function __construct(
        private LockService $lockService,
    ) {}

    /**
     * True when start+end time fall within the cafe's operational hours
     * for that date. Cafes without hours defined are unrestricted.
     */
    public function isWithinOperationalHours(Cafe $cafe, string $date, string $startTime, int $durationMinutes): bool
    {
        $hours = $cafe->operational_hours ?? [];

        if (empty($hours)) {
            return true;
        }

        $day = strtolower(Carbon::parse($date)->format('D'));
        $entry = $hours[$day][0] ?? null;

        if (empty($entry)) {
            return false;
        }

        $open = $entry['open'] ?? '08:00';
        $close = $entry['close'] ?? '22:00';

        $start = Carbon::parse($startTime)->format('H:i');
        $end = Carbon::parse($startTime)->addMinutes($durationMinutes)->format('H:i');

        return $start >= $open && $end <= $close;
    }

    public function isAvailable(int $tableId, string $date, string $startTime): bool
    {
        if ($this->lockService->isLocked($tableId, $date, $startTime)) {
            return false;
        }

        return ! Booking::where('table_id', $tableId)
            ->whereDate('booking_date', $date)
            ->whereTime('start_time', Carbon::parse($startTime)->format('H:i:s'))
            ->whereIn('status', ['confirmed', 'pending', 'no_show'])
            ->exists();
    }

    /**
     * @param array<string, array<int, array{open: string, close: string}>>|null $operationalHours
     * @return \Illuminate\Support\Collection<int, array{time: string, status: string}>
     */
    public function getSlots(int $tableId, string $date, int $cafeId, ?array $operationalHours = null): \Illuminate\Support\Collection
    {
        $day = strtolower(Carbon::parse($date)->format('D'));
        $hours = $operationalHours[$day] ?? null;

        if (empty($hours)) {
            return collect();
        }

        $open = $hours[0]['open'] ?? '08:00';
        $close = $hours[0]['close'] ?? '22:00';

        $bookings = Booking::where('table_id', $tableId)
            ->whereDate('booking_date', $date)
            ->whereIn('status', ['confirmed', 'pending', 'no_show'])
            ->get()
            ->keyBy(fn (Booking $b) => $b->start_time->format('H:i'));

        $slots = collect();
        $start = Carbon::parse($date.' '.$open);
        $end = Carbon::parse($date.' '.$close);

        while ($start < $end) {
            $time = $start->format('H:i');
            $status = match (true) {
                $this->lockService->isLocked($tableId, $date, $time) => 'locked',
                isset($bookings[$time]) => 'booked',
                $start->isPast() => 'unavailable',
                default => 'available',
            };

            $slots->push(['time' => $time, 'status' => $status]);
            $start->addMinutes(30);
        }

        return $slots;
    }
}
