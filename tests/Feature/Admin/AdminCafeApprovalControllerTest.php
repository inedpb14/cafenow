<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\CafeApprovalStatus;
use App\Models\AdminAuditLog;
use App\Models\Cafe;
use App\Models\CafePhoto;
use App\Models\MenuItem;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminCafeApprovalControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_index_returns_all_cafes_when_no_status_filter(): void
    {
        Cafe::factory()->create(['approval_status' => 'pending']);
        Cafe::factory()->create(['approval_status' => 'active']);
        Cafe::factory()->create(['approval_status' => 'rejected']);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/cafe-approvals')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('pagination.total', 3);
    }

    public function test_index_filters_by_status(): void
    {
        Cafe::factory()->create(['approval_status' => 'pending']);
        Cafe::factory()->create(['approval_status' => 'rejected']);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/cafe-approvals?status=pending')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'pending');
    }

    public function test_index_approved_filter_includes_active_and_legacy_approved(): void
    {
        Cafe::factory()->create(['approval_status' => 'active']);
        Cafe::factory()->create(['approval_status' => 'approved']);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/cafe-approvals?status=approved')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_index_returns_enriched_shape_with_relations(): void
    {
        $owner = User::factory()->create(['name' => 'Budi Santoso']);
        $cafe = Cafe::factory()->create([
            'owner_id' => $owner->id,
            'approval_status' => 'pending',
            'city' => 'Jakarta',
            'address' => '',
            'contact_whatsapp' => '08123456789',
        ]);
        Table::factory()->create(['cafe_id' => $cafe->id]);
        MenuItem::factory()->create(['cafe_id' => $cafe->id, 'price' => 50000]);
        CafePhoto::create(['cafe_id' => $cafe->id, 'photo_path' => 'cafes/foto.jpg']);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/cafe-approvals?status=pending')
            ->assertOk()
            ->assertJsonPath('data.0.owner_name', 'Budi Santoso')
            ->assertJsonPath('data.0.location', 'Jakarta')
            ->assertJsonPath('data.0.phone', '08123456789')
            ->assertJsonPath('data.0.tables.0.name', Cafe::first()->tables->first()->name)
            ->assertJsonCount(1, 'data.0.menu_items')
            ->assertJsonStructure(['data' => [['id', 'name', 'status', 'created_at', 'submission_count', 'primary_photo', 'operational_hours']]]);
    }

    public function test_index_menu_price_is_numeric(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'pending']);
        MenuItem::factory()->create(['cafe_id' => $cafe->id, 'price' => 50000]);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/cafe-approvals?status=pending')
            ->assertOk()
            ->assertJsonPath('data.0.menu_items.0.price', 50000);
    }

    public function test_index_paginates(): void
    {
        Cafe::factory()->count(3)->create(['approval_status' => 'pending']);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/cafe-approvals?per_page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('pagination.current_page', 1)
            ->assertJsonPath('pagination.last_page', 2)
            ->assertJsonPath('pagination.total', 3);
    }

    public function test_approve_clears_rejection_reason_and_creates_audit_log_with_notes(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $cafe = Cafe::factory()->create([
            'owner_id' => $owner->id,
            'approval_status' => 'pending',
            'rejection_reason' => 'Data tidak lengkap',
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafe-approvals/{$cafe->id}/approve", ['notes' => 'Dokumen lengkap, silakan mulai operasional.'])
            ->assertOk();

        $this->assertSame('active', $cafe->fresh()->approval_status);
        $this->assertNull($cafe->fresh()->rejection_reason);

        $this->assertDatabaseHas('admin_audit_logs', [
            'action' => 'approve_cafe',
            'entity_type' => 'cafe',
            'entity_id' => $cafe->id,
        ]);
        $log = AdminAuditLog::where('entity_id', $cafe->id)->first();
        $this->assertSame('Dokumen lengkap, silakan mulai operasional.', $log->after_value['notes']);

        $this->assertDatabaseHas('notifications', [
            'recipient_id' => $owner->id,
            'notification_type' => 'cafe_approved',
        ]);
    }

    public function test_approve_rejects_notes_longer_than_1000_characters(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'pending']);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafe-approvals/{$cafe->id}/approve", ['notes' => str_repeat('a', 1001)])
            ->assertStatus(422)
            ->assertJsonValidationErrors('notes');

        $this->assertSame('pending', $cafe->fresh()->approval_status);
    }

    public function test_approve_without_notes_stores_null_in_audit_log(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'pending']);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafe-approvals/{$cafe->id}/approve")
            ->assertOk();

        $log = AdminAuditLog::where('entity_id', $cafe->id)->first();
        $this->assertArrayHasKey('notes', $log->after_value);
        $this->assertNull($log->after_value['notes']);
    }

    public function test_reject_requires_reason(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'pending']);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafe-approvals/{$cafe->id}/reject")
            ->assertStatus(422)
            ->assertJsonValidationErrors('reason');

        $this->assertSame('pending', $cafe->fresh()->approval_status);
    }

    public function test_reject_creates_notification_and_audit_log(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $cafe = Cafe::factory()->create(['owner_id' => $owner->id, 'approval_status' => 'pending']);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafe-approvals/{$cafe->id}/reject", ['reason' => 'Foto tidak jelas'])
            ->assertOk();

        $cafe->refresh();
        $this->assertSame('rejected', $cafe->approval_status);
        $this->assertSame('Foto tidak jelas', $cafe->rejection_reason);

        $log = AdminAuditLog::where('entity_id', $cafe->id)->first();
        $this->assertSame('reject_cafe', $log->action);
        $this->assertSame('Foto tidak jelas', $log->after_value['rejection_reason']);

        $this->assertDatabaseHas('notifications', [
            'recipient_id' => $owner->id,
            'notification_type' => 'cafe_rejected',
        ]);
    }

    public function test_approve_works_after_reject_resubmit_flow(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'rejected', 'submission_count' => 2]);

        $cafe->transitionTo(CafeApprovalStatus::Pending);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafe-approvals/{$cafe->id}/approve")
            ->assertOk();

        $this->assertSame('active', $cafe->fresh()->approval_status);
    }

    public function test_non_admin_cannot_access_approvals(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'pending']);
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->getJson('/api/admin/cafe-approvals')
            ->assertStatus(403);

        $this->actingAs($owner)
            ->postJson("/api/admin/cafe-approvals/{$cafe->id}/approve")
            ->assertStatus(403);

        $this->assertSame('pending', $cafe->fresh()->approval_status);
    }

    public function test_detail_page_renders_cafe_props(): void
    {
        $cafe = Cafe::factory()->create([
            'approval_status' => 'pending',
            'name' => 'Kopi Senja',
        ]);

        $this->actingAs($this->admin)
            ->get("/admin/cafe-approvals/{$cafe->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/Cafe/ApprovalDetail')
                ->has('cafe', fn ($pageCafe) => $pageCafe
                    ->where('id', $cafe->id)
                    ->where('name', 'Kopi Senja')
                    ->where('status', 'pending')
                    ->etc()
                )
            );
    }
}
