<?php

declare(strict_types=1);

namespace App\Enums;

enum EntityType: string
{
    case Cafe = 'cafe';
    case Booking = 'booking';
    case RefundRequest = 'refund_request';
    case User = 'user';
    case FeaturedCafe = 'featured_cafe';
    case CommissionRule = 'commission_rule';
}
