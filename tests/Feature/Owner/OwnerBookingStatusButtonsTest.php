<?php

declare(strict_types=1);

namespace Tests\Feature\Owner;

use App\Models\Booking;
use App\Models\Cafe;
use App\Models\MenuOrder;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class OwnerBookingStatusButtonsTest extends TestCase
{
    use RefreshDatabase;

    private Cafe $cafe;

    private User $owner;

    private Booking $booking;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create(['role' => 'owner']);
        $customer = User::factory()->create(['role' => 'customer']);
        $this->cafe = Cafe::factory()->create(['owner_id' => $this->owner->id, 'approval_status' => 'active']);
        $table = Table::factory()->create(['cafe_id' => $this->cafe->id]);
        $this->booking = Booking::factory()->create([
            'customer_id' => $customer->id,
            'cafe_id' => $this->cafe->id,
            'table_id' => $table->id,
            'status' => 'confirmed',
        ]);
    }

    public function test_owner_can_check_in_a_confirmed_booking_then_complete_it(): void
    {
        $this->actingAs($this->owner)
            ->post(route('owner.bookings.check-in', $this->booking))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame('checked_in', $this->booking->fresh()->status);
        $this->assertNotNull($this->booking->fresh()->check_in_time);

        $this->actingAs($this->owner)
            ->post(route('owner.bookings.complete', $this->booking))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame('completed', $this->booking->fresh()->status);
        $this->assertNotNull($this->booking->fresh()->check_out_time);
    }

    public function test_check_in_menu_order_moves_to_preparing(): void
    {
        $order = MenuOrder::create([
            'cafe_id' => $this->cafe->id,
            'customer_id' => $this->booking->customer_id,
            'booking_id' => $this->booking->id,
            'order_type' => 'pre_order',
            'order_reference' => 'ORD-TEST-1',
            'status' => 'scheduled',
            'total_price' => 0,
            'payment_status' => 'unpaid',
        ]);

        $this->actingAs($this->owner)
            ->post(route('owner.bookings.check-in', $this->booking));

        $this->assertSame('preparing', $order->fresh()->status);
    }

    public function test_check_in_rejects_a_booking_that_is_not_confirmed(): void
    {
        $this->booking->update(['status' => 'cancelled', 'cancelled_by' => 'customer']);

        $this->actingAs($this->owner)
            ->post(route('owner.bookings.check-in', $this->booking))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertSame('cancelled', $this->booking->fresh()->status);
        $this->assertNull($this->booking->fresh()->check_in_time);
    }

    public function test_check_in_rejects_a_booking_for_another_date(): void
    {
        $this->booking->update([
            'booking_date' => now()->addDay()->toDateString(),
        ]);

        $this->actingAs($this->owner)
            ->post(route('owner.bookings.check-in', $this->booking))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertSame('confirmed', $this->booking->fresh()->status);
        $this->assertNull($this->booking->fresh()->check_in_time);
    }

    public function test_complete_rejects_a_booking_that_was_never_checked_in(): void
    {
        $this->actingAs($this->owner)
            ->post(route('owner.bookings.complete', $this->booking))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertSame('confirmed', $this->booking->fresh()->status);
        $this->assertNull($this->booking->fresh()->check_out_time);
    }
}
