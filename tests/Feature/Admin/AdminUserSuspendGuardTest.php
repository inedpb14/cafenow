<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminUserSuspendGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_cannot_suspend_self(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_suspended' => false]);

        $this->actingAs($admin)
            ->postJson("/api/admin/users/{$admin->id}/suspend")
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'CANNOT_SELF_SUSPEND');

        $this->assertFalse($admin->fresh()->is_suspended);
        $this->assertDatabaseCount('admin_audit_logs', 0);
    }

    public function test_admin_cannot_suspend_last_active_admin(): void
    {
        $actor = User::factory()->create(['role' => 'admin', 'is_suspended' => true]);
        $lastActive = User::factory()->create(['role' => 'admin', 'is_suspended' => false]);

        $this->actingAs($actor)
            ->postJson("/api/admin/users/{$lastActive->id}/suspend")
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'LAST_ADMIN');

        $this->assertFalse($lastActive->fresh()->is_suspended);
        $this->assertDatabaseCount('admin_audit_logs', 0);
    }

    public function test_admin_can_suspend_another_admin_when_another_active_remains(): void
    {
        $actor = User::factory()->create(['role' => 'admin', 'is_suspended' => false]);
        $target = User::factory()->create(['role' => 'admin', 'is_suspended' => false]);

        $this->actingAs($actor)
            ->postJson("/api/admin/users/{$target->id}/suspend")
            ->assertOk();

        $this->assertTrue($target->fresh()->is_suspended);
        $this->assertDatabaseCount('admin_audit_logs', 1);
    }

    public function test_admin_can_suspend_non_admin_user(): void
    {
        $actor = User::factory()->create(['role' => 'admin', 'is_suspended' => false]);
        $target = User::factory()->create(['role' => 'owner', 'is_suspended' => false]);

        $this->actingAs($actor)
            ->postJson("/api/admin/users/{$target->id}/suspend")
            ->assertOk();

        $this->assertTrue($target->fresh()->is_suspended);
        $this->assertDatabaseCount('admin_audit_logs', 1);
    }
}
