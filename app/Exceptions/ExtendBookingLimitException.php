<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

class ExtendBookingLimitException extends Exception
{
    public function __construct(string $message = 'Extend booking hanya dapat dilakukan maksimal 2 kali')
    {
        parent::__construct($message, 422);
    }
}
