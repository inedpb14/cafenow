<?php

declare(strict_types=1);

namespace App\Http\Controllers\Table;

use App\Http\Controllers\Controller;
use App\Http\Requests\Table\SetBookingRulesRequest;
use App\Http\Resources\BookingRuleResource;
use App\Http\Resources\TableResource;
use App\Models\Cafe;
use App\Models\Table;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OwnerTableController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'cafe_id' => ['required', 'exists:cafes,id'],
            'name' => ['required', 'string', 'max:255'],
            'capacity' => ['required', 'integer', 'min:1'],
            'table_type' => ['required', 'string', 'max:100'],
            'description' => ['sometimes', 'string', 'max:1000'],
            'photo' => ['sometimes', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $cafe = Cafe::findOrFail($request->integer('cafe_id'));

        if ($cafe->owner_id !== $request->user()->id) {
            abort(403);
        }

        if (! $cafe->isContentEditable()) {
            abort(403, 'Cafe belum aktif. Meja hanya dapat dikelola setelah cafe disetujui');
        }

        $exists = Table::where('cafe_id', $cafe->id)
            ->where('name', $request->string('name'))
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'CONFLICT', 'message' => 'Nama meja sudah digunakan di cafe ini'],
            ], 422);
        }

        $data = $request->only(['name', 'capacity', 'table_type', 'description']);
        $data['cafe_id'] = $cafe->id;

        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('table-photos', 'public');
        }

        $table = Table::create($data);

        return response()->json([
            'success' => true,
            'data' => new TableResource($table),
        ], 201);
    }

    public function update(Request $request, Table $table): JsonResponse
    {
        if ($table->cafe->owner_id !== $request->user()->id) {
            abort(403);
        }

        if (! $table->cafe->isContentEditable()) {
            abort(403, 'Cafe belum aktif. Meja hanya dapat dikelola setelah cafe disetujui');
        }

        $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'capacity' => ['sometimes', 'integer', 'min:1'],
            'table_type' => ['sometimes', 'string', 'max:100'],
            'description' => ['sometimes', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $table->update($request->only(['name', 'capacity', 'table_type', 'description', 'is_active']));

        return response()->json([
            'success' => true,
            'data' => new TableResource($table),
        ]);
    }

    public function destroy(Request $request, Table $table): JsonResponse
    {
        if ($table->cafe->owner_id !== $request->user()->id) {
            abort(403);
        }

        if (! $table->cafe->isContentEditable()) {
            abort(403, 'Cafe belum aktif. Meja hanya dapat dikelola setelah cafe disetujui');
        }

        $hasActiveBookings = $table->bookings()
            ->whereIn('status', ['pending', 'confirmed'])
            ->exists();

        if ($hasActiveBookings) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'CONFLICT', 'message' => 'Meja memiliki booking aktif'],
            ], 409);
        }

        $table->delete();

        return response()->json(null, 204);
    }

    public function setBookingRules(Request $request, Table $table): JsonResponse
    {
        if ($table->cafe->owner_id !== $request->user()->id) {
            abort(403);
        }

        if (! $table->cafe->isContentEditable()) {
            abort(403, 'Cafe belum aktif. Meja hanya dapat dikelola setelah cafe disetujui');
        }

        $ruleRequest = new SetBookingRulesRequest;
        $ruleRequest->merge($request->all());

        $request->validate($ruleRequest->rules());

        $data = $request->only([
            'rule_type', 'duration_minutes', 'price',
            'min_duration_minutes', 'max_duration_minutes',
            'base_price_per_hour', 'surge_rules', 'max_bookings_per_slot',
        ]);

        $rule = $table->bookingRule;

        if ($rule !== null) {
            $rule->update($data);
        } else {
            $rule = $table->bookingRule()->create($data);
        }

        return response()->json([
            'success' => true,
            'data' => new BookingRuleResource($rule),
        ]);
    }
}
