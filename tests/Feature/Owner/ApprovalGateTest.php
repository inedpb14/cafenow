<?php

declare(strict_types=1);

namespace Tests\Feature\Owner;

use App\Models\Cafe;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ApprovalGateTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->owner = User::factory()->create(['role' => 'owner']);
    }

    private function createCafe(string $status): Cafe
    {
        return Cafe::factory()->create(['owner_id' => $this->owner->id, 'approval_status' => $status]);
    }

    public function test_owner_with_pending_cafe_is_blocked_from_dashboard(): void
    {
        $this->createCafe('pending');

        $this->actingAs($this->owner)
            ->get(route('owner.dashboard'))
            ->assertRedirect(route('owner.cafes.index'));
    }

    public function test_owner_with_pending_cafe_can_still_access_cafe_profile(): void
    {
        $this->createCafe('pending');

        $this->actingAs($this->owner)
            ->get(route('owner.cafes.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('owner/cafes/index'));
    }

    public function test_owner_with_active_cafe_passes_the_gate(): void
    {
        $this->createCafe('active');

        $this->actingAs($this->owner)
            ->get(route('owner.dashboard'))
            ->assertOk();
    }

    public function test_gate_opens_with_one_active_cafe_among_pending_ones(): void
    {
        $this->createCafe('pending');
        $this->createCafe('pending');
        $this->createCafe('active');

        $this->actingAs($this->owner)
            ->get(route('owner.dashboard'))
            ->assertOk();
    }

    public function test_owner_with_only_suspended_cafe_is_blocked(): void
    {
        $this->createCafe('suspended');

        $this->actingAs($this->owner)
            ->get(route('owner.dashboard'))
            ->assertRedirect(route('owner.cafes.index'));
    }

    public function test_non_owner_is_rejected(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer)
            ->get(route('owner.dashboard'))
            ->assertForbidden();
    }
}
