<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Events\BookingCancelled;
use App\Models\Booking;
use Illuminate\Console\Command;

class CancelExpiredPendingBookings extends Command
{
    protected $signature = 'bookings:cancel-expired-pending';

    protected $description = 'Cancel pending bookings where lock_expires_at has passed';

    public function handle(): int
    {
        $expired = Booking::where('status', 'pending')
            ->where('payment_status', 'unpaid')
            ->where('lock_expires_at', '<', now())
            ->get();

        foreach ($expired as $booking) {
            $booking->update([
                'status' => 'cancelled',
                'cancelled_by' => 'system',
                'cancellation_reason' => 'Pembayaran tidak diselesaikan dalam 15 menit',
            ]);

            BookingCancelled::dispatch($booking->id, 'system', 'Payment timeout');
        }

        $this->info("Cancelled {$expired->count()} expired pending bookings.");

        return self::SUCCESS;
    }
}
