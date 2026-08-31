# Medium Priority Fixes — Implementation Plan

> 7 item Medium priority dari gap analysis PRD vs codebase.
> Eksekusi berdasarkan urutan: 1 → 2 → 3 → 4 → 5+6+7 (coupled).

---

## Dependency Graph

```
Item 1 (Rate Limiting) ─── independen
Item 2 (Search History) ── tergantung CafeController@index
Item 3 (Featured Cafe) ─── tergantung CafeController@index (sama)
Item 4 (Geolocation) ───── tergantung CafeController@index (sama)
Item 5+6+7 (Notif + Email + Broadcast) ─── coupled, kerjakan bersama
```

Item 2–4 bisa digabung karena semua modifikasi di `CafeController@index`.

---

## Execution Status

| Item | Status | Tanggal | Files Changed |
|------|--------|---------|---------------|
| 1. Rate Limiting | ✅ **Executed** | 19 Jul 2026 | `AppServiceProvider`, `auth.php`, `bookings.php`, `orders.php` |
| 2. Search History Auto-Save | ✅ **Executed** | 19 Jul 2026 | `CafeController@index` |
| 3. Featured Cafe Prioritization | ✅ **Executed** | 19 Jul 2026 | `CafeController@index` |
| 4. Geolocation / Nearby Sorting | ✅ **Executed** | 19 Jul 2026 | `CafeController@index`, `AppServiceProvider` (SQLite math) |
| 5. Email Notifications | ✅ **Executed** | 19 Jul 2026 | 7 listeners, `BookingNotificationMail`, blade view |
| 6. Event Listeners + Reverb | ✅ **Executed** | 19 Jul 2026 | 7 events (ShouldBroadcast), 7 listeners, `AppServiceProvider` |
| 7. In-app Notification Endpoint | ✅ **Executed** | 19 Jul 2026 | `NotificationController`, `NotificationResource`, `notifications.php` routes |

---

## Item 1: Rate Limiting — Auth + Booking + Orders

### Masalah
Tidak ada throttle middleware di API routes. Auth endpoints (login, register) dan booking endpoints rawan brute-force / abuse.

### Solusi
Daftarkan named rate limiters di `AppServiceProvider`, lalu aplikasikan `throttle:` middleware ke route group.

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `app/Providers/AppServiceProvider.php` | Tambah `RateLimiter::for('api')` (60/min), `RateLimiter::for('auth')` (5/min), `RateLimiter::for('orders')` (30/min) |
| `routes/api/auth.php` | Tambah `throttle:auth` ke route register, login, forgot/reset password |
| `routes/api/bookings.php` | Tambah `throttle:api` ke route store, cancel, reschedule, extend, checkin |
| `routes/api/orders.php` | Tambah `throttle:orders` ke route store |

### Detail Rate Limiters

| Limiter | Limit | Target |
|---------|-------|--------|
| `auth` | 5/min per IP | register, login, forgot-password, reset-password |
| `api` | 60/min per user/IP | booking store/cancel/reschedule/extend/checkin |
| `orders` | 30/min per user/IP | order store |

---

## Item 2: Search History Auto-Save

### Masalah
Search history controller dan model sudah lengkap, tapi tidak ada yang memanggil auto-save saat user mencari cafe. History tidak pernah terisi.

### Solusi
Di `CafeController@index`, jika user terautentikasi dan ada `query` parameter, simpan ke `search_histories`.

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `app/Http/Controllers/Cafe/CafeController.php` | Setelah query, jika auth + ada query, upsert `SearchHistory::updateOrCreate` |

### Flow
1. Cek `auth('sanctum')->check()` dan `$request->filled('query')`
2. `SearchHistory::updateOrCreate(['customer_id' => $user->id, 'cafe_id' => null], ['query' => $q, 'viewed_at' => now()])`
   - `cafe_id` null karena pencarian umum, bukan spesifik cafe

---

## Item 3: Featured Cafe Prioritization

### Masalah
`CafeController@index` hanya order by `created_at desc`. Cafe featured tidak mendapat prioritas.

### Solusi
Join `featured_cafes` (active scope) dan order by `display_order` asc, lalu `created_at desc`.

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `app/Http/Controllers/Cafe/CafeController.php` | `leftJoin('featured_cafes', ...)` lalu `orderBy('featured_cafes.display_order')->orderBy('cafes.created_at', 'desc')` |

### Catatan
- `leftJoin` agar cafe non-featured tetap muncul (di belakang)
- `where('featured_cafes.active_from', '<=', now())` dan `active_to` check
- Hati-hati column ambiguity -> prefix `cafes.` di orderBy

---

## Item 4: Geolocation / Nearby Sorting

### Masalah
Cafe punya latitude/longitude tapi tidak bisa disortir berdasarkan jarak dari user.

### Solusi
Terima `lat` dan `lng` query params. Jika keduanya ada, hitung jarak pakai haversine formula dan order by jarak.

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `app/Http/Controllers/Cafe/CafeController.php` | Jika `lat` + `lng` filled, addSelect haversine distance, orderBy distance |

### Haversine Formula (MySQL/SQLite compatible)
```sql
(6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))
```

### Radius filter
Tambahkan `radius` (default 25 km) optional filter.

---

## Items 5+6+7: Notifications, Email, Broadcasting (Coupled)

### Masalah
7 event classes sudah di-dispatch, tapi:
- Tidak ada listeners → tidak ada side effect
- Tidak ada email yang terkirim
- Tidak ada broadcast ke Reverb
- `notifications` table tidak pernah diisi
- Tidak ada endpoint untuk membaca notifikasi

### Solusi Terintegrasi
Bikin satu listener per event yang handle 3 side effects: (A) in-app notification, (B) email, (C) broadcast.

### File yang Diubah (8 files baru + 2 modifikasi)

| # | File | Perubahan |
|---|------|-----------|
| 5+6+7a | `app/Listeners/SendBookingConfirmedNotification.php` | **Baru** — create in-app notification + send email |
| 5+6+7b | `app/Listeners/SendBookingCancelledNotification.php` | **Baru** |
| 5+6+7c | `app/Listeners/SendBookingRescheduledNotification.php` | **Baru** |
| 5+6+7d | `app/Listeners/SendBookingExtendedNotification.php` | **Baru** |
| 5+6+7e | `app/Listeners/SendBookingCheckInNotification.php` | **Baru** |
| 5+6+7f | `app/Listeners/SendPaymentReceivedNotification.php` | **Baru** |
| 5+6+7g | `app/Listeners/SendOrderPlacedNotification.php` | **Baru** |
| 5+6+7h | `app/Mail/BookingNotificationMail.php` | **Baru** — reusable Mailable untuk semua booking notification |
| 6 | `app/Providers/AppServiceProvider.php` | Daftarkan event→listener mapping di `boot()` |
| 7 | `app/Http/Controllers/Notification/NotificationController.php` | **Baru** — index, markAsRead, markAllAsRead |
| 7 | `app/Http/Resources/NotificationResource.php` | **Baru** |
| 7 | `routes/api/favorites.php` atau file baru | Tambah routes notification |

### Listener Pattern (setiap listener kurang lebih sama)

```
class SendXxxNotification
{
    public function handle(Xxx $event): void
    {
        // 1. Create in-app notification
        Notification::create([
            'recipient_id' => ...,
            'recipient_type' => 'customer',
            'subject' => '...',
            'message' => '...',
            'notification_type' => NotificationType::Xxx->value,
            'related_entity_type' => 'booking',
            'related_entity_id' => $event->bookingId,
            'sent_at' => now(),
            'delivery_status' => 'sent',
        ]);

        // 2. Send email (via Mail facade — logs by default)
        Mail::to($user->email)->send(new BookingNotificationMail(...));
    }
}
```

### Broadcasting (Reverb)
Events sudah punya `InteractsWithSockets`. Tambah `ShouldBroadcast` ke event yang perlu real-time:

| Event | Broadcast? | Channel |
|-------|-----------|---------|
| `BookingConfirmed` | ✅ | `booking.{bookingId}` |
| `BookingCancelled` | ✅ | `booking.{bookingId}` |
| `BookingRescheduled` | ✅ | `booking.{bookingId}` |
| `BookingExtended` | ✅ | `booking.{bookingId}` |
| `BookingCheckIn` | ✅ | `booking.{bookingId}` |
| `PaymentReceived` | ✅ | `booking.{payableId}` (jika payable type = booking) |
| `OrderPlaced` | ✅ | `booking.{bookingId}` |

Tambah `ShouldBroadcast` interface ke setiap event + implementasi `broadcastOn()`.

### Notification Endpoints

| Method | Path | Controller |
|--------|------|------------|
| GET | `/notifications` | `index` — list notifikasi user, paginated |
| PUT | `/notifications/{notification}/read` | `markAsRead` — set read_at |
| PUT | `/notifications/read-all` | `markAllAsRead` — set read_at for all |

Di-mount dalam middleware `auth:sanctum`.

---

## Ringkasan File yang Diubah/Dibuat

| Item | File | Aksi |
|------|------|------|
| 1 | `app/Providers/AppServiceProvider.php` | **Edit** — tambah RateLimiter |
| 1 | `routes/api/auth.php` | **Edit** — tambah throttle |
| 1 | `routes/api/bookings.php` | **Edit** — tambah throttle |
| 1 | `routes/api/orders.php` | **Edit** — tambah throttle |
| 2+3+4 | `app/Http/Controllers/Cafe/CafeController.php` | **Edit** — search history + featured + geolocation |
| 5+6+7a | `app/Listeners/SendBookingConfirmedNotification.php` | **Baru** |
| 5+6+7b | `app/Listeners/SendBookingCancelledNotification.php` | **Baru** |
| 5+6+7c | `app/Listeners/SendBookingRescheduledNotification.php` | **Baru** |
| 5+6+7d | `app/Listeners/SendBookingExtendedNotification.php` | **Baru** |
| 5+6+7e | `app/Listeners/SendBookingCheckInNotification.php` | **Baru** |
| 5+6+7f | `app/Listeners/SendPaymentReceivedNotification.php` | **Baru** |
| 5+6+7g | `app/Listeners/SendOrderPlacedNotification.php` | **Baru** |
| 5+6+7h | `app/Mail/BookingNotificationMail.php` | **Baru** |
| 6 | `app/Events/BookingConfirmed.php` | **Edit** — tambah ShouldBroadcast |
| 6 | `app/Events/BookingCancelled.php` | **Edit** — tambah ShouldBroadcast |
| 6 | `app/Events/BookingRescheduled.php` | **Edit** — tambah ShouldBroadcast |
| 6 | `app/Events/BookingExtended.php` | **Edit** — tambah ShouldBroadcast |
| 6 | `app/Events/BookingCheckIn.php` | **Edit** — tambah ShouldBroadcast |
| 6 | `app/Events/PaymentReceived.php` | **Edit** — tambah ShouldBroadcast |
| 6 | `app/Events/OrderPlaced.php` | **Edit** — tambah ShouldBroadcast |
| 7 | `app/Http/Controllers/Notification/NotificationController.php` | **Baru** |
| 7 | `app/Http/Resources/NotificationResource.php` | **Baru** |
| 7 | `routes/api/notifications.php` | **Baru** |
| 7 | `routes/api.php` | **Edit** — require notifications route |

---

*Dibuat: 19 July 2026*
