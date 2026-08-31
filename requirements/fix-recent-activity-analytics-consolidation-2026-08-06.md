# Fix: Recent Activity Route & Konsolidasi Controller Analytics

Tanggal: 2026-08-06
Ruang lingkup: 2 temuan lanjutan dari audit sebelumnya.

## 1. Bug: Route `/api/admin/dashboard/recent-activity` Tidak Ada

### Temuan (dikonfirmasi bug live, bukan dead code)
- `resources/js/pages/admin/dashboard.tsx:48-64` melakukan `fetch('GET /api/admin/dashboard/recent-activity')` pada setiap load (useEffect) dan saat tombol refresh diklik.
- Route tersebut tidak pernah terdaftar di backend (tidak ada di `routes/api.php`, `routes/web.php`, maupun `routes/api/admin.php`).
- Akibatnya request gagal 404; karena dibungkus `try/catch`, halaman tidak error total melainkan menampilkan toast *"Gagal memuat aktivitas terbaru"* dan section aktivitas kosong.
- Frontend mengharapkan shape: `{ data: [{ id, type, message, time }] }`, dengan `time` berupa string relatif (diffForHumans), dirender sebagai daftar di `dashboard.tsx:205-215`.

### Solusi
Gunakan `AdminAuditLog` yang sudah terisi penuh sejak Part 2 (audit logging) sebagai sumber feed — reuse, bukan fitur baru.

- `app/Http/Controllers/Admin/AdminDashboardController.php`:
  - `recentActivity(): JsonResponse` — ambil 10 log terbaru (`AdminAuditLog::with('admin')->latest('created_at')`), petakan ke `{ id, type: action, message, time: diffForHumans }`.
  - `activityMessage(string $action)` — label 14 aksi (approve_cafe, reject_cafe, update_cafe, delete_cafe, suspend_user, activate_user, change_role, cancel_booking, delete_booking, update_commission, update_refund_policy, suspend_owner, activate_owner, featured_cafe) + fallback `ucfirst(str_replace('_',' '))`.
  - `entityLabel(string $type, ?int $id)` — nama entity untuk pesan: Cafe/User (nama), Booking (booking_reference), refund (id), FeaturedCafe (via relasi `cafe`).
- `routes/api/admin.php` — route baru di dalam group `auth:sanctum + role:admin`:
  ```php
  Route::get('/dashboard/recent-activity', [AdminDashboardController::class, 'recentActivity']);
  ```

### Test (4/4 lulus)
- `tests/Feature/Admin/DashboardRecentActivityTest.php`:
  - `test_recent_activity_returns_audit_logs_in_time_order_with_expected_shape` — 2 log (approve_cafe + cancel_booking), assert urutan terbaru-dahulu, shape `data.*.{id,type,message,time}`, label pesan berisi nama cafe.
  - `test_recent_activity_is_limited_to_ten_entries` — 12 log → hanya 10 dikembalikan.

## 2. Konsolidasi Controller Analytics Duplikat

### Temuan
- Dua controller analytics dengan nama class sama, namespace beda:
  - `App\Http\Controllers\Admin\AdminAnalyticsController` — DIPAKAI frontend (`resources/js/pages/admin/Analytics.tsx`), routes di `routes/api/admin.php`.
  - `App\Http\Controllers\Analytics\AdminAnalyticsController` — TIDAK dipakai runtime; hanya dirujuk `routes/api/analytics.php:17-18` dan file action TS hasil generate (wayfinder). Tidak ada test maupun caller.
- Controller yang tidak dipakai memiliki 2 method yang tidak dimiliki versi yang dipakai: `platform()` (aggregate usersByRole, cafesByStatus, bookingsByStatus, revenue = SUM `cafe_receives`) dan `commission()` (agregasi per period daily/weekly/monthly dari kolom `commission`).

### Solusi
Port logic ke controller yang bertahan, hapus duplikat:
- `app/Http/Controllers/Admin/AdminAnalyticsController.php` — tambah method `platform()` dan `commission()` (query di-port, hanya struktur respons dirapikan: `{ success, data }`).
- `routes/api/admin.php` — tambah route `/analytics/platform` dan `/analytics/commission` dalam group admin yang sudah ada.
- `routes/api/analytics.php` — hapus group admin (baris 5 use + 16-18); file kini hanya berisi `OwnerAnalyticsController` (PERTAHANKAN, tidak tersentuh).
- Hapus `app/Http/Controllers/Analytics/AdminAnalyticsController.php`.
- File TS `resources/js/actions/App/Http/Controllers/Analytics/AdminAnalyticsController.ts` DIBIARKAN — artifact generated wayfinder, tidak diimport halaman mana pun (verifikasi grep: 0 hasil), path route tidak berubah sehingga tetap valid; akan ter-update otomatis saat generate ulang.

### Bug yang ditemukan & diperbaiki saat port
- `$request->date('from', Carbon::now()->subYear())` — parameter kedua `date()` adalah FORMAT, bukan default value. Saat query param tidak dikirim → `null` → `whereBetween` tidak match → hasil kosong. Diperbaiki menjadi `$request->date('from') ?? Carbon::now()->subYear()`.

### Test (2/2 lulus)
- `tests/Feature/Admin/AdminAnalyticsConsolidationTest.php`:
  - `test_platform_endpoint_returns_aggregates_from_surviving_controller` — 1 booking completed → `data.revenue` = 850000, struktur `{users, cafes, bookings, revenue}`.
  - `test_commission_endpoint_returns_period_grouping` — booking completed hari ini, `?period=monthly` → key `Y-m` berisi `total_commission` 150000 dan `booking_count` 1.
  - Catatan: `assertJsonPath` tidak bisa menembus key berisi titik (format `Y-m-d`), test memakai period `monthly` (`Y-m`).

## Hasil Pengujian
| Scope | Hasil |
|---|---|
| Test baru (4 + 2) | 6/6 lulus |
| DashboardCommissionTest + AdminAuditLoggingTest (regresi) | 12/12 lulus |
| Full suite | 129/130 — 1 kegagalan `DashboardTest::test_authenticated_users_can_visit_the_dashboard` (PRE-EXISTING, bukan regresi dari pekerjaan ini) |

## File yang Diubah
- `routes/api/admin.php` (route recent-activity + 2 route analytics)
- `app/Http/Controllers/Admin/AdminDashboardController.php` (recentActivity + helper)
- `app/Http/Controllers/Admin/AdminAnalyticsController.php` (platform + commission)
- `routes/api/analytics.php` (hapus group admin duplikat)
- DIHAPUS: `app/Http/Controllers/Analytics/AdminAnalyticsController.php`
- Baru: `tests/Feature/Admin/DashboardRecentActivityTest.php`, `tests/Feature/Admin/AdminAnalyticsConsolidationTest.php`

## Catatan
- `Analytics.tsx` tidak dipanggil untuk menampilkan aktivitas — recent-activity adalah feed terpisah di dashboard admin, tidak ada konflik shape.
- Opsi alternatif (tidak diambil): menggabungkan analytics ke dalam satu endpoint dashboard — tidak perlu, frontend sudah memakai endpoint terpisah.
