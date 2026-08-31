<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Enums\NotificationType;
use App\Events\PaymentReceived;
use App\Models\Booking;
use App\Models\Notification;

readonly class SendPaymentReceivedNotification
{
    public function handle(PaymentReceived $event): void
    {
        if ($event->payableType !== 'booking') {
            return;
        }

        $booking = Booking::with('cafe', 'customer')->find($event->payableId);
        if (! $booking) {
            return;
        }

        $subject = 'Pembayaran Diterima';
        $message = "Pembayaran untuk booking {$booking->booking_reference} telah diterima.";

        Notification::create([
            'recipient_id' => $booking->customer_id,
            'recipient_type' => 'customer',
            'subject' => $subject,
            'message' => $message,
            'notification_type' => NotificationType::PaymentReceived->value,
            'related_entity_type' => 'booking',
            'related_entity_id' => $booking->id,
            'sent_at' => now(),
            'delivery_status' => 'sent',
        ]);
    }
}
