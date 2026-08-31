<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

class PaymentFailedException extends Exception
{
    public function __construct(string $message = 'Pembayaran gagal diproses')
    {
        parent::__construct($message, 402);
    }
}
