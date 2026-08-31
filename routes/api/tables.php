<?php

declare(strict_types=1);

use App\Http\Controllers\Table\OwnerTableController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:owner'])->group(function () {
    Route::post('/owner/tables', [OwnerTableController::class, 'store']);
    Route::put('/owner/tables/{table}', [OwnerTableController::class, 'update']);
    Route::delete('/owner/tables/{table}', [OwnerTableController::class, 'destroy']);
    Route::post('/owner/tables/{table}/booking-rules', [OwnerTableController::class, 'setBookingRules']);
});
