<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('featured_cafes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cafe_id')->constrained()->cascadeOnDelete();
            $table->integer('display_order')->default(0);
            $table->timestamp('active_from');
            $table->timestamp('active_to')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['active_from', 'active_to', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('featured_cafes');
    }
};
