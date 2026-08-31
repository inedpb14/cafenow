<?php

declare(strict_types=1);

use App\Http\Controllers\Payment\PaymentController;
use Illuminate\Support\Facades\Route;

Route::post('/payments/webhook', [PaymentController::class, 'webhook']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/payments/{payment}/status', [PaymentController::class, 'status']);
});
