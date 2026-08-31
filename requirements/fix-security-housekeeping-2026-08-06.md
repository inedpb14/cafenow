# Security Housekeeping — Eksekusi 2026-08-06

Eksekusi 4 item housekeeping keamanan (hasil investigasi audit 2026-08-04). Semua perubahan sudah diverifikasi before/after.

## Item 1 — Password Admin Seeder

### Status: RESOLVED (password kuat, generated, terdokumentasi)

**Perubahan kode — `database/seeders/UserRoleSeeder.php`:**
- Password admin tidak lagi di-hardcode. `firstOrCreate` → `updateOrCreate` (idempotent, tidak menduplikasi data — diverifikasi: `COUNT(admin@test.local) = 1`).
- Admin: password dari env `SEEDER_ADMIN_PASSWORD` jika diset, jika tidak → `Str::password(20)` (acak kuat, huruf besar/kecil + angka + simbol) dan **dicetak jelas ke output** saat seeder berjalan:
  ```
  Admin akun admin@test.local — password: tl<^ImVT!1rH{6)1,468
  ```
- Owner & customer tetap `1234` (akun test non-privileged, terdokumentasi di `akun.md`).
- Tidak ada konvensi env seeder yang sudah ada di codebase (grep `env(` di `database/` → 0 hasil), sehingga dipilih opsi generate + print sesuai instruksi.

**Database lokal (`cafe_now.users` id 1):** diperbarui via re-run seeder (aman — `updateOrCreate`). Verifikasi:
- `Hash::check('1234', ...)` → **false**
- `Hash::check('tl<^ImVT!1rH{6)1,468', ...)` → **true**
- `updated_at` = 2026-08-06 00:33:42, tidak ada baris duplikat.

**Dokumentasi diperbarui:**
- `requirements/akun.md` — ditulis ulang: admin = generated/env `SEEDER_ADMIN_PASSWORD`, lihat output seeder; owner/customer tetap 1234.
- `requirements/frontend/REVIEW_FIXES_APPLIED.md` (baris 91), `PHASE_6_COMPLETE.md` (96, 118, 166), `DEVELOPMENT_SUMMARY.md` (347), `ARCHITECTURE.md` (688) — semua referensi login `admin@test.local / 1234` diganti dengan petunjuk password generated.
- `security-audit-2026-08-04.md` (item 2 & 3), `security-audit-2026-08-04-mysql-verification.md` (tabel rekomendasi baris 1–3), `implementation-part1-2026-08-06.md` (baris 147) — diberi tanda **RESOLVED 2026-08-06** tanpa mengubah isi temuan historis.

**Catatan:** password saat ini yang tercetak seeder (`tl<^ImVT!1rH{6)1,468`) sudah tidak valid jika seeder dijalankan lagi (digenerate ulang per run) — itu memang desainnya; developer lokal mencatat password dari output run terakhir, atau set `SEEDER_ADMIN_PASSWORD` di `.env` untuk nilai tetap.

## Item 2 — Artifact Kredensial `cookie.txt` & `c.txt`

### Status: RESOLVED

- Kedua file dihapus dari root proyek (diverifikasi: 0 file tersisa).
- `.gitignore` ditambahkan:
  ```
  /cookie.txt
  /c.txt
  *.cookies.txt
  ```
  (pola root-anchored untuk dua file spesifik + pola umum `*.cookies.txt` untuk artefak session-cookie test serupa di masa depan; tidak over-broaden ke pola seperti `*.txt`).
- **Riwayat git:** proyek ini **tidak memiliki repo git sama sekali** — `Test-Path .git` → false, `git log` → fatal, dan pengecekan naik ke seluruh pohon direktori (`C:\laragon\www\` → root) tidak menemukan repo mana pun. Kedua file **tidak pernah dikomit** ke version control mana pun — mustahil karena tidak ada repo yang ada.

## Item 3 — 6 Personal Access Token Stale

### Status: RESOLVED — dihapus

Dikonfirmasi sebelum hapus (semua match: name `customer-token`, jendela waktu audit ~2026-07-28 17:02–17:05):

| id | tokenable_id | name | created_at | last_used_at |
|----|--------------|------|------------|--------------|
| 1 | 3 | customer-token | 2026-07-28 17:02:58 | NULL (never used) |
| 2 | 3 | customer-token | 2026-07-28 17:03:48 | 17:03:55 |
| 3 | 2 | customer-token | 2026-07-28 17:03:49 | 17:03:55 |
| 4 | 1 | customer-token | 2026-07-28 17:03:49 | 17:03:52 |
| 5 | 2 | customer-token | 2026-07-28 17:04:26 | 17:04:28 |
| 6 | 1 | customer-token | 2026-07-28 17:04:28 | 17:04:30 |

DELETE via match ketat `name='customer-token' AND created_at BETWEEN '2026-07-28 17:00:00' AND '2026-07-28 17:10:00'` → **6 baris terhapus** (`ROW_COUNT() = 6`). Verifikasi pasca: `COUNT(customer-token) = 0`, tabel `personal_access_tokens` kini kosong total — tidak ada token lain yang tersentuh.

## Item 4 — Akun `owner2@test.local` (id 4, role customer)

### Status: INVESTIGASI SELESAI — TIDAK DIHAPUS (menunggu keputusan owner)

**Temuan:**
- Grep seluruh codebase (`owner2@test.local`, `Owner Baru`): **0 referensi di kode, test, script, atau artifact Playwright** — `test-results/` hanya berisi file PNG screenshot, tidak ada script/referensi akun.
- Satu-satunya penyebutan ada di 2 dokumen audit (tabel user MySQL & rekomendasi) — yang justru menandai akun ini sebagai tidak terdokumentasi.
- Data DB: id 4, name "Owner Baru", role **customer**, dibuat 2026-07-26 10:42:56 (hari yang sama dengan sesi cookie login 26/07 yang diselidiki audit).
- Nama "Owner Baru" + role customer → **paling konsisten dengan test manual alur registrasi customer** (`CustomerAuthController@register` meng-hardcode role `customer`; penguji mengetik nama "Owner Baru" sembarangan). Bukan jalur registrasi owner (yang akan menghasilkan role `owner`).

**Rekomendasi:** akun ini **aman ditinggalkan** — role `customer`, tanpa hak istimewa, database lokal dev-only. Namun karena tidak direferensikan apa pun dan berpotensi membingungkan audit berikutnya, **disarankan dihapus untuk kebersihan** (satu baris `DELETE FROM users WHERE id=4` — tidak ada FK yang merujuknya yang perlu dipertimbangkan, tapi tetap perlu cek relasi booking/cafe sebelum hapus). **Keputusan ada di pemilik proyek — tidak dilakukan aksi apa pun atas akun ini.**

## Ringkasan Verifikasi

| Item | Sebelum | Sesudah | Verifikasi |
|------|---------|---------|-----------|
| 1 | admin password `1234` (Hash::check true) | generated kuat (Hash::check false utk 1234, true utk baru) | tinker + MySQL |
| 2 | cookie.txt (930B), c.txt (1B) di root | file hilang, .gitignore +3 entri | Get-ChildItem |
| 3 | 6 token customer-token | 0 token | ROW_COUNT + SELECT |
| 4 | owner2@test.local ada | **tidak disentuh** | grep seluruh repo |

Tidak ada test suite yang bergantung pada `UserRoleSeeder` atau password `1234` (grep `tests/` → 0 hasil), sehingga tidak ada regresi test terkait.
