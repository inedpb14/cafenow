<?php

use App\Actions\Fortify\CreateOwnerUser;
use App\Enums\UserRole;
use App\Http\Controllers\Admin\AdminBookingController;
use App\Http\Controllers\Admin\AdminCafeRegistrationController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Booking\BookingController;
use App\Http\Controllers\Cafe\CafeController;
use App\Http\Controllers\Customer\CustomerDashboardController;
use App\Http\Controllers\Owner\OwnerDashboardController;
use App\Http\Controllers\Payment\PaymentController;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

Route::get('/', [CafeController::class, 'welcome'])->name('home');

// Owner Registration — Guest Only
Route::middleware('guest')->group(function () {
    Route::get('owner/register', function (): Response {
        return Inertia::render('auth/owner-register');
    })->name('owner.register');

    Route::post('owner/register', function (Request $request, CreateOwnerUser $creator): RedirectResponse {
        $user = $creator->create($request->all());
        Auth::login($user);

        return redirect()->route('dashboard');
    })->name('owner.register.store');
});

Route::get('logout', function (Request $request) {
    Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();

    return redirect('/');
});

Route::inertia('cafes', 'cafes/index')->name('cafes.index');
Route::get('cafes/{cafe}', [CafeController::class, 'show'])->name('cafes.detail');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function (Request $request) {
        $user = $request->user();
        if ($user && $user->role === UserRole::Admin) {
            return redirect()->route('admin.dashboard');
        }
        if ($user && $user->role === UserRole::Owner) {
            return redirect()->route('owner.dashboard');
        }

        return redirect()->route('customer.dashboard');
    })->name('dashboard');

    // Customer Booking Wizard Page
    Route::get('cafes/{cafe}/book', [CafeController::class, 'bookPage'])->name('cafes.book');
    Route::post('cafes/{cafe}/book', [BookingController::class, 'storeBooking'])->name('cafes.book.store');

    // Dummy-mode payment simulation (active only when Midtrans server key is empty)
    Route::get('payments/{orderId}/simulate', [PaymentController::class, 'simulatePage'])->name('payments.simulate');
    Route::post('payments/{orderId}/simulate', [PaymentController::class, 'simulatePay'])->name('payments.simulate.pay');
    Route::post('payments/resume/{booking}', [PaymentController::class, 'resume'])->name('payments.resume');

    // Customer Portal Routes
    Route::middleware(['role:customer'])->prefix('customer')->name('customer.')->group(function () {
        Route::get('dashboard', [CustomerDashboardController::class, 'index'])->name('dashboard');
        Route::get('bookings', [CustomerDashboardController::class, 'bookings'])->name('bookings');
        Route::get('bookings/{booking}', [CustomerDashboardController::class, 'bookingDetail'])->name('bookings.detail');
        Route::post('bookings/{booking}/cancel', [CustomerDashboardController::class, 'cancelBooking'])->name('bookings.cancel');
        Route::delete('bookings/{booking}', [CustomerDashboardController::class, 'destroyBooking'])->name('bookings.destroy');
        Route::get('orders', [CustomerDashboardController::class, 'orders'])->name('orders');
        Route::get('orders/{order}', [CustomerDashboardController::class, 'orderDetail'])->name('orders.detail');
        Route::get('favorites', [CustomerDashboardController::class, 'favorites'])->name('favorites');
        Route::post('favorites/{cafe}/toggle', [CustomerDashboardController::class, 'toggleFavorite'])->name('favorites.toggle');
        Route::get('notifications', [CustomerDashboardController::class, 'notifications'])->name('notifications');
        Route::post('notifications/{notification}/read', [CustomerDashboardController::class, 'markNotificationRead'])->name('notifications.read');
        Route::delete('notifications/{notification}', [CustomerDashboardController::class, 'deleteNotification'])->name('notifications.destroy');
        Route::delete('notifications', [CustomerDashboardController::class, 'bulkDeleteNotifications'])->name('notifications.bulk-destroy');
    });

    // Owner Routes
    Route::middleware(['role:owner'])->group(function () {
        // Cafe CRUD — always available so a pending/rejected owner can complete and submit the profile
        Route::get('owner/cafes', [OwnerDashboardController::class, 'cafes'])->name('owner.cafes.index');
        Route::post('owner/cafes', [OwnerDashboardController::class, 'storeCafe'])->name('owner.cafes.store');
        Route::put('owner/cafes/{cafe}', [OwnerDashboardController::class, 'updateCafe'])->name('owner.cafes.update');
        Route::post('owner/cafes/{cafe}/hours', [OwnerDashboardController::class, 'saveHours'])->name('owner.cafes.hours');
        Route::post('owner/cafes/{cafe}/photos', [OwnerDashboardController::class, 'uploadCafePhotos'])->name('owner.cafes.photos');

        // ponytail: all other owner features require at least one approved (active) cafe
        Route::middleware('cafe.approved')->group(function () {
            Route::get('owner/dashboard', [OwnerDashboardController::class, 'index'])->name('owner.dashboard');
            Route::post('owner/bookings/{booking}/check-in', [OwnerDashboardController::class, 'checkIn'])->name('owner.bookings.check-in');
            Route::post('owner/bookings/{booking}/complete', [OwnerDashboardController::class, 'completeBooking'])->name('owner.bookings.complete');
            Route::patch('owner/orders/{order}/status', [OwnerDashboardController::class, 'updateOrderStatus'])->name('owner.orders.update-status');

            // Tables CRUD
            Route::get('owner/cafes/tables', [OwnerDashboardController::class, 'tables'])->name('owner.cafes.tables');
            Route::post('owner/cafes/tables', [OwnerDashboardController::class, 'storeTable'])->name('owner.cafes.tables.store');
            Route::put('owner/cafes/tables/{table}', [OwnerDashboardController::class, 'updateTable'])->name('owner.cafes.tables.update');
            Route::delete('owner/cafes/tables/{table}', [OwnerDashboardController::class, 'destroyTable'])->name('owner.cafes.tables.destroy');

            // Menus CRUD
            Route::get('owner/cafes/menus', [OwnerDashboardController::class, 'menus'])->name('owner.cafes.menus');
            Route::post('owner/cafes/menus', [OwnerDashboardController::class, 'storeMenu'])->name('owner.cafes.menus.store');
            Route::put('owner/cafes/menus/{menu}', [OwnerDashboardController::class, 'updateMenu'])->name('owner.cafes.menus.update');
            Route::delete('owner/cafes/menus/{menu}', [OwnerDashboardController::class, 'destroyMenu'])->name('owner.cafes.menus.destroy');

            Route::get('owner/bookings', [OwnerDashboardController::class, 'bookings'])->name('owner.bookings');
            Route::get('owner/orders', [OwnerDashboardController::class, 'orders'])->name('owner.orders');
            Route::get('owner/analytics', [OwnerDashboardController::class, 'analytics'])->name('owner.analytics');
        });
    });

    // Admin Routes
    Route::middleware(['role:admin'])->group(function () {
        Route::get('admin/dashboard', [AdminDashboardController::class, 'index'])->name('admin.dashboard');
        Route::get('admin/cafe-approvals/{cafe}', [AdminCafeRegistrationController::class, 'showPage'])->name('admin.cafe-approvals.show');
        Route::inertia('admin/cafe-approvals', 'admin/Cafe/Approvals')->name('admin.cafe-approvals');
        Route::inertia('admin/cafes', 'admin/Cafe/Management')->name('admin.cafes');
        Route::inertia('admin/featured-cafes', 'admin/Cafe/Featured')->name('admin.featured-cafes');
        Route::inertia('admin/bookings', 'admin/Booking/Oversight')->name('admin.bookings');
        Route::get('admin/bookings/{booking}', [AdminBookingController::class, 'showPage'])->name('admin.bookings.show');
        Route::inertia('admin/refunds', 'admin/Refund/Queue')->name('admin.refunds');
        Route::inertia('admin/analytics', 'admin/Analytics')->name('admin.analytics');
        Route::inertia('admin/commissions', 'admin/Commission/Management')->name('admin.commissions');
        Route::inertia('admin/users', 'admin/User/Management')->name('admin.users');
        Route::inertia('admin/audit-logs', 'admin/User/AuditLogs')->name('admin.audit-logs');
    });
});

require __DIR__.'/settings.php';
