<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cafe_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category');
            $table->decimal('price', 12, 2);
            $table->string('photo')->nullable();
            $table->string('availability_status')->default('available');
            $table->text('allergen_notes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['cafe_id', 'category']);
            $table->index('availability_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_items');
    }
};
