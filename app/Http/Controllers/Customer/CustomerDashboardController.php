<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Cafe;
use App\Models\Favorite;
use App\Models\MenuOrder;
use App\Models\Notification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerDashboardController extends Controller
{
    /**
     * Display the customer dashboard overview.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // 1. Upcoming booking (active/confirmed/checked-in)
        $upcomingBooking = Booking::with(['cafe', 'table'])
            ->where('customer_id', $user->id)
            ->whereIn('status', ['confirmed', 'checked_in', 'pending'])
            ->where('booking_date', '>=', now()->toDateString())
            ->orderBy('booking_date', 'asc')
            ->orderBy('start_time', 'asc')
            ->first();

        // 2. Recent bookings
        $recentBookings = Booking::with(['cafe', 'table'])
            ->where('customer_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // 3. Recent orders
        $recentOrders = MenuOrder::with(['cafe', 'items.menuItem'])
            ->where('customer_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // 4. Stats
        $stats = [
            'total_bookings' => Booking::where('customer_id', $user->id)->count(),
            'total_orders' => MenuOrder::where('customer_id', $user->id)->count(),
            'total_favorites' => Favorite::where('customer_id', $user->id)->count(),
            'unread_notifications' => Notification::where('recipient_id', $user->id)
                ->whereNull('read_at')
                ->count(),
        ];

        return Inertia::render('customer/dashboard', [
            'upcoming_booking' => $upcomingBooking,
            'recent_bookings' => $recentBookings,
            'recent_orders' => $recentOrders,
            'stats' => $stats,
        ]);
    }

    /**
     * Display customer bookings list.
     */
    public function bookings(Request $request): Response
    {
        $user = $request->user();
        $status = $request->query('status', 'all');

        $query = Booking::with(['cafe', 'table'])
            ->where('customer_id', $user->id);

        if ($status === 'upcoming') {
            $query->whereIn('status', ['confirmed', 'checked_in', 'pending'])
                ->where('booking_date', '>=', now()->toDateString());
        } elseif ($status === 'completed') {
            $query->where('status', 'completed');
        } elseif ($status === 'cancelled') {
            $query->where('status', 'cancelled');
        }

        $bookings = $query->orderBy('created_at', 'desc')->paginate(10);

        return Inertia::render('customer/bookings', [
            'bookings' => $bookings,
            'filters' => [
                'status' => $status,
            ],
        ]);
    }

    /**
     * Display a specific booking detail.
     */
    public function bookingDetail(Request $request, Booking $booking): Response
    {
        $user = $request->user();

        if ($booking->customer_id !== $user->id) {
            abort(403, 'Akses ditolak');
        }

        $booking->load(['cafe', 'table', 'payment', 'menuOrders.items.menuItem']);

        return Inertia::render('customer/booking-detail', [
            'booking' => $booking,
        ]);
    }

    /**
     * Cancel a booking.
     */
    public function cancelBooking(Request $request, Booking $booking): RedirectResponse
    {
        $user = $request->user();

        if ($booking->customer_id !== $user->id) {
            abort(403, 'Akses ditolak');
        }

        if (! in_array($booking->status, ['pending', 'confirmed'])) {
            return back()->with('error', 'Reservasi ini tidak dapat dibatalkan.');
        }

        $booking->update([
            'status' => 'cancelled',
            'cancelled_by' => 'customer',
            'cancellation_reason' => $request->input('reason', 'Dibatalkan oleh pelanggan'),
        ]);

        return redirect()->route('customer.bookings')->with('success', 'Reservasi berhasil dibatalkan.');
    }

    /**
     * Delete a booking history entry (only cancelled or completed).
     * Menu orders and their items are removed by DB cascade.
     */
    public function destroyBooking(Request $request, Booking $booking): RedirectResponse
    {
        $user = $request->user();

        if ($booking->customer_id !== $user->id) {
            abort(403, 'Akses ditolak');
        }

        if (! in_array($booking->status, ['cancelled', 'completed'])) {
            return back()->with('error', 'Hanya reservasi berstatus dibatalkan atau selesai yang dapat dihapus.');
        }

        $booking->delete();

        return redirect()->route('customer.bookings')->with('success', 'Riwayat reservasi berhasil dihapus.');
    }

    /**
     * Display customer menu orders history.
     */
    public function orders(Request $request): Response
    {
        $user = $request->user();
        $status = $request->query('status', 'all');

        $query = MenuOrder::with(['cafe', 'items.menuItem', 'booking'])
            ->where('customer_id', $user->id);

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate(10);

        return Inertia::render('customer/orders', [
            'orders' => $orders,
            'filters' => [
                'status' => $status,
            ],
        ]);
    }

    /**
     * Display a single menu order detail.
     */
    public function orderDetail(Request $request, MenuOrder $order): Response
    {
        $user = $request->user();

        if ($order->customer_id !== $user->id) {
            abort(403, 'Akses ditolak');
        }

        $order->load(['cafe', 'booking', 'items.menuItem']);

        return Inertia::render('customer/order-detail', [
            'order' => $order,
        ]);
    }

    /**
     * Display customer favorite cafes.
     */
    public function favorites(Request $request): Response
    {
        $user = $request->user();

        $favorites = Favorite::with('cafe')
            ->where('customer_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('customer/favorites', [
            'favorites' => $favorites,
        ]);
    }

    /**
     * Toggle favorite status for a cafe.
     */
    public function toggleFavorite(Request $request, Cafe $cafe): RedirectResponse
    {
        $user = $request->user();

        $favorite = Favorite::where('customer_id', $user->id)
            ->where('cafe_id', $cafe->id)
            ->first();

        if ($favorite) {
            $favorite->delete();
            $message = 'Cafe dihapus dari favorit.';
        } else {
            Favorite::create([
                'customer_id' => $user->id,
                'cafe_id' => $cafe->id,
            ]);
            $message = 'Cafe ditambahkan ke favorit.';
        }

        return back()->with('success', $message);
    }

    /**
     * Display customer notifications.
     */
    public function notifications(Request $request): Response
    {
        $user = $request->user();

        $notifications = Notification::where('recipient_id', $user->id)
            ->orderBy('sent_at', 'desc')
            ->paginate(15);

        return Inertia::render('customer/notifications', [
            'notifications' => $notifications,
        ]);
    }

    /**
     * Mark notification as read.
     */
    public function markNotificationRead(Request $request, Notification $notification): RedirectResponse
    {
        $user = $request->user();

        if ($notification->recipient_id !== $user->id) {
            abort(403, 'Akses ditolak');
        }

        $notification->update(['read_at' => now()]);

        return back();
    }

    /**
     * Hapus satu notifikasi (soft delete).
     */
    public function deleteNotification(Request $request, Notification $notification): RedirectResponse
    {
        $user = $request->user();

        if ($notification->recipient_id !== $user->id) {
            abort(403, 'Akses ditolak');
        }

        $notification->delete();

        return back()->with('success', 'Notifikasi dihapus.');
    }

    /**
     * Hapus beberapa notifikasi sekaligus (soft delete).
     */
    public function bulkDeleteNotifications(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:notifications,id'],
        ]);

        $deleted = Notification::whereIn('id', $validated['ids'])
            ->where('recipient_id', $request->user()->id)
            ->delete();

        return back()->with('success', $deleted.' notifikasi dihapus.');
    }
}
