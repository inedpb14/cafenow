<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('payable_type');
            $table->unsignedBigInteger('payable_id');
            $table->decimal('amount', 12, 2);
            $table->decimal('commission', 12, 2)->default(0);
            $table->string('status');
            $table->string('payment_method')->nullable();
            $table->string('gateway_reference')->nullable();
            $table->string('midtrans_order_id')->unique();
            $table->timestamps();

            $table->index(['payable_type', 'payable_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
