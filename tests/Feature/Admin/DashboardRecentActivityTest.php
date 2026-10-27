<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\AdminAuditLog;
use App\Models\Booking;
use App\Models\Cafe;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class DashboardRecentActivityTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_recent_activity_returns_audit_logs_in_time_order_with_expected_shape(): void
    {
        $cafe = Cafe::factory()->create(['name' => 'Kopi Senja']);
        $booking = Booking::factory()->create();

        AdminAuditLog::create([
            'admin_id' => $this->admin->id,
            'action' => 'approve_cafe',
            'entity_type' => 'cafe',
            'entity_id' => $cafe->id,
            'before_value' => ['approval_status' => 'pending'],
            'after_value' => ['approval_status' => 'active'],
            'ip_address' => '127.0.0.1',
            'created_at' => now()->subMinutes(5),
        ]);

        AdminAuditLog::create([
            'admin_id' => $this->admin->id,
            'action' => 'cancel_booking',
            'entity_type' => 'booking',
            'entity_id' => $booking->id,
            'before_value' => ['status' => 'confirmed'],
            'after_value' => ['status' => 'cancelled'],
            'ip_address' => '127.0.0.1',
            'created_at' => now()->subMinutes(2),
        ]);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/dashboard/recent-activity')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.type', 'cancel_booking')
            ->assertJsonPath('data.1.type', 'approve_cafe')
            ->assertJsonPath('data.1.message', 'Cafe disetujui — Kopi Senja')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'type', 'message', 'time'],
                ],
            ]);
    }

    public function test_recent_activity_is_limited_to_ten_entries(): void
    {
        for ($i = 0; $i < 12; $i++) {
            AdminAuditLog::create([
                'admin_id' => $this->admin->id,
                'action' => 'update_commission',
                'entity_type' => 'commission_rule',
                'entity_id' => $i + 1,
                'before_value' => [],
                'after_value' => [],
                'ip_address' => '127.0.0.1',
                'created_at' => now()->subMinutes($i),
            ]);
        }

        $this->actingAs($this->admin)
            ->getJson('/api/admin/dashboard/recent-activity')
            ->assertOk()
            ->assertJsonCount(10, 'data');
    }
}
