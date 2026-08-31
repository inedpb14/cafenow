<?php

declare(strict_types=1);

namespace App\Http\Controllers\Booking;

use App\Events\BookingCheckIn;
use App\Events\BookingExtended;
use App\Exceptions\BookingTimeWindowException;
use App\Exceptions\CafeNotActiveException;
use App\Exceptions\SlotNotAvailableException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\CancelBookingRequest;
use App\Http\Requests\Booking\ExtendBookingRequest;
use App\Http\Requests\Booking\RescheduleBookingRequest;
use App\Http\Requests\Booking\StoreBookingRequest;
use App\Http\Resources\BookingResource;
use App\Http\Resources\RefundRequestResource;
use App\Models\Booking;
use App\Models\Cafe;
use App\Models\RefundRequest;
use App\Models\Table;
use App\Services\Booking\AvailabilityService;
use App\Services\Booking\BookingService;
use App\Services\Booking\BookingWizardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookingService,
        private readonly AvailabilityService $availabilityService,
        private readonly BookingWizardService $wizardService,
    ) {}

    /**
     * Place a full reservation (booking + pre-order + payment) via Inertia.
     */
    public function storeBooking(Request $request, Cafe $cafe): RedirectResponse
    {
        $validated = $request->validate([
            'table_id' => ['required', 'integer', 'exists:tables,id'],
            'booking_rule_id' => ['nullable', 'integer', 'exists:booking_rules,id'],
            'booking_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'duration_minutes' => ['required', 'integer', 'min:30', 'max:1440'],
            'guest_count' => ['required', 'integer', 'min:1', 'max:20'],
            'customer_notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['nullable', 'array', 'max:50'],
            'items.*.menu_item_id' => ['required', 'integer', Rule::exists('menu_items', 'id')->where('cafe_id', $cafe->id)],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ]);

        try {
            $result = $this->wizardService->place($request->user(), $cafe, $validated);
        } catch (SlotNotAvailableException|BookingTimeWindowException|CafeNotActiveException $exception) {
            return back()->with('error', $exception->getMessage())->withInput();
        }

        return redirect()->route('cafes.book', $cafe)->with([
            'booking_success' => true,
            'booking_reference' => $result['booking']->booking_reference,
            'payment_url' => $result['payment_url'],
        ]);
    }

    public function availability(Request $request): JsonResponse
    {
        $request->validate([
            'cafe_id' => ['required', 'exists:cafes,id'],
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'guests' => ['sometimes', 'integer', 'min:1'],
            'start_time' => ['sometimes', 'date_format:H:i'],
        ]);

        $cafe = Cafe::with('tables.bookingRule')
            ->findOrFail($request->integer('cafe_id'));

        $tablesQuery = $cafe->tables()->active();

        if ($request->filled('guests')) {
            $tablesQuery->where('capacity', '>=', $request->integer('guests'));
        }

        $tables = $tablesQuery->get();
        $date = $request->string('date')->toString();

        $result = $tables->map(fn (Table $table) => [
            'table_id' => $table->id,
            'name' => $table->name,
            'capacity' => $table->capacity,
            'type' => $table->table_type,
            'slots' => $this->availabilityService->getSlots($table->id, $date, $cafe->id, $cafe->operational_hours),
        ]);

        return response()->json([
            'success' => true,
            'data' => ['date' => $date, 'tables' => $result],
        ]);
    }

    public function store(StoreBookingRequest $request): JsonResponse
    {
        $booking = $this->bookingService->create($request->toDto(), $request->user()->id);

        return response()->json([
            'success' => true,
            'data' => new BookingResource($booking),
        ], 201);
    }

    public function show(Request $request, Booking $booking): JsonResponse
    {
        $user = $request->user();

        if ($booking->customer_id !== $user->id && $booking->cafe->owner_id !== $user->id) {
            abort(403);
        }

        $booking->load(['cafe', 'table', 'payment', 'menuOrders.items.menuItem']);

        return response()->json([
            'success' => true,
            'data' => new BookingResource($booking),
        ]);
    }

    public function cancel(CancelBookingRequest $request, Booking $booking): JsonResponse
    {
        if ($booking->customer_id !== $request->user()->id) {
            abort(403);
        }

        $this->bookingService->cancel($booking, 'customer', $request->input('reason'));

        return response()->json([
            'success' => true,
            'data' => new BookingResource($booking->fresh()),
        ]);
    }

    public function reschedule(RescheduleBookingRequest $request, Booking $booking): JsonResponse
    {
        if ($booking->customer_id !== $request->user()->id) {
            abort(403);
        }

        $booking = $this->bookingService->reschedule($booking, $request->toDto());

        return response()->json([
            'success' => true,
            'data' => new BookingResource($booking),
        ]);
    }

    public function checkIn(Request $request, Booking $booking): JsonResponse
    {
        $user = $request->user();

        if ($booking->customer_id !== $user->id && $booking->cafe->owner_id !== $user->id) {
            abort(403);
        }

        if ($booking->status !== 'confirmed') {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'INVALID_STATUS', 'message' => 'Booking harus berstatus confirmed'],
            ], 409);
        }

        if ($booking->check_in_time !== null) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'ALREADY_CHECKED_IN', 'message' => 'Sudah check-in sebelumnya'],
            ], 409);
        }

        $booking->update(['check_in_time' => now()]);
        BookingCheckIn::dispatch($booking->id);

        return response()->json([
            'success' => true,
            'data' => new BookingResource($booking->fresh()),
        ]);
    }

    public function extend(ExtendBookingRequest $request, Booking $booking): JsonResponse
    {
        $user = $request->user();

        if ($booking->customer_id !== $user->id && $booking->cafe->owner_id !== $user->id) {
            abort(403);
        }

        if (! in_array($booking->status, ['confirmed'], true)) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'INVALID_STATUS', 'message' => 'Booking harus berstatus confirmed'],
            ], 422);
        }

        if ($booking->extend_count >= 3) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'EXTEND_LIMIT', 'message' => 'Batas perpanjangan tercapai (maks 3x)'],
            ], 422);
        }

        $additionalMinutes = $request->integer('additional_minutes');
        $totalDuration = $booking->duration_minutes + $additionalMinutes;

        if ($totalDuration > $booking->duration_minutes * 2) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'EXTEND_LIMIT', 'message' => 'Total durasi tidak boleh melebihi 2x durasi awal'],
            ], 422);
        }

        $booking->update([
            'duration_minutes' => $totalDuration,
            'extend_count' => $booking->extend_count + 1,
        ]);
        BookingExtended::dispatch($booking->id, $additionalMinutes);

        return response()->json([
            'success' => true,
            'data' => new BookingResource($booking->fresh()),
        ]);
    }

    public function refundRequest(Request $request, Booking $booking): JsonResponse
    {
        if ($booking->customer_id !== $request->user()->id) {
            abort(403);
        }

        if ($booking->payment_status !== 'paid') {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'NOT_PAID', 'message' => 'Booking belum dibayar'],
            ], 422);
        }

        $request->validate([
            'bank_name' => ['required', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'max:50'],
            'account_holder_name' => ['required', 'string', 'max:255'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $existing = RefundRequest::where('booking_id', $booking->id)
            ->whereIn('status', ['pending'])
            ->exists();

        if ($existing) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'CONFLICT', 'message' => 'Sudah ada permintaan refund yang pending'],
            ], 409);
        }

        $refund = RefundRequest::create([
            'booking_id' => $booking->id,
            'customer_id' => $request->user()->id,
            'amount' => $booking->total_price,
            'reason' => $request->string('reason'),
            'bank_name' => $request->string('bank_name'),
            'account_number' => $request->string('account_number'),
            'account_holder_name' => $request->string('account_holder_name'),
            'status' => 'pending',
            'initiated_by' => 'customer',
        ]);

        return response()->json([
            'success' => true,
            'data' => new RefundRequestResource($refund),
        ], 201);
    }
}
