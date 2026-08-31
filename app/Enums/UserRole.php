<?php

declare(strict_types=1);

namespace App\Enums;

enum UserRole: string
{
    case Customer = 'customer';
    case Owner = 'owner';
    case Admin = 'admin';
}
