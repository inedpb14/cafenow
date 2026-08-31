<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_item_id')->constrained('menu_items')->cascadeOnDelete();
            $table->integer('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('subtotal', 12, 2);

            $table->index('menu_order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_order_items');
    }
};
