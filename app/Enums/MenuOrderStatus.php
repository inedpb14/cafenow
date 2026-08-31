<?php

declare(strict_types=1);

namespace App\Enums;

enum MenuOrderStatus: string
{
    case PendingPayment = 'pending_payment';
    case Scheduled = 'scheduled';
    case Preparing = 'preparing';
    case Ready = 'ready';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
