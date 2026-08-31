<?php

declare(strict_types=1);

namespace App\Http\Controllers\Order;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\UpdateOrderStatusRequest;
use App\Http\Resources\MenuOrderResource;
use App\Models\MenuOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OwnerOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cafeIds = $request->user()->cafes()->pluck('id');

        $query = MenuOrder::whereIn('cafe_id', $cafeIds);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', (string) $request->string('date'));
        }

        $query->orderBy('created_at', 'desc');

        $perPage = $request->integer('per_page', 15);
        $orders = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => MenuOrderResource::collection($orders),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function updateStatus(UpdateOrderStatusRequest $request, MenuOrder $menuOrder): JsonResponse
    {
        $cafeIds = $request->user()->cafes()->pluck('id');

        if (! $cafeIds->contains($menuOrder->cafe_id)) {
            abort(403);
        }

        $newStatus = (string) $request->string('status');

        $allowedTransitions = [
            'pending_payment' => ['confirmed'],
            'confirmed' => ['preparing'],
            'preparing' => ['ready'],
            'ready' => ['completed'],
        ];

        $allowed = $allowedTransitions[$menuOrder->status] ?? [];
        $allowed[] = 'cancelled';

        if (! in_array($newStatus, $allowed, true)) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'INVALID_TRANSITION', 'message' => "Tidak bisa mengubah status dari {$menuOrder->status} ke {$newStatus}"],
            ], 422);
        }

        $menuOrder->update(['status' => $newStatus]);

        return response()->json([
            'success' => true,
            'data' => new MenuOrderResource($menuOrder->fresh()),
        ]);
    }
}
