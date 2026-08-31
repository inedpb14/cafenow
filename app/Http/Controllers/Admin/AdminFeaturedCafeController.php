<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\FeaturedCafeResource;
use App\Models\AdminAuditLog;
use App\Models\Cafe;
use App\Models\FeaturedCafe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminFeaturedCafeController extends Controller
{
    public function index(): JsonResponse
    {
        $featured = FeaturedCafe::with('cafe')->orderBy('display_order')->get();

        return response()->json([
            'success' => true,
            'data' => FeaturedCafeResource::collection($featured),
        ]);
    }

    public function options(): JsonResponse
    {
        $cafes = Cafe::whereIn('approval_status', ['active', 'approved'])
            ->whereNotIn('id', FeaturedCafe::select('cafe_id'))
            ->orderBy('name')
            ->get(['id', 'name', 'location']);

        return response()->json([
            'success' => true,
            'data' => $cafes,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'cafe_id' => ['required', 'exists:cafes,id'],
            'display_order' => ['required', 'integer', 'min:0'],
            'active_from' => ['required', 'date'],
            'active_to' => ['sometimes', 'date', 'after:active_from'],
        ]);

        $cafe = Cafe::find($request->integer('cafe_id'));

        if (! $cafe->isActive()) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'CAFE_NOT_ACTIVE', 'message' => 'Hanya cafe aktif yang bisa dijadikan featured'],
            ], 422);
        }

        $exists = FeaturedCafe::where('cafe_id', $request->integer('cafe_id'))->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'CONFLICT', 'message' => 'Cafe sudah ada di daftar featured'],
            ], 409);
        }

        $featured = FeaturedCafe::create([
            'cafe_id' => $request->integer('cafe_id'),
            'display_order' => $request->integer('display_order'),
            'active_from' => $request->date('active_from'),
            'active_to' => $request->date('active_to'),
            'created_by' => $request->user()->id,
        ]);

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'add_featured_cafe',
            'entity_type' => 'featured_cafe',
            'entity_id' => $featured->id,
            'before_value' => [],
            'after_value' => $featured->toArray(),
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => new FeaturedCafeResource($featured),
        ], 201);
    }

    public function update(Request $request, FeaturedCafe $featuredCafe): JsonResponse
    {
        $request->validate([
            'display_order' => ['sometimes', 'integer', 'min:0'],
            'active_from' => ['sometimes', 'date'],
            'active_to' => ['sometimes', 'date', 'nullable', 'after:active_from'],
        ]);

        $featuredCafe->update($request->only(['display_order', 'active_from', 'active_to']));

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'update_featured_cafe',
            'entity_type' => 'featured_cafe',
            'entity_id' => $featuredCafe->id,
            'before_value' => [],
            'after_value' => $featuredCafe->fresh()->toArray(),
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => new FeaturedCafeResource($featuredCafe->fresh()),
        ]);
    }

    public function destroy(Request $request, FeaturedCafe $featuredCafe): JsonResponse
    {
        $featuredCafe->delete();

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'remove_featured_cafe',
            'entity_type' => 'featured_cafe',
            'entity_id' => $featuredCafe->id,
            'before_value' => [],
            'after_value' => [],
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return response()->json(null, 204);
    }
}
