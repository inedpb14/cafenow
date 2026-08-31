<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\BookingRule;
use App\Models\Table;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\BookingRule> */
final class BookingRuleFactory extends Factory
{
    protected $model = BookingRule::class;

    public function definition(): array
    {
        return [
            'table_id' => Table::factory(),
            'rule_type' => 'fixed',
            'min_advance_hours' => 1,
            'max_duration_minutes' => 240,
            'min_duration_minutes' => 30,
        ];
    }
}
