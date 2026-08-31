<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Cafe;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Cafe> */
final class CafeFactory extends Factory
{
    protected $model = Cafe::class;

    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'name' => fake()->company().' Cafe',
            'description' => fake()->sentence(),
            'city' => fake()->city(),
            'address' => fake()->address(),
            'approval_status' => 'active',
            'operational_hours' => [
                'mon' => [['open' => '08:00', 'close' => '22:00']],
                'tue' => [['open' => '08:00', 'close' => '22:00']],
                'wed' => [['open' => '08:00', 'close' => '22:00']],
                'thu' => [['open' => '08:00', 'close' => '22:00']],
                'fri' => [['open' => '08:00', 'close' => '22:00']],
                'sat' => [['open' => '09:00', 'close' => '23:00']],
                'sun' => [['open' => '09:00', 'close' => '22:00']],
            ],
        ];
    }
}
