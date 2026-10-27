<?php

declare(strict_types=1);

namespace Tests\Feature\Cafe;

use App\Models\Cafe;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CafeListingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cafe::factory()->count(3)->create(['approval_status' => 'active']);
    }

    public function test_lists_active_cafes(): void
    {
        $response = $this->getJson('/api/cafes');

        $response->assertOk();
        $response->assertJsonCount(3, 'data');
    }

    public function test_search_by_query(): void
    {
        Cafe::factory()->create(['name' => 'Kopi Nusantara', 'approval_status' => 'active']);

        $response = $this->getJson('/api/cafes?query=Kopi');

        $response->assertOk();
        $this->assertGreaterThanOrEqual(1, $response->json('meta.total'));
    }

    public function test_search_by_city(): void
    {
        Cafe::factory()->create(['city' => 'Bandung', 'approval_status' => 'active']);

        $response = $this->getJson('/api/cafes?city=Bandung');

        $response->assertOk();
        $this->assertGreaterThanOrEqual(1, $response->json('meta.total'));
    }
}
