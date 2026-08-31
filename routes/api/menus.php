<?php

declare(strict_types=1);

use App\Http\Controllers\Menu\OwnerMenuController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:owner'])->group(function () {
    Route::post('/owner/menus', [OwnerMenuController::class, 'store']);
    Route::put('/owner/menus/{menuItem}', [OwnerMenuController::class, 'update']);
    Route::delete('/owner/menus/{menuItem}', [OwnerMenuController::class, 'destroy']);
    Route::put('/owner/menus/{menuItem}/toggle', [OwnerMenuController::class, 'toggle']);
    Route::put('/owner/menus/bulk-toggle', [OwnerMenuController::class, 'bulkToggle']);
});
