<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Enums\NotificationType;
use App\Events\OrderPlaced;
use App\Models\MenuOrder;
use App\Models\Notification;

readonly class SendOrderPlacedNotification
{
    public function handle(OrderPlaced $event): void
    {
        $order = MenuOrder::with('booking.cafe', 'booking.customer')->find($event->menuOrderId);
        if (! $order) {
            return;
        }

        $customer = $order->booking->customer;

        Notification::create([
            'recipient_id' => $customer->id,
            'recipient_type' => 'customer',
            'subject' => 'Pesanan Ditempatkan',
            'message' => "Pesanan #{$order->id} telah ditempatkan.",
            'notification_type' => NotificationType::OrderPlaced->value,
            'related_entity_type' => 'order',
            'related_entity_id' => $order->id,
            'sent_at' => now(),
            'delivery_status' => 'sent',
        ]);
    }
}
