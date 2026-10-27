<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminAnalyticsConsolidationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_platform_endpoint_returns_aggregates_from_surviving_controller(): void
    {
        Booking::factory()->create([
            'status' => 'completed',
            'total_price' => 1000000,
            'commission' => 150000,
            'cafe_receives' => 850000,
        ]);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/analytics/platform')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.revenue', 850000)
            ->assertJsonStructure([
                'data' => ['users', 'cafes', 'bookings', 'revenue'],
            ]);
    }

    public function test_commission_endpoint_returns_period_grouping(): void
    {
        Booking::factory()->create([
            'status' => 'completed',
            'total_price' => 1000000,
            'commission' => 150000,
            'booking_date' => today()->format('Y-m-d'),
        ]);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/analytics/commission?period=monthly')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.'.today()->format('Y-m').'.total_commission', 150000)
            ->assertJsonPath('data.'.today()->format('Y-m').'.booking_count', 1);
    }
}
