<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cafe_id')->constrained()->cascadeOnDelete();
            $table->foreignId('table_id')->constrained('tables')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('booking_rule_id')->nullable()->constrained('booking_rules')->nullOnDelete();
            $table->date('booking_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->integer('duration_minutes');
            $table->integer('guest_count');
            $table->string('status');
            $table->decimal('table_price', 12, 2);
            $table->decimal('menu_subtotal', 12, 2)->default(0);
            $table->decimal('total_price', 12, 2);
            $table->decimal('commission', 12, 2)->default(0);
            $table->decimal('cafe_receives', 12, 2)->default(0);
            $table->string('payment_status');
            $table->unsignedBigInteger('payment_id')->nullable();
            $table->string('booking_reference')->unique();
            $table->timestamp('lock_expires_at')->nullable();
            $table->timestamp('check_in_time')->nullable();
            $table->timestamp('check_out_time')->nullable();
            $table->integer('extend_count')->default(0);
            $table->string('cancelled_by')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->text('customer_notes')->nullable();
            $table->timestamps();

            $table->index(['table_id', 'booking_date', 'start_time']);
            $table->index('customer_id');
            $table->index('cafe_id');
            $table->index('status');
            $table->index('payment_status');
            $table->index('lock_expires_at');
            $table->index('payment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
