<?php

declare(strict_types=1);

use App\Http\Controllers\Booking\BookingController;
use App\Http\Controllers\Booking\CustomerBookingController;
use App\Http\Controllers\Booking\OwnerBookingController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::get('/bookings/availability', [BookingController::class, 'availability']);
    Route::get('/bookings/{booking}', [BookingController::class, 'show']);
    Route::put('/bookings/{booking}/cancel', [BookingController::class, 'cancel']);
    Route::put('/bookings/{booking}/reschedule', [BookingController::class, 'reschedule']);
    Route::post('/bookings/{booking}/checkin', [BookingController::class, 'checkIn']);
    Route::post('/bookings/{booking}/extend', [BookingController::class, 'extend']);
    Route::post('/bookings/{booking}/refund-request', [BookingController::class, 'refundRequest']);

    Route::get('/customer/bookings', [CustomerBookingController::class, 'index']);
});

Route::middleware(['auth:sanctum', 'role:owner'])->group(function () {
    Route::get('/owner/bookings', [OwnerBookingController::class, 'index']);
    Route::put('/owner/bookings/{booking}/cancel', [OwnerBookingController::class, 'cancel']);
    Route::put('/owner/bookings/{booking}/no-show', [OwnerBookingController::class, 'noShow']);
    Route::put('/owner/bookings/{booking}/checkout', [OwnerBookingController::class, 'checkout']);
});
