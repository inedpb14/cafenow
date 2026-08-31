<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('cafe.{cafeId}.availability.{date}', function ($user, int $cafeId, string $date) {
    return true;
});

Broadcast::channel('booking.{bookingId}', function ($user, int $bookingId) {
    return true;
});
