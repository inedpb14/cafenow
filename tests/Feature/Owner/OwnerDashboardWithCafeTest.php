<?php

declare(strict_types=1);

namespace Tests\Feature\Owner;

use App\Models\Booking;
use App\Models\Cafe;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class OwnerDashboardWithCafeTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_dashboard_renders_with_real_cafe_and_booking_data(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $customer = User::factory()->create(['role' => 'customer', 'phone' => '08123456789']);
        $cafe = Cafe::factory()->create(['owner_id' => $owner->id, 'approval_status' => 'active']);
        $table = Table::factory()->create(['cafe_id' => $cafe->id]);
        Booking::factory()->create([
            'customer_id' => $customer->id,
            'cafe_id' => $cafe->id,
            'table_id' => $table->id,
        ]);

        $this->actingAs($owner)
            ->get(route('owner.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('owner/dashboard')
                ->has('recentBookings', 1)
                ->where('recentBookings.0.customerName', $customer->name));
    }

    public function test_owner_bookings_page_renders_with_customer_phone(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $customer = User::factory()->create(['role' => 'customer', 'phone' => '08123456789']);
        $cafe = Cafe::factory()->create(['owner_id' => $owner->id, 'approval_status' => 'active']);
        $table = Table::factory()->create(['cafe_id' => $cafe->id]);
        Booking::factory()->create([
            'customer_id' => $customer->id,
            'cafe_id' => $cafe->id,
            'table_id' => $table->id,
        ]);

        $this->actingAs($owner)
            ->get(route('owner.bookings'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('owner/bookings')
                ->has('bookings', 1)
                ->where('bookings.0.phone', '08123456789'));
    }

    public function test_owner_orders_page_renders_with_real_cafe(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $customer = User::factory()->create(['role' => 'customer']);
        $cafe = Cafe::factory()->create(['owner_id' => $owner->id, 'approval_status' => 'active']);
        Table::factory()->create(['cafe_id' => $cafe->id]);

        $this->actingAs($owner)
            ->get(route('owner.orders'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('owner/orders'));
    }
}
