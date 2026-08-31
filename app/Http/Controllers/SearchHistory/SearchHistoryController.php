<?php

declare(strict_types=1);

namespace App\Http\Controllers\SearchHistory;

use App\Http\Controllers\Controller;
use App\Http\Resources\SearchHistoryResource;
use App\Models\SearchHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchHistoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $history = SearchHistory::where('customer_id', $request->user()->id)
            ->with('cafe')
            ->orderBy('viewed_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'data' => SearchHistoryResource::collection($history),
        ]);
    }

    public function destroyAll(Request $request): JsonResponse
    {
        SearchHistory::where('customer_id', $request->user()->id)->delete();

        return response()->json(null, 204);
    }

    public function destroyOne(Request $request, int $cafe): JsonResponse
    {
        SearchHistory::where('customer_id', $request->user()->id)
            ->where('cafe_id', $cafe)
            ->delete();

        return response()->json(null, 204);
    }
}
