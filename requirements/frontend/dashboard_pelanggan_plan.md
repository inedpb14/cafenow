# Plan: Customer Dashboard — CafeNow

## Kondisi Saat Ini

| Fitur | Backend (API) | Frontend (Pages) |
|-------|--------------|-------------------|
| Booking history | `GET /customer/bookings` | ❌ |
| Order history | `GET /customer/orders` | ❌ |
| Favorites list | `GET /customer/favorites` | ❌ |
| Notifications | `GET /notifications` | ❌ |
| Search history | `GET /customer/search-history` | ❌ |
| Booking page (`/book`) | `POST /bookings`, availability, etc. | ✅ tapi static placeholder |
| Customer dashboard | — | ❌ redirect ke `/` |
| Profile/Settings | via API | ✅ sudah ada |

## Arsitektur

### Controller
**`app/Http/Controllers/Customer/CustomerDashboardController.php`** — single controller, 6 methods:

| Method | Route | View |
|--------|-------|------|
| `index()` | `GET /dashboard` | `customer/dashboard` |
| `bookings()` | `GET /bookings` | `customer/bookings` |
| `bookingDetail(Booking $booking)` | `GET /bookings/{booking}` | `customer/booking-detail` |
| `orders()` | `GET /orders` | `customer/orders` |
| `favorites()` | `GET /favorites` | `customer/favorites` |
| `notifications()` | `GET /notifications` | `customer/notifications` |

Semua method panggil service/query yang sama dengan API endpoints.

### Data Shapes per Page

**Dashboard:**
```php
[
  'upcoming_booking' => BookingResource | null,
  'recent_bookings'  => BookingResource::collection($last3),
  'recent_orders'    => MenuOrderResource::collection($last3),
  'stats' => [
    'total_bookings'           => int,
    'total_orders'             => int,
    'total_favorites'          => int,
    'unread_notifications'     => int,
  ],
]
```

**Bookings (list):**
```php
[
  'bookings' => PaginatedResponse<BookingResource>,
  'filters'  => ['status' => 'upcoming|completed|cancelled|all'],
]
```

**Booking Detail:**
```php
[
  'booking' => BookingResource (with cafe + payment + table + menuOrders),
]
```

**Orders:**
```php
[
  'orders'  => PaginatedResponse<MenuOrderResource>,
  'filters' => ['status' => 'pending|completed|cancelled|all'],
]
```

**Favorites:**
```php
[
  'favorites' => Collection { id, cafe_id, cafe: { name, slug, city, primary_photo, rating, price_starting, category } },
]
```

**Notifications:**
```php
[
  'notifications' => PaginatedResponse<NotificationResource>,
]
```

### Layout
**`resources/js/layouts/customer-layout.tsx`** — Sidebar navigasi customer (collapsible, responsive):

```
+----------------------+-------------------+
|   ☕ CafeNow         |                   |
|                      |   Page Content    |
|   📊 Dashboard       |                   |
|   📋 My Bookings     |                   |
|   🛒 My Orders       |                   |
|   ❤️ Favorites       |                   |
|   🔔 Notifications   |                   |
|   ⚙️ Settings        |                   |
|                      |                   |
|   👤 User Menu       |                   |
+----------------------+-------------------+
```

Register di `resources/js/app.tsx` via layout resolver:
```ts
'customer/*': CustomerLayout,
'dashboard': CustomerLayout,
'bookings/*': CustomerLayout,
'orders': CustomerLayout,
'favorites': CustomerLayout,
'notifications': CustomerLayout,
```

### Routes (`routes/web.php`)

```php
use App\Http\Controllers\Customer\CustomerDashboardController;

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard — role-based redirect
    Route::get('dashboard', function (Request $request) {
        $user = $request->user();
        return match ($user->role) {
            UserRole::Admin => redirect()->route('admin.dashboard'),
            UserRole::Owner => redirect()->route('owner.dashboard'),
            UserRole::Customer => redirect()->route('customer.dashboard'),
        };
    })->name('dashboard');

    // Customer Routes
    Route::prefix('customer')->name('customer.')->group(function () {
        Route::get('dashboard', [CustomerDashboardController::class, 'index'])->name('dashboard');
        Route::get('bookings', [CustomerDashboardController::class, 'bookings'])->name('bookings');
        Route::get('bookings/{booking}', [CustomerDashboardController::class, 'bookingDetail'])->name('bookings.detail');
        Route::get('orders', [CustomerDashboardController::class, 'orders'])->name('orders');
        Route::get('favorites', [CustomerDashboardController::class, 'favorites'])->name('favorites');
        Route::get('notifications', [CustomerDashboardController::class, 'notifications'])->name('notifications');
    });
});
```

### Pages (7 files)

| # | File | Isi |
|---|------|-----|
| 1 | `resources/js/layouts/customer-layout.tsx` | Sidebar + content area, NavMain items khusus customer |
| 2 | `resources/js/pages/customer/dashboard.tsx` | Upcoming booking card, recent bookings mini-list, recent orders mini-list, stats cards, quick actions |
| 3 | `resources/js/pages/customer/bookings.tsx` | Filter tabs (All/Upcoming/Completed/Cancelled) + booking cards + infinite scroll |
| 4 | `resources/js/pages/customer/booking-detail.tsx` | Hero cafe photo, booking info card, payment status, cancel/reschedule buttons, cancel confirmation modal |
| 5 | `resources/js/pages/customer/orders.tsx` | Filter tabs + order cards + order items summary per card |
| 6 | `resources/js/pages/customer/favorites.tsx` | Grid of cafe cards (compact) + unfavorite button per card |
| 7 | `resources/js/pages/customer/notifications.tsx` | Notification list, unread indicator, mark read, mark all read |

### Booking Page Fix (`resources/js/pages/cafes/book.tsx`)

Ganti static form ke flow fungsional (4 langkah):

**1. Pilih Tanggal & Tamu** → `GET /api/cafes/{cafe}/availability?date=...&guests=...`
**2. Pilih Sesi** → Tampilkan available slots + table yang cocok
**3. Konfirmasi** → Ringkasan + catatan opsional
**4. Submit** → `POST /api/bookings` → redirect ke `/customer/bookings/{id}`

### Styling
- `block-card` untuk cards (border-2 + shadow 6px)
- `btn-primary` / `btn-secondary` untuk buttons
- `font-serif` untuk headings (Playfair Display SC)
- Warna: `--bg-warm`, `--primary`, `--text`, `--text-muted`, `--border`

### Files — Create

```
app/Http/Controllers/Customer/CustomerDashboardController.php
resources/js/layouts/customer-layout.tsx
resources/js/pages/customer/dashboard.tsx
resources/js/pages/customer/bookings.tsx
resources/js/pages/customer/booking-detail.tsx
resources/js/pages/customer/orders.tsx
resources/js/pages/customer/favorites.tsx
resources/js/pages/customer/notifications.tsx
```

### Files — Modify

```
routes/web.php              — tambah customer route group, update dashboard redirect
resources/js/app.tsx        — register layout resolver
resources/js/pages/cafes/book.tsx  — ganti static jadi fungsional
```
