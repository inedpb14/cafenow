<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Koreksi data lama: menu order yang booking-nya sudah lunas
     * tetapi statusnya belum di-cascade (dibuat sebelum fix confirmPayment).
     */
    public function up(): void
    {
        DB::table('menu_orders')
            ->join('bookings', 'bookings.id', '=', 'menu_orders.booking_id')
            ->where('menu_orders.status', 'pending_payment')
            ->where('bookings.payment_status', 'paid')
            ->where('bookings.status', 'confirmed')
            ->update([
                'menu_orders.payment_status' => 'paid',
                'menu_orders.status' => 'confirmed',
            ]);
    }

    public function down(): void
    {
        //
    }
};
