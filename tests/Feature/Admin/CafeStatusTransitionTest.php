<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Cafe;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CafeStatusTransitionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Cafe $cafe;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->cafe = Cafe::factory()->create(['approval_status' => 'pending']);
    }

    public function test_suspend_active_cafe_succeeds(): void
    {
        $this->cafe->update(['approval_status' => 'active']);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafes/{$this->cafe->id}/suspend", ['reason' => 'Alasan tes'])
            ->assertOk();

        $this->assertEquals('suspended', $this->cafe->fresh()->approval_status);
    }

    public function test_suspend_pending_cafe_fails(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafes/{$this->cafe->id}/suspend", ['reason' => 'Alasan tes'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'INVALID_STATUS_TRANSITION')
            ->assertJsonPath('error.message', 'Transisi status tidak valid: pending -> suspended');

        $this->assertEquals('pending', $this->cafe->fresh()->approval_status);
    }

    public function test_unsuspend_suspended_cafe_succeeds(): void
    {
        $this->cafe->update(['approval_status' => 'suspended']);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafes/{$this->cafe->id}/unsuspend")
            ->assertOk();

        $this->assertEquals('active', $this->cafe->fresh()->approval_status);
    }

    public function test_unsuspend_pending_cafe_fails(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafes/{$this->cafe->id}/unsuspend")
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'INVALID_STATUS_TRANSITION');

        $this->assertEquals('pending', $this->cafe->fresh()->approval_status);
    }

    public function test_approve_pending_cafe_succeeds(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafe-approvals/{$this->cafe->id}/approve")
            ->assertOk();

        $this->assertEquals('active', $this->cafe->fresh()->approval_status);
    }

    public function test_reapprove_active_cafe_fails(): void
    {
        $this->cafe->update(['approval_status' => 'active']);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafe-approvals/{$this->cafe->id}/approve")
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'INVALID_STATUS_TRANSITION');

        $this->assertEquals('active', $this->cafe->fresh()->approval_status);
    }

    public function test_reject_pending_cafe_succeeds(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafe-approvals/{$this->cafe->id}/reject", ['reason' => 'Data tidak lengkap'])
            ->assertOk();

        $cafe = $this->cafe->fresh();
        $this->assertEquals('rejected', $cafe->approval_status);
        $this->assertEquals('Data tidak lengkap', $cafe->rejection_reason);
    }

    public function test_reject_suspended_cafe_fails(): void
    {
        $this->cafe->update(['approval_status' => 'suspended']);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafe-approvals/{$this->cafe->id}/reject", ['reason' => 'Tidak valid'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'INVALID_STATUS_TRANSITION');

        $this->assertEquals('suspended', $this->cafe->fresh()->approval_status);
    }

    public function test_non_admin_cannot_suspend(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->postJson("/api/admin/cafes/{$this->cafe->id}/suspend")
            ->assertStatus(403);

        $this->assertEquals('pending', $this->cafe->fresh()->approval_status);
    }
}
