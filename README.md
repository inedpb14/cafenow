# CafeNow - Platform Reservasi & Manajemen Kafe Modern

**CafeNow** adalah platform web modern untuk manajemen dan reservasi meja kafe secara real-time, pemesanan menu, dan pembayaran digital, yang dibangun dengan **Laravel 13**, **Inertia.js v3**, dan **React 19**.

---

## 🚀 Fitur Utama

- 🔍 **Eksplorasi & Pencarian Kafe**: Filter kafe berdasarkan lokasi, fasilitas, jam operasional, dan kapasitas meja.
- 🪑 **Reservasi Meja Real-Time**: Pemilihan slot waktu dan meja interaktif dengan pencegahan bentrok jadwal (*distributed lock*).
- 🍽️ **Pemesanan Menu Digital**: Integrasi menu langsung saat melakukan reservasi atau pesan takeaway.
- 💳 **Integrasi Pembayaran Digital**: Mendukung Midtrans Payment Gateway (Snap & Core API) serta mode simulasi dummy untuk pengujian lokal.
- 📊 **Owner Dashboard**: Manajemen menu, tata letak meja, verifikasi reservasi, dan laporan analitik pendapatan kafe.
- 🛡️ **Admin Panel**: Persetujuan kafe baru, manajemen komisi platform, audit log aktivitas, dan persetujuan pengembalian dana (*refund*).
- 🔔 **Notifikasi Real-Time**: Notifikasi instan status booking dan pesanan via WebSocket (Laravel Reverb).
- 🔐 **Keamanan & Autentikasi**: Autentikasi multi-role (Admin, Owner, Customer), verifikasi email, dan proteksi sesi.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Laravel 13.x (PHP 8.3+)
- **Autentikasi & Sesi**: Laravel Fortify & Laravel Sanctum
- **Real-Time Broadcasting**: Laravel Reverb
- **Analisis Statis & Code Quality**: Larastan (PHPStan Level 7), Laravel Pint

### Frontend
- **Framework**: React 19 + TypeScript + Vite 8
- **Routing & Adaptor**: Inertia.js v3
- **Komponen UI & Styling**: Tailwind CSS v4, Radix UI, Lucide Icons
- **Code Quality**: ESLint + Prettier

### Database & Infrastruktur
- **Database**: MySQL 8.0+ / SQLite 3
- **Cache & Queue**: Database / Redis

---

## 📋 Prasyarat Sistem (Prerequisites)

Sebelum memulai instalasi, pastikan lingkungan pengembangan lokal Anda telah terinstal:

- **PHP** `>= 8.3` (dengan ekstensi: `pdo`, `mbstring`, `openssl`, `bcmath`, `curl`, `json`, `fileinfo`)
- **Composer** `>= 2.7`
- **Node.js** `>= 20.x` atau `22.x` dan **npm** / **pnpm**
- **Database**: MySQL 8.x (atau menggunakan SQLite bawaan)
- **Git**

---

## 💻 Panduan Instalasi dari Nol (Step-by-Step)

### 1. Clone Repositori
```bash
git clone https://github.com/username/cafe-now.git
cd cafe-now
```

### 2. Install Dependensi Backend (PHP)
```bash
composer install
```

### 3. Install Dependensi Frontend (Node.js)
```bash
npm install
```

### 4. Setup Environment File
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
*(Di Windows PowerShell / CMD):*
```powershell
copy .env.example .env
```

Generate application key:
```bash
php artisan key:generate
```

### 5. Konfigurasi Database

Buka file `.env` dan sesuaikan koneksi database.

**Opsi A: Menggunakan MySQL (Disarankan untuk production/development penuh)**
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cafenow_db
DB_USERNAME=root
DB_PASSWORD=
```
*(Pastikan database `cafenow_db` sudah dibuat di MySQL Anda).*

**Opsi B: Menggunakan SQLite (Mudah untuk testing cepat)**
```env
DB_CONNECTION=sqlite
```
Buat file database kosong jika belum ada:
```bash
touch database/database.sqlite
```

### 6. Konfigurasi Environment Tambahan (Opsional)

Jika ingin menggunakan fitur pembayaran Midtrans dan WebSocket:
```env
# Midtrans Gateway (Kosongkan SERVER_KEY untuk mode Dummy Simulator lokal)
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_MERCHANT_ID=
MIDTRANS_IS_PRODUCTION=false

# Laravel Reverb (WebSockets)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=cafenow-app
REVERB_APP_KEY=cafenow-key
REVERB_APP_SECRET=cafenow-secret
REVERB_HOST="localhost"
REVERB_PORT=8080
REVERB_SCHEME="http"
```

### 7. Migrasi & Seeding Database
Jalankan migrasi tabel beserta data awal (seeder pengguna dan contoh data):
```bash
php artisan migrate --seed
```
Jika ingin mereset dan memuat data seeder akun default:
```bash
php artisan db:seed --class=UserRoleSeeder
```

### 8. Build Asset Frontend
Untuk mode pengembangan:
```bash
npm run build
```

---

## 🏃 Menjalankan Aplikasi

Anda dapat menjalankan server pengembangan dengan salah satu cara berikut:

### Cara 1: Menggunakan Perintah Otomatis (Rekomendasi)
```bash
composer dev
```
Perintah ini akan menjalankan HTTP server Laravel, Vite dev server, dan Reverb WebSocket worker secara bersamaan.

### Cara 2: Menjalankan Secara Manual di Terminal Terpisah

**Terminal 1 — Laravel Backend Server:**
```bash
php artisan serve
```

**Terminal 2 — Vite Frontend Server:**
```bash
npm run dev
```

**Terminal 3 — Queue Worker (Opsional untuk background jobs & email):**
```bash
php artisan queue:work
```

Aplikasi dapat diakses di browser melalui: **[http://localhost:8000](http://localhost:8000)** (atau port sesuai output `php artisan serve`).

---

## 🔑 Akun Default untuk Pengujian

Setelah menjalankan `UserRoleSeeder`, gunakan kredensial berikut untuk login:

| Role | Email | Password | Hak Akses & Dashboard |
|------|-------|----------|------------------------|
| **Admin** | `admin@test.local` | `1234` | `/admin/dashboard` (Persetujuan Kafe, Log Audit, Refund) |
| **Owner** | `owner@test.local` | `1234` | `/owner/dashboard` (Manajemen Kafe, Menu, Meja, Laporan) |
| **Customer** | `customer@test.local` | `1234` | `/customer/dashboard` (Reservasi, Order, Riwayat Booking) |

---

## 🧪 Testing & Code Quality

Proyek ini dilengkapi standar pengetesan dan analisis kode yang ketat:

```bash
# Menjalankan PHPUnit test suite
php artisan test

# Menjalankan analisis tipe statis PHPStan (Level 7)
composer types:check

# Memeriksa dan merapikan style kode PHP (Laravel Pint)
composer lint:check
composer lint

# Memeriksa tipe TypeScript & linting frontend
npm run types:check
npm run lint:check
npm run format:check
```

---

## 📂 Struktur Direktori Utama

```
cafe-now/
├── app/
│   ├── Actions/            # Single-responsibility action classes
│   ├── Enums/              # PHP 8.1+ Enums (UserRole, BookingStatus, dll.)
│   ├── Http/
│   │   ├── Controllers/    # Controller API & Web per Role
│   │   ├── Middleware/     # Role-based middleware & validation
│   │   ├── Requests/       # Form Request validation
│   │   └── Resources/      # API Transformation Resources
│   ├── Models/             # Eloquent Models & Relationships
│   ├── Services/           # Business logic (Booking, Midtrans, Lock, dll.)
│   └── Traits/             # Shared traits (Audit logs, dll.)
├── config/                 # Konfigurasi aplikasi
├── database/
│   ├── factories/          # Model Factories untuk testing
│   ├── migrations/         # Skema database
│   └── seeders/            # Database seeders
├── resources/
│   └── js/
│       ├── components/     # Komponen UI React (Radix UI)
│       ├── layouts/        # Layout Inertia (Admin, Owner, Customer)
│       ├── pages/          # Halaman React / Inertia
│       └── types/          # Definisi TypeScript
├── routes/
│   ├── web.php             # Route web utama & role routing
│   └── api/                # Route API endpoint
└── tests/                  # Feature & Unit test suites
```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).