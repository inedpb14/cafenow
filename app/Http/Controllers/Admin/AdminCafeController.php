<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AdminAction;
use App\Enums\CafeApprovalStatus;
use App\Enums\CancelledBy;
use App\Exceptions\InvalidCafeStatusTransitionException;
use App\Http\Controllers\Controller;
use App\Models\Cafe;
use App\Services\Booking\BookingService;
use App\Traits\LogsAdminActions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminCafeController extends Controller
{
    use LogsAdminActions;

    public function __construct(
        private readonly BookingService $bookingService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Cafe::with('owner');

        if ($request->filled('keyword')) {
            $keyword = trim($request->keyword);
            $query->where(function ($q) use ($keyword): void {
                $q->where('name', 'like', "%{$keyword}%")
                    ->orWhereHas('owner', fn ($o) => $o->where('name', 'like', "%{$keyword}%"));
            });
        }

        if ($request->filled('status')) {
            $status = (string) $request->string('status');
            $query->whereIn('approval_status', $status === 'approved'
                ? ['active', 'approved']
                : [$status]);
        }

        $sortable = ['name', 'location', 'status', 'created_at'];
        $sortBy = $request->string('sort_by')->toString();
        $sortOrder = $request->string('sort_order')->toString() === 'desc' ? 'desc' : 'asc';

        if (in_array($sortBy, $sortable, true)) {
            $query->orderBy($sortBy === 'status' ? 'approval_status' : $sortBy, $sortOrder);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min(max($request->integer('per_page', 25), 1), 100);
        $cafes = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $cafes->items(),
            'pagination' => [
                'total' => $cafes->total(),
                'per_page' => $cafes->perPage(),
                'current_page' => $cafes->currentPage(),
                'last_page' => $cafes->lastPage(),
            ],
        ]);
    }

    public function options(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => Cafe::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(Cafe $cafe): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $cafe->load('owner')]);
    }

    public function suspend(Request $request, Cafe $cafe): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);
        $reason = trim($validated['reason']);

        $before = ['approval_status' => $cafe->approval_status];

        DB::transaction(function () use ($cafe): void {
            $cafe->transitionTo(CafeApprovalStatus::Suspended);

            $unpaid = $cafe->bookings()
                ->where('payment_status', 'unpaid')
                ->whereIn('status', ['pending', 'confirmed'])
                ->get();

            foreach ($unpaid as $booking) {
                $this->bookingService->cancel(
                    $booking,
                    CancelledBy::System->value,
                    'Dibatalkan otomatis karena cafe di-suspend',
                );
            }
        });

        $this->logAdminAction(
            $request,
            AdminAction::SuspendCafe->value,
            'cafe',
            $cafe->id,
            $before,
            ['approval_status' => 'suspended', 'reason' => $reason],
        );

        return response()->json(['success' => true, 'message' => 'Cafe suspended']);
    }

    public function unsuspend(Request $request, Cafe $cafe): JsonResponse
    {
        if ($cafe->approval_status !== CafeApprovalStatus::Suspended->value) {
            throw new InvalidCafeStatusTransitionException(
                "Transisi status tidak valid: {$cafe->approval_status} -> active"
            );
        }

        $before = ['approval_status' => $cafe->approval_status];

        $cafe->transitionTo(CafeApprovalStatus::Active);

        $this->logAdminAction(
            $request,
            AdminAction::UnsuspendCafe->value,
            'cafe',
            $cafe->id,
            $before,
            ['approval_status' => 'active'],
        );

        return response()->json(['success' => true, 'message' => 'Cafe unsuspended']);
    }
}
