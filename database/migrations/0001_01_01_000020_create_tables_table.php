<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cafe_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->integer('capacity');
            $table->string('table_type')->nullable();
            $table->text('description')->nullable();
            $table->string('photo')->nullable();
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['cafe_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tables');
    }
};
