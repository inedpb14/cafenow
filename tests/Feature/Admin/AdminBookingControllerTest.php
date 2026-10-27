<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Booking;
use App\Models\Cafe;
use App\Models\MenuItem;
use App\Models\MenuOrder;
use App\Models\MenuOrderItem;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminBookingControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    private function booking(array $overrides = []): Booking
    {
        $cafe = Cafe::factory()->create();
        $table = Table::factory()->create(['cafe_id' => $cafe->id]);
        $customer = User::factory()->create(['role' => 'customer']);

        return Booking::factory()->create(array_merge([
            'cafe_id' => $cafe->id,
            'table_id' => $table->id,
            'customer_id' => $customer->id,
            'booking_date' => today()->format('Y-m-d'),
        ], $overrides));
    }

    public function test_index_returns_bookings_with_relations(): void
    {
        $booking = $this->booking();

        $this->actingAs($this->admin)
            ->getJson('/api/admin/bookings')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.booking_reference', $booking->booking_reference)
            ->assertJsonPath('data.0.customer.name', $booking->customer->name)
            ->assertJsonPath('data.0.table.name', $booking->table->name)
            ->assertJsonPath('data.0.cafe.name', $booking->cafe->name);
    }

    public function test_index_includes_menu_orders_with_items(): void
    {
        $booking = $this->booking();
        $menuItem = MenuItem::factory()->create(['cafe_id' => $booking->cafe_id]);

        $order = MenuOrder::create([
            'cafe_id' => $booking->cafe_id,
            'customer_id' => $booking->customer_id,
            'booking_id' => $booking->id,
            'order_reference' => 'ORD-BOOK-001',
            'order_type' => 'preorder',
            'status' => 'preparing',
            'total_price' => 60000,
            'commission' => 6000,
            'cafe_receives' => 54000,
            'payment_status' => 'paid',
        ]);

        MenuOrderItem::create([
            'menu_order_id' => $order->id,
            'menu_item_id' => $menuItem->id,
            'quantity' => 3,
            'unit_price' => 20000,
            'subtotal' => 60000,
        ]);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/bookings')
            ->assertOk()
            ->assertJsonPath('data.0.menu_orders.0.order_reference', 'ORD-BOOK-001')
            ->assertJsonPath('data.0.menu_orders.0.status', 'preparing')
            ->assertJsonPath('data.0.menu_orders.0.items.0.quantity', 3)
            ->assertJsonPath('data.0.menu_orders.0.items.0.menu_item.name', $menuItem->name);
    }

    public function test_default_per_page_is_10(): void
    {
        Booking::factory()->count(12)->create();

        $this->actingAs($this->admin)
            ->getJson('/api/admin/bookings')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('pagination.per_page', 10)
            ->assertJsonPath('pagination.last_page', 2);
    }

    public function test_index_filters_by_status(): void
    {
        $this->booking(['status' => 'confirmed']);
        $this->booking(['status' => 'cancelled']);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/bookings?status=confirmed')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'confirmed');
    }

    public function test_index_filters_by_cafe(): void
    {
        $cafeA = Cafe::factory()->create();
        $tableA = Table::factory()->create(['cafe_id' => $cafeA->id]);
        $customer = User::factory()->create(['role' => 'customer']);

        $this->booking(['cafe_id' => $cafeA->id, 'table_id' => $tableA->id, 'customer_id' => $customer->id]);
        $this->booking();

        $this->actingAs($this->admin)
            ->getJson("/api/admin/bookings?cafe_id={$cafeA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_keyword_searches_booking_code_and_customer_name(): void
    {
        $this->booking(['booking_reference' => 'BKG-UNIK-001']);
        $customer = User::factory()->create(['role' => 'customer', 'name' => 'Siti Rahayu']);
        $this->booking(['customer_id' => $customer->id]);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/bookings?keyword=UNIK')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.booking_reference', 'BKG-UNIK-001');

        $this->actingAs($this->admin)
            ->getJson('/api/admin/bookings?keyword=Rahayu')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.customer.name', 'Siti Rahayu');
    }

    public function test_index_filters_by_date_range(): void
    {
        $this->booking(['booking_date' => today()->subDays(10)->format('Y-m-d')]);
        $this->booking(['booking_date' => today()->format('Y-m-d')]);
        $this->booking(['booking_date' => today()->addDays(10)->format('Y-m-d')]);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/bookings?date_from='.today()->subDays(5)->format('Y-m-d').'&date_to='.today()->addDays(5)->format('Y-m-d'))
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_index_sorts_by_customer_name(): void
    {
        $alice = User::factory()->create(['role' => 'customer', 'name' => 'Alice']);
        $bob = User::factory()->create(['role' => 'customer', 'name' => 'Bob']);
        $this->booking(['customer_id' => $alice->id]);
        $this->booking(['customer_id' => $bob->id]);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/bookings?sort_by=customer_name&sort_order=desc')
            ->assertOk()
            ->assertJsonPath('data.0.customer.name', 'Bob')
            ->assertJsonPath('data.1.customer.name', 'Alice');
    }

    public function test_per_page_is_capped_at_100(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/admin/bookings?per_page=999')
            ->assertOk()
            ->assertJsonPath('pagination.per_page', 100);
    }

    public function test_cancel_endpoint_is_removed(): void
    {
        $booking = $this->booking(['status' => 'confirmed']);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/bookings/{$booking->id}/cancel", ['cancellation_reason' => 'Alasan tes'])
            ->assertStatus(404);

        $this->assertSame('confirmed', $booking->fresh()->status);
    }

    public function test_non_admin_cannot_access_bookings(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->getJson('/api/admin/bookings')
            ->assertStatus(403);
    }

    public function test_oversight_page_renders(): void
    {
        $this->actingAs($this->admin)
            ->get('/admin/bookings')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('admin/Booking/Oversight'));
    }

    public function test_detail_page_renders_with_menu_orders(): void
    {
        $booking = $this->booking();
        $menuItem = MenuItem::factory()->create(['cafe_id' => $booking->cafe_id]);

        $order = MenuOrder::create([
            'cafe_id' => $booking->cafe_id,
            'customer_id' => $booking->customer_id,
            'booking_id' => $booking->id,
            'order_reference' => 'ORD-DETAIL-01',
            'order_type' => 'preorder',
            'status' => 'ready',
            'total_price' => 40000,
            'commission' => 4000,
            'cafe_receives' => 36000,
            'payment_status' => 'paid',
        ]);

        MenuOrderItem::create([
            'menu_order_id' => $order->id,
            'menu_item_id' => $menuItem->id,
            'quantity' => 1,
            'unit_price' => 40000,
            'subtotal' => 40000,
        ]);

        $this->actingAs($this->admin)
            ->get("/admin/bookings/{$booking->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/Booking/Detail')
                ->where('booking.id', $booking->id)
                ->where('booking.menu_orders.0.order_reference', 'ORD-DETAIL-01')
                ->where('booking.menu_orders.0.items.0.menu_item.name', $menuItem->name)
                ->where('booking.cafe.name', $booking->cafe->name));
    }

    public function test_detail_api_show_is_removed(): void
    {
        $booking = $this->booking();

        $this->actingAs($this->admin)
            ->getJson("/api/admin/bookings/{$booking->id}")
            ->assertStatus(404);
    }
}
