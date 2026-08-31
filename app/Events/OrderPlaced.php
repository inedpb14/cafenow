<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class OrderPlaced implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly int $menuOrderId,
        public readonly int $bookingId,
        public readonly string $orderType,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('booking.'.$this->bookingId),
        ];
    }
}
