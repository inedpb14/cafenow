<?php

declare(strict_types=1);

namespace Tests\Feature\Booking;

use App\Models\Booking;
use App\Models\BookingRule;
use App\Models\Cafe;
use App\Models\MenuItem;
use App\Models\Payment;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class BookingWizardFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    private User $owner;

    private Cafe $cafe;

    private Table $table;

    private BookingRule $rule;

    private MenuItem $menu;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.midtrans.server_key' => 'SB-Mid-server-test',
            'services.midtrans.merchant_id' => 'M-test',
            'services.midtrans.client_key' => 'SB-Mid-client-test',
        ]);

        $this->customer = User::factory()->create(['role' => 'customer']);
        $this->owner = User::factory()->create(['role' => 'owner']);
        $this->cafe = Cafe::factory()->create([
            'owner_id' => $this->owner->id,
            'approval_status' => 'active',
            'operational_hours' => [
                'mon' => [['open' => '08:00', 'close' => '22:00']],
                'tue' => [['open' => '08:00', 'close' => '22:00']],
                'wed' => [['open' => '08:00', 'close' => '22:00']],
                'thu' => [['open' => '08:00', 'close' => '22:00']],
                'fri' => [['open' => '08:00', 'close' => '22:00']],
                'sat' => [['open' => '08:00', 'close' => '22:00']],
                'sun' => [['open' => '08:00', 'close' => '22:00']],
            ],
        ]);
        $this->table = Table::factory()->create(['cafe_id' => $this->cafe->id]);
        $this->rule = BookingRule::factory()->create([
            'table_id' => $this->table->id,
            'rule_type' => 'fixed',
            'duration_minutes' => 120,
            'price' => 25000,
        ]);
        $this->menu = MenuItem::factory()->create([
            'cafe_id' => $this->cafe->id,
            'availability_status' => 'available',
        ]);
    }

    public function test_wizard_contract_returns_cafe_tables_slots_and_menus(): void
    {
        $date = today()->addWeek()->format('Y-m-d');

        $cafeRes = $this->getJson("/api/cafes/{$this->cafe->id}");
        $cafeRes->assertOk()->assertJsonPath('success', true)
            ->assertJsonPath('data.name', $this->cafe->name);

        $tablesRes = $this->getJson("/api/cafes/{$this->cafe->id}/tables");
        $tablesRes->assertOk()->assertJsonStructure([
            'data' => [['id', 'name', 'capacity', 'booking_rule' => ['id', 'price']]],
        ]);

        $slotsRes = $this->getJson("/api/cafes/{$this->cafe->id}/availability?date={$date}&guests=2");
        $slotsRes->assertOk()->assertJsonStructure([
            'data' => ['tables' => [['id', 'available_slots' => [['time', 'status']]]]],
        ]);

        $menusRes = $this->getJson("/api/cafes/{$this->cafe->id}/menus");
        $menusRes->assertOk()->assertJsonStructure([
            'data' => [['id', 'name', 'price']],
        ]);
    }

    public function test_full_flow_booking_then_pre_order_then_payment(): void
    {
        $this->actingAs($this->customer);

        Http::fake([
            '*' => Http::response([
                'token' => 'snap-token-123',
                'transaction_id' => 'midtrans-tx-1',
                'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v2/vt-1',
            ], 200),
        ]);

        $response = $this->post("/cafes/{$this->cafe->id}/book", [
            'table_id' => $this->table->id,
            'booking_rule_id' => $this->rule->id,
            'booking_date' => today()->addWeek()->format('Y-m-d'),
            'start_time' => '10:00',
            'duration_minutes' => 120,
            'guest_count' => 2,
            'items' => [
                ['menu_item_id' => $this->menu->id, 'quantity' => 2],
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('booking_success');

        $booking = Booking::firstOrFail();
        $this->assertEquals($booking->table_price + 2 * $this->menu->price, $booking->total_price);
        $this->assertSame('pre_order', $booking->menuOrders()->first()->order_type);

        $payment = Payment::firstOrFail();
        $this->assertEquals('pending', $payment->status);
    }

    public function test_dummy_mode_redirects_to_simulate_page_and_pay_confirms_booking(): void
    {
        config([
            'services.midtrans.server_key' => '',
            'services.midtrans.merchant_id' => '',
            'services.midtrans.client_key' => '',
        ]);

        $this->actingAs($this->customer);

        $response = $this->post("/cafes/{$this->cafe->id}/book", [
            'table_id' => $this->table->id,
            'booking_rule_id' => $this->rule->id,
            'booking_date' => today()->addWeek()->format('Y-m-d'),
            'start_time' => '10:00',
            'duration_minutes' => 120,
            'guest_count' => 2,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('booking_success');

        $booking = Booking::firstOrFail();
        $payment = Payment::firstOrFail();
        $this->assertEquals('pending', $payment->status);
        $this->assertEquals("dummy-{$payment->midtrans_order_id}", $payment->snap_token);
        $this->assertStringContainsString('/payments/', $payment->snap_redirect_url);

        $simulate = $this->get("/payments/{$payment->midtrans_order_id}/simulate");
        $simulate->assertOk();

        $pay = $this->post("/payments/{$payment->midtrans_order_id}/simulate", [
            'method' => 'qris',
        ]);

        $pay->assertRedirect(route('customer.bookings.detail', $booking->id));
        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => 'success',
            'payment_method' => 'qris',
        ]);
        $this->assertNotNull($payment->fresh()->paid_at);
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => 'confirmed',
            'payment_status' => 'paid',
        ]);
    }

    public function test_gateway_failure_keeps_booking_and_marks_payment_pending(): void
    {
        $this->actingAs($this->customer);

        Http::fake([
            '*' => Http::response([], 500),
        ]);

        $response = $this->post("/cafes/{$this->cafe->id}/book", [
            'table_id' => $this->table->id,
            'booking_rule_id' => $this->rule->id,
            'booking_date' => today()->addWeek()->format('Y-m-d'),
            'start_time' => '10:00',
            'duration_minutes' => 120,
            'guest_count' => 2,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('booking_success');

        $this->assertDatabaseCount('bookings', 1);
        $payment = Payment::firstOrFail();
        $this->assertEquals('pending', $payment->status);
        $this->assertNull($payment->gateway_reference);
    }

    public function test_slot_not_available_returns_error(): void
    {
        $this->actingAs($this->customer);

        Booking::factory()->create([
            'customer_id' => $this->customer->id,
            'cafe_id' => $this->cafe->id,
            'table_id' => $this->table->id,
            'booking_date' => today()->addWeek()->format('Y-m-d'),
            'start_time' => '10:00:00',
            'end_time' => '12:00:00',
            'status' => 'confirmed',
        ]);

        $response = $this->post("/cafes/{$this->cafe->id}/book", [
            'table_id' => $this->table->id,
            'booking_rule_id' => $this->rule->id,
            'booking_date' => today()->addWeek()->format('Y-m-d'),
            'start_time' => '10:00',
            'duration_minutes' => 120,
            'guest_count' => 2,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('error', 'Slot waktu yang dipilih tidak tersedia');
        $this->assertDatabaseCount('bookings', 1);
    }

    public function test_booking_time_window_returns_error(): void
    {
        $this->actingAs($this->customer);

        $tooSoon = now()->addHour()->format('H:i');

        $response = $this->post("/cafes/{$this->cafe->id}/book", [
            'table_id' => $this->table->id,
            'booking_rule_id' => $this->rule->id,
            'booking_date' => today()->format('Y-m-d'),
            'start_time' => $tooSoon,
            'duration_minutes' => 120,
            'guest_count' => 2,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertDatabaseCount('bookings', 0);
    }
}
