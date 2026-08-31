# Laporan Implementasi: State Machine Status Cafe & Penutupan Gap Keamanan — Part 1

**Tanggal:** 06 Agustus 2026
**Proyek:** CafeNow (Laravel 12, PHP 8.4, MySQL 8.4)
**Basis:** Temuan audit `requirements/security-audit-2026-08-04.md`
**Status:** Part 0 (investigasi) ✅ | Part 1 (state machine + guard) ✅ | Part 1B/2/3 ⏳ menunggu persetujuan

---

## 1. Tujuan Tugas

Meredesain sistem admin berdasarkan hasil audit keamanan, dengan 4 bagian kerja:

| Bagian | Lingkup |
|---|---|
| **Part 1** | State machine `cafe.approval_status` + penutupan semua jalur mutasi status & konten yang tidak sah |
| **Part 1B** | Cascade pembatalan otomatis booking BELUM dibayar saat cafe di-suspend (1 DB transaction, alasan khusus) |
| **Part 2** | Audit logging lengkap untuk 9 aksi admin yang belum tercatat |
| **Part 3** | Self-suspend guard (admin tidak boleh menonaktifkan akunnya sendiri) |

**Aturan bisnis yang dikonfirmasi owner** (tidak boleh diturunkan ulang):
- Cafe hanya menjadi `active` melalui persetujuan (approve) admin.
- Owner TIDAK boleh menambah tables/menu/data lain sebelum cafe approved.
- Saat cafe di-suspend: booking yang BELUM dibayar auto-cancelled; yang SUDAH dibayar tetap.
- Cascade harus dalam 1 DB transaction; alasan auto-cancel harus berbeda dari cancel manual ("Dibatalkan otomatis karena cafe di-suspend").
- Matriks transisi wajib: `pending→active`, `pending→rejected`, `rejected→pending`, `active→suspended`, `suspended→active`. Semua transisi lain (termasuk self-transition) ditolak dengan pesan `Transisi status tidak valid: {from} -> {to}`.

---

## 2. Temuan Investigasi (Part 0)

### 2.1 Gap status — tidak ada state machine
`CafeApprovalStatus` (enum) hanya daftar case tanpa logika transisi. Enam call site memutasi `approval_status` langsung tanpa validasi:

| Lokasi | Mutasi | Dampak |
|---|---|---|
| `AdminCafeRegistrationController@approve:103` | → `'active'` | Bisa approve cafe yang sudah active (self-transition) |
| `AdminCafeRegistrationController@reject:141` | → `'rejected'` | Bisa reject cafe berstatus apa pun |
| `AdminCafeController@suspend:46` | → `'suspended'` | Tanpa audit log & notifikasi |
| `AdminCafeController@unsuspend:52` | → `'active'` | **BUG: unsuspend cafe `pending` → langsung aktif tanpa approve** |
| `OwnerDashboardController@updateCafe:480-487` | rejected→pending | Resubmit, tanpa lewat state machine |
| `OwnerCafeController@store:36`, `OwnerDashboardController@storeCafe:448` | create `'pending'` | Benar, tapi string literal |

### 2.2 Status legacy `'approved'`
Masih dipakai di `CafeController@index/show` dan `CafeResource` sebagai padanan `active`. Tidak ada di enum — harus di-mapping sebagai alias active (data lama bisa berstatus ini).

### 2.3 Gap listing publik
`CafeController@index:30,57` dan `menuItems:142` menampilkan cafe berstatus **`pending`** (belum disetujui) ke publik.

### 2.4 Gap otorisasi konten owner (bug terkonfirmasi)
Semua endpoint tulis owner hanya memeriksa `owner_id`, TIDAK memeriksa `approval_status` — owner bisa menambah/mengedit konten cafe `pending`/`rejected`/`suspended`:
- API: `OwnerCafeController` (update, setHours, setBlackout, uploadPhotos, deletePhoto), `OwnerTableController` (store, update, destroy, setBookingRules), `OwnerMenuController` (store, update, destroy, toggle, bulkToggle).
- Web: `OwnerDashboardController` (updateCafe, storeTable, updateTable, destroyTable, storeMenu, updateMenu, destroyMenu).

### 2.5 Gap booking
`BookingService@create:35-36` dan `@reschedule` tidak memeriksa status cafe — customer bisa booking meja cafe `pending`/`rejected`/`suspended`.

### 2.6 Temuan infrastruktur
- **`app/Exceptions/Handler.php` adalah file mati.** Laravel 12 (via `bootstrap/app.php` `withExceptions`) tidak lagi menggunakannya — dikonfirmasi di `vendor/laravel/framework/.../ApplicationBuilder.php:398` yang me-register `Illuminate\Foundation\Exceptions\Handler`. Semua render exception kustom aplikasi selama ini... tidak berfungsi? (Perlu dicek: exception domain lama seperti `SlotNotAvailableException` kemungkinan TIDAK pernah dirender sesuai format JSON — kandidat perbaikan terpisah, di luar scope tugas ini.)
- `CafeFactory` default `approval_status => 'active'` (test-only, aman).
- Test infra: phpunit → SQLite `:memory:`, pola `RefreshDatabase` + factory sudah mapan.

---

## 3. Implementasi Part 1

### 3.1 Desain state machine
- **`app/Enums/CafeApprovalStatus.php`** — matriks transisi (private const `TRANSITIONS`), `canTransitionTo()`, `assertCanTransitionTo()` yang melempar `InvalidCafeStatusTransitionException` dengan pesan persis: `Transisi status tidak valid: {from} -> {to}`.
- **`app/Models/Cafe.php`** — method baru:
  - `transitionTo(CafeApprovalStatus $to)` — memvalidasi dari→ke (mapping legacy `'approved'` → Active), simpan via `forceFill`.
  - `isActive()` — `approval_status ∈ {active, approved}`.
  - `isContentEditable()` — `∈ {active, approved, rejected}` (alur perbaikan→resubmit saat rejected).
  - SENGJA TIDAK memakai cast enum (`approval_status` tetap string) — 41 titik penggunaan eksisting (perbandingan `=== 'approved'`, query builder, resource) tidak boleh berubah perilaku.
- **`bootstrap/app.php`** — `withExceptions()->renderable(...)` untuk 2 exception baru → JSON 422 `INVALID_STATUS_TRANSITION` / `CAFE_NOT_ACTIVE`. (Bukan `app/Exceptions/Handler.php` — file itu mati, sudah di-revert ke aslinya.)

### 3.2 Refactor call site
Semua mutasi status lewat `transitionTo()`: approve, reject, suspend, unsuspend, resubmit web. Store cafe tetap `'pending'` (create, bukan transisi) — sekarang via `CafeApprovalStatus::Pending->value`.

### 3.3 Guard konten owner
| Status cafe | Profil cafe (update/hours/foto) | Meja & Menu |
|---|---|---|
| `active` / `approved` | ✅ | ✅ |
| `rejected` | ✅ (perbaikan sebelum resubmit) | ❌ 403 |
| `pending` / `suspended` | ❌ 403 | ❌ 403 |

API → `abort(403)` (konsisten pola eksisting); Web → `back()->with('error')` (konsisten pola flash web).

### 3.4 Guard booking
`BookingService@create` (setelah `Table::findOrFail`) dan `@reschedule`: `if (! $table->cafe->isActive())` → `CafeNotActiveException` (422 `CAFE_NOT_ACTIVE`).

### 3.5 Listing publik
`CafeController@index`, `@welcome`, query `menuItems`: `whereIn('approval_status', ['approved', 'active'])` — `pending` dihapus.

### 3.6 Keputusan & asumsi (butuh konfirmasi owner)
1. Status legacy `'approved'` = alias `active` (dipertahankan di query & `isActive`, di-mapping saat transisi).
2. Saat `rejected`, owner boleh memperbaiki profil cafe (agar bisa resubmit) tetapi tidak boleh menambah/mengedit meja & menu.
3. Saat `pending`/`suspended`, semua mutasi konten diblokir (termasuk edit profil saat suspended — tidak ada jalur resubmit dari status ini).
4. API `OwnerCafeController@update` saat `rejected` TIDAK otomatis resubmit (perilaku eksisting dipertahankan; hanya jalur web yang auto-resubmit).
5. Transisi `pending→active` tetap sah di matriks (dipakai `approve`); `unsuspend` diberi guard tambahan: hanya valid dari `suspended` (menutup bug unsuspend-tanpa-approve tanpa merusak approve).

---

## 4. File yang Diubah / Dibuat

### Diubah
| File | Perubahan |
|---|---|
| `app/Enums/CafeApprovalStatus.php` | Matriks transisi + validasi |
| `app/Models/Cafe.php` | `transitionTo`, `isActive`, `isContentEditable` |
| `bootstrap/app.php` | Render 422 untuk exception baru |
| `app/Http/Controllers/Admin/AdminCafeRegistrationController.php` | approve/reject via `transitionTo` |
| `app/Http/Controllers/Admin/AdminCafeController.php` | suspend/unsuspend via `transitionTo` + guard unsuspend |
| `app/Http/Controllers/Cafe/OwnerCafeController.php` | Guard konten + store via enum |
| `app/Http/Controllers/Table/OwnerTableController.php` | Guard `isActive` (4 method) |
| `app/Http/Controllers/Menu/OwnerMenuController.php` | Guard `isActive` (5 method) |
| `app/Http/Controllers/Owner/OwnerDashboardController.php` | Guard konten web (7 method) + resubmit via `transitionTo` |
| `app/Services/Booking/BookingService.php` | Guard cafe aktif (create + reschedule) |
| `app/Http/Controllers/Cafe/CafeController.php` | Listing/menu publik tanpa `pending` |
| `tests/Feature/Booking/CreateBookingTest.php` | +2 test booking cafe non-aktif |

### Baru
| File | Isi |
|---|---|
| `app/Exceptions/InvalidCafeStatusTransitionException.php` | Exception transisi invalid |
| `app/Exceptions/CafeNotActiveException.php` | Exception cafe non-aktif |
| `tests/Unit/CafeApprovalStatusTest.php` | Matriks transisi (16 kombinasi: 5 valid + 11 invalid + pesan error) |
| `tests/Feature/Admin/CafeStatusTransitionTest.php` | 9 test API admin (suspend/unsuspend/approve/reject, valid + invalid + non-admin) |
| `tests/Feature/Cafe/OwnerCafeContentGuardTest.php` | 9 test guard konten API owner |

---

## 5. Hasil Test

| Suite | Hasil |
|---|---|
| Test baru + CreateBookingTest | **40/40 pass** (90 assertions) |
| Seluruh suite (`vendor/bin/phpunit`) | **97/98 pass** (259 assertions) |

**1 kegagalan pre-existing (bukan regresi):** `DashboardTest::test_authenticated_users_can_visit_the_dashboard` — route `dashboard` (web.php:39-48) memang redirect antar-role (302) untuk user factory tanpa role; tidak tersentuh perubahan ini.

---

## 6. Temuan Tambahan (di luar scope, rekomendasi lanjutan)

1. `app/Exceptions/Handler.php` mati — exception domain lama (`SlotNotAvailableException`, `CancellationTimeExpiredException`, dll.) kemungkinan tidak pernah dirender ke format JSON kustom; perlu audit render terpisah.
2. `AdminBookingController@cancel:41` update langsung tanpa `cancelled_by`, tanpa release lock, tanpa audit log — akan ditangani Part 1B/2.
3. Cleanup tertunda dari audit (menunggu konfirmasi owner): ganti password `admin@test.local` (masih `1234`), hapus `cookie.txt`/`c.txt`, hapus 6 token `customer-token` stale, klarifikasi user `owner2@test.local` (role customer). *(RESOLVED 2026-08-06: password admin digenerate, cookie/c.txt & 6 token dihapus; `owner2@test.local` masih menunggu keputusan — lihat `requirements/fix-security-housekeeping-2026-08-06.md`)*

---

## 7. Rencana Selanjutnya

| Bagian | Isi | Status |
|---|---|---|
| **Part 1B** | Cascade cancel booking `payment_status = unpaid` saat `suspend`, dalam 1 `DB::transaction`, `cancelled_by = system`, alasan "Dibatalkan otomatis karena cafe di-suspend", notifikasi owner | Menunggu persetujuan |
| **Part 2** | Audit log (enum `AdminAction` + record) untuk: cancel booking, suspend cafe, unsuspend cafe, update user, suspend user, unsuspend user (9 aksi) | Menunggu persetujuan |
| **Part 3** | Self-suspend guard: admin tidak bisa suspend/menonaktifkan akun sendiri | Menunggu persetujuan |
