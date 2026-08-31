# Bug Fix Report — All Reviews

> **Tanggal**: 19 July 2026
> **Scope**: Semua bug dari review HIGH_PRIORITY_PLAN.md + MEDIUM_PRIORITY_PLAN.md
> **Total**: 9 bugs — 9 ✅ Fixed

---

## 🔴 High Priority (3 bugs)

### #1 — `OwnerBookingController@cancel` tidak dispatch event

- **File**: `app/Http/Controllers/Booking/OwnerBookingController.php`
- **Review**: HIGH_PRIORITY_PLAN review, Temuan #1
- **Masalah**: Controller langsung `$booking->update(['status' => 'cancelled'])`, tidak melalui `BookingService@cancel`. Akibatnya event `BookingCancelled` tidak di-dispatch → tidak ada notifikasi/broadcast.
- **Fix**: Inject `BookingService`, panggil `$this->bookingService->cancel($booking, 'owner', $reason)` yang otomatis dispatch `BookingCancelled` event.

```diff
- $booking->update([
-     'status' => 'cancelled',
-     'cancelled_by' => 'owner',
-     'cancellation_reason' => $request->input('cancellation_reason'),
- ]);
+ $this->bookingService->cancel($booking, 'owner', $request->input('cancellation_reason'));
```

---

### #2 — `SendOrderPlacedNotification` tidak kirim email

- **File**: `app/Listeners/SendOrderPlacedNotification.php`
- **Review**: MEDIUM_PRIORITY_PLAN review, Bug #1
- **Masalah**: Listener hanya create in-app notification, tidak mengirim email.
- **Fix**: Tambah `Mail::to()->send()` dengan `BookingNotificationMail`.

```diff
+ use App\Mail\BookingNotificationMail;
+ use Illuminate\Support\Facades\Mail;

  Notification::create([...]);

+ Mail::to($customer->email)->send(new BookingNotificationMail(
+     'Pesanan Ditempatkan',
+     "Pesanan #{$order->id} telah ditempatkan.",
+     $order->booking->booking_reference,
+     $order->booking->cafe->name,
+     $order->booking->booking_date->format('Y-m-d'),
+     $order->booking->start_time->format('H:i'),
+ ));
```

---

### #3 — `notification_type` enum salah di 2 listener

- **Files**: `app/Enums/NotificationType.php`, `app/Listeners/SendBookingCheckInNotification.php`, `app/Listeners/SendPaymentReceivedNotification.php`
- **Review**: MEDIUM_PRIORITY_PLAN review, Bug #2
- **Masalah**: `NotificationType` enum tidak punya case `BookingCheckIn` dan `PaymentReceived`. Kedua listener fallback ke `BookingConfirmed` — isi notifikasi tidak sesuai.
- **Fix**: Tambah 2 case ke enum, update listener.

```diff
// NotificationType.php
  case BookingExtended = 'booking_extended';
+ case BookingCheckIn = 'booking_check_in';
+ case PaymentReceived = 'payment_received';
  case OrderPlaced = 'order_placed';
```

```diff
// SendBookingCheckInNotification.php
- 'notification_type' => NotificationType::BookingConfirmed->value,
+ 'notification_type' => NotificationType::BookingCheckIn->value,

// SendPaymentReceivedNotification.php
- 'notification_type' => NotificationType::BookingConfirmed->value,
+ 'notification_type' => NotificationType::PaymentReceived->value,
```

---

## 🟠 Medium Priority (3 bugs)

### #4 — `BookingController@checkIn` double check-in

- **File**: `app/Http/Controllers/Booking/BookingController.php`
- **Review**: HIGH_PRIORITY_PLAN review, Temuan #2
- **Masalah**: Tidak ada guard untuk double check-in. Jika dipanggil dua kali, `check_in_time` ter-overwrite tanpa error.
- **Fix**: Tambah guard sebelum update.

```diff
+ if ($booking->check_in_time !== null) {
+     return response()->json([
+         'success' => false,
+         'data' => null,
+         'error' => ['code' => 'ALREADY_CHECKED_IN', 'message' => 'Sudah check-in sebelumnya'],
+     ], 409);
+ }
  $booking->update(['check_in_time' => now()]);
```

---

### #5 — Route order konflik `read-all` vs `{notification}/read`

- **File**: `routes/api/notifications.php`
- **Review**: MEDIUM_PRIORITY_PLAN review, Item 7
- **Masalah**: Dynamic route `{notification}/read` dideklarasikan sebelum static route `read-all`. Laravel bisa salah mengikat `read-all` sebagai model ID.
- **Fix**: Tukar urutan — static route di atas dynamic route.

```diff
  Route::get('/notifications', [NotificationController::class, 'index']);
- Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
  Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
+ Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
```

---

### #6 — `NotificationController@index` bocor antar role

- **File**: `app/Http/Controllers/Notification/NotificationController.php`
- **Review**: MEDIUM_PRIORITY_PLAN review, Item 7
- **Masalah**: Hanya filter `recipient_id`. Jika user customer punya ID yang sama dengan notifikasi owner (edge case), notifikasi owner bisa muncul ke customer.
- **Fix**: Tambah filter `recipient_type`.

```diff
- $notifications = Notification::where('recipient_id', $request->user()->id)
+ $user = $request->user();
+ $notifications = Notification::where('recipient_id', $user->id)
+     ->where('recipient_type', $user->role->value)
      ->orderBy('sent_at', 'desc')
      ->paginate($request->integer('per_page', 15));
```

---

## 🟡 Low Priority (3 bugs)

### #7 — `AutoCompleteBookings` query lintas hari

- **File**: `app/Console/Commands/AutoCompleteBookings.php`
- **Review**: HIGH_PRIORITY_PLAN review, Temuan #3
- **Masalah**: `where('end_time', '<=', 'H:i')` + `where('booking_date', '<=', today())` bisa meng-complete booking dari hari sebelumnya yang end_time-nya match.
- **Fix**: Gabung `booking_date` + `end_time` sebagai datetime penuh untuk perbandingan.

```diff
- $count = Booking::where('status', 'confirmed')
-     ->where('end_time', '<=', Carbon::now()->format('H:i:s'))
-     ->where('booking_date', '<=', today())
-     ->whereNotNull('check_in_time')
-     ->whereNull('check_out_time')
+ $now = Carbon::now()->format('Y-m-d H:i:s');
+ $count = Booking::where('status', 'confirmed')
+     ->whereRaw("(booking_date || ' ' || end_time) <= ?", [$now])
+     ->whereNotNull('check_in_time')
+     ->whereNull('check_out_time')
```

---

### #8 — Validasi `lat`/`lng` tidak ada

- **File**: `app/Http/Controllers/Cafe/CafeController.php`
- **Review**: MEDIUM_PRIORITY_PLAN review, Catatan Item 4
- **Masalah**: Parameter `lat`/`lng` tidak divalidasi. String seperti `"abc"` di-cast ke `0.0` tanpa error.
- **Fix**: Tambah `numeric` + `between` validation rule.

```diff
+ if ($request->filled('lat')) {
+     $request->validate(['lat' => ['numeric', 'between:-90,90']]);
+ }
+ if ($request->filled('lng')) {
+     $request->validate(['lng' => ['numeric', 'between:-180,180']]);
+ }
```

---

### #9 — Dead import `use App\Models\User` di 6 listener

- **Files**: Semua listener di `app/Listeners/` (kecuali `SendOrderPlacedNotification`)
- **Review**: MEDIUM_PRIORITY_PLAN review, Catatan Item 5+6
- **Masalah**: `use App\Models\User;` di-import tapi tidak pernah dipakai di method `handle()`.
- **Fix**: Hapus import dari 6 file.

```diff
  use App\Models\Notification;
- use App\Models\User;
  use Illuminate\Support\Facades\Mail;
```

---

## Ringkasan

| Prioritas | Total | Fixed |
|-----------|-------|-------|
| 🔴 High | 3 | 3 ✅ |
| 🟠 Medium | 3 | 3 ✅ |
| 🟡 Low | 3 | 3 ✅ |
| **Total** | **9** | **9 ✅** |

### Files Affected

| File | Bug # |
|------|-------|
| `app/Http/Controllers/Booking/OwnerBookingController.php` | #1 |
| `app/Http/Controllers/Booking/BookingController.php` | #4 |
| `app/Http/Controllers/Cafe/CafeController.php` | #8 |
| `app/Http/Controllers/Notification/NotificationController.php` | #6 |
| `app/Console/Commands/AutoCompleteBookings.php` | #7 |
| `app/Listeners/SendOrderPlacedNotification.php` | #2 |
| `app/Listeners/SendBookingCheckInNotification.php` | #3, #9 |
| `app/Listeners/SendPaymentReceivedNotification.php` | #3, #9 |
| `app/Listeners/SendBookingConfirmedNotification.php` | #9 |
| `app/Listeners/SendBookingCancelledNotification.php` | #9 |
| `app/Listeners/SendBookingRescheduledNotification.php` | #9 |
| `app/Listeners/SendBookingExtendedNotification.php` | #9 |
| `app/Enums/NotificationType.php` | #3 |
| `routes/api/notifications.php` | #5 |
| **Total** | **14 files** |
