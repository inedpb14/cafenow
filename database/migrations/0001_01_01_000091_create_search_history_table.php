<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('search_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('cafe_id')->constrained()->cascadeOnDelete();
            $table->timestamp('viewed_at');

            $table->index(['customer_id', 'viewed_at']);
            $table->index(['customer_id', 'cafe_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('search_history');
    }
};
