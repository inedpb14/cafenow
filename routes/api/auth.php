<?php

declare(strict_types=1);

use App\Http\Controllers\Auth\AdminAuthController;
use App\Http\Controllers\Auth\CustomerAuthController;
use App\Http\Controllers\Auth\CustomerProfileController;
use App\Http\Controllers\Auth\OwnerAuthController;
use App\Http\Controllers\Auth\OwnerProfileController;
use Illuminate\Support\Facades\Route;

// Customer Auth
Route::post('/auth/register', [CustomerAuthController::class, 'register'])->middleware('throttle:auth');
Route::post('/auth/login', [CustomerAuthController::class, 'login'])->middleware('throttle:auth');
Route::post('/auth/social-login', [CustomerAuthController::class, 'socialLogin'])->middleware('throttle:auth');
// ponytail: email verification (OTP) disabled; routes removed, controller/OtpService kept for re-enable
Route::post('/auth/forgot-password', [CustomerAuthController::class, 'forgotPassword'])->middleware('throttle:auth');
Route::post('/auth/reset-password', [CustomerAuthController::class, 'resetPassword'])->middleware('throttle:auth');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [CustomerAuthController::class, 'logout']);
    Route::post('/auth/refresh-token', [CustomerAuthController::class, 'refreshToken']);

    Route::get('/customer/profile', [CustomerProfileController::class, 'show']);
    Route::put('/customer/profile', [CustomerProfileController::class, 'update']);
});

// Owner Auth
Route::post('/owner/register', [OwnerAuthController::class, 'register'])->middleware('throttle:auth');
Route::post('/owner/login', [OwnerAuthController::class, 'login'])->middleware('throttle:auth');
Route::post('/owner/forgot-password', [OwnerAuthController::class, 'forgotPassword'])->middleware('throttle:auth');
Route::post('/owner/reset-password', [OwnerAuthController::class, 'resetPassword'])->middleware('throttle:auth');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/owner/profile', [OwnerProfileController::class, 'show']);
    Route::put('/owner/profile', [OwnerProfileController::class, 'update']);
});

// Admin Auth
Route::post('/admin/login', [AdminAuthController::class, 'login'])->middleware('throttle:auth');
