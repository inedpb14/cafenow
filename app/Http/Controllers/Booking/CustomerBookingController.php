<?php

declare(strict_types=1);

namespace App\Http\Controllers\Booking;

use App\Http\Controllers\Controller;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerBookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Booking::where('customer_id', $request->user()->id);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $query->orderBy('booking_date', 'desc')->orderBy('start_time', 'desc');

        $perPage = $request->integer('per_page', 15);
        $bookings = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => BookingResource::collection($bookings),
            'meta' => [
                'current_page' => $bookings->currentPage(),
                'last_page' => $bookings->lastPage(),
                'total' => $bookings->total(),
            ],
        ]);
    }
}
