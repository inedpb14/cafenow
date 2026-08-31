<?php

declare(strict_types=1);

namespace App\Http\Controllers\Favorite;

use App\Http\Controllers\Controller;
use App\Http\Resources\FavoriteResource;
use App\Models\Cafe;
use App\Models\Favorite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate(['cafe_id' => ['required', 'exists:cafes,id']]);

        $cafeId = $request->integer('cafe_id');
        $userId = $request->user()->id;

        $exists = Favorite::where('customer_id', $userId)
            ->where('cafe_id', $cafeId)
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'CONFLICT', 'message' => 'Cafe sudah ada di daftar favorit'],
            ], 409);
        }

        $favorite = Favorite::create([
            'customer_id' => $userId,
            'cafe_id' => $cafeId,
        ]);

        return response()->json([
            'success' => true,
            'data' => new FavoriteResource($favorite),
        ], 201);
    }

    public function destroy(Request $request, Cafe $cafe): JsonResponse
    {
        $favorite = Favorite::where('customer_id', $request->user()->id)
            ->where('cafe_id', $cafe->id)
            ->firstOrFail();

        $favorite->delete();

        return response()->json(null, 204);
    }
}
