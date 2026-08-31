<?php

declare(strict_types=1);

namespace Tests\Feature\Cafe;

use App\Models\Cafe;
use App\Models\MenuItem;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class OwnerCafeContentGuardTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Cafe $cafe;

    protected function setUp(): void
    {
        parent::setUp();
        $this->owner = User::factory()->create(['role' => 'owner']);
        $this->cafe = Cafe::factory()->create(['owner_id' => $this->owner->id, 'approval_status' => 'pending']);
    }

    public function test_owner_cannot_add_table_to_pending_cafe(): void
    {
        $this->actingAs($this->owner)
            ->postJson('/api/owner/tables', [
                'cafe_id' => $this->cafe->id,
                'name' => 'Meja 1',
                'capacity' => 4,
                'table_type' => 'regular',
            ])
            ->assertStatus(403);

        $this->assertEquals(0, Table::count());
    }

    public function test_owner_cannot_add_table_to_suspended_cafe(): void
    {
        $this->cafe->update(['approval_status' => 'suspended']);

        $this->actingAs($this->owner)
            ->postJson('/api/owner/tables', [
                'cafe_id' => $this->cafe->id,
                'name' => 'Meja 1',
                'capacity' => 4,
                'table_type' => 'regular',
            ])
            ->assertStatus(403);

        $this->assertEquals(0, Table::count());
    }

    public function test_owner_can_add_table_to_active_cafe(): void
    {
        $this->cafe->update(['approval_status' => 'active']);

        $this->actingAs($this->owner)
            ->postJson('/api/owner/tables', [
                'cafe_id' => $this->cafe->id,
                'name' => 'Meja 1',
                'capacity' => 4,
                'table_type' => 'regular',
            ])
            ->assertCreated();

        $this->assertEquals(1, Table::count());
    }

    public function test_owner_can_add_table_to_rejected_cafe(): void
    {
        $this->cafe->update(['approval_status' => 'rejected']);

        $this->actingAs($this->owner)
            ->postJson('/api/owner/tables', [
                'cafe_id' => $this->cafe->id,
                'name' => 'Meja 1',
                'capacity' => 4,
                'table_type' => 'regular',
            ])
            ->assertCreated();

        $this->assertEquals(1, Table::count());
    }

    public function test_owner_cannot_add_menu_to_pending_cafe(): void
    {
        $this->actingAs($this->owner)
            ->postJson('/api/owner/menus', [
                'cafe_id' => $this->cafe->id,
                'name' => 'Kopi Susu',
                'price' => 20000,
                'category' => 'minuman',
            ])
            ->assertStatus(403);

        $this->assertEquals(0, MenuItem::count());
    }

    public function test_owner_can_add_menu_to_active_cafe(): void
    {
        $this->cafe->update(['approval_status' => 'active']);

        $this->actingAs($this->owner)
            ->postJson('/api/owner/menus', [
                'cafe_id' => $this->cafe->id,
                'name' => 'Kopi Susu',
                'price' => 20000,
                'category' => 'minuman',
            ])
            ->assertCreated();

        $this->assertEquals(1, MenuItem::count());
    }

    public function test_owner_can_add_menu_to_rejected_cafe(): void
    {
        $this->cafe->update(['approval_status' => 'rejected']);

        $this->actingAs($this->owner)
            ->postJson('/api/owner/menus', [
                'cafe_id' => $this->cafe->id,
                'name' => 'Kopi Susu',
                'price' => 20000,
                'category' => 'minuman',
            ])
            ->assertCreated();

        $this->assertEquals(1, MenuItem::count());
    }

    public function test_owner_can_update_menu_when_cafe_rejected(): void
    {
        $this->cafe->update(['approval_status' => 'rejected']);
        $menu = MenuItem::factory()->create([
            'cafe_id' => $this->cafe->id,
            'name' => 'Kopi Susu',
            'price' => 20000,
            'category' => 'minuman',
        ]);

        $this->actingAs($this->owner)
            ->putJson("/api/owner/menus/{$menu->id}", [
                'cafe_id' => $this->cafe->id,
                'name' => 'Kopi Susu Gula Aren',
                'price' => 25000,
                'category' => 'minuman',
            ])
            ->assertOk();

        $this->assertEquals('Kopi Susu Gula Aren', $menu->fresh()->name);
    }

    public function test_owner_cannot_edit_cafe_while_pending(): void
    {
        $this->actingAs($this->owner)
            ->put("/owner/cafes/{$this->cafe->id}", [
                'name' => 'Nama Baru',
                'address' => 'Jl. Baru No. 1',
                'city' => 'Jakarta',
            ])
            ->assertRedirect();

        $this->assertNotEquals('Nama Baru', $this->cafe->fresh()->name);
    }

    public function test_owner_cannot_edit_cafe_while_suspended(): void
    {
        $this->cafe->update(['approval_status' => 'suspended']);

        $this->actingAs($this->owner)
            ->put("/owner/cafes/{$this->cafe->id}", [
                'name' => 'Nama Baru',
                'address' => 'Jl. Baru No. 1',
                'city' => 'Jakarta',
            ])
            ->assertRedirect();
    }

    public function test_owner_can_edit_cafe_while_rejected(): void
    {
        $this->cafe->update(['approval_status' => 'rejected']);

        $this->actingAs($this->owner)
            ->put("/owner/cafes/{$this->cafe->id}", [
                'name' => 'Nama Perbaikan',
                'address' => 'Jl. Baru No. 1',
                'phone' => '081234567890',
            ])
            ->assertRedirect();

        $this->assertEquals('Nama Perbaikan', $this->cafe->fresh()->name);
    }

    public function test_owner_cannot_edit_other_owners_cafe(): void
    {
        $this->cafe->update(['approval_status' => 'active']);
        $other = User::factory()->create(['role' => 'owner']);

        $this->actingAs($other)
            ->put("/owner/cafes/{$this->cafe->id}", [
                'name' => 'Nama Curian',
                'address' => 'Jl. Hacker No. 1',
                'city' => 'Jakarta',
            ])
            ->assertStatus(403);
    }

    public function test_owner_can_save_operational_hours(): void
    {
        $this->cafe->update(['approval_status' => 'active']);

        $this->actingAs($this->owner)
            ->post("/owner/cafes/{$this->cafe->id}/hours", [
                'hours' => ['mon' => [['open' => '08:00', 'close' => '22:00']]],
            ])
            ->assertRedirect();

        $this->assertEquals(
            ['mon' => [['open' => '08:00', 'close' => '22:00']]],
            $this->cafe->fresh()->operational_hours,
        );
    }

    public function test_owner_cannot_save_invalid_operational_hours(): void
    {
        $this->cafe->update(['approval_status' => 'active']);
        $before = $this->cafe->fresh()->operational_hours;

        $this->actingAs($this->owner)
            ->post("/owner/cafes/{$this->cafe->id}/hours", [
                'hours' => ['mon' => [['open' => '22:00', 'close' => '08:00']]],
            ])
            ->assertSessionHasErrors('hours.mon.0.close');

        $this->assertEquals($before, $this->cafe->fresh()->operational_hours);
    }

    public function test_owner_cannot_set_hours_while_pending(): void
    {
        $before = $this->cafe->fresh()->operational_hours;

        $this->actingAs($this->owner)
            ->post("/owner/cafes/{$this->cafe->id}/hours", [
                'hours' => ['mon' => [['open' => '08:00', 'close' => '22:00']]],
            ])
            ->assertRedirect();

        $this->assertEquals($before, $this->cafe->fresh()->operational_hours);
    }
}
