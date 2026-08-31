<?php

declare(strict_types=1);

namespace App\Services\Payment;

use App\Models\CommissionRule;

readonly class CommissionService
{
    private const float DEFAULT_BOOKING_COMMISSION = 15.0;

    private const float DEFAULT_MENU_COMMISSION = 10.0;

    public function calculateBookingCommission(float $amount): float
    {
        $rate = $this->getActiveRate('booking');

        return $amount * ($rate / 100);
    }

    public function activeBookingRate(): float
    {
        return $this->getActiveRate('booking');
    }

    public function calculateMenuCommission(float $amount): float
    {
        $rate = $this->getActiveRate('menu_order');

        return $amount * ($rate / 100);
    }

    private function getActiveRate(string $type): float
    {
        $rule = CommissionRule::where('commission_type', $type)
            ->where('active_from', '<=', now())
            ->where(function ($q) {
                $q->where('active_to', '>=', now())
                    ->orWhereNull('active_to');
            })
            ->latest('active_from')
            ->first();

        if (! $rule) {
            return $type === 'booking' ? self::DEFAULT_BOOKING_COMMISSION : self::DEFAULT_MENU_COMMISSION;
        }

        return (float) $rule->percentage;
    }
}
