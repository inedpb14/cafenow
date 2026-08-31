# Laporan Audit Konsistensi Workflow — CafeNow

Tanggal: 2026-08-06
Metode: Audit baca-saja (read-only) terhadap kode sumber — tidak ada perubahan file.
Cakupan: Lifecycle Cafe, Booking, Refund, User/Role, dan kontrak Frontend–Backend untuk peran Customer, Owner, dan Admin.

---

## 1. Ringkasan Eksekutif

Audit memetakan lifecycle **cafe → booking → refund → user** di tiga lapis peran (Customer, Owner, Admin) serta kontrak frontend–backend. Ditemukan **4 masalah Critical, 8 High, 15 Medium/Low**. Inti masalahnya adalah:

- Ada **dua jalur implementasi paralel** yang tidak tersinkron: jalur API (`BookingService` + events + state machine) vs jalur Web (Inertia controllers yang meng-update DB langsung). Jalur web melewati semua guard bisnis.
- **Status ghost** `checked_in` dan `scheduled` dipakai di web/query padahal tidak ada di `BookingStatus` enum → availability, auto-complete, dan filter tidak mengenalinya.
- Halaman dashboard/bookings/orders **owner & refund admin berpotensi 500** karena relasi/kolom yang tidak ada.
- **Wizard booking customer (`cafes/book.tsx`) adalah mock statis** — tidak pernah memanggil API, booking tidak pernah tersimpan.
- `is_suspended` (user) dan sebagian guard status tidak di-enforce di mana pun.

---

## 2. Peta Lifecycle Cafe

Status (enum `CafeApprovalStatus`): `pending → active | rejected`, `rejected → pending`, `active → suspended`, `suspended → active`. Dijaga via `Cafe::transitionTo()` + `assertCanTransitionTo()`; legacy `'approved'` diperlakukan sebagai `active` (`Cafe::isActive()`).

### Konsisten & teruji

- `AdminCafeRegistrationController::approve/reject` → `transitionTo` + audit log + notifikasi owner + `rejection_reason` di-reset saat approve. ✔
- `updateCafe` (web) saat `rejected` → auto `transitionTo(Pending)` + `submission_count++`. ✔
- `isContentEditable()` = `active | approved | rejected` → owner boleh edit konten/meja/menu saat ditolak (fix-then-resubmit), full lock saat suspended. ✔ Teruji `OwnerCafeContentGuardTest`.
- `suspend/unsuspend` admin → `transitionTo` + audit log + cancel booking unpaid (rollback transaksional, teruji). ✔

### Gap yang ditemukan

1. `CafeController::publicList/show/welcome` & `CafeResource` memfilter `['approved','active']` sementara web index memakai scope `active()` (hanya `'active'`) → dua definisi "aktif" berbeda untuk data legacy `approved`.
2. Saat cafe **di-suspend, booking yang sudah dibayar tetap `confirmed`** (per desain, teruji `CafeSuspendCancellationTest`) — namun owner web **tetap bisa check-in/complete** booking di cafe suspended (tidak ada guard status cafe di `OwnerDashboardController::checkIn/completeBooking`), dan customer API juga masih bisa check-in. Tidak ada policy (hold vs cancel+refund) untuk booking paid.
3. `AdminCafeController::index` filter keyword tidak mengecualikan cafe terhapus (SoftDeletes) — minor, default scope sudah menangani.

---

## 3. Peta Lifecycle Booking

Status enum: `pending → confirmed → completed | cancelled | no_show`. **Tidak ada guard transisi di enum** (tidak seperti cafe) — semua dicek manual per controller, dan hasilnya tidak konsisten:

### Jalur API (dijaga)

- `create` (`BookingService` + LockService + AvailabilityService + 2 jam min advance + cafe active);
- payment (Midtrans webhook → `confirmPayment` → confirmed+paid+release lock+event);
- cancel customer (3 jam min via `BookingService::cancel` → event + lock release);
- reschedule;
- check-in (butuh `confirmed`, set `check_in_time`, event, tanpa ubah status);
- extend (max 3x, max 2x durasi);
- checkout owner (butuh check_in_time, status→completed);
- no-show owner (butuh `confirmed`).

### Jalur Web (bypass)

1. **`CustomerDashboardController::cancelBooking`** — update DB langsung: tanpa aturan 3 jam (bisa cancel 5 menit sebelum sesi), tanpa event `BookingCancelled` (owner tidak pernah tahu, customer dapat notifikasi kosong ke diri sendiri), tanpa release lock, dan cancel **confirmed+paid tanpa jalur refund** → uang tertahan.
2. **`OwnerDashboardController::checkIn`** — set `status='checked_in'` (tidak ada di enum!) + trigger menu `scheduled→preparing`, **tanpa event `BookingCheckIn`**. Bandingkan API check-in yang hanya set `check_in_time` tanpa ubah status — dua perilaku berbeda untuk aksi yang sama.
3. **`OwnerDashboardController::completeBooking`** — status→completed langsung, tanpa event.

### Akibat status ghost `checked_in`

- `AvailabilityService` hanya memblokir `confirmed|pending|no_show` → meja ber-status `checked_in` dianggap kosong.
- `AutoCompleteBookings` hanya menyelesaikan `confirmed` → booking `checked_in` tidak pernah auto-complete.
- Filter `pendingCheckInsToday` malah memakai `['confirmed','scheduled']` — `scheduled` juga ghost status.
- Badge UI customer menampilkan `checked_in` sebagai merah.

### Akibat jalur ganda cancel (sistem)

- `CancelExpiredPendingBookings` bypass `BookingService::cancel` → tanpa lock release (minor, TTL hampir habis), tanpa notifikasi owner, reason event (`'Payment timeout'`) beda dari `cancellation_reason` tersimpan.
- `AdminBookingController::cancel` memakai service + audit log ✔, tapi **tidak membuat refund request otomatis** untuk booking paid.
- **`PaymentController::initiate` tidak cek status booking** — booking `cancelled` atau `refunded` dengan `payment_status` selain `paid` masih bisa di-pay ulang → webhook `confirmPayment` mengembalikan status ke `confirmed`. Juga tidak mencegah multiple payment pending untuk booking yang sama → duplicate event/notifikasi.
- **Aturan waktu bertabrakan**: create min 2 jam, cancel API min 3 jam, cancel web tanpa batas. UI modal bilang "kurang dari 1 jam kena biaya administrasi" — **biaya administrasi tidak ada di backend**.
- Exception bisnis (`CancellationTimeExpiredException`, `SlotNotAvailableException`, `BookingTimeWindowException`) **tidak dirender** di `bootstrap/app.php` (hanya `InvalidCafeStatusTransitionException` & `CafeNotActiveException`) → API mengembalikan 500 alih-alih 4xx yang informatif.

---

## 4. Peta Lifecycle Refund

Alur: customer → `POST /api/bookings/{booking}/refund-request` (butuh `payment_status=paid`, satu pending saja, amount = `total_price`) → admin proses/tolak.

### Konsisten

- Guard pending duplikat ✔
- Validasi bank ✔
- Audit log admin ✔

### Gap

1. **`AdminRefundController::index/show` crash** — `with('booking', 'initiatedBy')` tapi `RefundRequest` **tidak punya relasi `initiatedBy`** (hanya `booking`, `customer`) → `RelationNotFoundException` → seluruh halaman refund admin 500.
2. **Status `'completed'`** dipakai `process()` — tidak ada di enum `RefundRequestStatus` (`processed`). `process/reject` juga **tanpa guard status** (bisa double-process), tanpa set `processed_by`/`processed_at`, tanpa update `booking.payment_status` (tetap `paid` meski refund "selesai"), tanpa notifikasi ke customer.
3. **Double-refund potensial** — guard hanya cek `pending`; setelah `processed`/`rejected`, customer bisa membuat request baru (booking tetap `paid`).
4. **`RefundRequestResource` tidak memuat `reason`** — alasan customer hilang di panel admin.
5. Cancellation (semua jalur) **tidak pernah** menginisiasi refund otomatis — refund murni manual.

---

## 5. Temuan User/Role

- **`is_suspended` tidak di-enforce di mana pun.** `AdminUserController::suspend/unsuspend` hanya set flag + audit log. `CheckRole` hanya cek `role`; tidak ada middleware yang menolak login/API user tersuspend; session/token tidak di-revoke. Owner tersuspend tetap bisa kelola cafe, customer tetap bisa booking. Guard `CANNOT_SELF_SUSPEND` + `LAST_ADMIN` ada (teruji), tapi efek suspend-nya nol.
- One-cafe-per-owner konsisten (web `storeCafe` + API `OwnerCafeController` + `User::cafe()` hasOne) ✔.
- Role routing konsisten (`FortifyServiceProvider` redirect by role; `role:customer|owner|admin` middleware) ✔.
- `CreateOwnerUser` (web) mem-bypass verifikasi email? Login langsung `verification.notice` — OK per desain.

---

## 6. Temuan Frontend–Backend

### Critical

- **`cafes/book.tsx` = mock statis.** Slot/meja/menu hardcoded; `handleFinalSubmit` = `setTimeout` → layar sukses palsu. Tidak ada panggilan `/api/bookings` maupun `availability`. **Fitur "pesan meja" tidak pernah menyimpan data.**
- **Owner pages 500** — `OwnerDashboardController` (index, bookings, orders) memakai relasi `user` pada `Booking` (tidak ada; model hanya punya `customer()`) **dan** kolom `users.phone_number` (tidak ada; kolomnya `phone`). `with(['user:id,name,email,phone_number'])` → crash. Tests lolos karena hanya menguji owner tanpa cafe (early return).

### High

- `Admin/Booking/Oversight.tsx` mengharapkan `booking.booking_code` — kolom tidak ada (`booking_reference`); pencarian keyword di `AdminBookingController::index` juga query `booking_code` → SQL error.
- `Admin/Refund/Queue.tsx` mengharapkan `refund_amount`, `bank_account`, `account_holder`, `booking.booking_code` — backend: `amount`, `account_number`, `account_holder_name`, `booking_reference` (dan halaman sudah 500 duluan, lihat §4).

### Medium/Low

- `customer/orders.tsx` & `booking-detail.tsx`: `order.total_amount` (model: `total_price`) → selalu "Rp 0"; `item.price` (model: `unit_price`) → fallback 35.000.
- `customer/favorites.tsx`: `cafe.primary_photo` tidak ada pada model raw (hanya ada di resource) → fallback gambar Unsplash.
- `CafeResource.rating` hardcoded `'4.9'` (data palsu).
- `CafeController::index` (web) dead code — route `Route::inertia('cafes', ...)` tanpa controller; halaman pakai fetch `/api/cafes` (yang shape-nya cocok ✔).
- Notifikasi: `SendBookingCancelledNotification` selalu notify `customer_id` → saat **customer** yang cancel, notifikasi ke diri sendiri, owner tidak pernah dinotifikasi (tidak ada saluran notifikasi owner untuk booking).
- Inertia mengirim model raw (bukan resource) di customer bookings/detail → `booking_date`/`start_time` terserialisasi sebagai ISO/Carbon penuh, tidak rapi di UI (kosmetik).

---

## 7. Daftar Gap Terurut Prioritas

### Critical

| # | Gap | Bukti | Alasan |
|---|-----|-------|--------|
| C1 | Booking web tidak pernah tersimpan (wizard mock) | `cafes/book.tsx:47-68,109-115` | Fitur inti mati end-to-end |
| C2 | Owner dashboard/bookings/orders 500 saat owner punya cafe | `OwnerDashboardController.php:73,95,104,230,260` + `Booking.php` (tanpa `user()`) + migration users (`phone`, bukan `phone_number`) | Semua halaman operasional owner rusak |
| C3 | Admin refund queue 500 (`initiatedBy` tidak ada) | `AdminRefundController.php:16,33` + `RefundRequest.php` | Panel refund admin mati total |
| C4 | Booking dibatalkan/refunded bisa di-pay ulang → balik `confirmed` | `PaymentController.php:53-59` (hanya cek `payment_status`) + `BookingService::confirmPayment` | Pembatalan bisa dibatalkan lewat jalur bayar; duplicate payment tanpa guard |

### High

| # | Gap | Bukti | Alasan |
|---|-----|-------|--------|
| H1 | Cancel web bypass BookingService (tanpa 3 jam, event, lock, refund) | `CustomerDashboardController.php:119-138` | Dua aturan bisnis berbeda per jalur |
| H2 | Status ghost `checked_in`/`scheduled` | `OwnerDashboardController.php:63,367` vs `BookingStatus` enum | Availability, auto-complete, filter, enum tidak sinkron |
| H3 | Suspend cafe tidak menangani booking paid + tidak ada guard check-in | `AdminCafeController.php:63-74`; `OwnerDashboardController.php:358-376` | Pelanggan terikat booking di cafe nonaktif tanpa jalur keluar |
| H4 | `is_suspended` tidak di-enforce (login/API/middleware) | `CheckRole.php`; `AdminUserController.php:77` | Suspensi user tanpa efek |
| H5 | Refund admin tanpa state machine (double process, status `completed` vs enum, tanpa `processed_at`, tanpa update payment_status) | `AdminRefundController.php:36-78` | Data refund tidak akurat |
| H6 | Admin booking search `booking_code` (kolom tak ada) | `AdminBookingController.php:28`; `Oversight.tsx:16,128,322` | SQL error + kolom kosong |
| H7 | Aturan waktu cancel/create tidak konsisten + UI janji biaya admin 1 jam yang tak ada | `BookingService.php:105-112`; `CheckBookingEligibility.php:17`; `booking-detail.tsx:154` | Ekspektasi customer vs perilaku nyata |
| H8 | Exception bisnis tidak dirender (500 bukan 422) | `bootstrap/app.php:36-56` | Kontrak API rusak untuk error umum |

### Medium

| # | Gap | Bukti | Alasan |
|---|-----|-------|--------|
| M1 | Komisi owner web hardcode 15% vs dynamic + API pakai `cafe_receives` | `OwnerDashboardController.php:54` vs `AdminDashboardController.php:27` | Laporan keuangan owner bisa salah |
| M2 | Double-refund potensial (guard hanya `pending`) | `BookingController.php:219-229` | Kerugian finansial |
| M3 | Cancel/refund tidak pernah update `payment_status` booking | `BookingService.php:114-122` | State tidak konsisten |
| M4 | Notifikasi cancel hanya ke customer (owner buta) | `SendBookingCancelledNotification.php:24-34` | Owner tidak tahu booking-nya dibatalkan |
| M5 | `CancelExpiredPendingBookings` bypass service (lock, reason ganda, tanpa info owner) | `CancelExpiredPendingBookings.php:24-32` | Konsistensi sistem |
| M6 | Ghost `approved` di API vs `active` di web | `CafeController.php:30` vs `scopeActive` | Dua definisi "aktif" |
| M7 | Frontend pakai `total_amount`/`price` (model: `total_price`/`unit_price`) | `orders.tsx:96,108`; `booking-detail.tsx:109` | Angka Rp 0 / 35.000 |
| M8 | `CafeResource.rating` hardcoded 4.9 | `CafeResource.php:31` | Data palsu di produksi |
| M9 | `CafeController::index` dead code + fallback data sample | `web.php:35`; `CafeController.php:85-140` | Kebingungan pemeliharaan |

### Low

| # | Gap | Bukti | Alasan |
|---|-----|-------|--------|
| L1 | Web check-in tanpa event `BookingCheckIn` (customer tak tahu) | `OwnerDashboardController.php:366-376` | Konsistensi notifikasi |
| L2 | Booking raw model ke Inertia → format tanggal ISO | `CustomerDashboardController.php:88-95` | Kosmetik |
| L3 | Badge UI tidak kenal `checked_in` (merah) | `bookings.tsx:88-94` | Akibat H2 |
| L4 | Favorit: `primary_photo` tidak ada di model raw | `favorites.tsx:59` | Kosmetik |
| L5 | `initiate()` ternary `$amount` identik; tanpa cek menu_order yang sudah paid | `PaymentController.php:61` | Sloppy, duplicate payment menu |
| L6 | Dua jalur update status order (API PUT vs web PATCH) dengan validasi berbeda | `OwnerOrderController.php:60` vs `OwnerDashboardController.php:408` | Drift aturan |

---

## 8. Rekomendasi Prioritas

Perbaiki C1 (hubungkan wizard ke `/api/bookings` + availability), C2/C3 (relasi & kolom), C4 (guard status di `initiate`), lalu satukan jalur cancel/check-in web ke `BookingService` (H1/H2) dan lengkapi enforcement `is_suspended` (H4).

## 9. File Kunci

- `app/Services/Booking/BookingService.php`
- `app/Http/Controllers/Owner/OwnerDashboardController.php`
- `app/Http/Controllers/Customer/CustomerDashboardController.php`
- `app/Http/Controllers/Admin/AdminRefundController.php`
- `app/Http/Controllers/Admin/AdminBookingController.php`
- `app/Http/Controllers/Admin/AdminCafeController.php`
- `app/Http/Controllers/Payment/PaymentController.php`
- `app/Models/Booking.php`, `app/Models/Cafe.php`, `app/Models/RefundRequest.php`, `app/Models/User.php`
- `app/Http/Middleware/CheckRole.php`
- `bootstrap/app.php`
- `resources/js/pages/cafes/book.tsx`
- `resources/js/pages/owner/**`, `resources/js/pages/customer/**`, `resources/js/pages/admin/**`
