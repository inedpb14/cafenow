<?php

declare(strict_types=1);

namespace Tests\Feature\Customer;

use App\Models\Booking;
use App\Models\MenuItem;
use App\Models\MenuOrder;
use App\Models\MenuOrderItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class BookingDestroyTest extends TestCase
{
    use RefreshDatabase;

    private function customerWithCancelledBooking(): array
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $other = User::factory()->create(['role' => 'customer']);
        $booking = Booking::factory()->create([
            'customer_id' => $customer->id,
            'status' => 'cancelled',
            'payment_status' => 'unpaid',
        ]);
        $menu = MenuItem::factory()->create(['cafe_id' => $booking->cafe_id]);
        $order = MenuOrder::create([
            'cafe_id' => $booking->cafe_id,
            'customer_id' => $customer->id,
            'booking_id' => $booking->id,
            'order_type' => 'pre_order',
            'order_reference' => 'ORD-DESTROY-'.uniqid(),
            'status' => 'cancelled',
            'total_price' => 15000,
            'payment_status' => 'unpaid',
        ]);
        MenuOrderItem::create([
            'menu_order_id' => $order->id,
            'menu_item_id' => $menu->id,
            'quantity' => 1,
            'unit_price' => 15000,
            'subtotal' => 15000,
        ]);

        return [$customer, $other, $booking, $order];
    }

    public function test_customer_can_delete_own_cancelled_booking_with_cascade(): void
    {
        [$customer, , $booking, $order] = $this->customerWithCancelledBooking();

        $response = $this->actingAs($customer)->delete("/customer/bookings/{$booking->id}");

        $response->assertRedirect(route('customer.bookings'));
        $this->assertDatabaseMissing('bookings', ['id' => $booking->id]);
        $this->assertDatabaseMissing('menu_orders', ['id' => $order->id]);
    }

    public function test_cannot_delete_booking_that_is_not_cancelled(): void
    {
        [$customer, , $booking] = $this->customerWithCancelledBooking();
        $booking->update(['status' => 'confirmed']);

        $response = $this->actingAs($customer)->delete("/customer/bookings/{$booking->id}");

        $response->assertSessionHas('error');
        $this->assertDatabaseHas('bookings', ['id' => $booking->id]);
    }

    public function test_cannot_delete_someone_elses_booking(): void
    {
        [$customer, $other, $booking] = $this->customerWithCancelledBooking();

        $this->actingAs($other)->delete("/customer/bookings/{$booking->id}")->assertForbidden();
        $this->assertDatabaseHas('bookings', ['id' => $booking->id]);
    }
}
