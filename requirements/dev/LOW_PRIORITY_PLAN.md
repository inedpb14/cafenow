# Low Priority Fixes — Implementation Plan

> 8 item Low priority dari gap analysis PRD vs codebase.
> Fokus pada yang **menyebabkan bug atau block fitur**. Frontend React ditunda ke fase terpisah.

---

## Execution Status

| Item | Status | Tanggal | Files Changed |
|------|--------|---------|---------------|
| 1. Schema Drift — Critical Fixes | ✅ Done | 2026-07-19 | 6 models, 1 enum, 1 migration |
| 2. Takeaway Order tanpa booking_id | ✅ Done | 2026-07-19 | StoreOrderRequest, OrderController |
| 3. Admin Cancel Booking | ✅ Done | 2026-07-19 | AdminBookingController, routes/admin.php |
| 4. Social Login Real Implementation | ✅ Done | 2026-07-19 | CustomerAuthController, config/services, Socialite install |
| 5. Tests: Feature + Unit | ✅ Done | 2026-07-19 | 7 test files (46 tests all pass) |
| 6+7+8. Frontend React (3 item) | ⬜ Pending | — | — |

---

## Item 1: Schema Drift — Critical Fixes Only

### Masalah
PRD vs codebase punya ~30 field/enum mismatches. Sebagian besar sudah diakui intentional oleh CONTROLLER_PLAN. Hanya yang **menyebabkan bug/blocker** yang perlu difix.

### Drift yang DIBIARKAN (intentional / kosmetik / tidak berdampak)

| Drift | Alasan |
|-------|--------|
| `operating_hours` → `operational_hours` | Intentional rename |
| `checked_in_at` → `check_in_time` | Intentional rename |
| `approved` → `active` | Intentional rename |
| `avatar` → `profile_pic` | Intentional rename |
| `photo_path` → `photo_url` | Intentional rename |
| `display_order` vs `is_primary` | Design choice (ordering > flag) |
| Most `BookingStatus` missing cases | Intentional — pakai `confirmed` + timestamp workaround |
| `CancelledBy` missing `admin` | Enum bisa ditambah kapan saja |
| `CommissionType` semantic mismatch | Sudah jalan, fixed/dynamic calc |
| `RefundRequestStatus` name drift | Kosmetik |
| `active_to` vs `active_until` | Kosmetik |
| Column naming docs vs code | Hanya berbeda naming convention |

### Drift yang PERLU DIFIX

| # | Drift | Dampak | Fix |
|---|-------|--------|-----|
| 1a | `menu_orders.booking_id` NOT NULL | **Block takeaway order** — harus nullable | Migration: `->nullable()->change()` |
| 1b | `refund_requests` missing `reason` column | Refund reason tidak tersimpan | Migration: add `reason` text |
| 1c | `refund_requests` missing `processed_by` | Admin audit trail hilang | Migration: add `processed_by` FK nullable |
| 1d | `payments` missing `midtrans_transaction_id`, `snap_token`, `snap_redirect_url`, `payment_channel`, `paid_at` | Midtrans data hilang | Migration: add 5 columns |
| 1e | `booking_rules` missing `min_advance_hours` | Configurable window tidak bisa diset per-table | Migration: add `min_advance_hours` nullable |
| 1f | `notifications` missing `data` (JSON) | Contextual payload notifikasi hilang | Migration: add `data` JSON nullable |
| 1g | `tables` missing unique `(cafe_id, name)` | Duplicate table names bisa terjadi | Migration: add unique composite |
| 1h | `PaymentStatus` enum missing `expired` | Expired payment tidak representable | Add `case Expired = 'expired'` |

### Files Changed

| File | Perubahan |
|------|-----------|
| `database/migrations/xxxx_xx_xx_xxxxxx_fix_schema_drift.php` | **Baru** — bulk migration untuk semua fix di atas |
| `app/Models/Payment.php` | Update fillable + casts |
| `app/Models/MenuOrder.php` | Update fillable (`booking_id` nullable) |
| `app/Models/RefundRequest.php` | Update fillable |
| `app/Models/BookingRule.php` | Update fillable |
| `app/Models/Notification.php` | Update fillable + casts |
| `app/Models/Table.php` | — (constraint only) |
| `app/Enums/PaymentStatus.php` | Add `Expired` case |
| `app/Http/Controllers/Booking/BookingController.php` | Refund request: simpan `reason` |

---

## Item 2: Takeaway Order Tanpa booking_id

### Masalah
`menu_orders.booking_id` migration pakai `constrained()` → NOT NULL. Takeaway order tidak punya booking reference sehingga tidak bisa disimpan.

### Prasyarat
Item 1a (migration nullable booking_id) harus jalan dulu.

### Files Changed

| File | Perubahan |
|------|-----------|
| `app/Http/Requests/Order/StoreOrderRequest.php` | `booking_id` jadi `nullable\|exists` |
| `app/Http/Controllers/Order/OrderController.php` | Handle null booking_id → `order_type = 'takeaway'` |
| `app/Models/MenuOrder.php` | `booking_id` nullable di fillable |

### Flow
1. Jika `booking_id` null → `order_type = 'takeaway'`
2. Price calculation tanpa commission split ke cafe
3. Payment: standalone (tidak attach ke booking payment)

---

## Item 3: Admin Cancel Booking Endpoint

### Masalah
Admin bisa cancel booking? Endpoint tidak ada.

### Files Changed

| File | Perubahan |
|------|-----------|
| `app/Http/Controllers/Admin/AdminBookingController.php` | Tambah method `cancel()` |
| `routes/api/admin.php` | Tambah route `PUT /admin/bookings/{booking}/cancel` |

### Implementation
Panggil `BookingService@cancel($booking, 'admin', $reason)` — sama pattern dengan owner cancel.

---

## Item 4: Social Login — Implementasi Nyata

### Masalah
Endpoint `POST /auth/social-login` ada di `CustomerAuthController` tapi implementasi masih dummy/stub.

### Approach (Ponytail — minimal)

Laravel Socialite untuk Google + Apple (iOS primary target).

### Files Changed

| File | Perubahan |
|------|-----------|
| `composer.json` | Tambah `laravel/socialite` |
| `.env` | Tambah `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` |
| `config/services.php` | Tambah google + apple config |
| `app/Http/Controllers/Auth/CustomerAuthController.php` | Replace stub dengan real Socialite logic |
| `app/Services/Auth/SocialLoginService.php` | **Baru** — handle findOrCreate user by email |

### Flow
1. Terima `provider` (google/apple) + `access_token` (from frontend SDK)
2. `Socialite::driver($provider)->userFromToken($token)`
3. Find user by email → login or register
4. Return Sanctum token

---

## Item 5: Tests — Feature + Unit

### Masalah
Tidak ada tests sama sekali.

### Approach (Ponytail — minimal coverage untuk paths kritis saja)

Bukan comprehensive coverage — hanya **1 test per critical path** untukencegah regression.

### Test Files (Baru)

| File | Covers |
|------|--------|
| `tests/Feature/Auth/RegistrationTest.php` | Register + verify OTP + login flow |
| `tests/Feature/Auth/LoginTest.php` | Login + throttle |
| `tests/Feature/Booking/CreateBookingTest.php` | Store booking + availability + price calc |
| `tests/Feature/Booking/BookingLifecycleTest.php` | checkIn → extend → checkout → noShow |
| `tests/Feature/Cafe/CafeListingTest.php` | Search + featured + geolocation |
| `tests/Feature/Order/CreateOrderTest.php` | Order store + status flow |
| `tests/Unit/Services/BookingServiceTest.php` | calculatePrice with surge |

### Configuration
- `phpunit.xml` — sudah ada default
- `RefreshDatabase` trait untuk feature tests

---

## Items 6+7+8: Frontend React (Deferred)

### Keputusan
**Ditunda ke fase terpisah.** Frontend React adalah proyek besar yang perlu:
1. Desain UI matang
2. Setup Inertia.js + React
3. Komponen per halaman

### Scope (untuk referensi nanti)

| Halaman | Route | Komponen |
|---------|-------|----------|
| **Customer** | `/`, `/cafes/{id}`, `/bookings`, `/orders`, `/profile` | Browse, Booking wizard, Payment, Order tracking |
| **Owner** | `/owner/dashboard`, `/owner/cafes`, `/owner/bookings`, `/owner/analytics` | Dashboard, Cafe mgmt, Calendar, Charts |
| **Admin** | `/admin`, `/admin/registrations`, `/admin/refunds`, `/admin/users` | Panel, Tables, Approve/Reject |

---

## Dependency Graph

```
Item 1a (booking_id nullable) ──┐
                                 ├── Item 2 (Takeaway)
Item 1b-1h (other schema fixes) ── independen
Item 3 (Admin cancel) ───────────── independen
Item 4 (Social login) ───────────── independen (requires composer install)
Item 5 (Tests) ──────────────────── tergantung semua fix di atas jalan
Items 6-8 (Frontend) ───────────── ditunda, independen
```

---

## Estimasi Total

| Item | Files | Estimasi |
|------|-------|----------|
| 1. Schema Drift (8 sub-fix) | ~8 files | ~30 menit |
| 2. Takeaway Order | ~3 files | ~15 menit |
| 3. Admin Cancel Booking | ~2 files | ~10 menit |
| 4. Social Login | ~4 files | ~20 menit |
| 5. Tests | ~7 files | ~40 menit |
| **Total (tanpa frontend)** | **~24 files** | **~115 menit** |

---

*Dibuat: 19 July 2026*
