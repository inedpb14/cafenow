<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Enums\NotificationType;
use App\Events\BookingCancelled;
use App\Mail\BookingNotificationMail;
use App\Models\Booking;
use App\Models\Notification;
use Illuminate\Support\Facades\Mail;

readonly class SendBookingCancelledNotification
{
    public function handle(BookingCancelled $event): void
    {
        $booking = Booking::with('cafe', 'customer')->find($event->bookingId);
        if (! $booking) {
            return;
        }

        $subject = 'Booking Dibatalkan';
        $message = "Booking {$booking->booking_reference} telah dibatalkan.";

        Notification::create([
            'recipient_id' => $booking->customer_id,
            'recipient_type' => 'customer',
            'subject' => $subject,
            'message' => $message,
            'notification_type' => NotificationType::BookingCancelled->value,
            'related_entity_type' => 'booking',
            'related_entity_id' => $booking->id,
            'sent_at' => now(),
            'delivery_status' => 'sent',
        ]);

        Mail::to($booking->customer->email)->send(new BookingNotificationMail(
            $subject,
            $message,
            $booking->booking_reference,
            $booking->cafe->name,
            $booking->booking_date->format('Y-m-d'),
            $booking->start_time->format('H:i'),
        ));
    }
}
