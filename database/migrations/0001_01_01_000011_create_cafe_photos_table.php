<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cafe_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cafe_id')->constrained()->cascadeOnDelete();
            $table->string('photo_path');
            $table->integer('display_order')->default(0);
            $table->timestamps();

            $table->index(['cafe_id', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cafe_photos');
    }
};
