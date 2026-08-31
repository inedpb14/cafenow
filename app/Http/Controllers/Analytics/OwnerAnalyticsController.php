<?php

declare(strict_types=1);

namespace App\Http\Controllers\Analytics;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\MenuOrder;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OwnerAnalyticsController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $cafeIds = $request->user()->cafes()->pluck('id');
        $today = Carbon::today();

        $todayBookings = Booking::whereIn('cafe_id', $cafeIds)
            ->whereDate('booking_date', $today)
            ->whereIn('status', ['confirmed'])
            ->count();

        $activeCustomers = Booking::whereIn('cafe_id', $cafeIds)
            ->whereNotNull('check_in_time')
            ->whereNull('check_out_time')
            ->count();

        $todayRevenue = Booking::whereIn('cafe_id', $cafeIds)
            ->whereDate('booking_date', $today)
            ->where('status', 'completed')
            ->sum('cafe_receives');

        $pendingOrders = MenuOrder::whereIn('cafe_id', $cafeIds)
            ->whereIn('status', ['pending_payment', 'confirmed', 'preparing'])
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'today_bookings' => $todayBookings,
                'active_customers' => $activeCustomers,
                'today_revenue' => (float) $todayRevenue,
                'pending_orders' => $pendingOrders,
            ],
        ]);
    }

    public function revenue(Request $request): JsonResponse
    {
        $cafeIds = $request->user()->cafes()->pluck('id');

        $request->validate([
            'period' => ['sometimes', 'string', 'in:daily,weekly,monthly'],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
        ]);

        $period = $request->string('period', 'monthly');
        $from = $request->date('from') ?? Carbon::now()->subYear()->toDateString();
        $to = $request->date('to') ?? Carbon::now()->toDateString();

        $dateFormat = match ((string) $period) {
            'daily' => 'Y-m-d',
            'weekly' => 'Y-W',
            default => 'Y-m',
        };

        $bookings = Booking::whereIn('cafe_id', $cafeIds)
            ->where('status', 'completed')
            ->whereBetween('booking_date', [$from, $to])
            ->get()
            ->groupBy(fn (Booking $booking) => $booking->booking_date->format($dateFormat))
            ->map(fn ($group) => [
                'total_price' => (float) $group->sum('total_price'),
                'commission' => (float) $group->sum('commission'),
                'cafe_receives' => (float) $group->sum('cafe_receives'),
                'count' => $group->count(),
            ]);

        return response()->json([
            'success' => true,
            'data' => $bookings,
        ]);
    }

    public function bookings(Request $request): JsonResponse
    {
        $cafeIds = $request->user()->cafes()->pluck('id');

        $bookings = Booking::whereIn('cafe_id', $cafeIds)
            ->selectRaw('DATE(booking_date) as date, status, COUNT(*) as count')
            ->groupBy('date', 'status')
            ->orderBy('date', 'desc')
            ->limit(30)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $bookings,
        ]);
    }

    public function menus(Request $request): JsonResponse
    {
        $cafeIds = $request->user()->cafes()->pluck('id');

        $topItems = MenuOrder::whereIn('cafe_id', $cafeIds)
            ->where('status', 'completed')
            ->join('menu_order_items', 'menu_orders.id', '=', 'menu_order_items.menu_order_id')
            ->join('menu_items', 'menu_order_items.menu_item_id', '=', 'menu_items.id')
            ->selectRaw('menu_items.id, menu_items.name, SUM(menu_order_items.quantity) as total_ordered')
            ->groupBy('menu_items.id', 'menu_items.name')
            ->orderBy('total_ordered', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $topItems,
        ]);
    }
}
