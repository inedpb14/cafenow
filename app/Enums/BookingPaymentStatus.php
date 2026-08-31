<?php

declare(strict_types=1);

namespace App\Enums;

enum BookingPaymentStatus: string
{
    case Unpaid = 'unpaid';
    case Paid = 'paid';
    case Refunded = 'refunded';
    case PartiallyRefunded = 'partially_refunded';
}
