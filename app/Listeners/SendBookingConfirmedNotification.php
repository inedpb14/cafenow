<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Enums\NotificationType;
use App\Events\BookingConfirmed;
use App\Models\Booking;
use App\Models\Notification;

readonly class SendBookingConfirmedNotification
{
    public function handle(BookingConfirmed $event): void
    {
        $booking = Booking::with('cafe', 'customer')->find($event->bookingId);
        if (! $booking) {
            return;
        }

        $subject = 'Booking Dikonfirmasi';
        $message = "Booking {$booking->booking_reference} telah dikonfirmasi.";

        Notification::create([
            'recipient_id' => $booking->customer_id,
            'recipient_type' => 'customer',
            'subject' => $subject,
            'message' => $message,
            'notification_type' => NotificationType::BookingConfirmed->value,
            'related_entity_type' => 'booking',
            'related_entity_id' => $booking->id,
            'sent_at' => now(),
            'delivery_status' => 'sent',
        ]);
    }
}
