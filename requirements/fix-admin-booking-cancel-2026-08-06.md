# Laporan Perbaikan Bug Operasional — AdminBookingController@cancel

Tanggal: 2026-08-06
Status: SELESAI — 5/5 test baru pass, full suite 122/123 (1 kegagalan pre-existing, tidak terkait).

## Ringkasan Bug

`AdminBookingController@cancel` (endpoint `POST /api/admin/bookings/{booking}/cancel`) sebelumnya hanya melakukan `$booking->update(['status' => 'cancelled', 'cancellation_reason' => ...])` — mengubah status langsung di DB **tanpa**:

1. Melepas slot lock table (`LockService::releaseForBooking`) — slot tetap terkunci, menyulitkan booking baru di slot yang sama sampai TTL cache (15 menit) habis.
2. Dispatch event `BookingCancelled` — customer tidak mendapat notifikasi pembatalan (padahal admin yang membatalkan).

Sementara `BookingService@cancel` sudah menangani keduanya dengan benar dan sudah dipakai oleh fitur cascade suspend (Part 1B), owner cancel, dan customer cancel. Refactor ini menyatukan jalur admin ke service yang sama agar perilakunya konsisten.

## Kontrak `BookingService@cancel`

```
cancel(Booking $booking, string $cancelledBy, ?string $reason = null): void
```

- **Tidak memvalidasi status booking** — tidak melempar untuk booking yang sudah cancelled / terminal; akan "membatalkan ulang" dengan aman (idempoten pada level DB, tapi menimpa `cancelled_by`).
- **Batasan waktu khusus customer:** jika `$cancelledBy === 'customer'`, melempar `CancellationTimeExpiredException` bila selisih waktu ke mulai booking < 3 jam. Untuk aktor lain (admin/owner/system) tidak ada batasan.
- **Efek samping lengkap:**
  1. Update DB: `status = 'cancelled'`, `cancelled_by`, `cancellation_reason`.
  2. `LockService::releaseForBooking($booking)` — menghapus cache key `table_lock:{tableId}:{date}:{startTime}`.
  3. `BookingCancelled::dispatch($bookingId, $cancelledBy, $reason)` — event broadcast (`PrivateChannel booking.{id}`) yang didengarkan `SendBookingCancelledNotification` (listener di `AppServiceProvider.php:56`) → membuat row `Notification` untuk customer + kirim email `BookingNotificationMail`.
- **Bukan dalam DB::transaction** — update + release lock + event berjalan berurutan biasa.

## Konvensi `cancelled_by` — Temuan dan Keputusan

Seluruh aplikasi memakai **aktor string**, bukan user id:

| Konteks | Nilai | Lokasi |
|---|---|---|
| Customer cancel | `'customer'` | `BookingController@cancel` (BookingController.php:96) |
| Owner cancel | `'owner'` | `OwnerBookingController@cancel` (OwnerBookingController.php:64) |
| Owner no-show | `'owner'` | OwnerBookingController.php:90 |
| Customer dashboard | `'customer'` | CustomerDashboardController.php:133 |
| Cascade suspend (Part 1B) | `'system'` | AdminCafeController.php:71 |
| Expired pending | `'system'` | CancelExpiredPendingBookings.php:27 |

Enum `CancelledBy` (Customer/Owner/**Admin**/System) **sudah mendefinisikan `case Admin = 'admin'`** namun belum pernah dipakai di mana pun.

**Keputusan:** gunakan `CancelledBy::Admin->value` (`'admin'`) — melengkapi konvensi enum yang sudah dirancang, konsisten dengan pola aktor string yang dipakai semua caller lain, dan otomatis terpropagasi ke event `BookingCancelled` serta kolom `cancelled_by` booking.

## Perubahan Kode — `AdminBookingController@cancel`

**Sebelum:**
```php
$booking->update(['status' => 'cancelled', 'cancellation_reason' => $request->string('cancellation_reason')]);
```

**Sesudah:**
```php
if (! in_array($booking->status, self::CANCELLABLE_STATUSES, true)) {
    return response()->json([
        'success' => false, 'data' => null,
        'error' => ['code' => 'INVALID_STATUS',
            'message' => 'Booking hanya dapat dibatalkan saat berstatus pending atau confirmed'],
    ], 422);
}

$reason = $request->string('cancellation_reason');
$this->bookingService->cancel($booking, CancelledBy::Admin->value, $reason);

$this->logAdminAction(...); // tidak berubah
```

- `BookingService` di-inject via constructor (`readonly` property, pola sama seperti `AdminCafeController`).
- Guard status baru: hanya `pending`/`confirmed` yang bisa dibatalkan → **422 `INVALID_STATUS`** untuk sudah-cancelled / terminal (`completed`, `no_show`). Ini ditambahkan eksplisit karena `BookingService@cancel` sendiri tidak melempar pada status invalid — tanpa guard, pembatalan ulang akan sukses secara diam-diam dan menimpa `cancelled_by`.
- Audit log (Part 2) tetap persis: action `cancel_booking`, entity `booking`, `before = ['status' => ...]`, `after = ['status' => 'cancelled', 'cancellation_reason' => ...]` — dijalankan setelah panggilan service.
- Response sukses tidak berubah: `200 {"success": true, "message": "Booking cancelled"}`. Frontend `Oversight.tsx` hanya mengecek `response.ok` dan mengirim `cancellation_reason` — tidak ada perubahan yang memecah frontend.

## Edge Cases yang Ditangani

| Skenario | Perilaku |
|---|---|
| Booking sudah `cancelled` | 422 `INVALID_STATUS`, tidak ada perubahan data, tidak ada audit log |
| Booking terminal (`completed`, `no_show`) | 422 `INVALID_STATUS` |
| Booking `pending`/`confirmed` | Dibatalkan via service: lock release + event + notifikasi + audit log |
| Tanpa `cancellation_reason` di request | reason menjadi string kosong, perilaku sama seperti sebelum fix |
| Booking yang lock-nya sudah tidak ada (mis. sudah release saat konfirmasi pembayaran) | `releaseForBooking` idempoten (Cache::forget) — aman |

## File yang Berubah

| File | Perubahan |
|---|---|
| `app/Http/Controllers/Admin/AdminBookingController.php` | Refactor cancel → `BookingService@cancel`, guard status 422, inject service |
| `tests/Feature/Admin/AdminBookingControllerTest.php` | **Baru** — 5 test |

## Test — Hasil

**Test baru (`AdminBookingControllerTest`, 5/5 pass, 25 assertions):**

1. `test_cancel_dispatches_booking_cancelled_event` — `Event::fake` + `assertDispatched(BookingCancelled, cancelledBy='admin', reason benar)`; verifikasi kolom DB `status/cancelled_by/cancellation_reason`.
2. `test_cancel_releases_slot_lock` — kunci slot via `LockService::acquireForBooking`, cancel, assert `isLocked` = false.
3. `test_cancel_records_audit_log` — tepat 1 row `AdminAuditLog` dengan action/entity/admin_id/before/after yang benar (regresi Part 2).
4. `test_cancel_already_cancelled_booking_returns_422` — 422 `INVALID_STATUS`, 0 audit log, status tetap `cancelled`.
5. `test_cancel_completed_booking_returns_422` — 422 `INVALID_STATUS`, 0 audit log.

**Full suite: 122/123 pass (404 assertions).**

- Satu-satunya kegagalan: `DashboardTest::test_authenticated_users_can_visit_the_dashboard` (302 vs 200) — pre-existing sejak awal sesi, tidak terkait perubahan ini.
- Regresi yang dipantau khusus:
  - `CafeSuspendCancellationTest` (Part 1B — bergantung pada perilaku `BookingService@cancel`): **hijau**.
  - `AdminAuditLoggingTest` (Part 2 — meliputi aksi `cancel_booking` ini): **hijau**.
  - `AdminUserSuspendGuardTest`, `AdminAuditLoggingTest`, suite booking lain: hijau.

## Catatan Tambahan / Backlog

- `BookingService@cancel` tidak memvalidasi status booking secara internal; guard 422 ada di level controller. Jika di masa depan lebih banyak caller memakai service ini, validasi status bisa dipindah ke dalam service (dengan exception khusus) agar semua jalur konsisten.
- `BookingService@cancel` belum dibungkus `DB::transaction` — konsisten dengan perilaku asli (event + cache release tidak perlu transaksional penuh), tapi bisa dievaluasi jika ada kebutuhan atomisitas yang lebih ketat.
