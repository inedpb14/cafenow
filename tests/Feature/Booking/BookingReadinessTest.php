<?php

declare(strict_types=1);

namespace Tests\Feature\Booking;

use App\Models\Booking;
use App\Models\Cafe;
use App\Models\Payment;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
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

        // Dummy payment mode: pembayaran lewat route web, tanpa memanggil Midtrans.
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

    private function createTableViaOwner(string $name = 'Meja Siap Pakai'): Table
    {
        $this->actingAs($this->owner)
            ->post(route('owner.cafes.tables.store'), [
                'name' => $name,
                'type' => 'vip',
                'capacity' => '4',
                'min_spend' => '50000',
            ])
            ->assertRedirect(route('owner.cafes.tables'))
            ->assertSessionHas('success');

        $table = Table::query()->where('cafe_id', $this->cafe->id)->latest('id')->firstOrFail();

        $this->assertNotNull($table->bookingRule, 'Meja baru harus langsung punya booking rule default');

        return $table;
    }

    /**
     * Data yang benar-benar dikirim UI diambil dari props wizard, bukan dari DB.
     *
     * @return array<string, mixed>
     */
    private function wizardTableProps(): array
    {
        $props = [];

        $this->actingAs($this->customer)
            ->get(route('cafes.book', $this->cafe))
            ->assertOk()
            ->assertInertia(function (Assert $page) use (&$props): void {
                $page->component('cafes/book')->has('tables', 1);

                $props = $page->toArray()['props'];
            });

        return $props['tables'][0];
    }

    /**
     * @param  array<string, mixed>  $table
     * @return array<string, mixed>
     */
    private function bookingPayload(array $table, string $date): array
    {
        return [
            'table_id' => $table['id'],
            'booking_rule_id' => $table['ruleId'],
            'booking_date' => $date,
            'start_time' => '10:00',
            'duration_minutes' => $table['duration'],
            'guest_count' => 4,
        ];
    }

    public function test_booking_feature_is_usable_end_to_end_through_ui_routes(): void
    {
        $createdTable = $this->createTableViaOwner();
        $date = today()->addWeek()->format('Y-m-d');

        // 1. Meja buatan owner tampil di wizard lengkap dengan data yang dipakai UI.
        $table = $this->wizardTableProps();

        $this->assertSame($createdTable->id, $table['id']);
        $this->assertSame('Meja Siap Pakai', $table['name']);
        $this->assertEquals(50000.0, (float) $table['price']);
        $this->assertSame(120, $table['duration']);

        // 2. Customer booking lewat route wizard memakai props di atas.
        $this->actingAs($this->customer)
            ->post(route('cafes.book.store', $this->cafe), $this->bookingPayload($table, $date))
            ->assertRedirect(route('cafes.book', $this->cafe))
            ->assertSessionHas('booking_success', true)
            ->assertSessionHas('booking_reference');

        $booking = Booking::query()->sole();

        $this->assertSame($this->customer->id, $booking->customer_id);
        $this->assertSame($createdTable->id, $booking->table_id);
        $this->assertSame($date, $booking->booking_date->toDateString());
        $this->assertSame('10:00', $booking->start_time->format('H:i'));
        $this->assertSame(4, $booking->guest_count);
        $this->assertEquals(50000.0, (float) $booking->total_price);
        $this->assertSame('pending', $booking->status);
        $this->assertSame('unpaid', $booking->payment_status);

        $payment = Payment::query()->sole();

        $this->assertSame($booking->id, (int) $payment->payable_id);
        $this->assertEquals(50000.0, (float) $payment->amount);
        $this->assertSame('pending', $payment->status);

        // 3. Customer membayar lewat halaman simulasi (route web yang dipakai UI).
        $this->actingAs($this->customer)
            ->get(route('payments.simulate', $payment->midtrans_order_id))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('payments/simulate')
                ->where('payment.order_id', $payment->midtrans_order_id)
                ->where('payment.amount', 50000));

        $this->actingAs($this->customer)
            ->post(route('payments.simulate.pay', $payment->midtrans_order_id), ['method' => 'qris'])
            ->assertRedirect(route('customer.bookings.detail', $booking->id))
            ->assertSessionHas('success');

        $booking->refresh();
        $payment->refresh();

        $this->assertSame('confirmed', $booking->status);
        $this->assertSame('paid', $booking->payment_status);
        $this->assertSame('success', $payment->status);
        $this->assertSame('qris', $payment->payment_method);
        $this->assertNotNull($payment->paid_at);

        // 4. Booking yang sudah dibayar terlihat di dashboard customer.
        $this->actingAs($this->customer)
            ->get(route('customer.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('customer/dashboard')
                ->where('upcoming_booking.id', $booking->id)
                ->where('upcoming_booking.status', 'confirmed'));
    }

    public function test_same_slot_cannot_be_booked_twice_through_ui_routes(): void
    {
        $this->createTableViaOwner();
        $date = today()->addWeek()->format('Y-m-d');
        $payload = $this->bookingPayload($this->wizardTableProps(), $date);

        $this->actingAs($this->customer)
            ->post(route('cafes.book.store', $this->cafe), $payload)
            ->assertSessionHas('booking_success');

        $booking = Booking::query()->sole();
        $payment = Payment::query()->sole();

        $this->actingAs($this->customer)
            ->post(route('payments.simulate.pay', $payment->midtrans_order_id), ['method' => 'qris'])
            ->assertRedirect(route('customer.bookings.detail', $booking->id));

        $this->assertSame('confirmed', $booking->fresh()->status);

        // Customer lain tidak bisa mengambil slot yang sudah terisi.
        $this->actingAs(User::factory()->create(['role' => 'customer']))
            ->post(route('cafes.book.store', $this->cafe), $payload)
            ->assertSessionHas('error', 'Slot waktu yang dipilih tidak tersedia');

        $this->assertDatabaseCount('bookings', 1);
        $this->assertSame('confirmed', $booking->fresh()->status);
    }
}
