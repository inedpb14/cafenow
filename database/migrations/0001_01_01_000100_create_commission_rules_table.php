<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commission_rules', function (Blueprint $table) {
            $table->id();
            $table->string('commission_type');
            $table->decimal('percentage', 5, 2);
            $table->foreignId('set_by_admin_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('active_from');
            $table->timestamp('active_to')->nullable();
            $table->timestamps();

            $table->index(['commission_type', 'active_from', 'active_to']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commission_rules');
    }
};
