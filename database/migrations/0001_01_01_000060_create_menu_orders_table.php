<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cafe_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->string('order_type');
            $table->string('order_reference')->unique();
            $table->string('status');
            $table->decimal('total_price', 12, 2);
            $table->decimal('commission', 12, 2)->default(0);
            $table->decimal('cafe_receives', 12, 2)->default(0);
            $table->string('payment_status');
            $table->unsignedBigInteger('payment_id')->nullable();
            $table->timestamp('prepare_at')->nullable();
            $table->text('special_notes')->nullable();
            $table->timestamps();

            $table->index(['booking_id', 'status', 'order_type']);
            $table->index('customer_id');
            $table->index('cafe_id');
            $table->index('payment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_orders');
    }
};
