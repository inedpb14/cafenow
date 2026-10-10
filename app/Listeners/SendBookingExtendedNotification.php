<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Enums\NotificationType;
use App\Events\BookingExtended;
use App\Mail\BookingNotificationMail;
use App\Models\Booking;
use App\Models\Notification;
use Illuminate\Support\Facades\Mail;

readonly class SendBookingExtendedNotification
{
    public function handle(BookingExtended $event): void
    {
        $booking = Booking::with('cafe', 'customer')->find($event->bookingId);
        if (! $booking) {
            return;
        }

        $subject = 'Booking Diperpanjang';
        $message = "Booking {$booking->booking_reference} diperpanjang {$event->additionalMinutes} menit.";

        Notification::create([
            'recipient_id' => $booking->customer_id,
            'recipient_type' => 'customer',
            'subject' => $subject,
            'message' => $message,
            'notification_type' => NotificationType::BookingExtended->value,
            'related_entity_type' => 'booking',
            'related_entity_id' => $booking->id,
            'sent_at' => now(),
            'delivery_status' => 'sent',
        ]);

        try {
            Mail::to($booking->customer->email)->send(new BookingNotificationMail(
                $subject,
                $message,
                $booking->booking_reference,
                $booking->cafe->name,
                $booking->booking_date->format('Y-m-d'),
                $booking->start_time->format('H:i'),
            ));
        } catch (\Throwable $e) {
            // ponytail: notifikasi DB sudah tersimpan; gagal SMTP jangan 500-kan extend
            report($e);
        }
    }
}
