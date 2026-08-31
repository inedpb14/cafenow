<?php

declare(strict_types=1);

namespace Tests\Feature\Payment;

use App\Models\Booking;
use App\Models\BookingRule;
use App\Models\Cafe;
use App\Models\Payment;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PaymentResumeTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    private User $otherCustomer;

    private Cafe $cafe;

    private Table $table;

    private Booking $booking;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.midtrans.server_key' => '',
            'services.midtrans.merchant_id' => '',
            'services.midtrans.client_key' => '',
        ]);

        $owner = User::factory()->create(['role' => 'owner']);
        $this->customer = User::factory()->create(['role' => 'customer']);
        $this->otherCustomer = User::factory()->create(['role' => 'customer']);
        $this->cafe = Cafe::factory()->create([
            'owner_id' => $owner->id,
            'approval_status' => 'active',
        ]);
        $this->table = Table::factory()->create(['cafe_id' => $this->cafe->id]);
        BookingRule::factory()->create([
            'table_id' => $this->table->id,
            'rule_type' => 'fixed',
            'duration_minutes' => 120,
            'price' => 25000,
        ]);

        $this->booking = Booking::factory()->create([
            'customer_id' => $this->customer->id,
            'cafe_id' => $this->cafe->id,
            'table_id' => $this->table->id,
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ]);
    }

    public function test_resume_pending_booking_reuses_pending_payment_and_redirects_to_simulate(): void
    {
        $payment = Payment::create([
            'payable_type' => 'booking',
            'payable_id' => $this->booking->id,
            'amount' => $this->booking->total_price,
            'status' => 'pending',
            'midtrans_order_id' => 'ORDER-ABCDEF',
            'snap_redirect_url' => '/payments/ORDER-ABCDEF/simulate',
        ]);

        $this->actingAs($this->customer);

        $response = $this->post(route('payments.resume', $this->booking));

        $response->assertRedirect('/payments/ORDER-ABCDEF/simulate');
        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'pending']);
    }

    public function test_resume_creates_fresh_payment_when_none_pending_exists(): void
    {
        $this->actingAs($this->customer);

        $response = $this->post(route('payments.resume', $this->booking));

        $response->assertRedirect();
        $this->assertStringContainsString('/payments/', $response->headers->get('Location'));
        $payment = Payment::where('payable_id', $this->booking->id)->firstOrFail();
        $this->assertSame('pending', $payment->status);
    }

    public function test_resume_paid_booking_redirects_to_detail_without_new_payment(): void
    {
        Payment::create([
            'payable_type' => 'booking',
            'payable_id' => $this->booking->id,
            'amount' => $this->booking->total_price,
            'status' => 'success',
            'midtrans_order_id' => 'ORDER-PAID',
            'paid_at' => now(),
        ]);

        $this->booking->update(['status' => 'confirmed', 'payment_status' => 'paid']);

        $this->actingAs($this->customer);

        $response = $this->post(route('payments.resume', $this->booking));

        $response->assertRedirect(route('customer.bookings.detail', $this->booking->id));
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_resume_cancelled_booking_is_rejected(): void
    {
        $this->booking->update(['status' => 'cancelled']);

        $this->actingAs($this->customer);

        $response = $this->post(route('payments.resume', $this->booking));

        $response->assertRedirect(route('customer.bookings.detail', $this->booking->id));
        $response->assertSessionHas('error');
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_resume_other_customers_booking_is_forbidden(): void
    {
        $this->actingAs($this->otherCustomer);

        $this->post(route('payments.resume', $this->booking))->assertForbidden();
    }
}
