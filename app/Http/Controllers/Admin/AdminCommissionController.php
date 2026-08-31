<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AdminAction;
use App\Http\Controllers\Controller;
use App\Models\CommissionRule;
use App\Traits\LogsAdminActions;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminCommissionController extends Controller
{
    use LogsAdminActions;

    public function rates(): JsonResponse
    {
        $rates = CommissionRule::all()->map(fn ($rule) => [
            'type' => $rule->commission_type,
            'percentage' => $rule->percentage,
        ]);

        return response()->json(['success' => true, 'data' => $rates]);
    }

    public function history(Request $request): JsonResponse
    {
        $query = CommissionRule::with('setByAdmin');

        if ($request->filled('type')) {
            $query->where('commission_type', $request->type);
        }

        $history = $query->latest()->paginate($request->integer('per_page', 50));

        return response()->json([
            'success' => true,
            'data' => $history->items(),
            'pagination' => $this->paginationMeta($history),
        ]);
    }

    public function updateRate(Request $request, string $type): JsonResponse
    {
        $rule = CommissionRule::where('commission_type', $type)->first();
        if ($rule) {
            $before = ['percentage' => $rule->percentage];
            $rule->update(['percentage' => $request->float('percentage')]);

            $this->logAdminAction(
                $request,
                AdminAction::UpdateCommission->value,
                'commission_rule',
                $rule->id,
                $before,
                ['percentage' => $rule->percentage],
            );
        }

        return response()->json(['success' => true, 'message' => 'Commission rate updated']);
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
