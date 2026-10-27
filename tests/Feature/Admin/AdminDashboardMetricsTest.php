<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\AdminAuditLog;
use App\Models\Booking;
use App\Models\Cafe;
use App\Models\FeaturedCafe;
use App\Models\MenuOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class AdminDashboardMetricsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_all_metrics_are_zero_with_empty_database(): void
    {
        $this->actingAs($this->admin)
            ->get('/admin/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/dashboard')
                ->where('metrics.totalCafes', 0)
                ->where('metrics.revenueToday', 0)
                ->where('metrics.activeBookings', 0)
                ->where('metrics.pendingApprovals', 0)
                ->where('metrics.newCustomers', 0)
                ->where('metrics.newOrders', 0)
            );
    }

    public function test_revenue_sums_stored_commission_of_paid_bookings_only(): void
    {
        Booking::factory()->create([
            'status' => 'completed',
            'payment_status' => 'paid',
            'commission' => 100000,
            'created_at' => now(),
        ]);

        Booking::factory()->create([
            'status' => 'completed',
            'payment_status' => 'refunded',
            'commission' => 50000,
            'created_at' => now(),
        ]);

        $this->actingAs($this->admin)
            ->get('/admin/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('metrics.revenueToday', 100000)
            );
    }

    public function test_revenue_excludes_bookings_from_previous_days(): void
    {
        Booking::factory()->create([
            'status' => 'completed',
            'payment_status' => 'paid',
            'commission' => 999999,
            'created_at' => now()->subDay(),
        ]);

        $this->actingAs($this->admin)
            ->get('/admin/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('metrics.revenueToday', 0)
            );
    }

    public function test_active_bookings_counts_pending_and_confirmed_only(): void
    {
        Booking::factory()->create(['status' => 'pending']);
        Booking::factory()->create(['status' => 'confirmed']);
        Booking::factory()->create(['status' => 'completed']);
        Booking::factory()->create(['status' => 'cancelled']);
        Booking::factory()->create(['status' => 'no_show']);

        $this->actingAs($this->admin)
            ->get('/admin/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('metrics.activeBookings', 2)
            );
    }

    public function test_new_orders_counts_menu_orders_created_today(): void
    {
        $cafe = Cafe::factory()->create();
        $customer = User::factory()->create();
        $booking = Booking::factory()->create();

        foreach (['pre_order', 'additional'] as $type) {
            MenuOrder::create([
                'cafe_id' => $cafe->id,
                'customer_id' => $customer->id,
                'booking_id' => $booking->id,
                'order_type' => $type,
                'order_reference' => 'ORD-TEST-'.Str::upper(Str::random(6)),
                'status' => 'scheduled',
                'total_price' => 50000,
                'commission' => 7500,
                'cafe_receives' => 42500,
                'payment_status' => 'paid',
            ]);
        }

        $this->actingAs($this->admin)
            ->get('/admin/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('metrics.newOrders', 2)
            );
    }

    public function test_new_orders_is_not_inflated_by_bookings_created_today(): void
    {
        Booking::factory()->create(['created_at' => now()]);

        $this->actingAs($this->admin)
            ->get('/admin/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('metrics.newOrders', 0)
            );
    }

    public function test_total_cafes_includes_active_and_legacy_approved(): void
    {
        Cafe::factory()->create(['approval_status' => 'active']);
        Cafe::factory()->create(['approval_status' => 'approved']);
        Cafe::factory()->create(['approval_status' => 'pending']);
        Cafe::factory()->create(['approval_status' => 'rejected']);

        $this->actingAs($this->admin)
            ->get('/admin/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('metrics.totalCafes', 2)
                ->where('metrics.pendingApprovals', 1)
            );
    }

    public function test_new_customers_counts_only_customer_role(): void
    {
        User::factory()->create(['role' => 'customer', 'created_at' => now()]);
        User::factory()->create(['role' => 'owner', 'created_at' => now()]);
        User::factory()->create(['role' => 'admin', 'created_at' => now()]);

        $this->actingAs($this->admin)
            ->get('/admin/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('metrics.newCustomers', 1)
            );
    }

    public function test_recent_activity_labels_every_entity_type(): void
    {
        $cafe = Cafe::factory()->create(['name' => 'Kopi Senja']);
        $booking = Booking::factory()->create();
        $featured = FeaturedCafe::create([
            'cafe_id' => $cafe->id,
            'display_order' => 1,
            'active_from' => now(),
            'active_to' => now()->addDay(),
            'created_by' => $this->admin->id,
        ]);

        $logs = [
            ['action' => 'approve_cafe', 'entity_type' => 'cafe', 'entity_id' => $cafe->id],
            ['action' => 'cancel_booking', 'entity_type' => 'booking', 'entity_id' => $booking->id],
            ['action' => 'process_refund', 'entity_type' => 'refund_request', 'entity_id' => 7],
            ['action' => 'update_commission', 'entity_type' => 'commission_rule', 'entity_id' => 1],
            ['action' => 'add_featured_cafe', 'entity_type' => 'featured_cafe', 'entity_id' => $featured->id],
        ];

        foreach ($logs as $i => $log) {
            AdminAuditLog::create([
                'admin_id' => $this->admin->id,
                'action' => $log['action'],
                'entity_type' => $log['entity_type'],
                'entity_id' => $log['entity_id'],
                'before_value' => [],
                'after_value' => [],
                'ip_address' => '127.0.0.1',
                'created_at' => now()->subMinutes($i),
            ]);
        }

        $this->actingAs($this->admin)
            ->getJson('/api/admin/dashboard/recent-activity')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('data.0.message', 'Cafe disetujui — Kopi Senja')
            ->assertJsonPath('data.1.message', "Booking dibatalkan — {$booking->booking_reference}")
            ->assertJsonPath('data.2.message', 'Refund diproses — #7')
            ->assertJsonPath('data.3.message', 'Rate komisi diperbarui')
            ->assertJsonPath('data.4.message', 'Cafe ditambahkan ke featured — Kopi Senja');
    }

    public function test_recent_activity_stays_safe_when_entity_is_deleted(): void
    {
        $cafe = Cafe::factory()->create(['name' => 'Kopi Senja']);

        AdminAuditLog::create([
            'admin_id' => $this->admin->id,
            'action' => 'approve_cafe',
            'entity_type' => 'cafe',
            'entity_id' => $cafe->id,
            'before_value' => [],
            'after_value' => [],
            'ip_address' => '127.0.0.1',
            'created_at' => now(),
        ]);

        $cafe->delete();

        $this->actingAs($this->admin)
            ->getJson('/api/admin/dashboard/recent-activity')
            ->assertOk()
            ->assertJsonPath('data.0.message', 'Cafe disetujui');
    }

    public function test_recent_activity_avoids_n_plus_one_queries(): void
    {
        $cafes = Cafe::factory()->count(5)->create();
        $users = User::factory()->count(3)->create(['role' => 'customer']);
        $bookings = Booking::factory()->count(2)->create();

        foreach ([...$cafes, ...$users, ...$bookings] as $i => $entity) {
            $type = match (true) {
                $entity instanceof Cafe => 'cafe',
                $entity instanceof User => 'user',
                default => 'booking',
            };
            AdminAuditLog::create([
                'admin_id' => $this->admin->id,
                'action' => 'update_user',
                'entity_type' => $type,
                'entity_id' => $entity->id,
                'before_value' => [],
                'after_value' => [],
                'ip_address' => '127.0.0.1',
                'created_at' => now()->subMinutes($i),
            ]);
        }

        $queries = 0;
        DB::listen(function ($query) use (&$queries) {
            if (Str::contains($query->sql, ['admin_audit_logs', 'cafes', 'users', 'bookings', 'featured_cafes'])) {
                $queries++;
            }
        });

        $this->actingAs($this->admin)
            ->getJson('/api/admin/dashboard/recent-activity')
            ->assertOk()
            ->assertJsonCount(10, 'data');

        $this->assertLessThanOrEqual(8, $queries);
    }
}
