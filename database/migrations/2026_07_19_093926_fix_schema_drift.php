<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1a. menu_orders.booking_id → nullable (for takeaway)
        Schema::table('menu_orders', function (Blueprint $table): void {
            $table->foreignId('booking_id')->nullable()->change();
        });

        // 1b. refund_requests — add reason
        Schema::table('refund_requests', function (Blueprint $table): void {
            $table->text('reason')->nullable()->after('admin_notes');
        });

        // 1c. refund_requests — add processed_by FK
        Schema::table('refund_requests', function (Blueprint $table): void {
            $table->foreignId('processed_by')->nullable()->after('processed_at')->constrained('users');
        });

        // 1d. payments — add 5 Midtrans columns
        Schema::table('payments', function (Blueprint $table): void {
            $table->string('midtrans_transaction_id')->nullable()->after('midtrans_order_id');
            $table->text('snap_token')->nullable()->after('midtrans_transaction_id');
            $table->text('snap_redirect_url')->nullable()->after('snap_token');
            $table->string('payment_channel')->nullable()->after('snap_redirect_url');
            $table->timestamp('paid_at')->nullable()->after('payment_channel');
        });

        // 1e. booking_rules — add min_advance_hours
        Schema::table('booking_rules', function (Blueprint $table): void {
            $table->integer('min_advance_hours')->nullable()->after('max_bookings_per_slot');
        });

        // 1f. notifications — add data JSON
        Schema::table('notifications', function (Blueprint $table): void {
            $table->json('data')->nullable()->after('delivery_status');
        });

        // 1g. tables — add unique (cafe_id, name)
        Schema::table('tables', function (Blueprint $table): void {
            $table->unique(['cafe_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::table('menu_orders', function (Blueprint $table): void {
            $table->foreignId('booking_id')->nullable(false)->change();
        });

        Schema::table('refund_requests', function (Blueprint $table): void {
            $table->dropColumn('reason');
            $table->dropForeign(['processed_by']);
            $table->dropColumn('processed_by');
        });

        Schema::table('payments', function (Blueprint $table): void {
            $table->dropColumn(['midtrans_transaction_id', 'snap_token', 'snap_redirect_url', 'payment_channel', 'paid_at']);
        });

        Schema::table('booking_rules', function (Blueprint $table): void {
            $table->dropColumn('min_advance_hours');
        });

        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropColumn('data');
        });

        Schema::table('tables', function (Blueprint $table): void {
            $table->dropUnique(['cafe_id', 'name']);
        });
    }
};
