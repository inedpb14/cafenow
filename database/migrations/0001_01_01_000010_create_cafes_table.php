<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cafes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category')->nullable();
            $table->string('address');
            $table->string('city');
            $table->string('postal_code', 10)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->json('facilities')->nullable();
            $table->json('operational_hours')->nullable();
            $table->json('blackout_dates')->nullable();
            $table->string('approval_status')->default('pending');
            $table->string('rejection_reason')->nullable();
            $table->integer('submission_count')->default(1);
            $table->string('contact_whatsapp', 20)->nullable();
            $table->string('contact_email')->nullable();
            $table->string('instagram')->nullable();
            $table->string('website')->nullable();
            $table->decimal('reschedule_fee', 12, 2)->default(5000);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['city', 'category']);
            $table->index('approval_status');
            $table->index('owner_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cafes');
    }
};
