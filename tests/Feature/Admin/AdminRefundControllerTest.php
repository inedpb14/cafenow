<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Booking;
use App\Models\RefundRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminRefundControllerTest extends TestCase
{
    use RefreshDatabase;

    private function makeRefund(): array
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'customer', 'name' => 'Budi Refund']);
        $booking = Booking::factory()->create([
            'customer_id' => $customer->id,
            'payment_status' => 'paid',
        ]);

        $refund = RefundRequest::create([
            'booking_id' => $booking->id,
            'customer_id' => $customer->id,
            'amount' => $booking->total_price,
            'bank_name' => 'BCA',
            'account_number' => '123456',
            'account_holder_name' => 'Budi',
            'status' => 'pending',
            'initiated_by' => 'customer',
            'reason' => 'Batal',
        ]);

        return [$admin, $refund];
    }

    public function test_index_returns_refunds_with_resolved_customer(): void
    {
        [$admin, $refund] = $this->makeRefund();

        $this->actingAs($admin)
            ->getJson('/api/admin/refunds')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.customer.name', 'Budi Refund');
    }

    public function test_show_returns_refund_with_resolved_customer(): void
    {
        [$admin, $refund] = $this->makeRefund();

        $this->actingAs($admin)
            ->getJson("/api/admin/refunds/{$refund->id}")
            ->assertOk()
            ->assertJsonPath('data.customer.name', 'Budi Refund')
            ->assertJsonPath('data.booking_id', $refund->booking_id);
    }
}
