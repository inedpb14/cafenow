<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\BookingRule;
use Carbon\Carbon;

readonly class CalculateSurgePrice
{
    public function __invoke(BookingRule $rule, string $date, string $startTime, int $durationMinutes): float
    {
        if ($rule->rule_type !== 'custom' || empty($rule->surge_rules)) {
            return 0;
        }

        $dayOfWeek = strtolower(Carbon::parse($date)->format('l'));
        $start = $startTime;
        $hourlyRate = (float) $rule->base_price_per_hour;
        $finalPrice = $hourlyRate * ($durationMinutes / 60);

        $rules = $rule->surge_rules['rules'] ?? [];
        if (! is_array($rules)) {
            $rules = [];
        }
        $highestPrice = $finalPrice;

        foreach ($rules as $surge) {
            $days = array_map('strtolower', $surge['days']);

            if (! in_array($dayOfWeek, $days, true)) {
                continue;
            }

            if ($start < $surge['start_time'] || $start >= $surge['end_time']) {
                continue;
            }

            $surgedPrice = match ($surge['type']) {
                'multiplier' => $finalPrice * (float) $surge['value'],
                'add_percent' => $finalPrice * (1 + (float) $surge['value'] / 100),
                default => $finalPrice,
            };

            if ($surgedPrice > $highestPrice) {
                $highestPrice = $surgedPrice;
            }
        }

        return $highestPrice;
    }
}
