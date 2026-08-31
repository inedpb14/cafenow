<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\AdminAuditLog;
use App\Models\Booking;
use App\Models\Cafe;
use App\Models\CommissionRule;
use App\Models\RefundRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminAuditLoggingTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    private function assertSingleAuditLog(string $action, string $entityType, int $entityId, array $before, array $after): AdminAuditLog
    {
        $this->assertEquals(1, AdminAuditLog::count());

        $log = AdminAuditLog::first();

        $this->assertEquals($this->admin->id, $log->admin_id);
        $this->assertEquals($action, $log->action);
        $this->assertEquals($entityType, $log->entity_type);
        $this->assertEquals($entityId, $log->entity_id);
        $this->assertEquals($before, $log->before_value);
        $this->assertEquals($after, $log->after_value);
        $this->assertNotNull($log->created_at);

        return $log;
    }

    public function test_process_refund_logs_audit(): void
    {
        $booking = Booking::factory()->create();
        $refund = RefundRequest::create([
            'booking_id' => $booking->id,
            'customer_id' => $booking->customer_id,
            'amount' => 50000,
            'status' => 'pending',
            'initiated_by' => $booking->customer_id,
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/refunds/{$refund->id}/process", ['admin_notes' => 'OK'])
            ->assertOk();

        $this->assertSingleAuditLog(
            'process_refund',
            'refund_request',
            $refund->id,
            ['status' => 'pending'],
            ['status' => 'completed', 'admin_notes' => 'OK'],
        );
    }

    public function test_reject_refund_logs_audit(): void
    {
        $booking = Booking::factory()->create();
        $refund = RefundRequest::create([
            'booking_id' => $booking->id,
            'customer_id' => $booking->customer_id,
            'amount' => 50000,
            'status' => 'pending',
            'initiated_by' => $booking->customer_id,
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/refunds/{$refund->id}/reject", ['reason' => 'Ditolak'])
            ->assertOk();

        $this->assertSingleAuditLog(
            'reject_refund',
            'refund_request',
            $refund->id,
            ['status' => 'pending'],
            ['status' => 'rejected', 'admin_notes' => 'Ditolak'],
        );
    }

    public function test_suspend_cafe_logs_audit(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'active']);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafes/{$cafe->id}/suspend", ['reason' => 'Pelanggaran aturan'])
            ->assertOk();

        $this->assertSingleAuditLog(
            'suspend_cafe',
            'cafe',
            $cafe->id,
            ['approval_status' => 'active'],
            ['approval_status' => 'suspended', 'reason' => 'Pelanggaran aturan'],
        );
    }

    public function test_unsuspend_cafe_logs_audit(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'suspended']);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafes/{$cafe->id}/unsuspend")
            ->assertOk();

        $this->assertSingleAuditLog(
            'unsuspend_cafe',
            'cafe',
            $cafe->id,
            ['approval_status' => 'suspended'],
            ['approval_status' => 'active'],
        );
    }

    public function test_update_user_logs_audit(): void
    {
        $target = User::factory()->create(['name' => 'Budi', 'email' => 'budi@example.com']);

        $this->actingAs($this->admin)
            ->patchJson("/api/admin/users/{$target->id}", ['name' => 'Budi Baru'])
            ->assertOk();

        $this->assertSingleAuditLog(
            'update_user',
            'user',
            $target->id,
            ['name' => 'Budi', 'email' => 'budi@example.com'],
            ['name' => 'Budi Baru', 'email' => 'budi@example.com'],
        );
    }

    public function test_suspend_user_logs_audit(): void
    {
        $target = User::factory()->create(['role' => 'owner', 'is_suspended' => false]);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/users/{$target->id}/suspend")
            ->assertOk();

        $this->assertSingleAuditLog(
            'suspend_user',
            'user',
            $target->id,
            ['is_suspended' => false],
            ['is_suspended' => true],
        );
    }

    public function test_unsuspend_user_logs_audit(): void
    {
        $target = User::factory()->create(['role' => 'owner', 'is_suspended' => true]);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/users/{$target->id}/unsuspend")
            ->assertOk();

        $this->assertSingleAuditLog(
            'unsuspend_user',
            'user',
            $target->id,
            ['is_suspended' => true],
            ['is_suspended' => false],
        );
    }

    public function test_update_commission_rate_logs_audit(): void
    {
        $rule = CommissionRule::create([
            'commission_type' => 'per_transaction',
            'percentage' => 10,
            'active_from' => today()->format('Y-m-d'),
            'set_by_admin_id' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
            ->patchJson('/api/admin/commissions/rates/per_transaction', ['percentage' => 12.5])
            ->assertOk();

        $this->assertSingleAuditLog(
            'update_commission',
            'commission_rule',
            $rule->id,
            ['percentage' => 10],
            ['percentage' => 12.5],
        );
    }
}
