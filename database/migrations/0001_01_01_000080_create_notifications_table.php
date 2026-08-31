<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->string('recipient_type');
            $table->string('subject');
            $table->text('message');
            $table->string('notification_type');
            $table->string('related_entity_type')->nullable();
            $table->unsignedBigInteger('related_entity_id')->nullable();
            $table->timestamp('sent_at');
            $table->string('delivery_status');
            $table->timestamps();

            $table->index(['recipient_id', 'created_at']);
            $table->index('notification_type');
            $table->index('delivery_status');
            $table->index(['related_entity_type', 'related_entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
