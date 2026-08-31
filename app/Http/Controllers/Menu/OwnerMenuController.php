<?php

declare(strict_types=1);

namespace App\Http\Controllers\Menu;

use App\Http\Controllers\Controller;
use App\Http\Requests\Menu\StoreMenuItemRequest;
use App\Http\Resources\MenuItemResource;
use App\Models\Cafe;
use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OwnerMenuController extends Controller
{
    public function store(StoreMenuItemRequest $request): JsonResponse
    {
        $dto = $request->toDto();

        /** @var Cafe $cafe */
        $cafe = Cafe::findOrFail($dto['cafe_id']);

        if ($cafe->owner_id !== $request->user()->id) {
            abort(403);
        }

        if (! $cafe->isContentEditable()) {
            abort(403, 'Cafe belum aktif. Menu hanya dapat dikelola setelah cafe disetujui');
        }

        $data = $dto;

        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('menu-photos', 'public');
        }

        $menuItem = MenuItem::create($data);

        return response()->json([
            'success' => true,
            'data' => new MenuItemResource($menuItem),
        ], 201);
    }

    public function update(StoreMenuItemRequest $request, MenuItem $menuItem): JsonResponse
    {
        /** @var Cafe $cafe */
        $cafe = $menuItem->cafe;

        if ($cafe->owner_id !== $request->user()->id) {
            abort(403);
        }

        if (! $menuItem->cafe->isContentEditable()) {
            abort(403, 'Cafe belum aktif. Menu hanya dapat dikelola setelah cafe disetujui');
        }

        $dto = $request->toDto();

        $data = $dto;

        if ($request->hasFile('photo')) {
            if ($menuItem->photo !== null) {
                Storage::delete($menuItem->photo);
            }

            $data['photo'] = $request->file('photo')->store('menu-photos', 'public');
        }

        $menuItem->update($data);

        return response()->json([
            'success' => true,
            'data' => new MenuItemResource($menuItem),
        ]);
    }

    public function destroy(Request $request, MenuItem $menuItem): JsonResponse
    {
        /** @var Cafe $cafe */
        $cafe = $menuItem->cafe;

        if ($cafe->owner_id !== $request->user()->id) {
            abort(403);
        }

        if (! $menuItem->cafe->isContentEditable()) {
            abort(403, 'Cafe belum aktif. Menu hanya dapat dikelola setelah cafe disetujui');
        }

        $menuItem->delete();

        return response()->json(null, 204);
    }

    public function toggle(Request $request, MenuItem $menuItem): JsonResponse
    {
        /** @var Cafe $cafe */
        $cafe = $menuItem->cafe;

        if ($cafe->owner_id !== $request->user()->id) {
            abort(403);
        }

        if (! $menuItem->cafe->isContentEditable()) {
            abort(403, 'Cafe belum aktif. Menu hanya dapat dikelola setelah cafe disetujui');
        }

        $newStatus = $menuItem->availability_status === 'available' ? 'out_of_stock' : 'available';
        $menuItem->update(['availability_status' => $newStatus]);

        return response()->json([
            'success' => true,
            'data' => new MenuItemResource($menuItem),
        ]);
    }

    public function bulkToggle(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['required', 'integer', 'exists:menu_items,id'],
            'cafe_id' => ['required', 'integer', 'exists:cafes,id'],
        ]);

        /** @var Cafe $cafe */
        $cafe = Cafe::findOrFail($request->integer('cafe_id'));

        if ($cafe->owner_id !== $request->user()->id) {
            abort(403);
        }

        if (! $cafe->isContentEditable()) {
            abort(403, 'Cafe belum aktif. Menu hanya dapat dikelola setelah cafe disetujui');
        }

        $items = MenuItem::whereIn('id', $request->input('ids'))
            ->where('cafe_id', $cafe->id)
            ->get();

        $count = 0;

        foreach ($items as $item) {
            $item->update([
                'availability_status' => $item->availability_status === 'available' ? 'out_of_stock' : 'available',
            ]);
            $count++;
        }

        return response()->json([
            'success' => true,
            'data' => ['toggled_count' => $count],
        ]);
    }
}
