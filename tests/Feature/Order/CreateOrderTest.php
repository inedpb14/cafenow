<?php

declare(strict_types=1);

namespace Tests\Feature\Order;

use App\Models\Booking;
use App\Models\BookingRule;
use App\Models\Cafe;
use App\Models\MenuItem;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CreateOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_pre_order_items_from_another_cafe_are_rejected(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $owner = User::factory()->create(['role' => 'owner']);
        $cafe = Cafe::factory()->create(['owner_id' => $owner->id, 'approval_status' => 'active']);
        $table = Table::factory()->create(['cafe_id' => $cafe->id]);
        $rule = BookingRule::factory()->create(['table_id' => $table->id]);
        $foreignItem = MenuItem::factory()->create(); // menu milik cafe lain

        $response = $this->actingAs($customer)->post("/cafes/{$cafe->id}/book", [
            'table_id' => $table->id,
            'booking_rule_id' => $rule->id,
            'booking_date' => today()->addWeek()->format('Y-m-d'),
            'start_time' => '10:00',
            'duration_minutes' => 60,
            'guest_count' => 2,
            'items' => [
                ['menu_item_id' => $foreignItem->id, 'quantity' => 2],
            ],
        ]);

        $response->assertSessionHasErrors('items.0.menu_item_id');
        $this->assertDatabaseCount('bookings', 0);
        $this->assertDatabaseCount('menu_orders', 0);
    }

    public function test_pre_order_created_with_booking(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $owner = User::factory()->create(['role' => 'owner']);
        $cafe = Cafe::factory()->create(['owner_id' => $owner->id, 'approval_status' => 'active']);
        $table = Table::factory()->create(['cafe_id' => $cafe->id]);
        $rule = BookingRule::factory()->create(['table_id' => $table->id]);
        $menuItem = MenuItem::factory()->create(['cafe_id' => $cafe->id]);

        $response = $this->actingAs($customer)->post("/cafes/{$cafe->id}/book", [
            'table_id' => $table->id,
            'booking_rule_id' => $rule->id,
            'booking_date' => today()->addWeek()->format('Y-m-d'),
            'start_time' => '10:00',
            'duration_minutes' => 60,
            'guest_count' => 2,
            'items' => [
                ['menu_item_id' => $menuItem->id, 'quantity' => 2],
            ],
        ]);

        $response->assertRedirect();
        $booking = Booking::firstOrFail();
        $this->assertEquals(2 * $menuItem->price, $booking->menu_subtotal);
        $this->assertDatabaseHas('menu_orders', [
            'booking_id' => $booking->id,
            'order_type' => 'pre_order',
            'status' => 'pending_payment',
        ]);
    }
}
