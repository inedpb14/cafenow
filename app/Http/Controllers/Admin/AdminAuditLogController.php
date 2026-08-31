<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminAuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AdminAuditLog::with('admin');

        if ($request->filled('admin_id')) {
            $query->where('admin_id', $request->admin_id);
        }
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }
        if ($request->filled('entity_type')) {
            $query->where('entity_type', $request->entity_type);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->latest()->paginate($request->integer('per_page', 100));

        return response()->json([
            'success' => true,
            'data' => $logs->items(),
            'pagination' => $this->paginationMeta($logs),
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
