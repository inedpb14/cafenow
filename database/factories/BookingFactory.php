<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Booking;
use App\Models\Cafe;
use App\Models\Table;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Booking> */
final class BookingFactory extends Factory
{
    protected $model = Booking::class;

    public function definition(): array
    {
        return [
            'cafe_id' => Cafe::factory(),
            'table_id' => Table::factory(),
            'customer_id' => User::factory(),
            'booking_date' => today()->format('Y-m-d'),
            'start_time' => fake()->time('H:i'),
            'end_time' => fake()->time('H:i'),
            'duration_minutes' => 60,
            'guest_count' => 2,
            'status' => 'confirmed',
            'table_price' => 50000,
            'total_price' => 50000,
            'payment_status' => 'unpaid',
            'booking_reference' => 'BKG-TEST-'.fake()->unique()->randomNumber(5),
        ];
    }
}
