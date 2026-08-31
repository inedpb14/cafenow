<?php

declare(strict_types=1);

namespace App\Enums;

enum InitiatedBy: string
{
    case Customer = 'customer';
    case Owner = 'owner';
    case System = 'system';
}
