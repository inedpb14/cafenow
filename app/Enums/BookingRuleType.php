<?php

declare(strict_types=1);

namespace App\Enums;

enum BookingRuleType: string
{
    case Fixed = 'fixed';
    case Custom = 'custom';
}
