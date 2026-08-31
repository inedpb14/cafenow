<?php

declare(strict_types=1);

namespace App\Http\Controllers\Menu;

use App\Http\Controllers\Controller;
use App\Http\Resources\MenuItemResource;
use App\Models\Cafe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    public function index(Request $request, Cafe $cafe): JsonResponse
    {
        $query = $cafe->menuItems()->where('availability_status', 'available');

        if ($request->filled('category')) {
            $query->where('category', $request->string('category'));
        }

        $menuItems = $query->orderBy('category')->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => MenuItemResource::collection($menuItems),
        ]);
    }
}
