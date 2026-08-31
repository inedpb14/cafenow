<?php

declare(strict_types=1);

namespace Tests\Feature\Payment;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PaymentWebhookTest extends TestCase
{
    use RefreshDatabase;

    private const SERVER_KEY = 'SB-Mid-server-testkey';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.midtrans.server_key' => self::SERVER_KEY,
            'services.midtrans.merchant_id' => 'M-test',
            'services.midtrans.client_key' => 'SB-Mid-client-test',
        ]);
    }

    private function makeSignature(string $orderId, string $statusCode, string $grossAmount): string
    {
        return hash('sha512', $orderId.$statusCode.$grossAmount.self::SERVER_KEY);
    }

    private function pendingPayment(): array
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $booking = Booking::factory()->create([
            'customer_id' => $customer->id,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'total_price' => 50000,
        ]);
        $payment = Payment::create([
            'payable_type' => 'booking',
            'payable_id' => $booking->id,
            'amount' => $booking->total_price,
            'status' => 'pending',
            'midtrans_order_id' => 'ORDER-WEBHOOK-1',
        ]);

        return [$customer, $booking, $payment];
    }

    public function test_settlement_marks_payment_success_and_confirms_booking(): void
    {
        [, $booking, $payment] = $this->pendingPayment();

        $response = $this->postJson('/api/payments/webhook', [
            'order_id' => 'ORDER-WEBHOOK-1',
            'status_code' => '200',
            'gross_amount' => '50000.00',
            'transaction_status' => 'settlement',
            'transaction_id' => 'midtrans-tx-9',
            'payment_type' => 'qris',
            'signature_key' => $this->makeSignature('ORDER-WEBHOOK-1', '200', '50000.00'),
        ]);

        $response->assertOk()->assertJsonPath('success', true);

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => 'success',
        ]);
        $this->assertNotNull($payment->fresh()->paid_at);
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => 'confirmed',
            'payment_status' => 'paid',
        ]);
    }

    public function test_invalid_signature_rejected(): void
    {
        [$customer, $booking] = $this->pendingPayment();

        $response = $this->postJson('/api/payments/webhook', [
            'order_id' => 'ORDER-WEBHOOK-1',
            'status_code' => '200',
            'gross_amount' => '50000.00',
            'transaction_status' => 'settlement',
            'signature_key' => 'wrong-signature',
        ]);

        $response->assertStatus(401)->assertJsonPath('error.code', 'INVALID_SIGNATURE');
        $this->assertDatabaseHas('payments', ['payable_id' => $booking->id, 'status' => 'pending']);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'pending']);
    }

    public function test_expire_marks_payment_failed(): void
    {
        [, $booking, $payment] = $this->pendingPayment();

        $response = $this->postJson('/api/payments/webhook', [
            'order_id' => 'ORDER-WEBHOOK-1',
            'status_code' => '202',
            'gross_amount' => '50000.00',
            'transaction_status' => 'expire',
            'signature_key' => $this->makeSignature('ORDER-WEBHOOK-1', '202', '50000.00'),
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => 'failed',
        ]);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'pending']);
    }

    public function test_refund_marks_payment_refunded(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $booking = Booking::factory()->create([
            'customer_id' => $customer->id,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'total_price' => 50000,
        ]);
        $payment = Payment::create([
            'payable_type' => 'booking',
            'payable_id' => $booking->id,
            'amount' => 50000,
            'status' => 'success',
            'midtrans_order_id' => 'ORDER-WEBHOOK-2',
        ]);

        $response = $this->postJson('/api/payments/webhook', [
            'order_id' => 'ORDER-WEBHOOK-2',
            'status_code' => '200',
            'gross_amount' => '50000.00',
            'transaction_status' => 'refund',
            'signature_key' => $this->makeSignature('ORDER-WEBHOOK-2', '200', '50000.00'),
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => 'refunded',
        ]);
    }
}
