<?php

declare(strict_types=1);

namespace App\Http\Controllers\Order;

use App\Http\Controllers\Controller;
use App\Http\Resources\MenuOrderResource;
use App\Models\MenuOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function show(Request $request, MenuOrder $menuOrder): JsonResponse
    {
        $user = $request->user();

        if ($menuOrder->customer_id !== $user->id && $menuOrder->cafe->owner_id !== $user->id) {
            abort(403);
        }

        $menuOrder->load(['items.menuItem', 'cafe', 'booking']);

        return response()->json([
            'success' => true,
            'data' => new MenuOrderResource($menuOrder),
        ]);
    }
}
