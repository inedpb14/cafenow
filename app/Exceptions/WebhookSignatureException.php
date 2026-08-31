<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

class WebhookSignatureException extends Exception
{
    public function __construct(string $message = 'Signature webhook tidak valid')
    {
        parent::__construct($message, 401);
    }
}
