<?php

declare(strict_types=1);

namespace Tests\Unit\Commands;

use App\Models\Booking;
use App\Models\Cafe;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AutoCompleteBookingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_with_future_end_time_stays_confirmed_after_check_in(): void
    {
        $cafe = Cafe::factory()->create();
        $table = Table::factory()->create(['cafe_id' => $cafe->id]);
        $customer = User::factory()->create(['role' => 'customer', 'phone' => '08123456789']);

        $future = Booking::factory()->create([
            'customer_id' => $customer->id,
            'cafe_id' => $cafe->id,
            'table_id' => $table->id,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'booking_date' => now()->addDay()->toDateString(),
            'start_time' => now()->addDay()->startOfDay()->addHours(8)->format('H:i:s'),
            'end_time' => now()->addDay()->startOfDay()->addHours(10)->format('H:i:s'),
            'check_in_time' => now(),
        ]);

        $this->artisan('bookings:auto-complete');

        $this->assertSame('confirmed', $future->fresh()->status);
        $this->assertNull($future->fresh()->check_out_time);
    }

    public function test_booking_with_past_end_time_is_completed(): void
    {
        $cafe = Cafe::factory()->create();
        $table = Table::factory()->create(['cafe_id' => $cafe->id]);
        $customer = User::factory()->create(['role' => 'customer', 'phone' => '08123456789']);

        Booking::factory()->create([
            'customer_id' => $customer->id,
            'cafe_id' => $cafe->id,
            'table_id' => $table->id,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'booking_date' => now()->subDay()->toDateString(),
            'start_time' => '08:00:00',
            'end_time' => '10:00:00',
            'check_in_time' => now()->subDay(),
        ]);

        $this->artisan('bookings:auto-complete');

        $completed = Booking::query()->where('status', 'completed')->first();

        $this->assertNotNull($completed, 'Booking yang sudah lewat waktunya harus completed');
        $this->assertNotNull($completed->check_out_time);
    }
}
