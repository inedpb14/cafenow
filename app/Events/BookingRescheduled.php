<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class BookingRescheduled implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly int $bookingId,
        public readonly string $oldDate,
        public readonly string $newDate,
        public readonly string $oldStartTime,
        public readonly string $newStartTime,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('booking.'.$this->bookingId),
        ];
    }
}
