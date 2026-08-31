# LAPORAN AUDIT KEAMANAN — Sistem Admin CafeNow

**Tanggal audit:** 4 Agustus 2026
**Metode:** Investigasi read-only (tidak ada file/data aplikasi yang diubah selama audit)
**Status plan Laragon/MySQL:** DITUNDA atas permintaan pemilik proyek — langkah verifikasi database MySQL dicatat di bagian 6, belum dieksekusi.

---

## 1. Ringkasan Eksekutif

Setelah pemeriksaan menyeluruh terhadap **151 route terdaftar**, seluruh controller admin, semua jalur pembuatan user, log aplikasi, serta database SQLite pengembangan, **tidak ditemukan endpoint registrasi/pembuatan akun admin yang tersembunyi (backdoor)**. Seluruh jalur pembuatan user yang ada — `CustomerAuthController@register`, `OwnerAuthController@register`, `CreateNewUser`, `CreateOwnerUser`, dan social login — **meng-hardcode role** (`customer`/`owner`) dan tidak dapat digunakan untuk menyuntikkan role `admin`. Satu-satunya mekanisme pembuatan admin adalah `UserRoleSeeder` (akun `admin@test.local` / password `1234`), yang **terdokumentasi resmi** di `requirements/akun.md` dan 6+ dokumen lain, serta hanya berjalan via artisan (tidak terjangkau HTTP). Indikasi "backdoor" kemungkinan besar merupakan kesalahan persepsi dari artifact dev (`cookie.txt`, `c.txt`) yang tertinggal di root repo — namun **verifikasi database MySQL belum tuntas** karena server MySQL sedang mati. Tingkat risiko keseluruhan: **MEDIUM** — ancaman backdoor tidak terbukti, tetapi terdapat masalah keamanan operasional nyata: kredensial admin test berpassword lemah kemungkinan masih ada di MySQL, session cookie live tertinggal di repo, `APP_DEBUG=true`, dan beberapa route admin rusak/inkonsisten.

---

## 2. Temuan Kritis: Endpoint Registrasi Admin Tak Sah

### Hasil: TIDAK ADA endpoint semacam itu

| Pemeriksaan | Hasil |
|---|---|
| `php artisan route:list` (151 route, lengkap) | Tidak ada route dengan pola `register/create/store/admin` untuk pembuatan user admin |
| `routes/api/admin.php` (35 route) | Hanya operasi CRUD/aksi admin — **tidak ada** `POST /api/admin/users` (create), hanya `PATCH`, `suspend`, `unsuspend` |
| `routes/api/auth.php:41` | `POST /api/admin/login` — satu-satunya route admin publik (login), di-throttle |
| `AdminUserController@update:34` | Hanya `$request->only(['name', 'email'])` — **role tidak bisa diubah via HTTP** |
| Pencarian keyword `promote`, `makeAdmin`, `assignRole`, `registerAdmin`, `is_admin`, `superadmin` | **0 hasil** di seluruh `app/`, `routes/`, `database/`, `tests/` |
| `User::create()` di seluruh codebase | 5 lokasi, semuanya meng-hardcode role (`Customer`/`Owner`) atau default `customer` |
| Mass assignment | `role` ada di `#[Fillable]` (`User.php:19-22`), tetapi **tidak ada jalur kode** yang memasukkan input request ke kolom `role` — tidak dapat dieksploitasi |
| `UserRoleSeeder.php:19-29` | Membuat `admin@test.local`, `owner@test.local`, `customer@test.local` (password `1234`) via `firstOrCreate` — **hanya artisan**, bukan route |

### Bukti bahwa akun seeder DIDOKUMENTASIKAN (bukan covert):
- `requirements/akun.md` (dibuat 24/07 22:29, satu menit setelah seeder dibuat 22:28) mencantumkan ketiga akun test.
- Disebut juga di `PHASE_6_COMPLETE.md`, `DEVELOPMENT_SUMMARY.md`, `ARCHITECTURE.md`, `REVIEW_FIXES_APPLIED.md`.

### Tingkat eksposur:
- **Seeder:** tidak terjangkau HTTP; hanya via `php artisan db:seed --class=UserRoleSeeder`.
- **Login admin:** publik tapi butuh akun dengan role `admin` — dan `AdminAuthController@login:30` memeriksa role, tidak ada cara HTTP untuk membuat akun admin.

### Apakah sudah dieksekusi? (Task 4)
- **Database SQLite dev** (`database/cafe_now.sqlite`, dibaca read-only): hanya **1 user** — `id=1, denipasbi@gmail.com, role=customer`, dibuat 24/07 14:37. **Tidak ada admin**, 0 audit log, 0 personal_access_tokens. Sesi yang ada: 3 (2 anonim, 1 milik user id 1).
- **Database MySQL** (`cafe_now`): **TIDAK dapat diverifikasi** — server MySQL mati (koneksi 127.0.0.1:3306 ditolak, tidak ada proses mysqld). Log menunjukkan userId 1, 2, 3, 6 pernah ada di MySQL, dan pada 24/07 16:32 user id 1 mengakses `/admin/dashboard` web (artinya kemungkinan ada user ber-role admin di MySQL).
- **Jejak curl:** `cookie.txt` berisi **session cookie Laravel asli** (`cafenow-session`, expire 26/07/2026) — berhasil didekripsi (read-only) dengan `APP_KEY`: session ID `EkIWS0gM3JmgqW2WLuTWaVlcgfVDl8EB6MJ0LhWr`. Session ID ini **tidak ada** di tabel `sessions` SQLite → sesi hidup di MySQL, dibuat ±26/07 (periode pengujian frontend admin). `c.txt` berisi string `b` — artifact output curl.
- **Interpretasi:** semua jejak konsisten dengan pengembangan/test legitim (agent menguji halaman admin via curl dengan sesi login), bukan eksekusi backdoor. Namun identitas sesi (admin atau bukan) tidak bisa dipastikan tanpa akses MySQL.

**Query yang harus dijalankan setelah MySQL menyala** (read-only):
```sql
SELECT id, name, email, role, created_at FROM users WHERE role = 'admin' ORDER BY created_at DESC;
SELECT id, user_id, ip_address, last_activity FROM sessions;
SELECT tokenable_id, name, abilities FROM personal_access_tokens;
```

---

## 3. Inventaris Route Admin Lengkap

**Total aktual: 49 route** (dokumentasi resmi menyebut 50 = 11+36+2+1). **Disparitas: −1** — `routes/api/admin.php` berisi **35** route, bukan 36 (overcount di dokumentasi `superadmin-deepcheck.md`). Rincian: 11 web + 35 admin.php + 2 analytics.php + 1 login = 49.

Semua route dilindungi `role:admin` (alias CheckRole) kecuali login.

### Route Web (11) — middleware `[web, auth, verified, role:admin]` (`web.php:98-110`)

| Method | Path | Target | Status |
|---|---|---|---|
| GET | admin/dashboard | Admin\AdminDashboardController@index | ✅ normal |
| GET | admin/cafe-approvals | Inertia (admin/Cafe/Approvals) | ✅ normal |
| GET | admin/cafes | Inertia (admin/Cafe/Management) | ✅ normal |
| GET | admin/featured-cafes | Inertia (admin/Cafe/Featured) | ✅ normal |
| GET | admin/bookings | Inertia (admin/Booking/Oversight) | ✅ normal |
| GET | admin/orders | Inertia (admin/Order/Oversight) | ✅ normal |
| GET | admin/refunds | Inertia (admin/Refund/Queue) | ✅ normal |
| GET | admin/analytics | Inertia (admin/Analytics) | ✅ normal |
| GET | admin/commissions | Inertia (admin/Commission/Management) | ✅ normal |
| GET | admin/users | Inertia (admin/User/Management) | ✅ normal |
| GET | admin/audit-logs | Inertia (admin/User/AuditLogs) | ✅ normal |

### Route API Admin (37) — middleware `[api, auth:sanctum, role:admin]`

| Method | Path | Target | Status |
|---|---|---|---|
| GET | api/admin/dashboard | Admin\AdminDashboardController@index | ⚠️ **anomali** — mengembalikan Inertia HTML, bukan JSON |
| GET | api/admin/analytics | Admin\AdminAnalyticsController@index | ✅ normal |
| GET | api/admin/analytics/revenue | Admin\AdminAnalyticsController@revenue | ✅ normal |
| GET | api/admin/analytics/cafes | Admin\AdminAnalyticsController@topCafes | ⚠️ bug — filter `where('status','approved')`, kolom asli `approval_status` → selalu kosong |
| GET | api/admin/analytics/bookings/status | Admin\AdminAnalyticsController@bookingStatus | ✅ normal |
| GET | api/admin/analytics/export-csv | Admin\AdminAnalyticsController@exportCsv | ✅ normal |
| GET | api/admin/analytics/platform | Analytics\AdminAnalyticsController@platform | ✅ normal |
| GET | api/admin/analytics/commission | Analytics\AdminAnalyticsController@commission | ✅ normal |
| GET | api/admin/audit-logs | Admin\AdminAuditLogController@index | ✅ normal |
| GET | api/admin/bookings | Admin\AdminBookingController@index | ✅ normal |
| GET | api/admin/bookings/{booking} | Admin\AdminBookingController@show | ✅ normal |
| POST | api/admin/bookings/{booking}/cancel | Admin\AdminBookingController@cancel | ⚠️ tanpa audit log |
| GET | api/admin/cafe-approvals | Admin\AdminCafeRegistrationController@index | ✅ normal |
| GET | api/admin/cafe-approvals/{cafe} | Admin\AdminCafeRegistrationController@show | ✅ normal |
| POST | api/admin/cafe-approvals/{cafe}/approve | Admin\AdminCafeRegistrationController@approve | ✅ normal (audit ✓) |
| POST | api/admin/cafe-approvals/{cafe}/reject | Admin\AdminCafeRegistrationController@reject | ✅ normal (audit ✓) |
| GET | api/admin/cafes | Admin\AdminCafeController@index | ✅ normal |
| GET | api/admin/cafes/{cafe} | Admin\AdminCafeController@show | ✅ normal |
| PATCH | api/admin/cafes/{cafe} | Admin\AdminCafeController@**update** | 🔴 **method TIDAK ADA** → 500 |
| POST | api/admin/cafes/{cafe}/suspend | Admin\AdminCafeController@suspend | ⚠️ tanpa audit log |
| POST | api/admin/cafes/{cafe}/unsuspend | Admin\AdminCafeController@unsuspend | ⚠️ tanpa audit log |
| GET | api/admin/commissions/rates | Admin\AdminCommissionController@rates | ✅ normal |
| GET | api/admin/commissions/history | Admin\AdminCommissionController@history | ✅ normal |
| PATCH | api/admin/commissions/rates/{type} | Admin\AdminCommissionController@updateRate | ⚠️ tanpa validasi + tanpa audit |
| GET | api/admin/featured-cafes | Admin\AdminFeaturedCafeController@index | ✅ normal |
| POST | api/admin/featured-cafes | Admin\AdminFeaturedCafeController@store | ✅ normal (audit ✓) |
| GET | api/admin/featured-cafes/{featured_cafe} | Admin\AdminFeaturedCafeController@**show** | 🔴 **method TIDAK ADA** → 500 (temuan baru) |
| PUT/PATCH | api/admin/featured-cafes/{featured_cafe} | Admin\AdminFeaturedCafeController@update | ✅ normal (audit ✓) |
| DELETE | api/admin/featured-cafes/{featured_cafe} | Admin\AdminFeaturedCafeController@destroy | ✅ normal (audit ✓) |
| GET | api/admin/refunds | Admin\AdminRefundController@index | ✅ normal |
| GET | api/admin/refunds/{refund} | Admin\AdminRefundController@show | ✅ normal |
| POST | api/admin/refunds/{refund}/process | Admin\AdminRefundController@process | ⚠️ tanpa audit, tanpa call API pembayaran |
| POST | api/admin/refunds/{refund}/reject | Admin\AdminRefundController@reject | ⚠️ tanpa audit |
| GET | api/admin/users | Admin\AdminUserController@index | ✅ normal |
| PATCH | api/admin/users/{user} | Admin\AdminUserController@update | ⚠️ tanpa validasi + tanpa audit |
| POST | api/admin/users/{user}/suspend | Admin\AdminUserController@suspend | ⚠️ tanpa audit; **admin bisa suspend dirinya/admin lain** |
| POST | api/admin/users/{user}/unsuspend | Admin\AdminUserController@unsuspend | ⚠️ tanpa audit |

### Route Login (1) — middleware `[api, throttle:auth]` (publik, di luar group role)

| Method | Path | Target | Status |
|---|---|---|---|
| POST | api/admin/login | Auth\AdminAuthController@login | ✅ normal (cek role `admin`, token `role:admin`) |

---

## 4. Temuan dari Git History

**TIDAK DAPAT DILAKUKAN — proyek bukan repositori git.** Direktori `.git` tidak ada (`git log` → `fatal: not a git repository`). Yang ada hanya `gitignore`, `gitattributes`, dan `.github/` (dibuat 18/07/2026). Hal ini patut dicatat: ketiadaan history git membuat **semua perubahan tidak dapat diaudit jejaknya**, dan menghilangkan kemampuan membuktikan/menyangkal niat agent sebelumnya.

**Rekonstruksi timeline dari timestamp file** (pengganti git history):

| Tanggal | Aktivitas |
|---|---|
| 30/06/2026 | Scaffold awal (seeder, action Fortify) |
| 13–19/07/2026 | Split routes, CheckRole (18/07), AdminOrderController + AdminFeaturedCafeController (18/07) |
| 24/07 14:37 | User customer (`denipasbi@gmail.com`) dibuat di SQLite |
| 24/07 16:32 | MySQL aktif; user id 1 mengakses `/admin/dashboard` (log error kolom `status`) |
| 24/07 21:38 | SQLite terakhir dimodifikasi |
| 24/07 22:28–22:29 | **UserRoleSeeder dibuat** + `akun.md` (dokumentasi akun test) |
| 24/07 22:59–23:42 | AdminMiddleware, bootstrap/app.php, routes/api/admin.php, semua controller admin inti |
| 25/07 01:20 | COMPLETE_ROUTE_MAPPING.md |
| 26/07 ±12:04 UTC | Session cookie curl (`cookie.txt`) dibuat — periode test frontend admin (screenshot 16:18 WIB) |
| 29–30/07 | CreateOwnerUser/web.php, AdminCafeRegistrationController; dokumentasi deepcheck |

Tidak ada indikasi commit tersembunyi/generik karena memang tidak ada git sama sekali.

---

## 5. Temuan Tambahan (Task 5)

1. **Route menuju method yang tidak ada:**
   - `PATCH /api/admin/cafes/{cafe}` → `AdminCafeController@update` **tidak ada** (`AdminCafeController.php` hanya index/show/suspend/unsuspend) → 500.
   - `GET /api/admin/featured-cafes/{featured_cafe}` → `AdminFeaturedCafeController@show` **tidak ada** (hanya index/store/update/destroy) → 500. *(yang kedua ini tidak tercatat di dokumentasi resmi — temuan baru)*
2. **Panggilan frontend ke endpoint tidak terdaftar:**
   - `resources/js/pages/admin/Order/Oversight.tsx:52` → `/api/admin/orders` — **tidak ada route** (404). `AdminOrderController` ada tapi mati (dead code, tidak diroute).
   - `resources/js/pages/admin/dashboard.tsx:51` → `/api/admin/dashboard/recent-activity` — **tidak ada route** (404).
   - Catatan: `GET /api/admin/dashboard` terdaftar tetapi mengembalikan Inertia HTML (method yang sama dengan route web) — tidak JSON.
3. **Aksi admin TANPA AdminAuditLog** (hanya `approve_cafe`, `reject_cafe`, dan CRUD featured yang mencatat): `AdminBookingController@cancel`, `AdminRefundController@process` dan `@reject`, `AdminCafeController@suspend`/`@unsuspend`, `AdminUserController@update`/`@suspend`/`@unsuspend`, `AdminCommissionController@updateRate`.
4. **AdminMiddleware — dead code TERKONFIRMASI:** hanya terdaftar sebagai alias `'admin'` di `bootstrap/app.php:31`; **0 route** menggunakannya (termasuk tidak ada `->middleware('admin')` di file route mana pun). CheckRole (`role:admin`) adalah satu-satunya gate aktif.
5. **Keamanan operasional:**
   - `users.role` kolom string default `'customer'` tanpa constraint DB (migrasi `2026_07_18_000001_add_fields_to_users_table.php:15`) — konsisten dengan dokumentasi; perubahan role hanya bisa via DB langsung/artisan.
   - `AdminUserController@suspend` tidak mencegah suspend admin lain/diri sendiri.
   - `.env`: `APP_DEBUG=true`, `APP_ENV=local`.
   - **`cookie.txt` (session cookie valid) dan `c.txt` tertinggal di root repo** — artifact credential.
   - `UserRoleSeeder` menggunakan password `1234` — jika akun `admin@test.local` tersisa di MySQL, itu kredensial admin berpassword trivial.
   - Login admin memakai `LoginRequest` customer yang sama (`AdminAuthController`), tanpa throttle khusus per-akun (hanya `throttle:auth` global).

---

## 6. Rekomendasi Langkah Selanjutnya (keputusan pemilik proyek — BELUM dieksekusi)

1. **[P0 — DITUNDA] Nyalakan MySQL Laragon lalu verifikasi** (query read-only dari bagian 2): daftar semua user `role='admin'`, cek `admin@test.local`, cek tabel `sessions` untuk session ID `EkIWS0gM3JmgqW2WLuTWaVlcgfVDl8EB6MJ0LhWr`. Ini satu-satunya celah bukti yang belum tertutup. *(Atas permintaan pemilik proyek, langkah ini disimpan untuk nanti.)*
2. **[P0] Hapus artifact `cookie.txt` dan `c.txt`** dari root repo + `php artisan session:clear` (atau truncate `sessions`) — jangan biarkan session cookie valid di repo. *(RESOLVED 2026-08-06: kedua file dihapus, `.gitignore` diperbarui — lihat `requirements/fix-security-housekeeping-2026-08-06.md`)*
3. **[P1] Hapus/ubah password akun `admin@test.local`** (atau hapus akun seeder sepenuhnya) di semua database; pertimbangkan hapus `UserRoleSeeder` dari repo jika bukan dev environment. *(RESOLVED 2026-08-06: seeder kini generate password kuat per-run, env `SEEDER_ADMIN_PASSWORD` sebagai override, docs diperbarui — lihat `requirements/fix-security-housekeeping-2026-08-06.md`)*
4. **[P1] Perbaiki/bereskan route rusak:** hapus route `PATCH api/admin/cafes/{cafe}` dan `GET api/admin/featured-cafes/{featured_cafe}` (atau tambahkan method `update`/`show`); daftarkan `AdminOrderController` atau hapus panggilan `/api/admin/orders` di frontend.
5. **[P2] Lengkapi audit log** untuk seluruh aksi admin (enum `AdminAction` sudah ada tapi tak terpakai) + proteksi suspend admin oleh admin.
6. **[P2] Set `APP_DEBUG=false`** di luar lokal; pertimbangkan constraint DB untuk `users.role`.
7. **[P3] Putuskan nasib `AdminMiddleware`** (hapus atau pakai konsisten), dan inisialisasi **git** untuk auditability ke depan.

---

## Lampiran — Konfirmasi Pemilik Proyek

Kesimpulan audit: **tidak ditemukan backdoor registrasi admin**; temuan utama adalah hygiene keamanan dev (kredensial test lemah, session cookie di repo, route rusak, audit log tidak lengkap) dan **satu verifikasi yang belum tuntas** — isi database MySQL (ditunda, dijadwalkan kemudian).
