# 🔍 Analisis Review — MEDIUM_PRIORITY_PLAN.md

> Review dilakukan: **2026-07-19 16:24 WIB** — verifikasi setiap item plan terhadap kode aktual.

---

## 📊 Ringkasan Eksekusi

| Item | Status di Plan | Verifikasi Aktual | Catatan |
|------|---------------|-------------------|---------|
| 1. Rate Limiting | ✅ Executed | ✅ **Terverifikasi** | Semua limiter terdaftar dan diterapkan ke route |
| 2. Search History Auto-Save | ✅ Executed | ✅ **Terverifikasi** | Implementasi sesuai plan |
| 3. Featured Cafe Prioritization | ✅ Executed | ✅ **Terverifikasi** | leftJoin + COALESCE ordering benar |
| 4. Geolocation / Nearby Sorting | ✅ Executed | ✅ **Terverifikasi** | Haversine + radius filter ada |
| 5. Email Notifications | ✅ Executed | ⚠️ **Ada Bug** | `SendOrderPlacedNotification` tidak kirim email |
| 6. Event Listeners + Reverb | ✅ Executed | ⚠️ **Ada Bug** | 2 listener pakai `NotificationType` yang salah |
| 7. In-app Notification Endpoint | ✅ Executed | ⚠️ **Potensi Bug** | Route order `read-all` vs `{notification}` rawan konflik |

---

## Item 1: Rate Limiting ✅ Terverifikasi

### `AppServiceProvider` — Rate Limiters:

| Limiter | Limit | Per | Status |
|---------|-------|-----|--------|
| `auth` | 5/min | IP | ✅ Ada — `Limit::perMinute(5)->by($request->ip())` |
| `api` | 60/min | user/IP | ✅ Ada — `Limit::perMinute(60)->by($request->user()?->id ?? $request->ip())` |
| `orders` | 30/min | user/IP | ✅ Ada — `Limit::perMinute(30)->by($request->user()?->id ?? $request->ip())` |

### Penerapan ke Routes:

| Route File | Middleware | Status |
|------------|-----------|--------|
| `auth.php` | `throttle:auth` di semua endpoint public auth | ✅ Benar — register, login, forgot/reset, owner register/login, admin login |
| `bookings.php` | `['auth:sanctum', 'throttle:api']` group-level | ✅ Benar |
| `orders.php` | `['auth:sanctum', 'throttle:orders']` group-level | ✅ Benar |

> **Bonus**: `auth.php` menerapkan throttle ke lebih banyak endpoint dari yang direncanakan (social-login, verify-otp, resend-otp juga di-throttle). Ini lebih aman.

---

## Item 2: Search History Auto-Save ✅ Terverifikasi

### `CafeController@index` — Implementasi Aktual:

```php
if ($request->filled('query')) {
    $q = $request->string('query');
    // ... filter query ...

    if (Auth::check()) {
        SearchHistory::updateOrCreate(
            ['customer_id' => Auth::id(), 'query' => $q],
            ['viewed_at' => now()],
        );
    }
}
```

✅ Sesuai plan. `updateOrCreate` dengan key `customer_id + query` mencegah duplikat.

> **Catatan minor**: Plan menyebutkan `cafe_id = null` sebagai bagian dari unique key, tapi implementasi aktual tidak menyertakan `cafe_id` di key (hanya `customer_id + query`). Ini justru **lebih bersih** karena search history adalah per-query, bukan per-cafe.

---

## Item 3: Featured Cafe Prioritization ✅ Terverifikasi

### `CafeController@index` — leftJoin + Ordering:

```php
$query->leftJoin('featured_cafes', function ($join) use ($now): void {
    $join->on('cafes.id', '=', 'featured_cafes.cafe_id')
        ->where('featured_cafes.active_from', '<=', $now)
        ->where(function ($q) use ($now): void {
            $q->where('featured_cafes.active_to', '>=', $now)
              ->orWhereNull('featured_cafes.active_to');
        });
});

$query->orderByRaw('COALESCE(featured_cafes.display_order, 999999)')
      ->orderBy('cafes.created_at', 'desc');
```

✅ Implementasi melebihi plan — menggunakan `COALESCE(..., 999999)` alih-alih `orderBy('featured_cafes.display_order')` sederhana. Ini **lebih robust** karena cafe non-featured yang `display_order = null` tidak akan error dan tetap muncul di belakang.

---

## Item 4: Geolocation / Nearby Sorting ✅ Terverifikasi

### Implementasi Aktual:

```php
if ($request->filled('lat') && $request->filled('lng')) {
    $lat = (float) $request->string('lat');
    $lng = (float) $request->string('lng');
    $radius = (float) $request->string('radius', '25');

    $haversine = '(6371 * acos(...))';
    $query->selectRaw("cafes.*, {$haversine} AS distance", [$lat, $lng, $lat])
          ->havingRaw('distance <= ?', [$radius])
          ->orderBy('distance');
} else {
    $query->select('cafes.*');
}
```

✅ Haversine formula benar, radius filter ada, SQLite math functions (`acos`, `cos`, `sin`, `radians`) sudah didaftarkan di `AppServiceProvider`.

> **Catatan**: Parameter `lat` dan `lng` tidak divalidasi tipe data. String seperti `"abc"` akan di-cast ke `0.0` tanpa error. Pertimbangkan menambah validasi `numeric` di request.

---

## Item 5 + 6: Email + Broadcasting ⚠️ Ada Bug

### Status file:
- 7 listeners: ✅ Semua ada
- `BookingNotificationMail.php`: ✅ Ada
- `booking-notification.blade.php`: ✅ Ada
- 7 events dengan `ShouldBroadcast`: ✅ Semua ada dan implement `broadcastOn()`
- `AppServiceProvider` event→listener mapping: ✅ 7 mapping terdaftar

---

### 🐛 Bug #1 — `SendOrderPlacedNotification` Tidak Kirim Email

```php
// SendOrderPlacedNotification.php - AKTUAL
public function handle(OrderPlaced $event): void
{
    $order = MenuOrder::with('booking.cafe', 'booking.customer')->find($event->menuOrderId);
    if (! $order) return;

    Notification::create([...]); // ← hanya in-app notification

    // ❌ TIDAK ADA Mail::to()->send() !
}
```

Plan menyatakan setiap listener harus handle 3 side effects: **in-app + email + broadcast**.
`SendOrderPlacedNotification` hanya menangani in-app notification. Email tidak dikirim.

---

### 🐛 Bug #2 — `notification_type` Salah di 2 Listener

`SendBookingCheckInNotification` memakai `NotificationType::BookingConfirmed`:

```php
// SendBookingCheckInNotification.php - Line 30
'notification_type' => NotificationType::BookingConfirmed->value,
//                                       ^^^^^^^^^^^^^^^^ SALAH — seharusnya tidak ada BookingCheckIn di enum
```

`SendPaymentReceivedNotification` memakai `NotificationType::BookingConfirmed`:

```php
// SendPaymentReceivedNotification.php - Line 32
'notification_type' => NotificationType::BookingConfirmed->value,
//                                       ^^^^^^^^^^^^^^^^ SALAH
```

**Akar masalah**: `NotificationType` enum **tidak punya case untuk `BookingCheckIn` dan `PaymentReceived`**. Developer fallback ke `BookingConfirmed` karena tidak ada nilai yang tepat.

> Enum yang ada: `BookingConfirmed`, `BookingCancelled`, `BookingRescheduled`, `BookingExtended`, `OrderPlaced` — tapi **tidak ada `BookingCheckIn`** dan **tidak ada `PaymentReceived`**.

**Fix yang diperlukan**:
1. Tambah 2 case baru ke `NotificationType` enum
2. Update kedua listener untuk menggunakan case yang benar

---

### Import `User` yang Tidak Dipakai

Semua listener booking (kecuali `SendOrderPlacedNotification`) memiliki:
```php
use App\Models\User; // ← tidak pernah dipakai di dalam handle()
```

Ini bukan bug fungsional, tapi dead import yang perlu dibersihkan.

---

## Item 7: Notification Endpoint ⚠️ Potensi Bug Route Order

### Endpoints yang Ada:

| Method | Path | Aktual | Status |
|--------|------|--------|--------|
| GET | `/notifications` | ✅ `NotificationController@index` | ✅ |
| PUT | `/notifications/{notification}/read` | ✅ `NotificationController@markAsRead` | ✅ |
| PUT | `/notifications/read-all` | ✅ `NotificationController@markAllAsRead` | ⚠️ |

### ⚠️ Potensi Bug — Route Order Konflik

```php
// notifications.php - urutan saat ini:
Route::get('/notifications', ...);
Route::put('/notifications/{notification}/read', ...);   // Line 10
Route::put('/notifications/read-all', ...);              // Line 11
```

**Masalah**: Laravel mencocokkan route secara **berurutan dari atas ke bawah**. Untuk `PUT /notifications/read-all`, Laravel bisa salah anggap `read-all` sebagai value dari `{notification}` wildcard (Line 10) jika ada model binding yang cocok.

**Rekomendasi**: Letakkan static route (`read-all`) **sebelum** dynamic route (`{notification}/read`):

```php
// Urutan yang aman:
Route::put('/notifications/read-all', ...);              // static dulu
Route::put('/notifications/{notification}/read', ...);   // dynamic belakangan
```

> Dalam praktik, Laravel biasanya aman karena Model Binding akan gagal jika `read-all` bukan ID valid — tapi ini bergantung pada implementasi model Notification. Lebih aman diurut ulang.

---

### `NotificationController@index` — Tidak Filter `recipient_type`

```php
Notification::where('recipient_id', $request->user()->id)->...
```

Query hanya filter by `recipient_id`. Jika ada notifikasi owner dengan `recipient_type = 'owner'` dan `recipient_id` sama dengan ID user customer (kebetulan), notifikasi owner bisa ikut muncul ke customer.

---

## 📋 Ringkasan Temuan & Rekomendasi

| Prioritas | Bug/Masalah | File | Rekomendasi |
|-----------|-------------|------|-------------|
| 🔴 High | `SendOrderPlacedNotification` tidak kirim email | `Listeners/SendOrderPlacedNotification.php` | Tambah `Mail::to()->send(...)` |
| 🔴 High | `notification_type` salah pada 2 listener | `SendBookingCheckInNotification`, `SendPaymentReceivedNotification` | Tambah `BookingCheckIn` & `PaymentReceived` case ke enum, update listener |
| 🟠 Medium | Route order `read-all` vs `{notification}` | `routes/api/notifications.php` | Pindah `read-all` ke atas `{notification}/read` |
| 🟠 Medium | `NotificationController@index` tidak filter `recipient_type` | `NotificationController.php` | Tambah `->where('recipient_type', ...)` |
| 🟡 Low | Validasi `lat`/`lng` tidak ada | `CafeController.php` | Tambah `numeric` validation rule |
| 🟡 Low | Dead import `use App\Models\User` di 6 listener | Semua booking listeners | Hapus unused import |

---

## ✅ Kesimpulan

- **4 dari 7 item** diimplementasi dengan sempurna dan melebihi ekspektasi plan.
- **Item 5 & 6** (Email + Broadcasting) memiliki **2 bug nyata** yang akan menyebabkan data salah di `notifications` table dan email tidak terkirim untuk order.
- **Item 7** (Notification Endpoint) fungsional tapi perlu **perbaikan route order** dan **filter `recipient_type`** untuk keamanan data.
