<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Cafe;
use App\Models\FeaturedCafe;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminFeaturedCafeControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    private function feature(Cafe $cafe, int $order = 1): FeaturedCafe
    {
        return FeaturedCafe::create([
            'cafe_id' => $cafe->id,
            'display_order' => $order,
            'active_from' => now()->subDay(),
            'active_to' => now()->addMonth(),
            'created_by' => $this->admin->id,
        ]);
    }

    public function test_index_returns_featured_cafes_with_cafe(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'active']);
        $this->feature($cafe, 2);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/featured-cafes')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.cafe.name', $cafe->name)
            ->assertJsonPath('data.0.display_order', 2);
    }

    public function test_store_adds_featured_cafe_and_logs_audit(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'active']);

        $this->actingAs($this->admin)
            ->postJson('/api/admin/featured-cafes', [
                'cafe_id' => $cafe->id,
                'display_order' => 1,
                'active_from' => today()->format('Y-m-d'),
                'active_to' => today()->addMonth()->format('Y-m-d'),
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.cafe_id', $cafe->id);

        $this->assertDatabaseHas('featured_cafes', ['cafe_id' => $cafe->id]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'action' => 'add_featured_cafe',
            'entity_type' => 'featured_cafe',
        ]);
    }

    public function test_store_rejects_duplicate_cafe(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'active']);
        $this->feature($cafe);

        $this->actingAs($this->admin)
            ->postJson('/api/admin/featured-cafes', [
                'cafe_id' => $cafe->id,
                'display_order' => 1,
                'active_from' => today()->format('Y-m-d'),
            ])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'CONFLICT');
    }

    public function test_store_rejects_non_active_cafe(): void
    {
        foreach (['pending', 'rejected', 'suspended'] as $status) {
            $cafe = Cafe::factory()->create(['approval_status' => $status]);

            $this->actingAs($this->admin)
                ->postJson('/api/admin/featured-cafes', [
                    'cafe_id' => $cafe->id,
                    'display_order' => 1,
                    'active_from' => today()->format('Y-m-d'),
                ])
                ->assertStatus(422)
                ->assertJsonPath('error.code', 'CAFE_NOT_ACTIVE');

            $this->assertDatabaseMissing('featured_cafes', ['cafe_id' => $cafe->id]);
        }
    }

    public function test_store_rejects_invalid_date_range(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'active']);

        $this->actingAs($this->admin)
            ->postJson('/api/admin/featured-cafes', [
                'cafe_id' => $cafe->id,
                'display_order' => 1,
                'active_from' => today()->addMonth()->format('Y-m-d'),
                'active_to' => today()->format('Y-m-d'),
            ])
            ->assertStatus(422);
    }

    public function test_update_changes_display_order_and_logs_audit(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'active']);
        $featured = $this->feature($cafe, 1);

        $this->actingAs($this->admin)
            ->putJson("/api/admin/featured-cafes/{$featured->id}", [
                'display_order' => 5,
                'active_to' => null,
            ])
            ->assertOk()
            ->assertJsonPath('data.display_order', 5);

        $this->assertSame(5, $featured->fresh()->display_order);
        $this->assertNull($featured->fresh()->active_to);
        $this->assertDatabaseHas('admin_audit_logs', [
            'action' => 'update_featured_cafe',
            'entity_id' => $featured->id,
        ]);
    }

    public function test_destroy_removes_and_logs_audit(): void
    {
        $cafe = Cafe::factory()->create(['approval_status' => 'active']);
        $featured = $this->feature($cafe);

        $this->actingAs($this->admin)
            ->deleteJson("/api/admin/featured-cafes/{$featured->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('featured_cafes', ['id' => $featured->id]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'action' => 'remove_featured_cafe',
            'entity_id' => $featured->id,
        ]);
    }

    public function test_options_returns_only_active_non_featured_cafes(): void
    {
        $active = Cafe::factory()->create(['approval_status' => 'active', 'name' => 'Kopi Aktif']);
        $legacy = Cafe::factory()->create(['approval_status' => 'approved', 'name' => 'Kopi Legacy']);
        Cafe::factory()->create(['approval_status' => 'pending', 'name' => 'Kopi Pending']);
        Cafe::factory()->create(['approval_status' => 'suspended', 'name' => 'Kopi Suspended']);
        $featuredCafe = Cafe::factory()->create(['approval_status' => 'active', 'name' => 'Kopi Featured']);
        $this->feature($featuredCafe);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/featured-cafes/options')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Kopi Aktif')
            ->assertJsonPath('data.1.name', 'Kopi Legacy');
    }

    public function test_non_admin_cannot_access_featured_cafes(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->getJson('/api/admin/featured-cafes')
            ->assertStatus(403);

        $this->actingAs($owner)
            ->postJson('/api/admin/featured-cafes', ['cafe_id' => 1])
            ->assertStatus(403);
    }

    public function test_featured_page_renders(): void
    {
        $this->actingAs($this->admin)
            ->get('/admin/featured-cafes')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('admin/Cafe/Featured'));
    }
}
