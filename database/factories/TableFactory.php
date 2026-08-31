<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Cafe;
use App\Models\Table;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Table> */
final class TableFactory extends Factory
{
    protected $model = Table::class;

    public function definition(): array
    {
        return [
            'cafe_id' => Cafe::factory(),
            'name' => 'Meja '.fake()->unique()->numberBetween(1, 999),
            'capacity' => fake()->numberBetween(2, 8),
            'is_active' => true,
        ];
    }
}
