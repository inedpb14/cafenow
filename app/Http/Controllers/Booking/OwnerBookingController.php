<?php

declare(strict_types=1);

namespace App\Http\Controllers\Booking;

use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\OwnerCancelBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\Booking\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OwnerBookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookingService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $cafeIds = $request->user()->cafes()->pluck('id');

        $query = Booking::whereIn('cafe_id', $cafeIds);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('date')) {
            $query->where('booking_date', $request->string('date'));
        }

        if ($request->filled('cafe_id')) {
            $query->where('cafe_id', $request->integer('cafe_id'));
        }

        $query->orderBy('booking_date', 'desc');

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

    public function cancel(OwnerCancelBookingRequest $request, Booking $booking): JsonResponse
    {
        $cafeIds = $request->user()->cafes()->pluck('id');

        if (! $cafeIds->contains($booking->cafe_id)) {
            abort(403);
        }

        $this->bookingService->cancel($booking, 'owner', $request->input('cancellation_reason'));

        return response()->json([
            'success' => true,
            'data' => new BookingResource($booking->fresh()),
        ]);
    }

    public function noShow(Request $request, Booking $booking): JsonResponse
    {
        $cafeIds = $request->user()->cafes()->pluck('id');

        if (! $cafeIds->contains($booking->cafe_id)) {
            abort(403);
        }

        if (! in_array($booking->status, ['confirmed'], true)) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'INVALID_STATUS', 'message' => 'Booking harus berstatus confirmed'],
            ], 422);
        }

        $booking->update([
            'status' => BookingStatus::NoShow->value,
            'cancelled_by' => 'owner',
            'cancellation_reason' => 'Tidak datang',
        ]);

        return response()->json([
            'success' => true,
            'data' => new BookingResource($booking->fresh()),
        ]);
    }

    public function checkout(Request $request, Booking $booking): JsonResponse
    {
        $cafeIds = $request->user()->cafes()->pluck('id');

        if (! $cafeIds->contains($booking->cafe_id)) {
            abort(403);
        }

        if ($booking->check_in_time === null) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'NOT_CHECKED_IN', 'message' => 'Booking belum check-in'],
            ], 422);
        }

        $booking->update([
            'check_out_time' => now(),
            'status' => 'completed',
        ]);

        return response()->json([
            'success' => true,
            'data' => new BookingResource($booking->fresh()),
        ]);
    }
}
