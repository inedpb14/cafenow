# Deep Check — Alur Superadmin/Admin CafeNow

> **Tanggal:** 29 Juli 2026
> **Scope:** Role, middleware, routes, controllers, frontend admin pages, alur approval, audit trail, security gaps
> **Metode:** Analisis statis full-codebase (backend + frontend)

---

## 1. Temuan Utama — "Superadmin" TIDAK Ada Sebagai Role

**Kesimpulan pertama dan paling penting:** Tidak ada `UserRole::SuperAdmin` di seluruh codebase.

| Aspek | Fakta |
|-------|-------|
| Enum | `app/Enums/UserRole.php:7-12` — hanya `Customer`, `Owner`, `Admin` |
| DB | Kolom `users.role` adalah `string` default `'customer'` — **tanpa constraint enum** |
| String "superadmin" | **0 matches** di seluruh repo (app, routes, resources, database) |
| UI badge | `AdminLayout.tsx:80` — "Super Admin" hanya **label hardcoded**, bukan role asli |
| Middleware | `AdminMiddleware` (alias `admin`) terdaftar tapi **tidak pernah dipakai** (dead code) |

**Implikasi:** Seluruh alur yang user sebut "superadmin" sebenarnya dijalankan oleh role **`admin`** tunggal. Tidak ada pemisahan admin vs superadmin.

---

## 2. Peta Akses & Middleware

### Middleware yang benar-benar aktif

| Middleware | Alias | Cara kerja |
|------------|:-----:|------------|
| `CheckRole` | `role` | Variadic: `role:admin`, `role:owner`, `role:customer` — 403 jika tidak cocok |
| `AdminMiddleware` | `admin` | Hanya `UserRole::Admin`, return JSON 403 — **tidak dipakai di route mana pun** |

### 50 route admin — semua digate `role:admin`

| Group | Jumlah | File | Middleware |
|-------|:------:|------|------------|
| Web pages (Inertia) | 11 | `routes/web.php:98-110` | `auth, verified, role:admin` |
| Admin API core | 36 | `routes/api/admin.php:17-73` | `auth:sanctum, role:admin` |
| Admin analytics API | 2 | `routes/api/analytics.php:16-18` | `auth:sanctum, role:admin` |
| Admin login API | 1 | `routes/api/auth.php:41` | `throttle:auth` (publik) |

**Semua admin web** (11 halaman): dashboard, cafe-approvals, cafes, featured-cafes, bookings, orders, refunds, analytics, commissions, users, audit-logs.

---

## 3. Alur Approval Cafe (Fitur Inti)

```
Owner submit cafe → status=pending
        │
        ▼
Admin buka /admin/cafe-approvals
        │
   ┌────┴────┐
   │ detail  │  → modal: info, tables, menu, hours, rejection history
   └────┬────┘
   ┌────┴─────────┐            ┌──────────────────┐
   │ APPROVE      │            │ REJECT           │
   │ POST .../approve          │ POST .../reject  │
   │ approval_status=active    │ approval_status=rejected
   │ rejection_reason=null     │ rejection_reason=alasan (required)
   │ audit log ✓               │ audit log ✓
   │ notifikasi owner ✓        │ notifikasi owner ✓ (dengan alasan)
   └─────────────┘             └──────────────────┘
```

**Alur berjalan baik**, dengan gap: tidak ada guard transisi status (cafe yang sudah `active` masih bisa di-approve/di-reject ulang).

### Owner resubmission (sudah berfungsi)
- `OwnerDashboardController@updateCafe:479-487` — jika `rejected`, edit profil → otomatis `pending`, `rejection_reason=null`, `submission_count++`
- Frontend owner menampilkan rejection reason (alert merah) + "Pengajuan ke-N"

---

## 4. Inventory Controller Admin (13 controller)

| Controller | Lines | Status | Catatan |
|------------|:-----:|:------:|---------|
| AdminCafeRegistrationController | 171 | ✅ aktif | Approval inti (index/show/approve/reject) |
| AdminCafeController | 55 | ⚠️ rusak | **PATCH update → method tidak ada** |
| AdminUserController | 59 | ⚠️ minim | update nama/email tanpa validasi; suspend tanpa audit |
| AdminBookingController | 54 | ⚠️ minim | cancel tanpa audit/notifikasi/refund |
| AdminRefundController | 60 | ⚠️ minim | process/reject tanpa audit log, tanpa panggilan API pembayaran |
| AdminCommissionController | 57 | ⚠️ minim | update rate tanpa validasi + audit |
| AdminDashboardController | 36 | ✅ aktif | 6 metrik (15% komisi hardcoded) |
| AdminAnalyticsController (Admin) | 95 | ⚠️ bug | `topCafes` filter kolom salah → **selalu kosong** |
| AdminAnalyticsController (Analytics) | 78 | ✅ aktif | platform & commission (pakai kolom commission asli) |
| AdminFeaturedCafeController | 114 | ✅ lengkap | CRUD + audit log + 409 conflict |
| AdminAuditLogController | 49 | ✅ aktif | Filter lengkap |
| AdminAuthController | 48 | ✅ aktif | Login token `role:admin` |
| AdminOrderController | 38 | ☠️ dead code | **Tidak ada route sama sekali** |

---

## 5. Frontend Admin (11 halaman, ~3.900 baris)

| Halaman | Lines | Endpoint utama | Catatan |
|---------|:-----:|----------------|---------|
| dashboard.tsx | 270 | GET recent-activity | 6 metric cards, quick actions |
| Cafe/Approvals.tsx | 443 | approvals + approve/reject | Modal 4 tab, reject butuh reason |
| Cafe/Management.tsx | 314 | cafes + suspend | Search + sortable DataTable |
| Cafe/Featured.tsx | 343 | featured CRUD | Card grid + delete confirm |
| Booking/Oversight.tsx | 443 | bookings + cancel | Filter lengkap, cancel modal |
| Order/Oversight.tsx | 251 | orders | **Inconsistent**: `meta` vs `pagination`, tanpa toast |
| Refund/Queue.tsx | 419 | refunds + process/reject | Bank info di `<code>` |
| Analytics.tsx | 297 | revenue/topCafes/status/export | Chart custom (no lib) |
| Commission/Management.tsx | 301 | rates + history + PATCH | Inline edit rate |
| User/Management.tsx | 384 | users + suspend | **Tanpa role management** |
| User/AuditLogs.tsx | 392 | audit-logs | Filter + JSON pre |

**Pola API:** Tidak ada axios. Reads pakai `fetch()` mentah, writes lewat `resources/js/lib/http.ts` (inject XSRF cookie).

---

## 6. Daftar Temuan (Issues)

### 🔴 Critical (4)

| # | Temuan | Lokasi | Dampak |
|:-:|--------|--------|--------|
| **C1** | `PATCH /api/admin/cafes/{cafe}` menarget `update()` yang **tidak ada** di `AdminCafeController` | `routes/api/admin.php:32` | Route ini 500 error jika dipanggil; halaman Cafe Management tidak punya edit cafe |
| **C2** | `AdminAnalyticsController::topCafes()` filter `where('status','approved')` — kolom sebenarnya `approval_status` (nilai: pending/active/suspended/rejected) | `app/Http/Controllers/Admin/AdminAnalyticsController.php:36` | **Selalu return kosong** — top cafes analytics mati |
| **C3** | Admin bisa suspend **admin lain & dirinya sendiri** — tanpa proteksi diri | `AdminUserController@suspend:38` | Admin bisa mengunci akun admin lain / diri sendiri dari sistem |
| **C4** | Approval tanpa guard transisi status: cafe `active`/`suspended` masih bisa di-approve/di-reject | `AdminCafeRegistrationController@approve:99, reject:134` | Status bisa di-overwrite secara tidak sengaja |

### 🟠 High (6)

| # | Temuan | Lokasi | Dampak |
|:-:|--------|--------|--------|
| **H1** | Audit log **tidak ada** untuk: suspend/unsuspend cafe, suspend user, cancel booking, process/reject refund, update commission | berbagai controller | Tidak bisa trace siapa melakukan apa (padahal `AdminAction` enum sudah definisikan `suspend_user`, `process_refund`, `update_commission` dll — cuma tidak dipakai) |
| **H2** | Dua perhitungan revenue berbeda: dashboard & analytics pakai `total_price * 0.15` **hardcoded**; Analytics/platform pakai kolom `commission` asli | `AdminDashboardController:26`, `AdminAnalyticsController:20` | Angka bisa drift jika komisi diubah via Commission Management |
| **H3** | `AdminUserController@update` — update name/email **tanpa validasi** dan tanpa audit | `AdminUserController:32` | Input tidak valid + tidak terlacak |
| **H4** | `AdminRefundController@process` — set `completed` **tanpa panggilan API pembayaran** (Midtrans refund), tanpa validasi, tanpa audit | `AdminRefundController:33` | Refund "diproses" tapi uang tidak benar-benar dikembalikan |
| **H5** | `AdminBookingController@cancel` — tanpa `cancelled_by`, tanpa enum `CancelledBy::Admin`, tanpa audit, tanpa notifikasi owner | `AdminBookingController:39` | Booking dibatalkan tanpa jejak |
| **H6** | `AdminCommissionController@updateRate` — tanpa validasi (bisa float negatif/0), silent no-op jika rule tidak ada, tanpa audit | `AdminCommissionController:38` | Rate bisa jadi tidak valid |

### 🟡 Medium (7)

| # | Temuan | Lokasi | Dampak |
|:-:|--------|--------|--------|
| **M1** | `RejectCafeRequest` dibuat tapi **tidak dipakai** (validasi inline di reject) | `app/Http/Requests/Admin/RejectCafeRequest.php` | Form request mubazir |
| **M2** | `AdminMiddleware` (alias `admin`) dead code | `bootstrap/app.php:31` | Kebingungan dual middleware |
| **M3** | `AdminOrderController` dead code — tidak ada route | `app/Http/Controllers/Admin/AdminOrderController.php` | Halaman Order Oversight FE menunjuk `/api/admin/orders` yang **tidak terdaftar** → 404 |
| **M4** | CSV export tanpa escaping — nama cafe berisi koma merusak file | `AdminAnalyticsController@exportCsv:74` | Data korup |
| **M5** | `topCafes` + `revenue` tanpa validasi tanggal — null/absend dates merusak `whereBetween` | `AdminAnalyticsController:18-34` | 500 error |
| **M6** | Frontend mengabaikan error body — hanya cek `response.ok` | semua halaman admin | Pesan error backend (validasi, konflik) tidak pernah tampil |
| **M7** | `formatCurrency` duplikat 4x; pagination markup duplikat 6x; Order/Oversight pakai `meta` beda dari yang lain (`data.pagination`) | FE admin | Tech debt konsistensi |

### 🟢 Low (4)

| # | Temuan | Lokasi |
|:-:|--------|--------|
| **L1** | Badge "Super Admin" hardcoded di sidebar — selalu tampil meski role bukan admin | `AdminLayout.tsx:80` |
| **L2** | Admin login API (`POST /api/admin/login`) memakai `LoginRequest` customer — tidak dibedakan | `AdminAuthController` |
| **L3** | Tidak ada role management UI — admin tidak bisa promote/demote user (bisa disengaja) | `User/Management.tsx` |
| **L4** | `AdminCafeController@index` — keyword search `orWhereHas` tanpa grouping bisa "bleed" ke kondisi lain | `AdminCafeController:11` |

---

## 7. Rekomendasi Prioritas

| Prioritas | Tindakan | Temuan |
|:---------:|----------|--------|
| **P0** | Tentukan dulu: perlu **pemisahan role** admin vs superadmin, atau cukup perbaiki role admin existing? | §1 |
| **P1** | Fix `AdminCafeController@update` (buat method atau hapus route) + hapus `AdminOrderController`/route-nya | C1, M3 |
| **P1** | Fix filter `topCafes` → `approval_status` + validasi tanggal | C2, M5 |
| **P1** | Tambah guard transisi status approval (hanya `pending` yang bisa approve/reject) | C4 |
| **P1** | Proteksi admin suspend: jangan izinkan suspend user ber-role admin | C3 |
| **P2** | Lengkapi audit log untuk semua aksi (pakai enum `AdminAction` yang sudah ada) | H1 |
| **P2** | Seragamkan perhitungan revenue → pakai kolom `commission` asli | H2 |
| **P2** | Validasi + audit untuk user update, refund process, booking cancel, commission rate | H3-H6 |
| **P3** | Rapikan FE: hapus `formatCurrency` duplikat, samakan pagination, tampilkan error body | M6, M7 |
| **P3** | Pakai `RejectCafeRequest`, hapus `AdminMiddleware`, CSV escaping | M1, M2, M4 |

---

## 8. Ringkasan

| Metrik | Nilai |
|--------|:-----:|
| Role total | 3 (customer, owner, admin) — **tanpa superadmin** |
| Route admin | 50 (11 web + 36 API + 2 analytics + 1 login) |
| Controller admin | 13 (2 dead/broken) |
| Halaman FE admin | 11 (~3.900 baris) |
| Temuan critical | 4 |
| Temuan high | 6 |
| Temuan medium | 7 |
| Temuan low | 4 |
| **Total temuan** | **21** |
