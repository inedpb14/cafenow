<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Cafe;
use App\Models\MenuItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MenuItem> */
final class MenuItemFactory extends Factory
{
    protected $model = MenuItem::class;

    public function definition(): array
    {
        return [
            'cafe_id' => Cafe::factory(),
            'name' => fake()->word().' Menu',
            'category' => fake()->word(),
            'price' => fake()->numberBetween(10000, 100000),
        ];
    }
}
