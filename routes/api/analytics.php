<?php

declare(strict_types=1);

use App\Http\Controllers\Analytics\OwnerAnalyticsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:owner'])->group(function () {
    Route::get('/owner/analytics/dashboard', [OwnerAnalyticsController::class, 'dashboard']);
    Route::get('/owner/analytics/revenue', [OwnerAnalyticsController::class, 'revenue']);
    Route::get('/owner/analytics/bookings', [OwnerAnalyticsController::class, 'bookings']);
    Route::get('/owner/analytics/menus', [OwnerAnalyticsController::class, 'menus']);
});
