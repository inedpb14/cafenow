<?php

declare(strict_types=1);

namespace App\Http\Controllers\Order;

use App\Http\Controllers\Controller;
use App\Http\Resources\MenuOrderResource;
use App\Models\MenuOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MenuOrder::where('customer_id', $request->user()->id);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
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
}
