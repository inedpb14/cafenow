<?php

declare(strict_types=1);

namespace App\Enums;

enum MenuAvailabilityStatus: string
{
    case Available = 'available';
    case OutOfStock = 'out_of_stock';
}
