<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Booking;
use App\Models\Cafe;
use App\Models\FeaturedCafe;
use App\Models\MenuOrder;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AdminDashboardController extends Controller
{
    public function index(): Response
    {
        $today = now()->startOfDay();

        $metrics = [
            'totalCafes' => Cafe::whereIn('approval_status', ['active', 'approved'])->count(),
            'revenueToday' => (float) Booking::where('status', 'completed')
                ->whereDate('created_at', $today)
                ->where('payment_status', 'paid')
                ->sum('commission'),
            'activeBookings' => Booking::whereIn('status', ['pending', 'confirmed'])->count(),
            'pendingApprovals' => Cafe::where('approval_status', 'pending')->count(),
            'newCustomers' => User::where('role', 'customer')
                ->whereDate('created_at', $today)
                ->count(),
            'newOrders' => MenuOrder::whereDate('created_at', $today)->count(),
        ];

        return Inertia::render('admin/dashboard', ['metrics' => $metrics]);
    }

    public function recentActivity(): JsonResponse
    {
        $logs = AdminAuditLog::latest('created_at')
            ->limit(10)
            ->get();

        $entityLabels = $this->batchEntityLabels($logs);

        $activities = [];
        foreach ($logs as $log) {
            $activities[] = [
                'id' => $log->id,
                'type' => $log->action,
                'message' => $this->activityMessage($log, $entityLabels),
                'time' => $log->created_at->diffForHumans(),
            ];
        }

        return response()->json(['success' => true, 'data' => $activities]);
    }

    /**
     * @param array<string, array<int, string>> $entityLabels
     */
    private function activityMessage(AdminAuditLog $log, array $entityLabels): string
    {
        /** @var array<string, string> $labels */
        $labels = [
            'approve_cafe' => 'Cafe disetujui',
            'reject_cafe' => 'Cafe ditolak',
            'process_refund' => 'Refund diproses',
            'reject_refund' => 'Refund ditolak',
            'suspend_cafe' => 'Cafe di-suspend',
            'unsuspend_cafe' => 'Cafe di-unsuspend',
            'suspend_user' => 'User di-suspend',
            'unsuspend_user' => 'User di-unsuspend',
            'update_user' => 'Data user diperbarui',
            'update_commission' => 'Rate komisi diperbarui',
            'add_featured_cafe' => 'Cafe ditambahkan ke featured',
            'remove_featured_cafe' => 'Cafe dihapus dari featured',
            'update_featured_cafe' => 'Featured cafe diperbarui',
            'cancel_booking' => 'Booking dibatalkan',
        ];

        $label = $labels[$log->action] ?? ucfirst(str_replace('_', ' ', $log->action));

        $entity = $entityLabels[$log->entity_type][$log->entity_id] ?? null;

        return $entity === null ? $label : "{$label} — {$entity}";
    }

    /**
     * @param \Illuminate\Support\Collection<int, AdminAuditLog> $logs
     * @return array<string, array<int, string>>
     */
    private function batchEntityLabels(\Illuminate\Support\Collection $logs): array
    {
        $idsByType = [];

        foreach ($logs as $log) {
            $idsByType[$log->entity_type][] = $log->entity_id;
        }

        $labels = [];

        foreach ($idsByType as $type => $ids) {
            $uniqueIds = array_unique($ids);

            $labels[$type] = match ($type) {
                'cafe' => Cafe::whereIn('id', $uniqueIds)->pluck('name', 'id')->all(),
                'user' => User::whereIn('id', $uniqueIds)->pluck('name', 'id')->all(),
                'booking' => Booking::whereIn('id', $uniqueIds)->pluck('booking_reference', 'id')->all(),
                'refund_request' => array_combine($uniqueIds, array_map(fn ($id) => '#'.$id, $uniqueIds)),
                'featured_cafe' => FeaturedCafe::whereIn('id', $uniqueIds)
                    ->with('cafe:id,name')
                    ->get()
                    ->pluck('cafe.name', 'id')
                    ->all(),
                default => [],
            };
        }

        return $labels;
    }
}
