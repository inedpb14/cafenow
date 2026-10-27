<?php

declare(strict_types=1);

namespace Tests\Feature\Owner;

use App\Models\BookingRule;
use App\Models\Cafe;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class StoreTableBookingRuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_table_creates_default_booking_rule(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        Cafe::factory()->create(['owner_id' => $owner->id, 'approval_status' => 'active']);

        $this->actingAs($owner)
            ->post(route('owner.cafes.tables.store'), [
                'name' => 'VIP++',
                'type' => 'vip',
                'capacity' => '4',
                'min_spend' => '150000',
            ])
            ->assertRedirect();

        $table = Table::query()->latest('id')->first();
        $rule = BookingRule::query()->where('table_id', $table->id)->first();

        $this->assertNotNull($table, 'Meja harus tersimpan');
        $this->assertNotNull($rule, 'Meja baru wajib punya booking rule default');
        $this->assertSame('fixed', $rule->rule_type);
        $this->assertSame('150000.00', (string) $rule->price);
        $this->assertSame(120, $rule->duration_minutes);
    }

    public function test_table_without_rule_is_hidden_from_booking_wizard(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $cafe = Cafe::factory()->create(['owner_id' => $owner->id, 'approval_status' => 'active']);
        Table::factory()->create(['cafe_id' => $cafe->id, 'name' => 'Tanpa Rule']);

        $this->actingAs(User::factory()->create(['role' => 'customer', 'phone' => '08123456789']))
            ->get(route('cafes.book', $cafe))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('cafes/book')->has('tables', 0));
    }

    public function test_table_with_rule_appears_in_booking_wizard(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $cafe = Cafe::factory()->create(['owner_id' => $owner->id, 'approval_status' => 'active']);
        $table = Table::factory()->create(['cafe_id' => $cafe->id, 'name' => 'VIP++']);
        BookingRule::factory()->create(['table_id' => $table->id, 'price' => 50000, 'duration_minutes' => 120]);

        $this->actingAs(User::factory()->create(['role' => 'customer', 'phone' => '08123456789']))
            ->get(route('cafes.book', $cafe))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('cafes/book')
                ->has('tables', 1)
                ->where('tables.0.name', 'VIP++'));
    }
}
