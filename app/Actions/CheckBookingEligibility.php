<?php

declare(strict_types=1);

namespace App\Actions;

use App\Exceptions\BookingTimeWindowException;
use Carbon\Carbon;

readonly class CheckBookingEligibility
{
    public function __invoke(string $date, string $startTime, int $minAdvanceHours = 2): void
    {
        $bookingStart = Carbon::parse($date.' '.$startTime);
        $now = Carbon::now();

        if ($now->diffInHours($bookingStart, false) < $minAdvanceHours) {
            throw new BookingTimeWindowException(
                "Booking harus dilakukan minimal {$minAdvanceHours} jam sebelum waktu yang dipilih"
            );
        }
    }
}
