<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

class CancellationTimeExpiredException extends Exception
{
    public function __construct(string $message = 'Batas waktu pembatalan telah habis (minimal 3 jam sebelum booking)')
    {
        parent::__construct($message, 422);
    }
}
