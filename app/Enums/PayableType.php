<?php

declare(strict_types=1);

namespace App\Enums;

enum PayableType: string
{
    case Booking = 'booking';
    case MenuOrder = 'menu_order';
}
