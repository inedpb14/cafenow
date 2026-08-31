# Laporan Perbaikan 4 Temuan Critical — Audit Konsistensi Workflow CafeNow

Tanggal: 07 Agustus 2026
Lingkup: Perbaikan temuan C2, C3, C4, C1 dari audit lintas-role
Dokumen asli audit: `requirements/audit-konsistensi-workflow-2026-08-06.md`

---

## Ringkasan Perbaikan 4 Temuan Critical

### C2 — Owner Dashboard Crash (Saat Owner Punya Cafe) ✅
- **Re-verifikasi:** `OwnerDashboardController.php:73,82-83,94,106,230,237-238,260,271` eager-load relasi `user` dan kolom `phone_number` yang tidak ada (relasi asli `customer`, kolom `phone`). Pada owner dengan cafe aktif, query menemukan booking → kena `RelationNotFoundException` → 500.
- **Perbaikan:** Semua `user` → `customer`, `phone_number` → `phone` (termasuk eager load `user:id,name,email,phone_number` → `customer:id,name,email,phone`, dan `booking.user` → `booking.customer`).
- **File:** `app/Http/Controllers/Owner/OwnerDashboardController.php`; test baru `tests/Feature/Owner/OwnerDashboardWithCafeTest.php`.
- **Hasil:** `OK (3 tests, 32 assertions)`.

### C3 — Admin Refund Queue Crash ✅
- **Re-verifikasi:** `AdminRefundController.php:16,33` eager-load `initiatedBy` yang tidak terdefinisi di `RefundRequest` (relasi yang ada: `booking`, `customer`; `initiated_by` hanya string fillable). → `RelationNotFoundException` 500.
- **Perbaikan:** `with('booking', 'initiatedBy')` → `with('booking', 'customer')`.
- **File:** `app/Http/Controllers/Admin/AdminRefundController.php`; test baru `tests/Feature/Admin/AdminRefundControllerTest.php`.
- **Hasil:** `OK (2 tests, 6 assertions)`.

### C4 — Booking Dibatalkan Masih Bisa Dibayar ✅
- **Re-verifikasi:** `PaymentController::initiate` hanya cek `payment_status === 'paid'` → booking `cancelled`/`no_show` tetap bisa initiate ulang.
- **Perbaikan:** Guard baru: status `cancelled`/`no_show` → 409 `BOOKING_NOT_PAYABLE`; ada Payment `pending` → 409 `DUPLICATE_PAYMENT`.
- **Bonus (bug kritis ditemukan saat test):** `$request->string('payable_type')` mengembalikan objek `Stringable`, sehingga `=== 'booking'` **selalu false** → semua request jatuh ke cabang `MenuOrder::findOrFail` (404/500) dan guard lama/baru tidak pernah jalan di production. Diperbaiki dengan `->toString()` (PaymentController.php:34).
- **File:** `app/Http/Controllers/Payment/PaymentController.php`; test baru `tests/Feature/Payment/PaymentInitiateTest.php` (midtrans config di-`set` di `setUp` karena `MidtransService` pakai typed property `string` yang TypeError saat config null di test env).
- **Hasil:** `OK (5 tests, 14 assertions)`.

### C1 — Booking Wizard (`book.tsx`) Masih Mock ✅
- **Re-verifikasi:** Wizard pakai `SESSION_SLOTS`/`TABLES_LIST`/`MENU_OPTIONS` hardcoded dan `handleFinalSubmit` hanya `setTimeout` → tidak membuat booking nyata, cafe di header hardcoded.
- **Perbaikan:**
  - Frontend: `book.tsx` kini mengambil `id` dari route prop, memuat cafe/tables/menus dari API publik, slot dari `/api/cafes/{id}/availability`, submit berurutan: `POST /api/bookings` → `POST /api/orders` (pre-order) → `POST /api/payments` (initiate), tampil tombol "Bayar Sekarang" bila `redirect_url` ada; error ditampilkan inline.
  - Backend error handling (H8): `bootstrap/app.php` kini memetakan `SlotNotAvailableException` (409 `SLOT_NOT_AVAILABLE`), `BookingTimeWindowException` (422 `BOOKING_TIME_WINDOW`), `CancellationTimeExpiredException` (422 `CANCELLATION_TIME_EXPIRED`) → JSON error shape konsisten.
  - **Bug pre-existing yang ditemukan contract test:** `CafeController::availability` & `BookingController::availability` meneruskan `Stringable` ke `getSlots(string)` → 500; `MenuOrderItem` insert timestamps tapi tabel tidak punya kolom → 500 di `POST /api/orders` (fix: `$timestamps = false`); dan **bug double-booking**: `isAvailable`/`getSlots` mencocokkan `booking_date`/`start_time` secara string (kolom datetime) sehingga booking yang sudah ada tidak terdeteksi → slot sama bisa dibooking dua kali (fix: `whereDate` + `whereTime` dengan format `H:i:s`).
- **File:** `resources/js/pages/cafes/book.tsx`, `bootstrap/app.php`, `app/Http/Controllers/Cafe/CafeController.php`, `app/Http/Controllers/Booking/BookingController.php`, `app/Models/MenuOrderItem.php`, `app/Services/Booking/AvailabilityService.php`; test baru `tests/Feature/Booking/BookingWizardFlowTest.php`.
- **Hasil:** `OK (4 tests, 41 assertions)`. TypeScript: `book.tsx` bebas error (error `tsc` lain pre-existing di file lain).

## Full Suite
`144 tests, 143 passed, 1 failed` — satu-satunya kegagalan `DashboardTest::test_authenticated_users_can_visit_the_dashboard` adalah **pre-existing** (route `/dashboard` selalu 302 redirect ke dashboard per-role, tapi test mengharap 200) dan tidak tersentuh perubahan ini. 5 "risky" (tidak pakai assertion) juga pre-existing.
