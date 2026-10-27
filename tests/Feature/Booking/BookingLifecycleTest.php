<?php

declare(strict_types=1);

namespace Tests\Feature\Booking;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Cafe;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class BookingLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    private User $owner;

    private Booking $booking;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create(['role' => 'customer']);
        $this->owner = User::factory()->create(['role' => 'owner']);

        $cafe = Cafe::factory()->create(['owner_id' => $this->owner->id, 'approval_status' => 'active']);
        $table = Table::factory()->create(['cafe_id' => $cafe->id]);

        $this->booking = Booking::factory()->create([
            'customer_id' => $this->customer->id,
            'cafe_id' => $cafe->id,
            'table_id' => $table->id,
            'status' => BookingStatus::Confirmed->value,
        ]);
    }

    public function test_owner_can_mark_no_show(): void
    {
        $this->actingAs($this->owner);

        $response = $this->putJson("/api/owner/bookings/{$this->booking->id}/no-show");

        $response->assertOk();
        $this->assertEquals('no_show', $this->booking->fresh()->status);
    }

    public function test_owner_can_checkout_checked_in_booking(): void
    {
        $this->actingAs($this->owner);
        $this->booking->update(['check_in_time' => now()]);

        $response = $this->putJson("/api/owner/bookings/{$this->booking->id}/checkout");

        $response->assertOk();
        $this->assertEquals('completed', $this->booking->fresh()->status);
        $this->assertNotNull($this->booking->fresh()->check_out_time);
    }

    public function test_checkout_fails_when_not_checked_in(): void
    {
        $this->actingAs($this->owner);

        $response = $this->putJson("/api/owner/bookings/{$this->booking->id}/checkout");

        $response->assertStatus(422);
        $this->assertEquals('confirmed', $this->booking->fresh()->status);
    }

    public function test_double_checkin_returns_error(): void
    {
        $this->actingAs($this->customer);
        $this->booking->update(['check_in_time' => now()]);

        $response = $this->postJson("/api/bookings/{$this->booking->id}/checkin");

        $response->assertStatus(409);
    }
}
