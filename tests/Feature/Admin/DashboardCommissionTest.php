<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Booking;
use App\Models\CommissionRule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class DashboardCommissionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_dashboard_revenue_uses_stored_commission_and_is_unaffected_by_rate_changes(): void
    {
        CommissionRule::create([
            'commission_type' => 'booking',
            'percentage' => 15,
            'active_from' => today()->format('Y-m-d'),
            'set_by_admin_id' => $this->admin->id,
        ]);

        Booking::factory()->create([
            'status' => 'completed',
            'payment_status' => 'paid',
            'total_price' => 1000000,
            'commission' => 250000,
            'created_at' => now(),
        ]);

        $this->actingAs($this->admin)
            ->get('/admin/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/dashboard')
                ->where('metrics.revenueToday', 250000)
            );

        $this->actingAs($this->admin)
            ->patchJson('/api/admin/commissions/rates/booking', ['percentage' => 20])
            ->assertOk();

        $this->actingAs($this->admin)
            ->get('/admin/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/dashboard')
                ->where('metrics.revenueToday', 250000)
            );
    }

    public function test_dashboard_revenue_is_zero_when_no_booking_exists_today(): void
    {
        Booking::factory()->create([
            'status' => 'completed',
            'payment_status' => 'paid',
            'total_price' => 1000000,
            'commission' => 150000,
            'created_at' => now()->subDay(),
        ]);

        $this->actingAs($this->admin)
            ->get('/admin/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/dashboard')
                ->where('metrics.revenueToday', 0)
            );
    }

    public function test_dashboard_revenue_excludes_refunded_bookings(): void
    {
        Booking::factory()->create([
            'status' => 'completed',
            'payment_status' => 'refunded',
            'total_price' => 1000000,
            'commission' => 150000,
            'created_at' => now(),
        ]);

        Booking::factory()->create([
            'status' => 'completed',
            'payment_status' => 'partially_refunded',
            'total_price' => 500000,
            'commission' => 75000,
            'created_at' => now(),
        ]);

        $this->actingAs($this->admin)
            ->get('/admin/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/dashboard')
                ->where('metrics.revenueToday', 0)
            );
    }

    public function test_analytics_revenue_uses_actual_booking_commission_not_hardcoded_rate(): void
    {
        Booking::factory()->create([
            'status' => 'completed',
            'total_price' => 1000000,
            'commission' => 250000,
            'created_at' => now()->subDay(),
        ]);

        $this->actingAs($this->admin)
            ->getJson('/api/admin/analytics/revenue?start_date='.now()->subWeek()->format('Y-m-d').'&end_date='.now()->format('Y-m-d'))
            ->assertOk()
            ->assertJsonPath('data.0.revenue', 250000);
    }
}
