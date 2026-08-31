# Laporan Analisis — Verifikasi Email & Hasil Manual Testing

Tanggal: 2026-08-08
Status: ANALISIS SELESAI — menunggu eksekusi
Sumber: Manual testing fitur owner & admin + inspeksi codebase

---

## Ringkasan

Sesi analisis komprehensif atas hasil manual testing menghasilkan **6 temuan** (3 bug
terkonfirmasi dengan akar masalah, 1 persyaratan fitur baru, 1 masalah layout, 1 klarifikasi
workflow) plus **1 keputusan arsitektur** (matikan verifikasi email sementara). Seluruh
keputusan sudah dikonfirmasi bersama pemilik proyek.

---

## Temuan 1 — Bug Verifikasi Email Setelah Pendaftaran

### Alur saat ini (2 jalur registrasi)

**Jalur A — Customer via API mobile (`/api/auth/register`):**
`app/Http/Controllers/Auth/CustomerAuthController.php`

1. `register()` (baris 32-58): user dibuat dengan `email_verified_at => null`, OTP
   digenerate & dikirim via email (Mailtrap). Response TIDAK berisi token → app pindah
   ke layar OTP.
2. `verifyOtp()` (baris 141-165): validasi OTP dari Cache, baru set verified + keluar token.
3. `login()` (baris 72-78): memblokir user dengan `email_verified_at === null`
   (`EMAIL_NOT_VERIFIED`).

**Akar masalah:** `OtpService::sendEmailOtp()` (`app/Services/Auth/OtpService.php:48-57`)
membungkus kirim email dengan `try/catch` yang hanya `Log::warning` — jika email gagal,
tidak ada error ke user. User terjebak di layar OTP selamanya, akun terlanjur dibuat tapi
`email_verified_at = null` → tidak bisa login.

**Jalur B — Owner via web (Inertia `/owner/register`):**
`app/Actions/Fortify/CreateOwnerUser.php` + `routes/web.php:21-25`

User dibuat → `event(new Registered($user))` → Fortify kirim email verifikasi → redirect
`verification.notice` → middleware `verified` memblokir dashboard. Kalau email tidak
sampai → owner terkunci.

### Data terdampak (database MySQL `cafe_now`)

```sql
-- User dengan email_verified_at = NULL (terkunci dari login)
-- id 4,5,6,7,8 — termasuk owner1@test.local (2026-08-08)
```

### Keputusan (disetujui pemilik proyek)

**Fitur verifikasi email DIMATIKAN sementara** (arsitektur dipertahankan untuk dihidupkan
lagi nanti). User yang selesai mendaftar langsung di-acc & disimpan di DB, lalu diarahkan
ke halaman login. Tidak perlu backfill data lama.

### Rencana perubahan

| File | Perubahan |
|---|---|
| `app/Http/Controllers/Auth/CustomerAuthController.php` | `register()`: `email_verified_at => now()` (baris 44), hapus generate & kirim OTP (baris 47-48); response tetap shape lama (`user_id`, `email`, `message`); `login()`: hapus blok `EMAIL_NOT_VERIFIED` (baris 72-78) |
| `app/Http/Controllers/Auth/CustomerProfileController.php` | Hapus reset `email_verified_at = null` saat ganti email (baris 31-33) — tanpa jalur verifikasi, ini mengunci user permanen |
| `app/Actions/Fortify/CreateOwnerUser.php` | Tambah `'email_verified_at' => now()`; hapus `event(new Registered($user))` + import (tidak ada listener lain) |
| `app/Actions/Fortify/CreateNewUser.php` | Tambah `'email_verified_at' => now()` — konsisten dengan ekspektasi `RegistrationTest` (redirect dashboard) |
| `routes/web.php` | Baris 24: redirect `verification.notice` → `dashboard` (user sudah verified) |
| `routes/api/auth.php` | Hapus baris 16-17: route `POST /auth/verify-otp` & `POST /auth/resend-otp`. Method controller, `OtpService`, `VerifyOtpRequest`, `ResendOtpRequest` DIPERTAHANKAN |

**Tidak diubah:** `OtpService`, Request classes OTP, `config/fortify.php`
(`emailVerification()` jadi inert karena semua user verified), tanpa backfill DB.

---

## Temuan 2 — Owner Belum Approved Harus Diblokir dari Fitur

### Kondisi saat ini

Route owner web (`routes/web.php:67-93`) hanya cek `role:owner` — owner dengan cafe
`pending` bisa membuka semua halaman (data kosong, tapi halaman tidak diblokir).
`Cafe` model sudah punya `approval_status` + `isActive()` + `isContentEditable()`.

### Persyaratan

> Owner yang belum di-approve admin TIDAK boleh menggunakan semua fitur KECUALI fitur
> pengajuan cafe (Profil Cafe: index/store/update).

### Keputusan (disetujui pemilik proyek)

Blokir di **backend + frontend** (bukan sekadar sembunyikan menu).

### Rencana perubahan

- Middleware baru (pola `CheckRole`): cek `$request->user()->cafe` `isActive()`; jika tidak
  → redirect ke `owner.cafes.index` (dengan flash error).
- Daftarkan alias di `bootstrap/app.php`, terapkan di group route owner web kecuali:
  `owner.cafes.index`, `owner.cafes.store`, `owner.cafes.update` (route line 74-76).
- `app/Http/Middleware/HandleInertiaRequests.php`: share `cafe_status` untuk role owner.
- `resources/js/components/Owner/OwnerLayout.tsx`: banner "Menunggu persetujuan admin"
  + sembunyikan nav (Dashboard, Booking, Order Dapur, Analitik, Meja & Surge, Menu Dapur)
  saat cafe belum active/approved; tampilkan hanya "Profil & Info Cafe".
- Halaman `owner/cafes/index.tsx` sudah menampilkan `approval_status` + rejection reason.

---

## Temuan 3 — Layout Bermasalah: Form "Manajemen Meja & Surge Pricing"

`resources/js/pages/owner/cafes/tables.tsx:219`

Modal tambah/edit meja: `fixed inset-0 flex items-center justify-center p-4` **tanpa
`overflow-y-auto` / max-height** → pada viewport pendek/seluler, isi form (foto, toggle
status, tombol submit) terpotong dan tombol **Simpan tidak terjangkau**.

### Rencana perbaikan

- Container modal: tambah `max-h-[90vh] overflow-y-auto`, dan `items-start sm:items-center`
  agar di layar kecil modal rata atas & konten bisa di-scroll.

---

## Temuan 4 — Fitur "Order Dapur Live": Klarifikasi Workflow

### Workflow yang benar (klarifikasi pemilik proyek)

> Pelanggan booking + pesan menu → dikelola oleh fitur ini → cetak struk pesanan →
> pesanan dikirim ke dapur → pesanan selesai dimasak & dikirim ke kasir → admin kasir
> update pesanan selesai → user datang dan menerima pesanan.

Fitur ini adalah **pengelolaan pesanan**, bukan monitoring dapur real-time.

### Kondisi saat ini

- Status flow sudah sesuai: `scheduled → preparing → ready → completed`
  (state machine `app/Http/Controllers/Order/OwnerOrderController.php:58-60`,
  web `OwnerDashboardController::updateOrderStatus`).
- **Belum ada fitur cetak struk** (grep seluruh frontend: 0 hasil).

### Keputusan (disetujui pemilik proyek)

Cetak struk + perbaiki label status.

### Rencana perubahan (`resources/js/pages/owner/orders.tsx`)

- Tombol **Cetak Struk** per kartu pesanan → modal struk berisi: no. order, booking ref,
  nama pelanggan, rincian item + qty, total → `window.print()`.
- Label tombol status disesuaikan alur: `Mulai Masak` (scheduled→preparing),
  `Siap di Kasir` (preparing→ready), `Selesai Diserahkan` (ready→completed).

---

## Temuan 5 — Bug "Analitik Bisnis": SQLSTATE Unknown column 'user_id'

`app/Http/Controllers/Owner/OwnerDashboardController.php:309`

```php
$totalCustomers = Booking::where('cafe_id', $cafe->id)->distinct('user_id')->count('user_id');
```

Error yang muncul:
```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'user_id' in 'field list'
select count(distinct `user_id`) as `aggregate` from `bookings` where `cafe_id` = 3
```

Tabel `bookings` memakai kolom **`customer_id`** (dikonfirmasi di
`database/migrations/0001_01_01_000030_create_bookings_table.php:17`).

### Rencana perbaikan

```php
$totalCustomers = Booking::where('cafe_id', $cafe->id)->distinct('customer_id')->count('customer_id');
```

Satu baris. Akar masalah, bukan gejala — halaman analitik langsung 200.

---

## Temuan 6 — Admin: Akun & Halaman Tidak Menampilkan Data

### 6a. Akun admin: password generated (menyulitkan login)

`database/seeders/UserRoleSeeder.php:17-18` — password admin di-generate acak per run
(`Str::password(20)`, env `SEEDER_ADMIN_PASSWORD` tidak diset di `.env`), hanya dicetak
ke output seeder. Tidak praktis untuk dev.

### Keputusan (disetujui pemilik proyek)

Admin disimpan seperti akun lainnya — **password tetap `1234`** (dev only).

### Rencana perubahan

- `UserRoleSeeder.php`: admin pakai `Hash::make('1234')` seperti owner/customer; hapus
  method `adminPassword()` + import `Str` (tidak dipakai).
- `requirements/akun.md`: perbarui dokumentasi.

### 6b. Semua halaman admin tidak menampilkan data — AKAR MASALAH KETEMU

**Gejala:** Cafe Approvals kosong padahal 3 cafe pending di DB (`Kopi Nusantara` id 1,
`tuku dewe` id 2, `cafe gw lah` id 3 — terverifikasi via query MySQL 2026-08-08);
halaman admin lain juga kosong.

**Akar masalah:** `bootstrap/app.php` **tidak memanggil `$middleware->statefulApi()`**:

- Route API admin (`routes/api/admin.php`) memakai middleware `api` + `auth:sanctum`
  (diverifikasi via `php artisan route:list`: `["api","Authenticate:sanctum","CheckRole:admin"]`).
- Group `api` default (tanpa `statefulApi()`) TIDAK berisi
  `EnsureFrontendRequestsAreStateful` (`vendor/laravel/framework/.../Middleware.php:495-499`)
  → session web tidak pernah distart di request `/api/*`.
- Browser admin melakukan `fetch('/api/admin/...')` tanpa Bearer token → `auth:sanctum`
  fallback ke web guard → session tidak ada → **401 `{"message":"Unauthenticated."}`**.
- Frontend menelan 401 diam-diam: `setCafes(data.data || [])` → tampil "Tidak ada data",
  tanpa toast error (fetch tidak throw pada status 401).

**Konteks:** dashboard admin tetap tampil karena metriknya di-render server-side via
Inertia props (`AdminDashboardController::index`); semua daftar (cafe-approvals, bookings,
orders, refunds, users, dll.) di-fetch client-side → kosong.

### Rencana perbaikan

`bootstrap/app.php` → tambah satu baris:

```php
$middleware->statefulApi();
```

Efek: `EnsureFrontendRequestsAreStateful` masuk ke group `api` → request same-origin
dari browser (web admin/owner) membuka session → `auth:sanctum` fallback ke web guard
berhasil. **Tidak berdampak ke app mobile** (Bearer token tetap diprioritaskan; request
lintas-origin tidak mendapat session handling).

---

## Rencana Eksekusi (Urutan)

### Phase 1 — Matikan Verifikasi Email
6 file backend + routes (detail di Temuan 1).

### Phase 2 — Bug Fix
| File | Perubahan |
|---|---|
| `OwnerDashboardController.php:309` | `user_id` → `customer_id` |
| `bootstrap/app.php` | `$middleware->statefulApi()` |
| `UserRoleSeeder.php` | Admin password tetap `1234` |

### Phase 3 — Fitur
| Item | File |
|---|---|
| Gating owner (middleware + share props + banner/nav OwnerLayout) | baru + `bootstrap/app.php`, `HandleInertiaRequests.php`, `OwnerLayout.tsx`, `routes/web.php` |
| Layout modal meja | `pages/owner/cafes/tables.tsx` |
| Cetak struk + label status | `pages/owner/orders.tsx` |

### Phase 4 — Docs & Test
- `requirements/akun.md`: admin = 1234
- Test baru:
  - `tests/Feature/Auth/CustomerRegistrationTest.php` — register auto-verified + login langsung OK
  - `tests/Feature/Owner/AnalyticsTest.php` — GET `/owner/analytics` 200 (distinct customer)
  - `tests/Feature/Owner/ApprovalGateTest.php` — owner cafe pending diblokir dari
    `/owner/dashboard`, diizinkan di `/owner/cafes` (pola `OwnerCafeContentGuardTest`)
- Verifikasi: `php artisan test` + `php artisan route:list --path=api/auth` (verify-otp/
  resend-otp hilang) + uji manual: login admin → Cafe Approvals menampilkan 3 cafe pending.

---

## Lampiran — Verifikasi DB (2026-08-08, read-only)

```sql
-- users: 8 baris; id 4-8 email_verified_at = NULL (terdampak bug verifikasi)
-- cafes: 3 baris, SEMUA approval_status = 'pending'
--   id 1 Kopi Nusantara (owner 2)      — 2026-07-26
--   id 2 tuku dewe (owner 6)           — 2026-07-30
--   id 3 cafe gw lah (owner 8)         — 2026-08-08 13:02 (data manual testing terbaru)
-- tables: 3, menu_items: 3, bookings: 0
```

## Lampiran — Konfirmasi Pemilik Proyek

1. Register → langsung di-acc & disimpan, user diarahkan ke halaman login (tanpa token di response).
2. Route verify-otp/resend-otp dihapus, arsitektur (OtpService/Requests/controller methods) dipertahankan.
3. Web owner flow ikut dimatikan verifikasinya.
4. Backfill user lama: TIDAK perlu.
5. Order dapur: cetak struk + perbaiki label status.
6. Gating owner: backend + frontend.
7. Admin: password tetap 1234.
