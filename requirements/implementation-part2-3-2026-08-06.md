# Laporan Implementasi Part 1B, 2, 3 — CafeNow Admin Redesign

Tanggal: 2026-08-06
Status: SELESAI — semua test pass (117/118, 1 kegagalan pre-existing DashboardTest 302, tidak terkait).

## Part 1B — Cascade Pembatalan Booking Saat Cafe Di-Suspend

**Masalah:** Saat admin me-suspend cafe, booking unpaid tetap tertahan di status pending/confirmed tanpa batas waktu; slot table tetap terkunci.

**Solusi:** `AdminCafeController@suspend` kini membungkus transisi status + pembatalan booking dalam satu `DB::transaction`:

- Cascade target: booking milik cafe dengan `payment_status = unpaid` dan `status IN (pending, confirmed)`. Booking paid, booking sudah cancelled, dan booking status lain tidak tersentuh.
- Pembatalan memakai `BookingService@cancel()` yang sudah ada → reuse seluruh side-effect: dispatch `BookingCancelled` (notifikasi customer via listener `SendBookingCancelledNotification` di `AppServiceProvider`) + `LockService@releaseForBooking` (slot terbuka lagi).
- `cancelled_by = system`, alasan `Dibatalkan otomatis karena cafe di-suspend`.
- Atomik: jika satu pembatalan gagal, seluruh transaksi (termasuk transisi ke `suspended`) di-rollback; cafe tetap `active`.

**File:**
- `app/Http/Controllers/Admin/AdminCafeController.php` (ubah — `BookingService` di-inject via konstruktor, sebelumnya ada; cascade ditambahkan di `suspend()`)
- `tests/Feature/Admin/CafeSuspendCancellationTest.php` (baru — 4 test)

**Test (4/4 pass, 19 assertions):**
1. Mixed paid + unpaid: yang unpaid tercancel (status + cancelled_by + reason), yang paid tetap confirmed, slot lock dirilis.
2. Cafe tanpa booking: transisi sukses, tidak ada efek samping.
3. Forced-failure (listener `BookingCancelled` melempar pada booking kedua): respons 500, cafe tetap `active`, kedua booking tidak berubah → transaction terbukti atomik.
4. Booking unpaid yang SUDAH cancelled tidak di-touch ulang.

**Catatan teknis:** Mockery tidak bisa mocking `BookingService` (class `readonly` — fatal `cannot extend readonly class`). Test rollback diganti forced-failure via `Event::listen(BookingCancelled::class)` — pendekatan lebih nyata karena menyimulasikan kegagalan pada side-effect produksi.

## Part 2 — Audit Logging 9 Aksi Admin

**Masalah:** Hanya aksi approval cafe dan featured cafe yang tercatat di `AdminAuditLog`; 9 aksi admin lain tidak meninggalkan jejak.

**Solusi:**
- Trait baru `App\Traits\LogsAdminActions` dengan satu helper `logAdminAction()` (mencegah duplikasi pola audit 9×).
- Case enum `AdminAction` baru: `cancel_booking`, `suspend_cafe`, `unsuspend_cafe`, `update_user`, `unsuspend_user`.
- Audit log ditambahkan di:

| Aksi | Controller@method | Action | Entity | before/after |
|---|---|---|---|---|
| Cancel booking | AdminBookingController@cancel | cancel_booking | booking | status, cancellation_reason |
| Process refund | AdminRefundController@process | process_refund | refund_request | status, admin_notes |
| Reject refund | AdminRefundController@reject | reject_refund | refund_request | status, admin_notes |
| Suspend cafe | AdminCafeController@suspend | suspend_cafe | cafe | approval_status |
| Unsuspend cafe | AdminCafeController@unsuspend | unsuspend_cafe | cafe | approval_status |
| Update user | AdminUserController@update | update_user | user | name, email |
| Suspend user | AdminUserController@suspend | suspend_user | user | is_suspended |
| Unsuspend user | AdminUserController@unsuspend | unsuspend_user | user | is_suspended |
| Update komisi | AdminCommissionController@updateRate | update_commission | commission_rule | percentage |

Catatan: `updateRate` tidak mencatat log bila rule tidak ditemukan (no-op — tidak ada perubahan nyata). before_value diambil sebelum mutasi, after_value setelah mutasi.

**File:**
- `app/Traits/LogsAdminActions.php` (baru)
- `app/Enums/AdminAction.php` (ubah — +5 case)
- 5 controller admin (ubah)
- `tests/Feature/Admin/AdminAuditLoggingTest.php` (baru — 9 test)

**Test (9/9 pass, 81 assertions):** setiap aksi menghasilkan tepat 1 row `AdminAuditLog` dengan `admin_id` = admin yang bertindak, action/entity_type/entity_id/before_value/after_value/created_at benar.

## Part 3 — Self-Suspend & Last-Admin Guard

**Masalah:** Admin bisa me-suspend dirinya sendiri (mengunci diri) dan bisa me-suspend admin terakhir yang aktif (meninggalkan sistem tanpa admin).

**Solusi:** Guard di `AdminUserController@suspend` (sebelum mutasi & audit log):
1. **Self-suspend diblokir** — admin tidak bisa menonaktifkan akunnya sendiri → 422 `CANNOT_SELF_SUSPEND`, pesan `Tidak dapat menonaktifkan akun sendiri`.
2. **Last-admin diblokir** — menonaktifkan admin aktif lain bila jumlah admin aktif (role=admin, is_suspended=false) ≤ 1 → 422 `LAST_ADMIN`, pesan `Tidak dapat menonaktifkan admin terakhir yang aktif`. Guard hanya berlaku untuk target admin yang belum suspended (redundan, tapi defensif).
3. Non-admin user (owner/customer) tidak terpengaruh guard — tetap bisa di-suspend seperti biasa.

**File:**
- `app/Http/Controllers/Admin/AdminUserController.php` (ubah — guard + tetap mencatat audit log)
- `tests/Feature/Admin/AdminUserSuspendGuardTest.php` (baru — 4 test)

**Test (4/4 pass, 14 assertions):**
1. Admin suspend diri → 422 CANNOT_SELF_SUSPEND, tidak ada row audit, `is_suspended` tetap false.
2. Admin (suspended, sesi tetap aktif) suspend satu-satunya admin aktif → 422 LAST_ADMIN, target tetap aktif, tidak ada row audit.
3. Admin suspend admin lain saat masih ada admin aktif lain → 200, target suspended, tepat 1 row audit.
4. Admin suspend owner → 200, owner suspended, tepat 1 row audit.

## Regresi

- Full suite: **117/118 pass** (379 assertions). Satu-satunya kegagalan: `DashboardTest::test_authenticated_users_can_visit_the_dashboard` (302 vs 200) — pre-existing, tidak terkait perubahan ini (sudah gagal sejak awal sesi).
- Suite terkait (CafeStatusTransition 9, CafeApprovalStatus 16, OwnerCafeContentGuard 12, CreateBooking 5, BookingLifecycle, CancelExpiredPendingBookings, AdminAuditLogging 9, AdminUserSuspendGuard 4, CafeSuspendCancellation 4): semua hijau.

## Backlog (di luar scope — sudah dikonfirmasi owner)

- Fitur appeal/recovery request untuk owner cafe di-suspend (form + notifikasi ke admin) — untuk di-scope terpisah.
- `AdminBookingController@cancel` hanya mengubah status booking (tanpa release slot lock / dispatch event seperti `BookingService@cancel`) — perilaku lama dipertahankan karena di luar scope; audit log ditambahkan saja. Jika ingin konsisten, alihkan ke `BookingService@cancel` di iterasi berikutnya.
- Refactor `AdminFeaturedCafeController` ke trait `LogsAdminActions` (masih pola manual) — kosmetik, tidak mengubah perilaku.
