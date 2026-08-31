<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

class SlotNotAvailableException extends Exception
{
    public function __construct(string $message = 'Slot waktu yang dipilih tidak tersedia')
    {
        parent::__construct($message, 409);
    }
}
