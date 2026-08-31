<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('table_id')->constrained('tables')->cascadeOnDelete();
            $table->string('rule_type'); // fixed / custom
            $table->integer('duration_minutes')->nullable();
            $table->decimal('price', 12, 2)->nullable();
            $table->integer('min_duration_minutes')->nullable();
            $table->integer('max_duration_minutes')->nullable();
            $table->decimal('base_price_per_hour', 12, 2)->nullable();
            $table->json('surge_rules')->nullable();
            $table->integer('max_bookings_per_slot')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['table_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_rules');
    }
};
