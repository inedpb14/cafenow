<?php

declare(strict_types=1);

namespace App\Enums;

enum CancelledBy: string
{
    case Customer = 'customer';
    case Owner = 'owner';
    case Admin = 'admin';
    case System = 'system';
}
