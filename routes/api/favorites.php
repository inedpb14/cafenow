<?php

declare(strict_types=1);

use App\Http\Controllers\Favorite\CustomerFavoriteController;
use App\Http\Controllers\Favorite\FavoriteController;
use App\Http\Controllers\SearchHistory\SearchHistoryController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:customer'])->group(function () {
    Route::post('/favorites', [FavoriteController::class, 'store']);
    Route::delete('/favorites/{cafe}', [FavoriteController::class, 'destroy']);
    Route::get('/customer/favorites', [CustomerFavoriteController::class, 'index']);

    Route::get('/customer/search-history', [SearchHistoryController::class, 'index']);
    Route::delete('/customer/search-history', [SearchHistoryController::class, 'destroyAll']);
    Route::delete('/customer/search-history/{cafe}', [SearchHistoryController::class, 'destroyOne']);
});
