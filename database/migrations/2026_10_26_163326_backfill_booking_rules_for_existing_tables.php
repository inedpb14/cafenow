<?php

use App\Models\Table;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Setiap meja yang ditampilkan di wizard booking wajib punya booking rule.
     * Meja lama yang dibuat sebelum rule otomatis dibuat di-backfill
     * dengan rule fixed berharga = min_spend meja.
     */
    public function up(): void
    {
        Table::query()
            ->whereDoesntHave('bookingRule')
            ->withTrashed()
            ->each(fn (Table $table) => $table->bookingRule()->create([
                'rule_type' => 'fixed',
                'price' => (float) ($table->min_spend ?? 0),
                'duration_minutes' => 120,
                'min_duration_minutes' => 30,
                'max_duration_minutes' => 240,
                'max_bookings_per_slot' => 1,
                'min_advance_hours' => 1,
            ]));
    }

    public function down(): void
    {
        // tidak reversibel: rule backfill tidak bisa dibedakan dari rule buatan owner,
        // dan menghapus rule membuat meja menghilang dari wizard booking lagi
    }
};
