<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AdminAction;
use App\Http\Controllers\Controller;
use App\Models\RefundRequest;
use App\Traits\LogsAdminActions;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminRefundController extends Controller
{
    use LogsAdminActions;

    public function index(Request $request): JsonResponse
    {
        $query = RefundRequest::with('booking', 'customer');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $refunds = $query->paginate($request->integer('per_page', 50));

        return response()->json([
            'success' => true,
            'data' => $refunds->items(),
            'pagination' => $this->paginationMeta($refunds),
        ]);
    }

    public function show(RefundRequest $refund): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $refund->load('booking', 'customer')]);
    }

    public function process(Request $request, RefundRequest $refund): JsonResponse
    {
        $before = ['status' => $refund->status];
        $notes = $request->string('admin_notes');

        $refund->update([
            'status' => 'completed',
            'admin_notes' => $notes,
        ]);

        $this->logAdminAction(
            $request,
            AdminAction::ProcessRefund->value,
            'refund_request',
            $refund->id,
            $before,
            ['status' => 'completed', 'admin_notes' => $notes],
        );

        return response()->json(['success' => true, 'message' => 'Refund processed']);
    }

    public function reject(Request $request, RefundRequest $refund): JsonResponse
    {
        $before = ['status' => $refund->status];
        $reason = $request->string('reason');

        $refund->update([
            'status' => 'rejected',
            'admin_notes' => $reason,
        ]);

        $this->logAdminAction(
            $request,
            AdminAction::RejectRefund->value,
            'refund_request',
            $refund->id,
            $before,
            ['status' => 'rejected', 'admin_notes' => $reason],
        );

        return response()->json(['success' => true, 'message' => 'Refund rejected']);
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
