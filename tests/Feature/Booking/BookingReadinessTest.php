<?php

declare(strict_types=1);

namespace Tests\Feature\Booking;

use App\Models\Cafe;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class BookingReadinessTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $customer;

    private Cafe $cafe;

    protected function setUp(): void
    {
        parent::setUp();

        // Dummy payment mode: tidak memanggil Midtrans saat booking dibuat.
        config([
            'services.midtrans.server_key' => '',
            'services.midtrans.merchant_id' => '',
            'services.midtrans.client_key' => '',
        ]);

        $this->owner = User::factory()->create(['role' => 'owner']);
        $this->customer = User::factory()->create(['role' => 'customer']);
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
    }

    /**
     * @return array<string, mixed>
     */
    private function bookingPayload(Table $table, string $date): array
    {
        return [
            'table_id' => $table->id,
            'booking_rule_id' => $table->bookingRule->id,
            'booking_date' => $date,
            'start_time' => '10:00',
            'duration_minutes' => 120,
            'guest_count' => 4,
        ];
    }

    private function createTableViaOwner(string $name = 'Meja Siap Pakai'): Table
    {
        $this->actingAs($this->owner)
            ->post(route('owner.cafes.tables.store'), [
                'name' => $name,
                'type' => 'vip',
                'capacity' => '4',
                'min_spend' => '50000',
            ])
            ->assertRedirect();

        $table = Table::query()->where('cafe_id', $this->cafe->id)->latest('id')->firstOrFail();

        $this->assertNotNull($table->bookingRule, 'Meja baru harus langsung punya booking rule default');

        return $table;
    }

    public function test_booking_feature_is_usable_end_to_end(): void
    {
        $table = $this->createTableViaOwner();
        $date = today()->addWeek()->format('Y-m-d');

        // 1. Meja buatan owner langsung tampil di wizard customer.
        $this->actingAs($this->customer)
            ->get(route('cafes.book', $this->cafe))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('cafes/book')
                ->has('tables', 1)
                ->where('tables.0.name', $table->name));

        // 2. Availability API menawarkan slot yang bisa dipilih.
        $slots = $this->getJson("/api/cafes/{$this->cafe->id}/availability?date={$date}&guests=4")
            ->assertOk()
            ->json('data.tables.0.available_slots');

        $this->assertContains(
            ['time' => '10:00', 'status' => 'available'],
            $slots,
            'Slot 10:00 harus tersedia agar booking bisa dibuat'
        );

        // 3. Booking berhasil dibuat dan pembayaran dummy menunggu.
        $this->actingAs($this->customer)
            ->post(route('cafes.book.store', $this->cafe), $this->bookingPayload($table, $date))
            ->assertRedirect()
            ->assertSessionHas('booking_success');

        $this->assertDatabaseHas('bookings', [
            'cafe_id' => $this->cafe->id,
            'table_id' => $table->id,
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('payments', ['status' => 'pending']);
    }

    public function test_same_slot_cannot_be_booked_twice(): void
    {
        $table = $this->createTableViaOwner();
        $date = today()->addWeek()->format('Y-m-d');
        $payload = $this->bookingPayload($table, $date);

        $this->actingAs($this->customer)
            ->post(route('cafes.book.store', $this->cafe), $payload)
            ->assertSessionHas('booking_success');

        $this->actingAs(User::factory()->create(['role' => 'customer']))
            ->post(route('cafes.book.store', $this->cafe), $payload)
            ->assertSessionHas('error', 'Slot waktu yang dipilih tidak tersedia');

        $this->assertDatabaseCount('bookings', 1);
    }
}
