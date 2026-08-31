<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

class BookingTimeWindowException extends Exception
{
    public function __construct(string $message = 'Booking harus dilakukan minimal 2 jam sebelum waktu yang dipilih')
    {
        parent::__construct($message, 422);
    }
}
