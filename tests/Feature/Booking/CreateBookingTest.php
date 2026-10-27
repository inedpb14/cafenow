<?php

declare(strict_types=1);

namespace Tests\Feature\Booking;

use App\Models\Booking;
use App\Models\BookingRule;
use App\Models\Cafe;
use App\Models\Table;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CreateBookingTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    private User $owner;

    private Cafe $cafe;

    private Table $table;

    private BookingRule $rule;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customer = User::factory()->create(['role' => 'customer']);
        $this->owner = User::factory()->create(['role' => 'owner']);
        $this->cafe = Cafe::factory()->create(['owner_id' => $this->owner->id, 'approval_status' => 'active']);
        $this->table = Table::factory()->create(['cafe_id' => $this->cafe->id]);
        $this->rule = BookingRule::factory()->create(['table_id' => $this->table->id]);
    }

    private function bookPayload(array $overrides = []): array
    {
        return array_merge([
            'table_id' => $this->table->id,
            'booking_rule_id' => $this->rule->id,
            'booking_date' => today()->addWeek()->format('Y-m-d'),
            'start_time' => '10:00',
            'duration_minutes' => 60,
            'guest_count' => 2,
        ], $overrides);
    }

    public function test_customer_can_create_booking(): void
    {
        $this->actingAs($this->customer);

        $response = $this->post("/cafes/{$this->cafe->id}/book", $this->bookPayload());

        $response->assertRedirect();
        $response->assertSessionHas('booking_success');
        $this->assertDatabaseHas('bookings', [
            'cafe_id' => $this->cafe->id,
            'table_id' => $this->table->id,
            'status' => 'pending',
        ]);
    }

    public function test_booking_requires_auth(): void
    {
        $response = $this->post("/cafes/{$this->cafe->id}/book", $this->bookPayload([
            'booking_date' => today()->addDay()->format('Y-m-d'),
        ]));

        $response->assertRedirect();
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_booking_outside_operational_hours_is_rejected(): void
    {
        $date = today()->addWeek()->format('Y-m-d');
        $day = strtolower((new Carbon($date))->format('D'));
        $this->cafe->update([
            'operational_hours' => [$day => [['open' => '08:00', 'close' => '17:00']]],
        ]);
        $this->actingAs($this->customer);

        $response = $this->post("/cafes/{$this->cafe->id}/book", $this->bookPayload([
            'booking_date' => $date,
            'start_time' => '20:00',
        ]));

        $response->assertRedirect();
        $response->assertSessionHas('error', 'Waktu booking di luar jam operasional cafe');
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_booking_within_operational_hours_succeeds(): void
    {
        $date = today()->addWeek()->format('Y-m-d');
        $day = strtolower((new Carbon($date))->format('D'));
        $this->cafe->update([
            'operational_hours' => [$day => [['open' => '08:00', 'close' => '22:00']]],
        ]);
        $this->actingAs($this->customer);

        $response = $this->post("/cafes/{$this->cafe->id}/book", $this->bookPayload([
            'booking_date' => $date,
            'start_time' => '10:00',
        ]));

        $response->assertRedirect();
        $this->assertDatabaseHas('bookings', ['booking_date' => $date.' 00:00:00']);
    }

    public function test_booking_when_cafe_has_no_hours_defined_succeeds(): void
    {
        $this->actingAs($this->customer);

        $response = $this->post("/cafes/{$this->cafe->id}/book", $this->bookPayload());

        $response->assertRedirect();
        $this->assertDatabaseCount('bookings', 1);
    }

    public function test_booking_requires_valid_cafe(): void
    {
        $this->actingAs($this->customer);

        $response = $this->post('/cafes/99999/book', $this->bookPayload());

        $response->assertStatus(404);
    }

    public function test_booking_rejected_for_pending_cafe(): void
    {
        $this->cafe->update(['approval_status' => 'pending']);
        $this->actingAs($this->customer);

        $response = $this->post("/cafes/{$this->cafe->id}/book", $this->bookPayload());

        $response->assertRedirect();
        $response->assertSessionHas('error', 'Cafe tidak tersedia untuk pemesanan saat ini');
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_booking_rejected_for_suspended_cafe(): void
    {
        $this->cafe->update(['approval_status' => 'suspended']);
        $this->actingAs($this->customer);

        $response = $this->post("/cafes/{$this->cafe->id}/book", $this->bookPayload());

        $response->assertRedirect();
        $response->assertSessionHas('error', 'Cafe tidak tersedia untuk pemesanan saat ini');
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_booking_customer_can_cancel(): void
    {
        $this->actingAs($this->customer);

        $booking = Booking::factory()->create([
            'customer_id' => $this->customer->id,
            'cafe_id' => $this->cafe->id,
            'table_id' => $this->table->id,
            'booking_date' => today()->addWeek()->format('Y-m-d'),
            'start_time' => '14:00',
            'end_time' => '15:00',
            'status' => 'confirmed',
        ]);

        $response = $this->putJson("/api/bookings/{$booking->id}/cancel");

        $response->assertOk();
        $this->assertEquals('cancelled', $booking->fresh()->status);
        $this->assertEquals('customer', $booking->fresh()->cancelled_by);
    }
}
