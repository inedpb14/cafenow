<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Events\BookingCancelled;
use App\Models\Booking;
use App\Models\Cafe;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

final class CafeSuspendCancellationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Cafe $cafe;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->cafe = Cafe::factory()->create(['approval_status' => 'active']);
    }

    private function booking(string $paymentStatus, string $status): Booking
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $customer = User::factory()->create(['role' => 'customer']);
        $table = Table::factory()->create(['cafe_id' => $this->cafe->id]);

        return Booking::factory()->create([
            'customer_id' => $customer->id,
            'cafe_id' => $this->cafe->id,
            'table_id' => $table->id,
            'booking_date' => today()->addWeek()->format('Y-m-d'),
            'start_time' => '14:00',
            'end_time' => '15:00',
            'status' => $status,
            'payment_status' => $paymentStatus,
        ]);
    }

    public function test_suspend_cancels_unpaid_bookings_and_keeps_paid(): void
    {
        $unpaidPending = $this->booking('unpaid', 'pending');
        $unpaidConfirmed = $this->booking('unpaid', 'confirmed');
        $paid = $this->booking('paid', 'confirmed');

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafes/{$this->cafe->id}/suspend", ['reason' => 'Pelanggaran aturan platform'])
            ->assertOk();

        foreach ([$unpaidPending, $unpaidConfirmed] as $booking) {
            $fresh = $booking->fresh();
            $this->assertEquals('cancelled', $fresh->status);
            $this->assertEquals('system', $fresh->cancelled_by);
            $this->assertEquals('Dibatalkan otomatis karena cafe di-suspend', $fresh->cancellation_reason);
        }

        $this->assertEquals('confirmed', $paid->fresh()->status);
        $this->assertEquals('paid', $paid->fresh()->payment_status);
        $this->assertEquals('suspended', $this->cafe->fresh()->approval_status);
    }

    public function test_suspend_with_no_bookings_succeeds(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafes/{$this->cafe->id}/suspend", ['reason' => 'Pelanggaran aturan platform'])
            ->assertOk();

        $this->assertEquals('suspended', $this->cafe->fresh()->approval_status);
    }

    public function test_suspend_rolls_back_everything_when_cascade_fails(): void
    {
        $unpaidFirst = $this->booking('unpaid', 'pending');
        $unpaidSecond = $this->booking('unpaid', 'confirmed');

        Event::listen(
            BookingCancelled::class,
            function (BookingCancelled $event) use ($unpaidSecond): void {
                if ($event->bookingId === $unpaidSecond->id) {
                    throw new \RuntimeException('forced cascade failure');
                }
            },
        );

        $response = $this->actingAs($this->admin)
            ->postJson("/api/admin/cafes/{$this->cafe->id}/suspend", ['reason' => 'Pelanggaran aturan platform'])
            ->assertStatus(500);

        $this->assertEquals('active', $this->cafe->fresh()->approval_status);
        $this->assertEquals('pending', $unpaidFirst->fresh()->status);
        $this->assertEquals('confirmed', $unpaidSecond->fresh()->status);
    }

    public function test_already_cancelled_unpaid_booking_is_not_retouched(): void
    {
        $cancelled = $this->booking('unpaid', 'cancelled');

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafes/{$this->cafe->id}/suspend", ['reason' => 'Pelanggaran aturan platform'])
            ->assertOk();

        $this->assertEquals('cancelled', $cancelled->fresh()->status);
        $this->assertNull($cancelled->fresh()->cancelled_by);
    }
}
