<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Cafe;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAnalyticsController extends Controller
{
    public function index(Request $request): \Inertia\Response
    {
        return inertia('Admin/Analytics');
    }

    public function platform(Request $request): JsonResponse
    {
        $usersByRole = User::selectRaw('role, COUNT(*) as count')
            ->groupBy('role')
            ->pluck('count', 'role');

        $cafesByStatus = Cafe::selectRaw('approval_status, COUNT(*) as count')
            ->groupBy('approval_status')
            ->pluck('count', 'approval_status');

        $bookingsByStatus = Booking::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $totalRevenue = Booking::where('status', 'completed')
            ->sum('cafe_receives');

        return response()->json([
            'success' => true,
            'data' => [
                'users' => $usersByRole,
                'cafes' => $cafesByStatus,
                'bookings' => $bookingsByStatus,
                'revenue' => (float) $totalRevenue,
            ],
        ]);
    }

    public function commission(Request $request): JsonResponse
    {
        $request->validate([
            'period' => ['sometimes', 'string', 'in:daily,weekly,monthly'],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
        ]);

        $period = $request->string('period', 'monthly');
        $from = $request->date('from') ?? Carbon::now()->subYear();
        $to = $request->date('to') ?? Carbon::now();

        $dateFormat = match ((string) $period) {
            'daily' => 'Y-m-d',
            'weekly' => 'Y-W',
            default => 'Y-m',
        };

        $commissions = Booking::where('status', 'completed')
            ->whereBetween('booking_date', [$from, $to])
            ->get()
            ->groupBy(fn (Booking $booking) => $booking->booking_date->format($dateFormat))
            ->map(fn ($group) => [
                'total_commission' => (float) $group->sum('commission'),
                'total_revenue' => (float) $group->sum('total_price'),
                'booking_count' => $group->count(),
            ]);

        return response()->json([
            'success' => true,
            'data' => $commissions,
        ]);
    }

    public function revenue(Request $request): JsonResponse
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $data = Booking::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('DATE(created_at) as date, COALESCE(SUM(commission), 0) as revenue')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function topCafes(Request $request): JsonResponse
    {
        $limit = $request->query('top', 10);

        $cafes = Cafe::withCount('bookings')
            ->withSum('bookings', 'commission')
            ->where('status', 'approved')
            ->orderByDesc('bookings_count')
            ->limit($limit)
            ->get()
            ->map(fn ($cafe) => [
                'id' => $cafe->id,
                'name' => $cafe->name,
                'revenue' => (float) ($cafe->bookings_sum_commission ?? 0),
                'bookings' => $cafe->bookings_count,
                'rating' => $cafe->rating ?? 0,
            ]);

        return response()->json([
            'success' => true,
            'data' => $cafes,
        ]);
    }

    public function bookingStatus(): JsonResponse
    {
        $data = [
            'completed' => Booking::where('status', 'completed')->count(),
            'pending' => Booking::where('status', 'pending')->count(),
            'cancelled' => Booking::where('status', 'cancelled')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function exportCsv(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $bookings = Booking::with('cafe')
            ->where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        $csv = "Tanggal,Cafe,Revenue\n";
        foreach ($bookings as $booking) {
            $revenue = (float) ($booking->commission ?? 0);
            $csv .= "{$booking->created_at},{$booking->cafe->name},{$revenue}\n";
        }

        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="revenue-'.now()->format('Y-m-d').'.csv"');
    }
}
