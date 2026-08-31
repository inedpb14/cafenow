<?php

declare(strict_types=1);

namespace App\Http\Controllers\Favorite;

use App\Http\Controllers\Controller;
use App\Http\Resources\CafeResource;
use App\Models\Favorite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerFavoriteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $favorites = Favorite::where('customer_id', $request->user()->id)
            ->with('cafe')
            ->latest()
            ->get();

        $cafes = $favorites->pluck('cafe');

        return response()->json([
            'success' => true,
            'data' => CafeResource::collection($cafes),
        ]);
    }
}
