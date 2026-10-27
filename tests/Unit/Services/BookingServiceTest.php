<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Enums\BookingStatus;
use App\Enums\CancelledBy;
use App\Exceptions\CancellationTimeExpiredException;
use App\Models\Booking;
use App\Models\Cafe;
use App\Models\Table;
use App\Models\User;
use App\Services\Booking\BookingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class BookingServiceTest extends TestCase
{
    use RefreshDatabase;

    private BookingService $service;

    private User $customer;

    private User $owner;

    private Booking $booking;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = $this->app->make(BookingService::class);
        $this->customer = User::factory()->create(['role' => 'customer']);
        $this->owner = User::factory()->create(['role' => 'owner']);
        $cafe = Cafe::factory()->create(['owner_id' => $this->owner->id]);
        $table = Table::factory()->create(['cafe_id' => $cafe->id]);
        $this->booking = Booking::factory()->create([
            'customer_id' => $this->customer->id,
            'cafe_id' => $cafe->id,
            'table_id' => $table->id,
            'booking_date' => today()->addDays(2)->format('Y-m-d'),
            'start_time' => '14:00',
            'end_time' => '15:00',
            'status' => BookingStatus::Confirmed->value,
        ]);
    }

    public function test_cancel_by_customer(): void
    {
        $this->service->cancel($this->booking, CancelledBy::Customer->value);

        $this->assertEquals(BookingStatus::Cancelled->value, $this->booking->fresh()->status);
        $this->assertEquals(CancelledBy::Customer->value, $this->booking->fresh()->cancelled_by);
    }

    public function test_cancel_by_owner(): void
    {
        $this->service->cancel($this->booking, CancelledBy::Owner->value);

        $this->assertEquals(CancelledBy::Owner->value, $this->booking->fresh()->cancelled_by);
    }

    public function test_cancel_by_admin(): void
    {
        $this->service->cancel($this->booking, CancelledBy::Admin->value);

        $this->assertEquals(CancelledBy::Admin->value, $this->booking->fresh()->cancelled_by);
    }

    public function test_cancel_with_reason(): void
    {
        $this->service->cancel($this->booking, CancelledBy::Owner->value, 'Meja rusak');

        $this->assertEquals('Meja rusak', $this->booking->fresh()->cancellation_reason);
    }

    public function test_cancel_within_3_hours_throws(): void
    {
        $soon = Booking::factory()->create([
            'customer_id' => $this->customer->id,
            'cafe_id' => $this->booking->cafe_id,
            'table_id' => $this->booking->table_id,
            'booking_date' => today()->format('Y-m-d'),
            'start_time' => now()->addHour()->format('H:i'),
            'end_time' => now()->addHours(2)->format('H:i'),
            'status' => BookingStatus::Confirmed->value,
        ]);

        $this->expectException(CancellationTimeExpiredException::class);
        $this->service->cancel($soon, CancelledBy::Customer->value);
    }
}
