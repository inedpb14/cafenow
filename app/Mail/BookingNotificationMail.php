<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class BookingNotificationMail extends Mailable
{
    use Queueable;

    public function __construct(
        public readonly string $subjectText,
        public readonly string $messageText,
        public readonly string $bookingReference,
        public readonly string $cafeName,
        public readonly string $date,
        public readonly string $startTime,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subjectText,
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: view('emails.booking-notification', [
                'subjectText' => $this->subjectText,
                'messageText' => $this->messageText,
                'bookingReference' => $this->bookingReference,
                'cafeName' => $this->cafeName,
                'date' => $this->date,
                'startTime' => $this->startTime,
            ])->render(),
        );
    }
}
