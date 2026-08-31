<?php

declare(strict_types=1);

namespace App\Http\Controllers\Table;

use App\Http\Controllers\Controller;
use App\Http\Resources\TableResource;
use App\Models\Cafe;
use App\Models\Table;
use App\Services\Booking\AvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TableController extends Controller
{
    public function __construct(
        private readonly AvailabilityService $availabilityService,
    ) {}

    public function index(Cafe $cafe): JsonResponse
    {
        $tables = $cafe->tables()->active()->with('bookingRule')->get();

        return response()->json([
            'success' => true,
            'data' => TableResource::collection($tables),
        ]);
    }

    public function slots(Request $request, Cafe $cafe, Table $table): JsonResponse
    {
        $request->validate([
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
        ]);

        if ($table->cafe_id !== $cafe->id) {
            abort(404);
        }

        $date = (string) $request->string('date');

        $slots = $this->availabilityService->getSlots($table->id, $date, $cafe->id, $cafe->operational_hours);

        $rule = $table->bookingRule;

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $date,
                'table' => new TableResource($table),
                'slots' => $slots->map(fn (array $slot) => [
                    ...$slot,
                    'price' => $rule->price ?? 0,
                ]),
            ],
        ]);
    }
}
