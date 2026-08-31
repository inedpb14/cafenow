<?php

declare(strict_types=1);

namespace Tests\Feature\Owner;

use App\Models\Booking;
use App\Models\Cafe;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_analytics_renders_with_cafe_and_bookings(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $customer = User::factory()->create(['role' => 'customer']);
        $cafe = Cafe::factory()->create(['owner_id' => $owner->id, 'approval_status' => 'active']);
        $table = Table::factory()->create(['cafe_id' => $cafe->id]);
        Booking::factory()->create([
            'customer_id' => $customer->id,
            'cafe_id' => $cafe->id,
            'table_id' => $table->id,
        ]);

        $this->actingAs($owner)
            ->get(route('owner.analytics'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('owner/analytics'));
    }
}
