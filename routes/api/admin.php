<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\AdminAnalyticsController;
use App\Http\Controllers\Admin\AdminAuditLogController;
use App\Http\Controllers\Admin\AdminBookingController;
use App\Http\Controllers\Admin\AdminCafeController;
use App\Http\Controllers\Admin\AdminCafeRegistrationController;
use App\Http\Controllers\Admin\AdminCommissionController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminFeaturedCafeController;
use App\Http\Controllers\Admin\AdminRefundController;
use App\Http\Controllers\Admin\AdminUserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {

    Route::get('/dashboard/recent-activity', [AdminDashboardController::class, 'recentActivity']);

    Route::prefix('analytics')->group(function () {
        Route::get('/', [AdminAnalyticsController::class, 'index']);
        Route::get('/revenue', [AdminAnalyticsController::class, 'revenue']);
        Route::get('/cafes', [AdminAnalyticsController::class, 'topCafes']);
        Route::get('/bookings/status', [AdminAnalyticsController::class, 'bookingStatus']);
        Route::get('/commission', [AdminAnalyticsController::class, 'commission']);
        Route::get('/platform', [AdminAnalyticsController::class, 'platform']);
        Route::get('/export-csv', [AdminAnalyticsController::class, 'exportCsv']);
    });

    Route::prefix('cafes')->group(function () {
        Route::get('/', [AdminCafeController::class, 'index']);
        Route::get('/options', [AdminCafeController::class, 'options']);
        Route::get('/{cafe}', [AdminCafeController::class, 'show']);
        Route::post('/{cafe}/suspend', [AdminCafeController::class, 'suspend']);
        Route::post('/{cafe}/unsuspend', [AdminCafeController::class, 'unsuspend']);
    });

    Route::prefix('cafe-approvals')->group(function () {
        Route::get('/', [AdminCafeRegistrationController::class, 'index']);
        Route::get('/{cafe}', [AdminCafeRegistrationController::class, 'show']);
        Route::post('/{cafe}/approve', [AdminCafeRegistrationController::class, 'approve']);
        Route::post('/{cafe}/reject', [AdminCafeRegistrationController::class, 'reject']);
    });

    Route::apiResource('featured-cafes', AdminFeaturedCafeController::class)->except(['show']);
    Route::get('featured-cafes/options', [AdminFeaturedCafeController::class, 'options']);

    Route::prefix('bookings')->group(function () {
        Route::get('/', [AdminBookingController::class, 'index']);
    });

    Route::prefix('refunds')->group(function () {
        Route::get('/', [AdminRefundController::class, 'index']);
        Route::get('/{refund}', [AdminRefundController::class, 'show']);
        Route::post('/{refund}/process', [AdminRefundController::class, 'process']);
        Route::post('/{refund}/reject', [AdminRefundController::class, 'reject']);
    });

    Route::prefix('commissions')->group(function () {
        Route::get('/rates', [AdminCommissionController::class, 'rates']);
        Route::get('/history', [AdminCommissionController::class, 'history']);
        Route::patch('/rates/{type}', [AdminCommissionController::class, 'updateRate']);
    });

    Route::prefix('users')->group(function () {
        Route::get('/', [AdminUserController::class, 'index']);
        Route::patch('/{user}', [AdminUserController::class, 'update']);
        Route::post('/{user}/suspend', [AdminUserController::class, 'suspend']);
        Route::post('/{user}/unsuspend', [AdminUserController::class, 'unsuspend']);
    });

    Route::get('/audit-logs', [AdminAuditLogController::class, 'index']);
});
