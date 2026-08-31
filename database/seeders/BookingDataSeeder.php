<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Cafe;
use App\Models\Table;
use Illuminate\Database\Seeder;

class BookingDataSeeder extends Seeder
{
    /**
     * Fill dev booking data gaps: operational hours, per-table booking rules,
     * and bookable tables for active cafes. Idempotent — only fills what is missing.
     */
    public function run(): void
    {
        $hours = [];
        foreach (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as $day) {
            $hours[$day] = [['open' => '08:00', 'close' => '22:00']];
        }

        foreach (Cafe::all() as $cafe) {
            if (empty($cafe->operational_hours)) {
                $cafe->update(['operational_hours' => $hours]);
            }

            if ($cafe->isActive()) {
                $this->ensureBookableTables($cafe);
            }

            foreach ($cafe->tables()->withTrashed()->get() as $table) {
                if (! $table->bookingRule()->exists()) {
                    $table->bookingRule()->create([
                        'rule_type' => 'fixed',
                        'duration_minutes' => 120,
                        'price' => (float) ($table->min_spend ?: 25000),
                        'max_bookings_per_slot' => 1,
                        'is_active' => true,
                    ]);
                }
            }
        }
    }

    /** ponytail: dev convenience — active cafes need >=2 bookable tables (capacity >= 4) */
    private function ensureBookableTables(Cafe $cafe): void
    {
        $count = $cafe->tables()->active()->where('capacity', '>=', 4)->count();

        for ($i = $count + 1; $i <= 2; $i++) {
            $table = Table::create([
                'cafe_id' => $cafe->id,
                'name' => "Meja {$cafe->name} {$i}",
                'capacity' => 4,
                'table_type' => 'indoor',
                'min_spend' => 25000,
                'is_active' => true,
            ]);

            $table->bookingRule()->create([
                'rule_type' => 'fixed',
                'duration_minutes' => 120,
                'price' => 25000,
                'max_bookings_per_slot' => 1,
                'is_active' => true,
            ]);
        }
    }
}
