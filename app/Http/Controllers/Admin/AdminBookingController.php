<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Cafe;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Response;

class AdminBookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Booking::with('cafe', 'customer', 'table', 'menuOrders.items.menuItem');

        if ($request->filled('keyword')) {
            $keyword = trim($request->keyword);
            $query->where(function ($q) use ($keyword): void {
                $q->where('booking_reference', 'like', "%{$keyword}%")
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$keyword}%"));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        if ($request->filled('cafe_id')) {
            $query->where('cafe_id', $request->integer('cafe_id'));
        }

        if ($request->filled('date_from')) {
            $request->validate(['date_from' => ['date']]);
            $query->whereDate('booking_date', '>=', $request->date('date_from'));
        }

        if ($request->filled('date_to')) {
            $request->validate(['date_to' => ['date']]);
            $query->whereDate('booking_date', '<=', $request->date('date_to'));
        }

        $sortable = ['booking_reference', 'booking_date', 'status', 'created_at', 'cafe_name', 'customer_name'];
        $sortBy = $request->string('sort_by')->toString();
        $sortOrder = $request->string('sort_order')->toString() === 'desc' ? 'desc' : 'asc';

        if (in_array($sortBy, $sortable, true)) {
            $query->orderBy(match ($sortBy) {
                'cafe_name' => Cafe::select('name')->whereColumn('cafes.id', 'bookings.cafe_id'),
                'customer_name' => User::select('name')->whereColumn('users.id', 'bookings.customer_id'),
                default => $sortBy === 'status' ? 'status' : $sortBy,
            }, $sortOrder);
        } else {
            $query->orderBy('booking_date', 'desc');
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);
        $bookings = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $bookings->items(),
            'pagination' => $this->paginationMeta($bookings),
        ]);
    }

    public function showPage(Booking $booking): Response
    {
        return inertia('admin/Booking/Detail', [
            'booking' => $booking->load(
                'cafe',
                'customer',
                'table',
                'payment',
                'menuOrders.items.menuItem',
            ),
        ]);
    }

    /**
     * @param \Illuminate\Contracts\Pagination\LengthAwarePaginator<int, mixed> $paginated
     * @return array{total: int, per_page: int, current_page: int, last_page: int}
     */
    private function paginationMeta(\Illuminate\Contracts\Pagination\LengthAwarePaginator $paginated): array
    {
        return [
            'total' => $paginated->total(),
            'per_page' => $paginated->perPage(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
        ];
    }
}
