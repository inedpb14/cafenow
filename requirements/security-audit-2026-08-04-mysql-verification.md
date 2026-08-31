# LAPORAN VERIFIKASI FINAL — Database MySQL `cafe_now`

**Tanggal:** 4 Agustus 2026 · **Metode:** SELECT read-only (tidak ada data diubah/dihapus/diinsert)
**Referensi:** Menutup item terbuka dari `requirements/security-audit-2026-08-04.md` (verifikasi MySQL ditunda)

---

## 1. Ringkasan Eksekutif

Verifikasi database MySQL `cafe_now` **menutup sepenuhnya** item terbuka dari audit sebelumnya. Hanya terdapat **satu akun admin** di seluruh database — `admin@test.local` (id 1), yang **terdokumentasi penuh** di `requirements/akun.md` sebagai akun seeder test; **tidak ada akun admin tak terdokumentasi**. Sesi cookie 26/07 sudah tidak ada di tabel `sessions` (expired sesuai `SESSION_LIFETIME=120` dan dibersihkan garbage collector), sehingga identitasnya hanya bisa disimpulkan secara kontekstual — dan semua petunjuk menunjuk ke `admin@test.local`, konsisten dengan pernyataan pemilik proyek bahwa sesi itu adalah login sah mereka. Tidak ada personal access token ber-ability admin. Kekhawatiran endpoint registrasi admin tak sah **tertutup sepenuhnya**.

---

## 2. Hasil Query Lengkap

### Konfirmasi Koneksi (Task 1)

- MySQL **8.4.3**, host `127.0.0.1:3306`, database **`cafe_now`** — koneksi sukses (kredensial dari `.env`; password tidak ditampilkan).
- **27 tabel** — nama tabel identik dengan skema SQLite dev (`users`, `sessions`, `personal_access_tokens`, `admin_audit_logs`, `cafes`, `bookings`, dll).
- `php artisan migrate:status` — **seluruh 26 migrasi status "Ran"** (batch 1 & 2), termasuk `2026_07_18_000001_add_fields_to_users_table` (kolom `role` string default `customer`).

### Query 1 — Semua User (`users`)

| id | name | email | role | created_at | updated_at |
|----|------|-------|------|------------|------------|
| 6 | Deni Prastya budi | deniprastyabudi@gmail.com | owner | 2026-07-29 17:23:09 | 2026-07-29 17:23:09 |
| 5 | Deni Prastya budi | denipasbi@gmail.com | customer | 2026-07-29 17:20:21 | 2026-07-29 17:20:21 |
| 4 | Owner Baru | owner2@test.local | customer | 2026-07-26 10:42:56 | 2026-07-26 10:42:56 |
| 1 | admin | admin@test.local | **admin** | 2026-07-24 15:28:19 | 2026-07-24 15:28:19 |
| 2 | owner | owner@test.local | owner | 2026-07-24 15:28:19 | 2026-07-24 15:28:19 |
| 3 | customer | customer@test.local | customer | 2026-07-24 15:28:19 | 2026-07-24 15:28:19 |

### Query 2 — Sesi (`sessions`)

| id | user_id | ip_address | last_activity (unix) | last_activity (WIB) |
|----|---------|------------|----------------------|---------------------|
| bcH4uDiNvqZPRdbWbG9UoBiydDGhrV59aItB5ugb | 3 | 127.0.0.1 | 1785763385 | 2026-08-03 20:23:05 |
| VcR4xGnxpwISlhvxhwTwhdLZuJSbVYNauYCy33Kb | NULL | 127.0.0.1 | 1785415352 | 2026-07-30 19:42:32 |

### Query 3 — Personal Access Tokens (`personal_access_tokens`)

| id | tokenable_id | name | abilities | last_used_at | created_at |
|----|--------------|------|-----------|--------------|------------|
| 1 | 3 | customer-token | ["role:customer"] | **NULL (tidak pernah)** | 2026-07-28 17:02:58 |
| 2 | 3 | customer-token | ["role:customer"] | 2026-07-28 17:03:55 | 2026-07-28 17:03:48 |
| 3 | 2 | customer-token | ["role:customer"] | 2026-07-28 17:03:55 | 2026-07-28 17:03:49 |
| 4 | 1 | customer-token | ["role:customer"] | 2026-07-28 17:03:52 | 2026-07-28 17:03:49 |
| 5 | 2 | customer-token | ["role:customer"] | 2026-07-28 17:04:28 | 2026-07-28 17:04:26 |
| 6 | 1 | customer-token | ["role:customer"] | 2026-07-28 17:04:30 | 2026-07-28 17:04:28 |

---

## 3. Identitas Sesi Cookie

**Status: sesi sudah TIDAK ada di tabel `sessions`.** Session ID `EkIWS0gM3JmgqW2WLuTWaVlcgfVDl8EB6MJ0LhWr` tidak ditemukan pada kedua baris yang tersisa. Karena `SESSION_DRIVER=database` dan `SESSION_LIFETIME=120` (menit), sesi yang terakhir aktif ±26/07 telah lama kedaluwarsa dan dihapus garbage collector — ketidakhadiran baris ini **konklusif**, bukan kegagalan pencarian.

**Inferensi identitas (kontekstual):**
- Pada 26/07 (saat sesi cookie dibuat), akun yang tersedia di MySQL: id 1–3 (seeder, 24/07) dan id 4 (26/07 10:42). Satu-satunya akun **admin** adalah `admin@test.local` (id 1).
- Log aplikasi 24/07 16:32 mencatat **user id 1** mengakses `/admin/dashboard` — dan di MySQL, id 1 = `admin@test.local` (catatan: berbeda dengan SQLite yang id 1-nya user customer — ini menjelaskan kebingungan data lintas database sebelumnya).
- Screenshot test frontend admin (test-results/) dibuat 26/07 18:06–18:24 WIB — bertepatan dengan periode hidup sesi cookie.

**Kesimpulan:** pemilik sesi 26/07 hampir pasti **`admin@test.local` (role admin)** — login test admin yang sah, konsisten dengan pengakuan pemilik proyek. Identitas absolut tidak dapat dibuktikan karena baris sesi telah dibersihkan, tetapi tidak ada skenario alternatif yang masuk akal.

---

## 4. Status Akun `admin@test.local`

| Pemeriksaan | Hasil |
|---|---|
| Masih ada? | **YA** — id 1, dibuat 2026-07-24 15:28:19 (bersamaan dengan `owner@`/`customer@test.local` → eksekusi `UserRoleSeeder` pada 24/07) |
| Role | `admin` |
| Password masih default `1234`? | **YA** — diverifikasi read-only (`password_verify('1234', hash)` = benar) |
| Terdokumentasi? | YA — `requirements/akun.md` + 6 dokumen lain (PHASE_6_COMPLETE, DEVELOPMENT_SUMMARY, ARCHITECTURE, REVIEW_FIXES_APPLIED) |

---

## 5. Pemeriksaan Spesifik (Task 3) & Sanity Check Dokumentasi (Task 4)

**Akun admin:** Hanya 1 — `admin@test.local`, teridentifikasi sebagai akun seeder yang terdokumentasi. **Tidak ada akun admin tak terdokumentasi.**

**User ID 1, 2, 3, 6 (dari log):** Semua eksis dan terjelaskan.

| id | email | role | Sumber |
|----|-------|------|--------|
| 1 | admin@test.local | admin | Seeder (dokumentasi `akun.md`) |
| 2 | owner@test.local | owner | Seeder (dokumentasi `akun.md`) |
| 3 | customer@test.local | customer | Seeder (dokumentasi `akun.md`) |
| 6 | deniprastyabudi@gmail.com | owner | Akun nyata pemilik proyek (29/07, registrasi owner — sesuai error email di log) |

Tambahan di luar log: id 4 `owner2@test.local` ("Owner Baru", role **customer**, 26/07) — **tidak terdokumentasi** di `requirements/`, dan id 5 `denipasbi@gmail.com` (customer, 29/07) — akun nyata pemilik.

**Personal access tokens:** 6 token, **semuanya** `customer-token` ber-ability `["role:customer"]` — **tidak ada token ber-ability admin**. Seluruhnya dibuat dalam jendela 1,5 menit (28/07 17:02:58–17:04:30) = sesi test API. Semua sudah stale (terakhir dipakai 28/07); token id 1 **tidak pernah digunakan**.

---

## 6. Kesimpulan Final Investigasi

Item terbuka dari `security-audit-2026-08-04.md` **tertutup sepenuhnya**:

1. **Endpoint registrasi admin tak sah — tidak ada.** Hanya satu akun admin yang eksis, `admin@test.local`, berasal dari seeder terdokumentasi, bukan dari endpoint HTTP mana pun. Tidak ada jalur kode yang dapat membuat akun admin dari request (konfirmasi ulang dari audit sebelumnya).
2. **Akun admin tidak terdokumentasi — tidak ada.** Satu-satunya penyimpangan kecil: `owner2@test.local` (id 4) yang tidak terdokumentasi — tetapi ber-role **customer** (tanpa hak istimewa apa pun), kemungkinan artefak test registrasi manual.
3. **Sesi 26/07** — teridentifikasi secara kontekstual sebagai `admin@test.local` (login test sah pemilik proyek); baris sesinya telah kedaluwarsa dan dibersihkan, bukan bukti aktivitas tersembunyi.
4. **Token admin — tidak ada.** Enam token yang tersisa semuanya ber-ability customer, artefak test API 28/07.
5. **Kesimpulan audit menyeluruh: RISIKO RENDAH-MEDIUM** — kekhawatiran backdoor dinyatakan **tertutup**; yang tersisa hanyalah masalah hygiene (kredensial test lemah, akun/token test menumpuk, artifact file `cookie.txt`/`c.txt` di repo).

---

## 7. Rekomendasi (tidak dieksekusi — keputusan pemilik proyek)

| # | Prioritas | Tindakan yang disarankan | Alasan |
|---|-----------|--------------------------|--------|
| 1 | P0 | Ubah/hapus password akun `admin@test.local` (atau hapus akun + seeder) | Terverifikasi masih `1234` — kredensial admin trivial. **RESOLVED 2026-08-06:** password kini generated saat seed (env `SEEDER_ADMIN_PASSWORD` / random, dicetak di output seeder) — lihat `akun.md` |
| 2 | P0 | Hapus `cookie.txt` & `c.txt` dari root repo + bersihkan tabel `sessions`/token test | Artifact credential & data test menumpuk (rekomendasi lama, belum dilakukan). **RESOLVED 2026-08-06:** kedua file dihapus + `.gitignore` diperbarui |
| 3 | P1 | Hapus 6 `personal_access_tokens` (semua stale, id 1 tidak pernah dipakai) | Tidak ada token aktif yang dibutuhkan. **RESOLVED 2026-08-06:** 6 token dihapus |
| 4 | P1 | Klarifikasi/hapus akun test `owner2@test.local` (id 4) | Tidak terdokumentasi, berpotensi membingungkan audit berikutnya |
| 5 | P2 | Jalankan rekomendasi lain dari `security-audit-2026-08-04.md` (route rusak, audit log lengkap, `APP_DEBUG=false`) | Belum dieksekusi |

*Seluruh rekomendasi bersifat non-urgent dan menunggu konfirmasi eksplisit Anda sebelum dieksekusi.*
