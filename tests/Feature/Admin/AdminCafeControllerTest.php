<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Cafe;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminCafeControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_index_returns_cafes_with_owner(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'active']);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/cafes')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.owner.name', $cafe->owner->name);
    }

    public function test_keyword_search_does_not_break_status_filter(): void
    {
        Cafe::factory()->create(['approval_status' => 'rejected', 'name' => 'Kopi Senja']);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/cafes?keyword=Kopi&status=active')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_keyword_search_matches_owner_name(): void
    {
        $owner = User::factory()->create(['role' => 'owner', 'name' => 'Budi Santoso']);
        Cafe::factory()->create(['approval_status' => 'active', 'name' => 'Warung Kopi', 'owner_id' => $owner->id]);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/cafes?keyword=Budi')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Warung Kopi');
    }

    public function test_status_approved_includes_legacy_approved_and_active(): void
    {
        Cafe::factory()->create(['approval_status' => 'active']);
        Cafe::factory()->create(['approval_status' => 'approved']);
        Cafe::factory()->create(['approval_status' => 'suspended']);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/cafes?status=approved')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_per_page_is_capped_at_100(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/admin/cafes?per_page=999')
            ->assertOk()
            ->assertJsonPath('pagination.per_page', 100);
    }

    public function test_sort_by_name_desc(): void
    {
        Cafe::factory()->create(['name' => 'Aaaa Cafe']);
        Cafe::factory()->create(['name' => 'Zzzz Cafe']);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/cafes?sort_by=name&sort_order=desc')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Zzzz Cafe')
            ->assertJsonPath('data.1.name', 'Aaaa Cafe');
    }

    public function test_suspend_requires_reason(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'active']);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafes/{$cafe->id}/suspend")
            ->assertStatus(422);

        $this->assertSame('active', $cafe->fresh()->approval_status);
    }

    public function test_suspend_rejects_invalid_transition(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'rejected']);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafes/{$cafe->id}/suspend", ['reason' => 'Alasan tes'])
            ->assertStatus(422);

        $this->assertSame('rejected', $cafe->fresh()->approval_status);
    }

    public function test_unsuspend_activates_suspended_cafe(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'suspended']);

        $this->actingAs($this->admin)
            ->postJson("/api/admin/cafes/{$cafe->id}/unsuspend")
            ->assertOk();

        $this->assertSame('active', $cafe->fresh()->approval_status);
    }

    public function test_non_admin_cannot_access_cafe_management(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'active']);
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->getJson('/api/admin/cafes')
            ->assertStatus(403);

        $this->actingAs($owner)
            ->postJson("/api/admin/cafes/{$cafe->id}/suspend", ['reason' => 'Alasan tes'])
            ->assertStatus(403);
    }

    public function test_management_page_renders(): void
    {
        $this->actingAs($this->admin)
            ->get('/admin/cafes')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('admin/Cafe/Management'));
    }
}
