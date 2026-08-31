<?php

declare(strict_types=1);

use App\Http\Controllers\Order\CustomerOrderController;
use App\Http\Controllers\Order\OrderController;
use App\Http\Controllers\Order\OwnerOrderController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'throttle:orders'])->group(function () {
    Route::get('/orders/{menuOrder}', [OrderController::class, 'show']);
    Route::get('/customer/orders', [CustomerOrderController::class, 'index']);
});

Route::middleware(['auth:sanctum', 'role:owner'])->group(function () {
    Route::get('/owner/orders', [OwnerOrderController::class, 'index']);
    Route::put('/owner/orders/{menuOrder}/status', [OwnerOrderController::class, 'updateStatus']);
});
