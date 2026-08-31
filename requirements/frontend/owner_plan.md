# Development Task Plan — CafeNow Owner Features

> **Berdasarkan:** `owner-flow-analysis.md`
> **Tanggal:** 29 Juli 2026
> **Total File:** 14 (2 baru, 12 diubah)
> **Estimasi Total:** ~8.5 jam

---

## Daftar Isi

1. [Task Groups & Dependencies](#1-task-groups--dependencies)
2. [TASK 1.x — Foto Per Kategori Meja (3 file)](#2-tasks-fitur-1--foto-per-kategori-meja)
3. [TASK 2.x — Owner Registration Web Flow (6 file)](#3-tasks-fitur-2--owner-registration-web-flow)
4. [TASK 3.x — Resubmission Cafe Ditolak (4 file)](#4-tasks-fitur-3--resubmission-cafe-ditolak)
5. [Prioritas Eksekusi](#5-prioritas-eksekusi)

---

## 1. Task Groups & Dependencies

```
Fitur 1 (Foto Meja)
  ├── T1.1 → Backend: storeTable + updateTable ---+
  ├── T1.2 → Frontend: form upload foto meja       | (parallel)
  └── T1.3 → Frontend: galeri meja di detail cafe  + (depends on T1.1)

Fitur 2 (Register Owner)
  ├── T2.1 → Backend: CreateOwnerUser action
  ├── T2.2 → Frontend: halaman owner-register.tsx
  ├── T2.3 → Route: routes/web.php
  ├── T2.4 → Frontend: update login.tsx (link owner)
  ├── T2.5 → Frontend: update welcome.tsx (arahkan mitra)
  └── T2.6 → Config: .env Mailtrap

Fitur 3 (Resubmission Cafe)
  ├── T3.1 → Backend: updateCafe auto reset logic
  ├── T3.2 → Frontend: tampilkan rejection reason
  ├── T3.3 → Backend: enrich CafeResource
  └── T3.4 → Frontend: admin lihat riwayat
```

---

## 2. Tasks — Fitur 1: Foto Per Kategori Meja

### TASK 1.1 — Backend: Upload Foto Meja

| Atribut | Nilai |
|---------|-------|
| **File** | `app/Http/Controllers/Owner/OwnerDashboardController.php` |
| **Method** | `storeTable()` (line 484), `updateTable()` (line 514) |
| **Deskripsi** | Tambah logic upload foto saat buka/edit meja |

**Subtasks:**

- [ ] **1.1.a** — `storeTable()`: tambah `if ($request->hasFile('photo'))` → `->store('tables', 'public')`
- [ ] **1.1.b** — `updateTable()`: tambah logic hapus foto lama + upload baru
- [ ] **1.1.c** — Validasi file: `image, mimes:jpg,jpeg,png,webp, max:2048`
- [ ] **1.1.d** — Tambah `use Illuminate\Support\Facades\Storage;` jika belum ada

**Depends on:** —
**Estimate:** 30 menit

---

### TASK 1.2 — Frontend: Form Upload Foto Meja

| Atribut | Nilai |
|---------|-------|
| **File** | `resources/js/pages/owner/cafes/tables.tsx` |
| **Deskripsi** | Tambah input file foto + preview di modal tambah/edit meja |

**Subtasks:**

- [ ] **1.2.a** — Tambah state `photoFile: File | null` dan `photoPreview: string | null`
- [ ] **1.2.b** — Tambah input `type="file" accept="image/*"` di modal form
- [ ] **1.2.c** — Preview thumbnail setelah pilih file (`URL.createObjectURL`)
- [ ] **1.2.d** — Form submit menggunakan `FormData` agar file terkirim
- [ ] **1.2.e** — Tampilkan foto existing saat edit (jika ada)

**Depends on:** —
**Estimate:** 1 jam

---

### TASK 1.3 — Frontend: Galeri Meja di Detail Cafe

| Atribut | Nilai |
|---------|-------|
| **File** | `resources/js/pages/cafes/detail.tsx` |
| **Deskripsi** | Tambah section "Pilihan Meja" — tampilkan foto meja per kategori |

**Subtasks:**

- [ ] **1.3.a** — Pastikan `CafeController@show` mengirim `tables` dengan `photo` ke frontend
- [ ] **1.3.b** — Tambah interface `TableInfo` di frontend: `{id, name, table_type, capacity, min_spend, photo}`
- [ ] **1.3.c** — Group by `table_type`, header per kategori (Indoor, Outdoor, VIP, Regular, Private Room)
- [ ] **1.3.d** — Tiap item: foto (atau placeholder fallback sesuai tipe), nama, kapasitas, harga
- [ ] **1.3.e** — Jika foto null, tampilkan ikon/placeholder sesuai tipe

**Depends on:** TASK 1.1
**Estimate:** 1.5 jam

---

## 3. Tasks — Fitur 2: Owner Registration Web Flow

### TASK 2.1 — Backend: CreateOwnerUser Action

| Atribut | Nilai |
|---------|-------|
| **File** | **Baru** `app/Actions/Fortify/CreateOwnerUser.php` |
| **Deskripsi** | Action class untuk register owner via Fortify |

**Subtasks:**

- [ ] **2.1.a** — Buat class implement `CreatesNewUsers`
- [ ] **2.1.b** — Validasi: `full_name`, `email`, `phone`, `password` + `confirmed`
- [ ] **2.1.c** — `User::create(role: UserRole::Owner)`, trigger email verifikasi

**Depends on:** —
**Estimate:** 30 menit

---

### TASK 2.2 — Frontend: Halaman Register Owner

| Atribut | Nilai |
|---------|-------|
| **File** | **Baru** `resources/js/pages/auth/owner-register.tsx` |
| **Deskripsi** | Halaman register khusus owner |

**Subtasks:**

- [ ] **2.2.a** — Form fields: `full_name`, `email`, `phone`, `password`, `password_confirmation`
- [ ] **2.2.b** — Validasi frontend (required, email format, password match)
- [ ] **2.2.c** — Submit via Inertia `router.post('/owner/register', data)`
- [ ] **2.2.d** — Layout: `AuthLayout` yang sudah ada
- [ ] **2.2.e** — Link ke `/login` jika sudah punya akun

**Depends on:** TASK 2.1
**Estimate:** 1 jam

---

### TASK 2.3 — Route: Web Routes

| Atribut | Nilai |
|---------|-------|
| **File** | `routes/web.php` |
| **Deskripsi** | Tambah route register owner |

**Subtasks:**

- [ ] **2.3.a** — `GET /owner/register` → Inertia render `auth/owner-register`
- [ ] **2.3.b** — `POST /owner/register` → proses registrasi via `CreateOwnerUser`
- [ ] **2.3.c** — Di grup middleware `guest` agar hanya user yang belum login

**Depends on:** TASK 2.1 + 2.2
**Estimate:** 10 menit

---

### TASK 2.4 — Frontend: Update Login Page

| Atribut | Nilai |
|---------|-------|
| **File** | `resources/js/pages/auth/login.tsx` |
| **Deskripsi** | Tambah link "Daftar sebagai Owner" |

**Subtasks:**

- [ ] **2.4.a** — Tambah link manual `href="/owner/register"`
- [ ] **2.4.b** — Tambah teks: "Ingin daftarkan cafe? " + link "Daftar sebagai Owner"

**Depends on:** TASK 2.3
**Estimate:** 15 menit

---

### TASK 2.5 — Frontend: Update Landing Page CTA

| Atribut | Nilai |
|---------|-------|
| **File** | `resources/js/pages/welcome.tsx` |
| **Deskripsi** | Arahkan form mitra ke `/owner/register` (stop simulasi) |

**Subtasks:**

- [ ] **2.5.a** — Cari state `partnerForm` dan `submittedPartner`
- [ ] **2.5.b** — Ubah submit handler menjadi redirect ke `/owner/register`

**Depends on:** TASK 2.3
**Estimate:** 10 menit

---

### TASK 2.6 — Config: Mailtrap SMTP

| Atribut | Nilai |
|---------|-------|
| **File** | `.env` |
| **Deskripsi** | Setup Mailtrap untuk kirim email verifikasi & reset password |

**Subtasks:**

- [ ] **2.6.a** — Ubah `MAIL_MAILER=log` → `MAIL_MAILER=smtp`
- [ ] **2.6.b** — Isi `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` dari Mailtrap
- [ ] **2.6.c** — Ubah `MAIL_FROM_ADDRESS` ke `noreply@cafenow.app`
- [ ] **2.6.d** — Ubah `MAIL_FROM_NAME` ke `CafeNow`

**Depends on:** Akun Mailtrap (user daftar di mailtrap.io)
**Estimate:** 10 menit

---

## 4. Tasks — Fitur 3: Resubmission Cafe Ditolak

### TASK 3.1 — Backend: Auto Reset Cafe Rejected

| Atribut | Nilai |
|---------|-------|
| **File** | `app/Http/Controllers/Owner/OwnerDashboardController.php` |
| **Method** | `cafes()`, `updateCafe()` |
| **Deskripsi** | Kirim rejection_reason ke frontend + logic auto reset saat edit |

**Subtasks:**

- [ ] **3.1.a** — `cafes()`: tambah `'rejection_reason' => $cafe->rejection_reason` ke response
- [ ] **3.1.b** — `updateCafe()`: setelah update data, cek `if ($cafe->approval_status === 'rejected')`
- [ ] **3.1.c** — Reset: `approval_status = 'pending'`, `rejection_reason = null`, `submission_count++`

**Depends on:** —
**Estimate:** 30 menit

---

### TASK 3.2 — Frontend: Tampilkan Rejection ke Owner

| Atribut | Nilai |
|---------|-------|
| **File** | `resources/js/pages/owner/cafes/index.tsx` |
| **Deskripsi** | Tampilkan rejection reason + alert merah + info submission count |

**Subtasks:**

- [ ] **3.2.a** — Tambah field `rejection_reason` di interface `CafeInfo`
- [ ] **3.2.b** — Tambah `submission_count` di interface `CafeInfo`
- [ ] **3.2.c** — Saat `status === 'rejected'`, tampilkan alert merah dengan rejection_reason
- [ ] **3.2.d** — Ubah status label: tambah info `(Pengajuan ke-{n})`
- [ ] **3.2.e** — Flash success/error untuk resubmission

**Depends on:** TASK 3.1
**Estimate:** 1 jam

---

### TASK 3.3 — Backend: Enrich CafeResource

| Atribut | Nilai |
|---------|-------|
| **File** | `app/Http/Resources/CafeResource.php` |
| **Deskripsi** | Tambah rejection_reason + submission_count ke resource response |

**Subtasks:**

- [ ] **3.3.a** — Tambah `'rejection_reason' => $this->rejection_reason`
- [ ] **3.3.b** — Tambah `'submission_count' => $this->submission_count`

**Depends on:** —
**Estimate:** 10 menit

---

### TASK 3.4 — Frontend: Admin Lihat Riwayat

| Atribut | Nilai |
|---------|-------|
| **File** | `resources/js/pages/admin/Cafe/Approvals.tsx` |
| **Deskripsi** | Admin bisa melihat riwayat penolakan + submission count di modal detail |

**Subtasks:**

- [ ] **3.4.a** — Tambah field `rejection_reason`, `submission_count` di interface `CafeApproval`
- [ ] **3.4.b** — Tampilkan "Pengajuan ke-{n}" di card list
- [ ] **3.4.c** — Di modal detail, tambah section "Riwayat Penolakan" jika ada data
- [ ] **3.4.d** — Jika status === 'rejected', tampilkan rejection_reason dengan warna merah

**Depends on:** TASK 3.3
**Estimate:** 1 jam

---

## 5. Prioritas Eksekusi

| Urutan | Task | File | Estimate | Alasan |
|:------:|:----|:-----|:--------:|--------|
| 1 | **T2.6** | `.env` | 10m | Infra email — dependency untuk verifikasi |
| 2 | **T2.1** | `CreateOwnerUser.php` (baru) | 30m | Action register owner |
| 3 | **T2.2** | `owner-register.tsx` (baru) | 1j | Halaman register owner |
| 4 | **T2.3** | `web.php` | 10m | Route register |
| 5 | **T2.4** | `login.tsx` | 15m | Link register di login |
| 6 | **T2.5** | `welcome.tsx` | 10m | Arahkan form mitra |
| 7 | **T1.1** | `OwnerDashboardController.php` | 30m | Backend upload foto meja |
| 8 | **T1.2** | `tables.tsx` | 1j | Frontend form upload meja |
| 9 | **T1.3** | `detail.tsx` | 1.5j | Galeri meja di detail cafe |
| 10 | **T3.1** | `OwnerDashboardController.php` | 30m | Auto reset cafe rejected |
| 11 | **T3.3** | `CafeResource.php` | 10m | Enrich resource |
| 12 | **T3.2** | `cafes/index.tsx` | 1j | Tampilkan rejection ke owner |
| 13 | **T3.4** | `Approvals.tsx` | 1j | Admin lihat riwayat |

### Urutan Berdasarkan Dependency

```
Fase 1 — Infrastructure (10m)
  T2.6 → Mailtrap

Fase 2 — Owner Registration (2.5j)
  T2.1 → T2.2 → T2.3 → T2.4 + T2.5

Fase 3 — Foto Meja (3j)
  T1.1 → T1.3
  T1.2 (parallel with T1.1)

Fase 4 — Resubmission (2.75j)
  T3.1 + T3.3 → T3.2 + T3.4
```

---

## Ringkasan

| Fitur | File Baru | File Diubah | Total File | Total Estimate |
|-------|:---------:|:-----------:|:----------:|:--------------:|
| Foto Meja | 0 | 3 | 3 | 3 jam |
| Register Owner | 2 | 4 | 6 | 2.75 jam |
| Resubmission | 0 | 4 | 4 | 2.75 jam |
| **Grand Total** | **2** | **11** | **13** | **~8.5 jam** |
