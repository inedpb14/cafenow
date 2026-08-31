# Laporan Perbaikan Audit — Route Rusak & Dual-Source Komisi

Tanggal: 2026-08-06
Status: SELESAI — full suite 125/126 pass (1 kegagalan pre-existing DashboardTest, tidak terkait).

## Ringkasan

Dua temuan lama dari audit arsitektur diperbaiki:
1. **TASK 1** — dua route API admin menunjuk ke method controller yang tidak ada (dead routes).
2. **TASK 2** — dua sumber kebenaran rate komisi: dashboard pakai hardcoded 15%, analytics membaca kolom aktual (inkonsistensi data finansial).

---

## TASK 1 — Route Admin Rusak

### Investigasi

`php artisan route:list --path=api/admin` mengonfirmasi kedua route masih eksis dan menunjuk ke method yang TIDAK ADA:

| Route | Controller@method | Status method |
|---|---|---|
| `PATCH /api/admin/cafes/{cafe}` | `AdminCafeController@update` | Tidak ada |
| `GET /api/admin/featured-cafes/{featured_cafe}` | `AdminFeaturedCafeController@show` | Tidak ada (lahir dari `Route::apiResource`) |

**Pemanggil frontend (grep seluruh `resources/js/pages/`):**
- `admin/Cafe/Management.tsx` hanya memanggil `GET /api/admin/cafes` (list) dan `POST /{id}/suspend`. Tidak ada form edit cafe admin.
- `admin/Cafe/Featured.tsx` hanya memanggil `GET/POST /api/admin/featured-cafes` dan `DELETE /{id}`.
- Tidak ada test yang memanggil kedua endpoint.

**Kesimpulan:** keduanya dead code — bukan fitur rusak, tidak ada caller sama sekali.

### Keputusan & Perubahan

Dikonfirmasi user (keduanya: "Hapus route"). Perubahan hanya di `routes/api/admin.php`:

- Hapus `Route::patch('/{cafe}', [AdminCafeController::class, 'update'])`.
- `Route::apiResource('featured-cafes', AdminFeaturedCafeController::class)` → tambah `->except(['show'])`.

**Verifikasi:**
- `route:list` — kedua route hilang, route lain di group tidak berubah.
- Tidak ada method yang ditambahkan (tidak ada caller → tidak ada fitur yang hilang).

---

## TASK 2 — Unifikasi Sumber Komisi

### Investigasi

**Temuan utama (melampaui temuan audit):** hardcoded 15% tersebar di **4 lokasi**, dan audit keliru mengira analytics sudah benar:

| Lokasi | Baris | Penggunaan |
|---|---|---|
| `AdminDashboardController@index` | 23 | `SUM(total_price * 0.15)` → metric `revenueToday` |
| `Admin\AdminAnalyticsController@revenue` | 25 | `SUM(total_price * 0.15)` |
| `Admin\AdminAnalyticsController@topCafes` | 49 | `bookings_sum_total_price * 0.15` |
| `Admin\AdminAnalyticsController@exportCsv` | 86 | `$booking->total_price * 0.15` |

**Penemuan dua controller analytics:** ada `Analytics\AdminAnalyticsController` (namespace `Analytics`) yang BENAR — membaca `sum('commission')` dari booking dan `cafe_receives` — dan `Admin\AdminAnalyticsController` (namespace `Admin`) yang SALAH — hardcoded `0.15`. Halaman frontend `admin/Analytics.tsx` memanggil endpoint **yang salah** (`/api/admin/analytics/revenue`, `/cafes`, `/bookings/status`). Endpoint controller yang benar (`/api/admin/analytics/platform`, `/commission`) tidak dipanggil halaman apa pun.

**Model data komisi (diverifikasi):**
- Rate aktif dikelola di tabel `commission_rules` (`commission_type`: `booking` / `menu_order`; `percentage`; `active_from`/`active_to`; `set_by_admin_id`).
- `AdminCommissionController@rates`/`@updateRate` membaca/menulis tabel ini.
- `CommissionService::getActiveRate(type)` memilih rule aktif (active_from <= now, active_to null atau >= now, terbaru), fallback ke default `15.0` (booking) / `10.0` (menu_order).
- Kolom `bookings.commission` menyimpan rate yang BERLAKU SAAT booking dibuat (historis) — ini NORMAL dan benar untuk catatan finansial; **tidak diubah**.

### Perubahan

1. **`CommissionService`** — tambah method publik `activeBookingRate(): float` (membungkus `getActiveRate('booking')` yang private; sumber yang sama dengan `updateRate`).

2. **`AdminDashboardController@revenueToday`** — hardcoded `0.15` diganti `CommissionService::activeBookingRate()`:
   ```php
   $commissionRate = $this->commissionService->activeBookingRate();
   'revenueToday' => Booking::where('status', 'completed')
       ->whereDate('created_at', $today)
       ->sum('total_price') * ($commissionRate / 100),
   ```
   Fallback 15.0 tetap berlaku bila tidak ada rule (default sistem).

3. **`Admin\AdminAnalyticsController`** (3 tempat) — hardcoded `0.15` diganti dengan kolom komisi aktual per booking (historis, konsisten dengan `Analytics\AdminAnalyticsController` yang sudah benar):
   - `revenue()`: `COALESCE(SUM(commission), 0) as revenue` (bukan `SUM(total_price * 0.15)`).
   - `topCafes()`: `withSum('bookings', 'commission')` → `revenue = bookings_sum_commission ?? 0` (bukan `total_price * 0.15`).
   - `exportCsv()`: `revenue = (float) ($booking->commission ?? 0)` (bukan `total_price * 0.15`).

**Prinsip yang dihormati:** dashboard (live display, hari ini) membaca rate AKTIF saat ini; analytics (laporan periode historis) membaca komisi aktual tersimpan per booking. Nilai historis di kolom `bookings.commission` tidak disentuh.

### File yang Berubah

| File | Perubahan |
|---|---|
| `routes/api/admin.php` | Hapus route `PATCH cafes/{cafe}`; `apiResource featured-cafes` → `except(['show'])` |
| `app/Services/Payment/CommissionService.php` | Tambah `activeBookingRate()` |
| `app/Http/Controllers/Admin/AdminDashboardController.php` | `revenueToday` pakai rate aktif |
| `app/Http/Controllers/Admin/AdminAnalyticsController.php` | 3 metode pakai komisi aktual |
| `tests/Feature/Admin/DashboardCommissionTest.php` | Baru — 3 test |

---

## Test

**Test baru `DashboardCommissionTest` (3/3 pass, 33 assertions):**

1. `test_dashboard_revenue_uses_current_commission_rate_after_update_rate` — booking completed hari ini total 1.000.000, rule 15% aktif → dashboard `revenueToday` = 150.000; `updateRate` ke 20% → dashboard = **200.000** (bukan tetap 150.000 / hardcoded 15%).
2. `test_dashboard_revenue_falls_back_to_default_when_no_rule_exists` — tanpa rule → fallback 15% (150.000).
3. `test_analytics_revenue_uses_actual_booking_commission_not_hardcoded_rate` — booking dengan komisi aktual 250.000 (total 1.000.000) → endpoint revenue mengembalikan 250.000, bukan 15% × total (150.000).

Teknis test: pakai `assertInertia` (pola eksisting di `SecurityTest`); akses web route `/admin/dashboard` yang me-render `AdminDashboardController@index`; `assertJsonPath` sebelumnya gagal karena json_encode menormalisasi float .0 → int.

**Full suite: 125/126 pass (437 assertions).**
- Satu-satunya kegagalan: `DashboardTest::test_authenticated_users_can_visit_the_dashboard` (302 vs 200) — pre-existing sejak awal sesi, tidak terkait.
- Tidak ada regresi pada suite Part 1/1B/2/3 (CafeStatusTransition, CafeSuspendCancellation, AdminAuditLogging, AdminUserSuspendGuard, AdminBookingController, OwnerCafeContentGuard, dll).

---

## Catatan / Temuan Tambahan

- `Admin\AdminAnalyticsController` dan `Analytics\AdminAnalyticsController` adalah DUPLIKAT fungsional (dua controller analytics dengan namespace berbeda, endpoint tumpang tindih `/api/admin/analytics/...`). Controller `Admin\` dipakai frontend; controller `Analytics\` (platform/commission) tidak dipakai halaman mana pun. Konsolidasi keduanya layak dijadikan backlog terpisah.
- `AdminCafeController@update` dihapus karena dead code — jika nanti fitur "admin edit data cafe" dibutuhkan, implementasikan method + route + test bersama-sama.
- Frontend `dashboard.tsx` memanggil `/api/admin/dashboard/recent-activity` yang **tidak terdaftar di route:list** — kandidat temuan lain (404 saat runtime). Tidak disentuh karena di luar scope tugas ini.
