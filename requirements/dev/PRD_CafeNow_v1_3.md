# **Product Requirements Document (PRD)**

## **CafeNow — Web Application for Cafe Table Reservation and Menu Ordering**

## **📋 Table of Contents**

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [User Types & Personas](#user-types--personas)
4. [Features & Functionalities](#features--functionalities)
5. [Technical Requirements](#technical-requirements)
6. [Payment & Commission](#payment--commission)
7. [Notifications](#notifications)
8. [Database Schema (High Level)](#database-schema-high-level)
9. [API Endpoints (High Level)](#api-endpoints-high-level)
10. [Timeline & Milestones](#timeline--milestones)
11. [Appendix](#appendix)

---

## **Executive Summary**

**CafeNow** adalah platform web-based yang memungkinkan pelanggan untuk melakukan reservasi meja di berbagai cafe dan memesan menu secara online. Platform ini menghubungkan customer dengan cafe owners, memfasilitasi sistem booking yang efisien dengan pembayaran online terintegrasi.

**Key Points:**

* 🎯 Target: Memudahkan customer booking cafe dan memesan menu
* 🏢 Multi-merchant platform dengan berbagai cafe
* 💰 Payment gateway: Midtrans (IDR)
* 📱 Platform: Web Application (Mobile-responsive)
* 🔔 Notifikasi via WhatsApp (Twilio)
* ⚡ Real-time availability via WebSocket
* 🔒 Anti race-condition via Redis Temporary Lock

---

## **Product Overview**

### **1.1 Product Name**

**CafeNow** — Booking Cafe Instant

### **1.2 Product Vision**

Menyediakan platform terpadu dimana pelanggan dapat dengan mudah menemukan cafe favorit, melakukan reservasi meja, dan memesan menu makanan/minuman secara online dengan sistem pembayaran yang aman dan terintegrasi.

### **1.3 Product Scope**

**Target Wilayah:** Bandar Lampung, Lampung (single-region MVP, single timezone WIB)

**In Scope (MVP):**

* ✅ Customer dapat browse dan search cafe
* ✅ Customer dapat melihat ketersediaan meja real-time (7 hari ke depan)
* ✅ Customer dapat melakukan reservasi meja dengan pembayaran penuh di muka
* ✅ Customer dapat pre-order menu dalam satu transaksi dengan booking, dan menambah order lagi (additional order) setelah booking confirmed
* ✅ Owner cafe dapat mendaftarkan cafe dan mengelola informasi cafe
* ✅ Owner cafe dapat mengelola meja dan harga (fixed time + custom time options)
* ✅ Owner cafe dapat melihat booking & menu orders, serta cancel booking kapanpun dengan full refund ke customer
* ✅ Super admin dapat mengelola semua fitur platform, menetapkan komisi, dan mengkurasi featured cafe
* ✅ Sistem notifikasi via WhatsApp
* ✅ Pembayaran via Midtrans
* ✅ Fitur Favorites/Wishlist
* ✅ Recently Viewed Cafe
* ✅ Social Login (Google/Facebook) — tetap wajib verifikasi OTP WhatsApp
* ✅ Extend Booking (perpanjangan durasi)
* ✅ Reschedule Booking (flat fee + selisih surge, dikonfigurasi per owner)
* ✅ Forgot/Reset Password via email (customer & owner)
* ✅ Refund manual untuk VA/Minimarket

**Out of Scope (Future):**

* ❌ Manual Approval Mode untuk booking (semua booking auto-confirmed setelah payment; owner tetap bisa cancel kapan saja — lihat 3.2.6)
* ❌ Review & Rating (Phase 2)
* ❌ Mobile Application (Phase 3)
* ❌ In-app chat support (Phase 3)
* ❌ Loyalty program (Phase 3)
* ❌ Promo code system (Phase 2)
* ❌ Payout otomatis ke rekening owner (Phase 2)

---

## **User Types & Personas**

### **2.1 User Types**

#### **A. Customer (End User)**

**Description:** Pengguna yang ingin melakukan reservasi meja di cafe dan memesan menu

**Key Characteristics:**

* Mencari cafe dengan meja yang tersedia
* Ingin kemudahan dalam booking dan pembayaran
* Membutuhkan notifikasi reminder

**User Journey:**

```
Browse Cafe → Search & Filter → View Availability → Select Table & Time
→ (Opsional) Pre-Order Menu → Make Payment (Booking + Menu jadi 1x bayar)
→ Booking Confirmation → Receive WhatsApp Confirmation
→ (Opsional) Additional Order di Kemudian Waktu
```

#### **B. Cafe Owner/Admin**

**Description:** Pemilik atau pengelola cafe yang mendaftarkan cafe dan mengelola operasional

**Key Characteristics:**

* Ingin meningkatkan visibility cafe
* Perlu mengelola inventory meja dan menu
* Ingin menerima booking dengan mudah
* Membutuhkan analytics untuk business insights

**User Journey:**

```
Register Account → Fill Cafe Details → Add Tables & Set Hours
→ Add Menu Items → Setup Pricing & Surge Rules → Kelola Booking Masuk
→ View Analytics & Reports
```

#### **C. Super Admin**

**Description:** Administrator platform yang mengelola semua aspek bisnis

**Key Characteristics:**

* Mengelola owner cafe registrations
* Menetapkan komisi platform
* Memonitor performa platform
* Memproses refund manual
* Melihat analytics global

**User Journey:**

```
Login Dashboard → View Global Analytics → Manage Commissions
→ Approve/Reject Cafe Registration → Process Manual Refunds → View All Bookings
```

---

## **Features & Functionalities**

### **3.1 Customer Features**

#### **3.1.1 Authentication & Account Management**

**Feature:** User Registration & Login

* **Description:** Customer harus login/register untuk melakukan pembayaran booking. Pendaftaran wajib memvalidasi nomor telepon aktif untuk mencegah spam.
* **Flow:**
  * Customer dapat browse cafe tanpa login (read-only)
  * Saat melakukan pembayaran, harus login/register
  * Opsi login: Email + Password, atau Social Login (Google/Facebook)
* **Fields for Registration:**
  * Email
  * Password (min 8 karakter, harus mengandung: uppercase, angka, special char)
  * Full Name
  * Phone Number (WhatsApp) — **Wajib melalui proses verifikasi OTP (One Time Password)**
  * Date of Birth (optional)
* **OTP Verification Flow:**
  1. Customer input nomor telepon
  2. Sistem kirim 6-digit OTP via WhatsApp (atau SMS fallback)
  3. Customer input OTP dalam 5 menit (expired setelahnya)
  4. Jika benar, kolom `is_phone_verified` di tabel users di-set `true`
  5. Resend OTP dapat dilakukan setelah 60 detik (rate-limited)
* **Social Login (Google/Facebook):**
  * Social login menggantikan proses input email + password saja
  * Verifikasi OTP nomor WhatsApp **tetap wajib** setelah social login pertama kali — social login bukan pengganti verifikasi nomor telepon
* **Forgot Password:**
  1. Customer input email di halaman "Lupa Password"
  2. Sistem kirim link reset password ke email (signed token, expired dalam 60 menit, one-time use)
  3. Untuk mencegah email enumeration, sistem selalu menampilkan pesan sukses generik ("Jika email terdaftar, link reset akan dikirim") terlepas dari apakah email terdaftar atau tidak
  4. Customer klik link → input password baru → redirect ke halaman login

#### **3.1.2 Home Page / Dashboard**

**Feature:** Landing Page & Browse Cafe

* **Components:**
  * Search bar dengan autocomplete (nama cafe, lokasi)
  * Filter: Category, Location, Price Range (filter Rating **tidak ada** di MVP — baik UI maupun backend — karena tidak ada data source sebelum Review & Rating masuk di Phase 2)
  * Sorting: Popular (by booking count), Newest, Price (Low-High), Distance
    * **Catatan Distance:** Memerlukan izin GPS dari browser. Jika ditolak, opsi "Distance" disembunyikan atau di-disable.
  * Featured/Recommended Cafe — diambil dari tabel `featured_cafes` yang sedang aktif (`active_from <= now <= active_to`), diurutkan berdasarkan `display_order`, dikurasi oleh Super Admin (lihat 3.3.9)
  * Recently Viewed Cafe (dari riwayat cafe yang pernah dilihat customer)
* **Display:** Grid/List view dengan cafe cards (foto, nama, lokasi, harga mulai dari, jumlah booking)
* **Rating MVP:** Karena Review & Rating masuk Phase 2, tampilkan jumlah booking sebagai social proof pengganti (e.g., "⭐ 230 booking"). Elemen rating bintang disembunyikan sampai Phase 2 diimplementasi.

#### **3.1.3 Favorites / Wishlist**

**Feature:** Save Favorite Cafe

* **Description:** Customer dapat menambahkan cafe ke favorites
* **Flow:**
  * Click heart icon pada cafe card (memerlukan login)
  * Bisa dilihat di menu "My Favorites"
  * Bisa remove dari favorites
* **Data:** Di-sync dengan account customer (stored in database)

#### **3.1.4 Recently Viewed Cafe**

**Feature:** Automatic View History Tracking

* **Description:** Sistem otomatis menyimpan cafe yang pernah di-klik/dilihat customer (bukan riwayat query pencarian)
* **Flow:**
  * Setiap kali customer klik cafe, dicatat sebagai viewed
  * Ditampilkan di home page sebagai "Cafe yang Baru Dilihat"
  * Customer bisa clear riwayat, baik semua sekaligus maupun per-item
* **Limitation:** Simpan 20 cafe terakhir yang dilihat per customer

#### **3.1.5 Cafe Detail Page**

**Feature:** Detailed Cafe Information

* **Display:**
  * Foto cafe (gallery — tampilkan min 1, max 10 foto)
  * Nama, lokasi, alamat lengkap
  * Jam operasional (per hari)
  * Deskripsi cafe
  * Fasilitas (WiFi, AC, Parking, Pet Friendly, dll — tampilkan sebagai ikon/badge)
  * Contact info (WhatsApp, email)
  * Map location (Google Maps embed — menggunakan koordinat latitude/longitude)
  * Jumlah booking (social proof di MVP)
* **Additional:** Add to favorites button (requires login)

#### **3.1.6 Table Selection & Booking**

**Feature:** Real-time Table Availability & Booking

* **Availability View:**
  * Calendar: Tampilkan 7 hari ke depan (hari ini tidak bisa di-booking jika sudah lewat window 2 jam)
  * Per hari bisa melihat ketersediaan meja dalam format slot waktu
  * Real-time availability status: **available / locked / booked / unavailable**
    * `available` → bisa dipilih
    * `locked` → sedang dalam proses pembayaran orang lain (Redis lock aktif, TTL 15 menit)
    * `booked` → sudah ada booking confirmed
    * `unavailable` → di luar jam operasional atau blackout date
  * Update real-time menggunakan **WebSockets** (Laravel Reverb) agar UI ter-update ke semua user aktif tanpa perlu refresh halaman.
    * **Fallback:** Jika koneksi WebSocket terputus, sistem otomatis fallback ke polling setiap 15 detik.
    * **Channel:** Channel dibuat per-cafe per-tanggal, contoh: `cafe.{cafe_id}.availability.{date}`

* **Table Selection:**
  * Tampilkan semua meja dengan info: nama meja, kapasitas, tipe, foto, harga
  * Ada 2 opsi per meja:
    * **Fixed Time Slots:** Durasi & harga sudah ditentukan cafe (e.g., 2 jam @ 50K)
    * **Custom Duration:** Customer bisa pilih durasi sendiri (dalam rentang min-max yang ditentukan owner) dengan harga yang dapat berubah berdasarkan surge pricing
  * Tampilkan harga real-time sesuai selected date, time, duration, dan surge pricing

* **Booking Rules:**
  * Booking hanya dapat dilakukan minimal 2 jam sebelum waktu yang dipilih
  * Contoh: Jika sekarang jam 14:00, customer hanya bisa booking untuk jam 16:00 ke depan
  * Validasi di frontend (disable slot yang tidak memenuhi) dan backend (return error 422 jika dilanggar)

* **Booking Flow:**
  1. Customer select tanggal & jam
  2. Pilih meja dari daftar available
  3. Pilih durasi (untuk custom time option)
  4. Input jumlah tamu (guest count) dan catatan khusus (optional)
  5. **Pilih menu (opsional/pre-order)** — customer dapat langsung memilih makanan/minuman yang akan disiapkan saat booking dimulai (lihat 3.1.9). Langkah ini bisa di-skip; customer tetap bisa additional order setelah booking confirmed.
  6. Review booking details: cafe name, meja, waktu, durasi, price breakdown meja + menu (jika ada)
  7. Proceed to payment (1x checkout untuk booking + pre-order)

#### **3.1.7 Payment & Checkout**

**Feature:** Secure Payment Processing & Table Locking (Anti Race-Condition)

* **Payment Flow & Locking Mechanism:**
  1. Customer review booking summary (termasuk pre-order menu jika ada)
  2. Confirm booking dan klik "Proceed to Payment"
  3. **Backend melakukan "Temporary Lock" meja di Redis (Key: `table_lock:{table_id}:{date}:{start_time}`, TTL: 15 menit). Status meja di UI berubah menjadi `locked` bagi semua user lain via WebSocket event.**
  4. Booking record dibuat di DB dengan `payment_status: 'pending'`, field `lock_expires_at` diisi, dan (jika ada) `menu_orders` pre-order dengan `order_type: 'pre_order'` ikut dibuat terhubung ke `booking_id`
  5. Redirect ke Midtrans Payment Gateway dengan `item_details` berisi harga meja **dan** setiap menu item pre-order. Parameter `expiry` di-set **15 menit untuk semua payment method** (termasuk VA dan Minimarket) — Midtrans akan otomatis meng-expire transaksi jika tidak dibayar dalam window ini
  6. Customer memilih payment method (Bank Transfer/VA, e-wallet, Credit Card, Minimarket, dll)
  7. Jika payment selesai: Midtrans kirim webhook → backend konfirmasi → Redis lock dihapus → status booking (dan pre-order menu terkait) menjadi `confirmed` / `scheduled`
  8. Jika **tidak dibayar dalam 15 menit**: Redis lock otomatis expired → meja kembali `available` → booking record (dan pre-order terkait) statusnya di-set `cancelled`
  9. **Safety net late webhook:** Jika webhook sukses tetap diterima Midtrans untuk `order_id` yang booking-nya sudah `cancelled` (misal karena retry Midtrans yang terlambat), sistem **tidak mengubah status booking**, langsung trigger refund otomatis (ditandai `refunded_on_arrival` di tabel `payments`), dan tetap return HTTP 200 OK ke Midtrans (lihat 4.4 & 5.1)

* **Payment Details:**
  * Full payment di muka (no partial/installment)
  * Currency: IDR
  * Display breakdown: Harga meja, subtotal menu pre-order (jika ada), platform fee/commission (jika dibebankan ke customer), total
  * Payment status tracking real-time

* **Post-Payment:**
  * Show booking confirmation page dengan semua detail
  * Generate booking reference number (format: `BKG-YYYYMMDD-XXXXX`)
  * Send WhatsApp confirmation ke customer
  * Send WhatsApp alert ke owner cafe

#### **3.1.8 Customer Check-In**

**Feature:** Digital Check-In di Lokasi

* **Mekanisme:**
  * Customer membuka halaman **Booking Detail** di aplikasi saat tiba di cafe
  * Tap tombol **"Check In"** yang hanya muncul:
    * Pada hari booking
    * Dalam window 30 menit sebelum hingga 60 menit setelah `start_time`
  * Sistem mencatat `check_in_time` di record booking
  * Konfirmasi check-in juga tampil di dashboard Owner secara real-time

* **Efek pada Order Status:**
  * Jika customer sudah melakukan check-in, status menu order yang sedang `scheduled` akan otomatis berubah ke `preparing`, terlepas dari hitungan 30-menit otomatis.

* **Validasi:** Tidak ada validasi geolokasi di MVP. Customer diharapkan self-report. Validasi geolokasi dapat ditambahkan di Phase 2.

#### **3.1.9 Menu Ordering (Pre-Order & Additional Order)**

**Feature:** Menu Selection & Food Ordering

Karena booking meja pada dasarnya selalu untuk makan/minum di tempat, menu ordering dibagi menjadi dua alur:

**A. Pre-Order (bagian dari booking flow)**

* **Access:** Dipilih pada step 5 booking flow (lihat 3.1.6), sebelum checkout
* **Menu Display:**
  * Kategori menu (Drinks, Food, Dessert, dll)
  * Per kategori: product card dengan foto, nama, harga, status ketersediaan
  * Add to cart button (disabled jika item out of stock)
  * Quantity selector (+/-)
  * Step ini bisa di-skip sepenuhnya
* **Checkout:** Pre-order **tidak punya transaksi sendiri** — harga menu digabung ke dalam 1x checkout booking (lihat 3.1.7). `menu_orders` yang dibuat berstatus `order_type: 'pre_order'` dan `booking_id` wajib terisi
* **Status:** Mengikuti payment_status booking induknya — sukses bayar booking = pre-order otomatis `scheduled`

**B. Additional Order (setelah booking confirmed)**

* **Access:**
  * Customer buka halaman **Booking Detail** dari booking yang sudah `confirmed`
  * Pilih menu tambahan, terlepas dari apakah sudah ada pre-order sebelumnya
* **Menu Display:** Sama seperti pre-order (kategori, cart, quantity selector)
* **Cart & Checkout:**
  * View cart dengan items, quantity, harga per item, subtotal
  * Proceed to payment (**transaksi Midtrans terpisah** dari booking payment)
* **Menu Payment:**
  * Full payment untuk additional order
  * Redirect ke Midtrans (flow sama seperti booking)
  * `menu_orders` dibuat dengan `order_type: 'additional'`, `booking_id` wajib terisi (menu order tidak bisa berdiri sendiri tanpa booking)
* **Order Confirmation:**
  * Tampilkan halaman order confirmation dengan semua detail
  * Generate order reference number (format: `ORD-YYYYMMDD-XXXXX`)
  * Send WhatsApp confirmation ke customer
  * Send WhatsApp alert ke owner cafe

#### **3.1.10 Booking Management**

**Feature:** View & Manage Bookings

* **Booking History:**
  * Display semua booking customer (past & upcoming)
  * Tampilkan: Cafe name, meja, tanggal, jam, harga, status
  * Filter: Upcoming, Completed, Cancelled, No-Show

* **Booking Details:**
  * Click booking → view full details
  * Show: Cafe name, alamat, contact, booking reference, waktu, meja, payment status
  * Display menu orders untuk booking tersebut (jika ada)
  * Tombol Check-In (muncul sesuai kondisi di 3.1.8)

* **Cancellation & Refund:**
  * Customer bisa cancel booking dengan rules:
    * Cancel button **hanya muncul** jika saat ini masih **3 jam atau lebih** sebelum `start_time`
    * Jika sudah kurang dari 3 jam, tombol cancel di-disable dengan pesan "Batas waktu pembatalan telah habis"
    * Setelah cancel, refund tidak bisa di-reverse
  * Show confirmation modal sebelum cancel
  * **Sistem Refund berdasarkan metode pembayaran:**
    * **Credit Card / e-Wallet (GoPay, OVO, dll):** Auto-refund via Midtrans API ke sumber pembayaran. Estimasi 1-3 hari kerja.
    * **Virtual Account / Minimarket:** Sistem menampilkan **form input data rekening bank** (Bank Name, Account Number, Account Holder Name). Data disimpan ke tabel `refund_requests`. Diproses manual oleh Super Admin dengan SLA 3×24 jam kerja.
  * **Cascade ke Menu Orders:** Semua `menu_orders` (pre-order maupun additional order) dengan status `pending_payment` atau `scheduled` yang terhubung ke booking tersebut otomatis di-set `cancelled`, dan direfund mengikuti flow refund yang sama berdasarkan payment method masing-masing. Total refund customer = booking amount + seluruh menu order amount yang belum masuk `preparing`. Order yang sudah `preparing`/`ready`/`completed` **tidak direfund**.
  * Send WhatsApp confirmation cancellation ke customer
  * Send WhatsApp alert ke owner bahwa booking dibatalkan
  * **Catatan:** Owner cafe juga dapat cancel booking dari sisi mereka kapan saja (termasuk H-jam booking) — lihat 3.2.6 "Owner Cancellation". Dalam kasus ini, refund customer **selalu penuh** tanpa syarat 3 jam, karena pembatalan berasal dari pihak cafe.

* **Reschedule:**
  * Reschedule adalah **edit jadwal** pada booking yang sudah ada (bukan cancel + buat booking baru) — `booking_id` tidak berubah, sehingga pre-order menu yang sudah dipesan tetap terhubung tanpa perlu order ulang
  * **Syarat:**
    * Hanya bisa dilakukan jika saat ini masih **3 jam atau lebih** sebelum `start_time` **original** (bukan waktu baru)
    * Slot waktu baru yang dipilih harus berstatus `available`
  * **Biaya Reschedule:**
    * Flat reschedule fee — **dikonfigurasi oleh masing-masing owner cafe** (lihat 3.2.5), default Rp 5.000
    * **Plus** selisih harga jika slot baru lebih mahal karena surge pricing (harga baru − harga lama)
    * Jika slot baru **lebih murah**: customer tetap hanya membayar flat fee, **tidak ada refund** atas selisih harga yang lebih rendah
  * Flat fee + selisih (jika ada) diproses sebagai 1 transaksi Midtrans baru untuk reschedule
  * Customer harus check availability terlebih dahulu untuk time slot baru sebelum konfirmasi reschedule

* **Extend Booking (Perpanjangan Waktu):**
  * Customer yang sedang berada di lokasi (sudah check-in) dapat menambah durasi booking jika slot waktu berikutnya untuk meja tersebut berstatus `available`
  * **Flow:**
    1. Customer klik "Extend Booking" di halaman Booking Detail
    2. Sistem validasi: apakah slot berikutnya available (tidak ada `booked` atau `locked`)
    3. **Sistem langsung pasang Redis lock untuk slot tambahan tersebut (TTL: 15 menit)** untuk mencegah race condition
    4. Customer pilih durasi tambahan
    5. Customer bayar via Midtrans (transaksi baru)
    6. Setelah bayar, `end_time` booking diupdate
  * **Aturan Bisnis Extend:**
    * Extend hanya bisa dilakukan maksimal 2 kali per booking
    * Durasi tambahan minimal 30 menit, maksimal mengikuti `max_duration` dari `booking_rules` meja tersebut
    * Jika slot berikutnya tidak available, tombol "Extend" di-disable dengan pesan "Meja sudah dibooking setelah waktu ini"
    * **Penting:** `extend_count` hanya di-increment **setelah payment extension dikonfirmasi via webhook Midtrans** (langkah 5-6 di flow di atas) — bukan saat Redis lock dipasang di langkah 3. Jika payment gagal/expired, `extend_count` tidak bertambah dan customer tidak kehilangan jatah extend-nya.

#### **3.1.11 Order History**

**Feature:** View Menu Orders

* **Order History Page:**
  * Display semua menu orders customer (pre-order maupun additional order)
  * Tampilkan: Cafe name, menu items (ringkasan), tanggal order, harga, status, badge tipe order (Pre-Order/Additional Order)
  * Filter: By Cafe, By Date, By Status, By Order Type

* **Order Details:**
  * Click order → view full details (items, qty, harga per item, total, payment status, order reference)

---

### **3.2 Cafe Owner Features**

#### **3.2.1 Authentication & Account Management**

**Feature:** Owner Registration & Login

* **Registration Flow:**
  1. Owner buat akun dengan email + password
  2. Verifikasi email (link verifikasi dikirim via email)
  3. Isi profil: Full name, nomor telepon, info bisnis dasar
  4. Submit form registrasi cafe (lihat 3.2.3)
  5. Menunggu persetujuan Super Admin (status: pending)

* **Fields Registrasi:**
  * Email
  * Password (min 8 karakter, harus mengandung: uppercase, angka, special char)
  * Full Name
  * Phone Number (WhatsApp)

* **Login:** Email + Password. Session-based atau JWT.

* **Forgot Password:** Sama seperti flow customer (lihat 3.1.1) — link reset dikirim via email, signed token, expired 60 menit, one-time use.

* **Resubmission setelah Cafe Rejection:**
  * Jika registrasi cafe ditolak Super Admin (`approval_status: rejected`), owner dapat memperbaiki data cafe dan melakukan resubmission tanpa perlu membuat akun baru
  * Status cafe kembali ke `pending` setelah resubmit
  * **Maksimal 3x resubmission.** Jika ditolak untuk yang ke-3 kalinya, akun owner tersebut di-lock untuk pendaftaran cafe baru dan diarahkan untuk menghubungi Customer Support
  * `cafes.submission_count` bertambah setiap kali resubmit (lihat 7.1)

#### **3.2.2 Cafe Management Dashboard**

**Feature:** Main Dashboard untuk Owner

* **Components:**
  * **Statistics Cards (summary hari ini & bulan ini):**
    * Total Booking (hari ini / bulan ini / all time)
    * Total Revenue (hari ini / bulan ini / all time, setelah komisi)
    * Booking Hari Ini yang Belum Check-In
    * Total Menu Orders (hari ini / bulan ini)
  * **Quick Access Menu:** Shortcut ke fitur utama (Kelola Meja, Kelola Menu, Lihat Booking, Lihat Order)
  * **Recent Bookings:** List 5 booking terbaru dengan status
  * **Recent Orders:** List 5 menu order terbaru dengan status

#### **3.2.3 Cafe Information Management**

**Feature:** Manage Cafe Details

* **Cafe Setup (First Time):**
  1. Isi info dasar: Nama cafe, Kategori, Deskripsi
  2. Isi info lokasi: Alamat lengkap, Kota, Kode Pos, Latitude/Longitude (bisa via Google Maps picker)
  3. Upload foto gallery (min 1, max 10 foto; format JPG/PNG/WebP; maks 5 MB per foto)
  4. Set jam operasional per hari (Senin–Minggu): jam buka, jam tutup, centang "Tutup" untuk hari libur
  5. Set blackout dates: tanggal-tanggal spesifik dimana cafe tidak menerima booking (mis. renovasi, acara private)
     * **Kebijakan jika ada existing booking:** Jika blackout date yang di-set overlap dengan booking `confirmed` yang sudah ada, sistem **tetap mengizinkan** blackout date tersebut disimpan, lalu otomatis cancel semua booking (dan menu order terkait) yang overlap dengan **full refund** + notifikasi WhatsApp ke customer bahwa cafe tutup pada tanggal tersebut
  6. Pilih fasilitas/amenities (checkbox: WiFi, AC, Parking, Outdoor Area, Pet Friendly, dll)
  7. Isi info kontak: Nomor WhatsApp, Email, Link Instagram/Website (optional)

* **Edit Cafe Info:**
  * Owner bisa edit semua informasi di atas kapan saja
  * Perubahan langsung tercermin di sisi customer

#### **3.2.4 Table Management**

**Feature:** Create & Manage Tables

* **Add Table:**
  1. Nama/identifier meja (e.g., "Meja A1", "VIP Table 1")
  2. Kapasitas (jumlah kursi)
  3. Tipe meja (Regular, VIP, Window Seat, Outdoor, dll)
  4. Deskripsi/catatan (optional)
  5. Foto meja (optional; format JPG/PNG/WebP; maks 5 MB)

* **Table Inventory:**
  * List semua meja dengan status aktif/non-aktif
  * Edit info meja
  * Non-aktifkan meja (meja tidak bisa di-booking tapi data tidak dihapus)
  * Hapus meja (hanya jika tidak ada booking aktif atau upcoming) — menggunakan **soft delete** (`deleted_at`), bukan hard delete, agar riwayat booking lama tetap valid untuk audit

#### **3.2.5 Pricing & Booking Rules**

**Feature:** Set Pricing & Operational Rules per Table

Owner bisa mengkonfigurasi 2 jenis opsi booking per meja:

**Opsi 1 — Fixed Time Slots:**
* Definisikan durasi tetap (e.g., 1 jam, 2 jam, 3 jam)
* Set harga untuk masing-masing durasi
* Set maksimal booking bersamaan untuk slot tersebut
* Contoh:
  * 1 jam: Rp 50.000 (maks 5 booking bersamaan)
  * 2 jam: Rp 80.000 (maks 3 booking bersamaan)

**Opsi 2 — Custom Duration:**
* Set durasi minimum dan maksimum (e.g., min 1 jam, maks 5 jam)
* Set harga dasar per jam
* Aktifkan surge pricing (optional):
  * Owner bisa set aturan harga berbeda untuk window waktu tertentu
  * **Format `surge_rules` (JSON):**
    ```json
    {
      "rules": [
        {
          "name": "Peak Evening",
          "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
          "start_time": "18:00",
          "end_time": "21:00",
          "type": "multiplier",
          "value": 1.5
        },
        {
          "name": "Weekend Surge",
          "days": ["saturday", "sunday"],
          "start_time": "00:00",
          "end_time": "23:59",
          "type": "add_percent",
          "value": 20
        }
      ]
    }
    ```
  * `type: "multiplier"` → harga dasar × value (1.5 = 150%)
  * `type: "add_percent"` → harga dasar + (harga dasar × value/100)
  * Jika ada multiple rules yang berlaku bersamaan, sistem menghitung **final price** dari masing-masing rule dan memilih rule yang menghasilkan **final price tertinggi** — bukan membandingkan nilai parameter (`multiplier`/`add_percent`) secara langsung, karena keduanya tidak comparable satu sama lain
* Set maksimal booking bersamaan per slot waktu

**Aturan Surge Pricing Contoh:**
* Off-peak (10:00–14:00): Rp 50.000/jam
* Peak (18:00–21:00): Rp 75.000/jam (multiplier 1.5)
* Weekend: +20%

**Reschedule Fee:**
* Setiap owner dapat mengkonfigurasi `reschedule_fee` (nominal flat, default Rp 5.000) yang dikenakan setiap kali customer melakukan reschedule booking (lihat 3.1.10)
* Fee ini berlaku per cafe, bukan per meja

#### **3.2.6 Booking Management**

**Feature:** View & Manage Bookings

* **Booking List:**
  * Tampilkan semua booking (upcoming & past)
  * Filter: By table, By status, By date
  * Search: by customer name, booking reference
  * Export: ke CSV (optional Phase 2)

* **Booking Status:**
  * `pending` — Booking record dibuat, menunggu pembayaran selesai (Redis lock aktif); **bukan** status menunggu keputusan owner
  * `confirmed` — Payment berhasil, booking otomatis confirmed
  * `completed` — Booking sudah selesai
  * `cancelled` — Booking dibatalkan (oleh customer, owner, sistem/timeout, atau blackout date)
  * `no_show` — Customer tidak datang (ditandai oleh owner)

* **Auto-Confirmation:**
  * Semua booking otomatis menjadi `confirmed` setelah pembayaran berhasil — **tidak ada mode approval manual** di MVP (lihat 1.3 Out of Scope)
  * Selama window pembayaran (15 menit), meja berstatus `locked` sehingga tidak bisa dipilih user lain, sehingga tidak ada celah race condition menunggu keputusan owner

* **Owner Cancellation:**
  * Owner memiliki kontrol penuh (CRUD) atas booking yang masuk ke cafenya, dan dapat cancel booking `confirmed` **kapan saja — termasuk H-jam booking** — dengan menyertakan alasan (`cancellation_reason`)
  * Berbeda dari cancellation oleh customer (lihat 3.1.10), owner cancellation **selalu full refund** tanpa syarat batas waktu 3 jam, karena pembatalan berasal dari keputusan pihak cafe
  * **Refund berdasarkan metode pembayaran customer:**
    * Credit Card / e-Wallet: Auto-refund via Midtrans API
    * Virtual Account / Minimarket: Sistem kirim WhatsApp ke customer berisi link form refund (signed token, expired 7 hari) untuk mengisi data rekening bank. Data masuk ke tabel `refund_requests`, diproses manual oleh Super Admin (SLA 3×24 jam kerja)
  * Menu orders (pre-order maupun additional order) yang terhubung ke booking tersebut ikut di-cancel dan direfund mengikuti aturan yang sama (lihat 3.1.10)
  * Customer menerima notifikasi WhatsApp "Booking dibatalkan oleh cafe" (lihat 6.2)

* **Check-In & Check-Out Log:**
  * Catat `check_in_time` (dari aksi customer check-in)
  * `check_out_time` diisi secara **hybrid**:
    * **Otomatis:** Scheduled job scan booking `confirmed` dengan `end_time <= now()` dan `check_out_time IS NULL` → auto-fill `check_out_time = end_time`, status booking berubah menjadi `completed`
    * **Manual override:** Owner dapat klik tombol "Checkout" kapan saja sebelum `end_time` tercapai (misal customer pulang lebih awal) → `check_out_time = now()`, status → `completed`

* **Post-Booking Actions:**
  * Tandai booking sebagai "No-show" jika customer tidak datang
  * Lihat menu orders (pre-order & additional order) yang terkait dengan booking tersebut

#### **3.2.7 Menu Management**

**Feature:** Create & Manage Menu Items

* **Add Menu Item:**
  1. Nama menu
  2. Kategori (Drinks, Food, Dessert, Snack, dll)
  3. Deskripsi (optional)
  4. Harga (IDR)
  5. Upload foto (format JPG/PNG/WebP; maks 5 MB)
  6. Status ketersediaan: Toggle "Tersedia" / "Habis"
  7. Catatan alergen (optional, free text)

* **Menu Inventory:**
  * List semua menu items
  * Tampilkan: nama, kategori, harga, status ketersediaan
  * Edit info menu
  * Hapus menu item (hanya jika tidak ada order aktif)

* **Menu Status Management:**
  * Toggle ketersediaan per item secara individual
  * Bulk toggle untuk seluruh kategori (e.g., set semua "Drinks" jadi "Habis")

#### **3.2.8 Order Management**

**Feature:** View & Manage Food Orders

* **Order List:**
  * Tampilkan semua menu orders, dengan badge pembeda **Pre-Order** (dipesan saat booking) atau **Additional Order** (dipesan setelah booking confirmed)
  * Filter: By status, By date, By booking, By order type
  * Search: by order reference, customer name

* **Order Status Flow (Optimized for Pre-Order):**

  | Status | Deskripsi | Trigger |
  |---|---|---|
  | `pending_payment` | Order belum dibayar | Customer buat order, belum checkout |
  | `scheduled` | Sudah dibayar, jam booking masih jauh | Payment webhook confirmed |
  | `preparing` | Dapur sedang memasak | Otomatis 30 menit sebelum `start_time` ATAU customer klik Check-In |
  | `ready` | Makanan siap diambil/diantar | Owner update manual |
  | `completed` | Order selesai | Owner update manual setelah disajikan |
  | `cancelled` | Order dibatalkan | Customer cancel booking / sistem auto-cancel |

  > **Catatan:** Status `preparing` di-trigger oleh dua kondisi (OR):
  > 1. Scheduled job berjalan 30 menit sebelum `start_time` booking
  > 2. Customer melakukan check-in via app (lihat 3.1.8)

* **Order Details:**
  * Click order → view full details
  * Info: Items, quantity, harga per item, total, customer, booking reference, catatan khusus
  * Update status order
  * Opsi print order (untuk dapur — format sederhana)

* **Integration:** Order terhubung ke booking. Tampilkan info customer dari booking terkait.

#### **3.2.9 Analytics & Reports**

**Feature:** Business Insights & Performance Metrics

* **Dashboard Analytics:**
  * Revenue: Daily, Weekly, Monthly, All Time (setelah komisi)
  * Booking Trends: Grafik bookings over time
  * Tabel Terpopuler: Meja mana yang paling banyak di-booking
  * Peak Hours: Jam berapa paling banyak booking
  * Menu Performance: Top 10 menu items terlaris
  * Occupancy Rate: Persentase slot terisi vs total slot tersedia
  * No-Show Rate: Persentase customer tidak datang

* **Date Range Filtering:** Filter analytics by custom date range

---

### **3.3 Super Admin Features**

#### **3.3.1 Authentication**

**Feature:** Super Admin Login

* Login aman dengan email + password
* Akun Super Admin dibuat secara manual di database (tidak ada public registration)
* Session timeout setelah 8 jam idle

#### **3.3.2 Main Dashboard**

**Feature:** Global Platform Dashboard

* **System-wide Statistics:**
  * Total cafe owners terdaftar (active / pending / suspended)
  * Total customers terdaftar
  * Total bookings platform-wide (hari ini / bulan ini / all time)
  * Total revenue platform-wide (GMV — Gross Merchandise Value)
  * Total komisi yang dikumpulkan platform
  * Total menu orders

* **Key Metrics:**
  * Active cafe count
  * Monthly Active Customers (MAU)
  * Average booking value
  * Platform commission rate yang berlaku

* **Recent Activity:**
  * New cafe registrations (perlu approval)
  * Recent bookings across all cafes
  * Recent menu orders
  * Pending manual refund requests

#### **3.3.3 Cafe Owner Management**

**Feature:** Manage Cafe Registrations & Active Cafes

* **Pending Approvals:**
  * List registrasi cafe yang menunggu approval
  * Lihat detail cafe yang disubmit (nama, lokasi, foto, info owner)
  * Jika ini adalah resubmission, tampilkan label "Resubmission ke-N" (dari `cafes.submission_count`) agar admin tahu riwayatnya
  * Approve → cafe langsung active, owner dapat notifikasi
  * Reject → sertakan alasan penolakan, owner dapat notifikasi dengan alasan. Owner dapat resubmit hingga maksimal 3x (lihat 3.2.1) sebelum diarahkan menghubungi CS

* **Active Cafe List:**
  * List semua cafe aktif
  * Lihat info cafe, info owner, tanggal registrasi, total booking
  * Search & filter by status (active/suspended/pending), kota, kategori
  * Suspend/Deactivate cafe jika melanggar aturan platform

* **Cafe Detail Management:**
  * View detail cafe lengkap
  * Edit info cafe (untuk koreksi data)

#### **3.3.4 Commission Management**

**Feature:** Set & Monitor Commission Rates

* **Commission Configuration:**
  * Set persentase komisi global untuk **booking** (default: 15%)
  * Set persentase komisi global untuk **menu orders** (default: 10%)
  * Perubahan komisi tidak berlaku retroaktif (hanya untuk transaksi baru)
  * History perubahan komisi tersimpan di tabel `commission_rules`

* **Commission Monitoring:**
  * View semua transaksi komisi
  * Filter by cafe, date range
  * Hitung total komisi terkumpul
  * Generate laporan komisi (PDF/CSV)

#### **3.3.5 Global Booking Management**

**Feature:** View & Monitor All Bookings

* **Booking Overview:**
  * View SEMUA booking dari semua cafe
  * Filter: By cafe, By date, By status
  * Search: by booking reference, customer name, cafe name

* **Dispute Resolution:**
  * Tangani keluhan customer mengenai booking
  * Override status booking jika diperlukan
  * Catat catatan resolusi (admin notes)

#### **3.3.6 Manual Refund Management**

**Feature:** Process Manual Refund Requests

* **Refund Queue:**
  * List semua pending refund requests (dari pembayaran VA/Minimarket) — baik yang berasal dari cancellation customer, cancellation owner, reschedule, maupun blackout date auto-cancel
  * Tampilkan: customer name, booking reference, amount, bank name, account number, account holder, tanggal request, sumber pembatalan (customer/owner/system)

* **Refund Actions:**
  * **Approve & Process:** Admin konfirmasi transfer manual ke rekening yang disediakan, update status `refund_requests` menjadi `processed`
  * **Reject:** Tolak refund dengan alasan (misalnya data rekening tidak valid), update status `refund_requests` menjadi `rejected`

* **SLA:** 3×24 jam kerja sejak request masuk

* **Notifikasi:** Setelah status update, customer menerima WhatsApp notification:
  * Jika `processed`: "Refund Anda sebesar Rp [amount] telah dikirim ke rekening [bank] [account_number]. Mohon cek dalam 1-3 hari kerja."
  * Jika `rejected`: "Permintaan refund Anda ditolak dengan alasan: [reason]. Silakan hubungi support."

#### **3.3.7 Analytics & Reports (Global)**

**Feature:** Platform-wide Analytics

* **Key Metrics:**
  * Total GMV & Revenue platform
  * Komisi terkumpul per periode
  * Ranking performa cafe (by revenue, by booking count)
  * Analisis perilaku customer (booking frequency, order value)
  * Menu performance lintas semua cafe

* **Report Generation:**
  * Export laporan ke CSV
  * Date range filtering

#### **3.3.8 User Management**

**Feature:** Manage Platform Users

* **Super Admin Management:**
  * Buat akun Super Admin tambahan (jika diperlukan)
  * **Audit log** (tabel `admin_audit_logs`, lihat 7.1): track semua aksi admin — minimal mencakup approve/reject cafe, process/reject refund, suspend user, update commission rules, dan perubahan featured cafe. Setiap entry mencatat admin, aksi, entitas terkait, before/after value, dan IP address.

* **Customer Management:**
  * View semua customer accounts
  * Suspend/deactivate customer jika melanggar aturan

#### **3.3.9 Featured Cafe Management**

**Feature:** Curate Featured/Recommended Cafe on Home Page

* Super Admin dapat menambah, menghapus, dan mengatur urutan tampil cafe yang muncul di section "Featured/Recommended Cafe" di home page (lihat 3.1.2)
* **Konfigurasi per entry:**
  * Pilih cafe yang akan di-featured
  * `display_order` — urutan tampil
  * `active_from` / `active_to` — periode featured tersebut aktif (`active_to` boleh kosong = featured tanpa batas waktu)
* Data disimpan di tabel terpisah `featured_cafes` (lihat 7.1), bukan sekadar flag boolean di tabel `cafes`, agar mendukung penjadwalan dan urutan tampil

---

## **Technical Requirements**

### **4.1 Technology Stack**

**Frontend:**

* Framework: **Laravel Blade**
* Reactivity: **Alpine.js** (untuk komponen real-time — mendengarkan WebSocket event dari Laravel Reverb langsung di template tanpa build step tambahan)
* Styling: Tailwind CSS
* Build Tool: Vite

**Backend:**

* Framework: Laravel (PHP)
* Database: **MySQL**
* Cache & Locking: **Redis** (untuk temporary table locking, rate limiting, caching data cafe)
* Message Queue: Redis Queue + **Laravel Horizon** (untuk async tasks: scheduled jobs, notifikasi)
* **WebSockets: Laravel Reverb** (self-hosted) untuk real-time availability updates
* File Storage: AWS S3 / DigitalOcean Spaces / Local Storage (konfigurasi via Laravel Filesystem)

**Infrastructure & External Services:**

* Server: Cloud — AWS / DigitalOcean / Railway
* CDN: Cloudfront atau Cloudflare (untuk static assets & foto)
* Payment: Midtrans API
* Notifications: Twilio (WhatsApp Business API)
* Maps: Google Maps API (untuk embed peta dan geocoding alamat)
* Email: SendGrid / SMTP (untuk verifikasi email owner & reset password)
* Monitoring: Laravel Telescope (development) / Sentry (production)
* **Timezone:** WIB (UTC+7) untuk seluruh sistem — sesuai target wilayah Bandar Lampung (lihat 1.3)

### **4.2 System Architecture**

```
┌─────────────────────────────┐
│       Frontend (Web)        │
│  Laravel Blade + Alpine.js  │
│  WebSocket Client           │
└────────────┬────────────────┘
             │ HTTP + WS
             ▼
┌─────────────────────────────┐
│     Laravel Backend API     │
│  ├─ Auth Service            │
│  ├─ Cafe Service            │
│  ├─ Table & Booking Service │
│  ├─ Menu & Order Service    │
│  ├─ Payment Service         │
│  ├─ Notification Service    │
│  └─ Admin Service           │
└──────┬───────────┬──────────┘
       │           │
  ┌────┴───┐   ┌───┴────────────────────────┐
  │  MySQL │   │  Redis                     │
  │        │   │  - Table Locks (TTL 15 min)│
  └────────┘   │  - Cache (Cafe data)       │
               │  - Queue (Horizon)         │
               └────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       Midtrans        Twilio      Google Maps
    (Payment GW)    (WhatsApp)       (Maps)

WebSocket Server: Laravel Reverb (self-hosted)
CDN: CloudFront / Cloudflare
Storage: AWS S3 / DO Spaces
```

### **4.3 Database Considerations**

**Key Indexes untuk Query Kritis:**
* `bookings`: index pada `(table_id, booking_date, start_time)` — untuk availability check
* `bookings`: index pada `customer_id` — untuk booking history
* `cafes`: index pada `category`, `city` — untuk filtering
* `search_history`: index pada `(customer_id, viewed_at DESC)` — untuk recently viewed cafe
* `menu_orders`: index pada `(booking_id, status, order_type)` — untuk order tracking
* `featured_cafes`: index pada `(active_from, active_to, display_order)` — untuk query featured yang sedang aktif
* `admin_audit_logs`: index pada `(admin_id, created_at)` dan `(entity_type, entity_id)`

**Data Retention:**
* Semua record transaksi (bookings, payments, orders) disimpan permanen untuk audit
* Recently viewed cafe: retain 20 records terbaru per user (old records otomatis di-delete via query)
* Logs sistem: retain 90 hari

### **4.4 Security Requirements**

**Authentication & Authorization:**

* Password di-hash menggunakan Bcrypt
* JWT atau Session-based auth (Laravel Sanctum)
* Rate limiting pada endpoint login (maks 5 attempts per 15 menit)
* RBAC: role `customer`, `owner`, `admin` — setiap route diproteksi middleware sesuai role

**Data Security:**

* HTTPS/TLS untuk semua komunikasi
* SQL injection prevention (Laravel Eloquent / prepared statements)
* XSS prevention (output escaping via Blade)
* CSRF protection (Laravel CSRF token)
* Input validation di backend untuk semua request
* Validasi file upload menggunakan **magic bytes** (file header), bukan hanya ekstensi filename, untuk mencegah file berbahaya yang di-rename menjadi `.jpg`/`.png`/`.webp`
* Password reset token: signed token (Laravel `Password::createToken()`), expired 60 menit, one-time use. Response selalu generik ("Jika email terdaftar, link reset akan dikirim") untuk mencegah email enumeration

**API Security:**

* Rate limiting per endpoint (Laravel Throttle)
* CORS configuration yang ketat (hanya izinkan origin tertentu)
* Validasi signature/token untuk WebSocket connection

**Payment Security (Kritikal):**

* **Jangan pernah simpan data kartu kredit penuh** — gunakan Midtrans tokenization
* PCI DSS compliance
* Validasi webhook Midtrans dengan **verifikasi Signature Key** (`SHA512(order_id + status_code + gross_amount + server_key)`)
* **Idempotency Logic pada Webhook:** Backend wajib validasi apakah `order_id` sudah pernah diproses menjadi status "Paid" di database sebelum melakukan update apapun. Jika sudah, return 200 OK tanpa melakukan update ulang (mencegah duplikasi komisi dan perubahan status akibat retry webhook dari Midtrans)
* **Webhook handler wajib selalu return HTTP 200 OK** ke Midtrans terlepas dari hasil pemrosesan internal (termasuk kasus late webhook untuk booking yang sudah `cancelled` — lihat 3.1.7 & 5.1). Return status selain 200 akan membuat Midtrans retry webhook berkali-kali dan berisiko flooding.
* Transaksi Midtrans dibuat dengan parameter `expiry` **15 menit untuk semua payment method** (termasuk VA dan Minimarket), diselaraskan dengan TTL Redis lock, agar tidak ada window pembayaran yang lebih panjang dari lock meja

---

## **Payment & Commission**

### **5.1 Booking Payment Flow**

1. Customer proceed to payment setelah select meja, waktu, dan (opsional) pre-order menu
2. Backend buat record booking (status: `pending`) + record `menu_orders` pre-order jika ada (`order_type: 'pre_order'`), dan pasang Redis lock (TTL 15 menit)
3. Backend buat transaksi Midtrans dengan `item_details` mencakup harga meja **dan** setiap item menu pre-order, `expiry` di-set **15 menit** → dapat `payment_url`
4. Customer di-redirect ke Midtrans payment page
5. Customer pilih metode pembayaran (VA, e-wallet, CC, Minimarket — semua diberi window 15 menit yang sama) dan selesaikan transaksi
6. Midtrans kirim webhook POST ke `/api/payments/webhook`
7. Backend verifikasi signature key dari webhook
8. **Idempotency check:** Cek apakah `order_id` sudah diproses. Jika sudah, skip dan return 200.
9. **Cek status booking saat ini:**
   * Jika `bookings.status` masih `pending` → update `bookings.payment_status` = `paid`, `bookings.status` = `confirmed`, dan `menu_orders` pre-order terkait → `scheduled`. Hitung & simpan komisi terpisah untuk porsi meja (`table_price` × 15%) dan porsi menu (`menu_subtotal` × 10%)
   * Jika `bookings.status` sudah `cancelled` (late webhook — lihat 3.1.7 poin 9): **jangan ubah status booking**, langsung trigger refund otomatis, tandai `payments.status = 'refunded_on_arrival'`, kirim WhatsApp ke customer bahwa pembayaran diterima namun meja sudah tidak tersedia dan refund sedang diproses
10. Hapus Redis lock
11. Kirim WhatsApp notification ke customer dan owner
12. Emit WebSocket event untuk update real-time di semua client
13. **Selalu return HTTP 200 OK** ke Midtrans di akhir, apapun hasil pemrosesan di atas (lihat 4.4)

**Jika payment timeout (15 menit):**
* Redis lock expired otomatis
* Scheduled job (setiap 1 menit) scan bookings dengan `payment_status = 'pending'` dan `lock_expires_at < now()` → set status `cancelled` (termasuk `menu_orders` pre-order terkait)
* Meja kembali `available` via WebSocket event

### **5.2 Additional Order Payment Flow**

> Flow ini khusus untuk **Additional Order** (menu tambahan setelah booking confirmed). Untuk pre-order yang dipesan bersamaan dengan booking, lihat 5.1 — pre-order tidak punya transaksi Midtrans sendiri.

1. Customer submit cart dari halaman Booking Detail → backend buat record `menu_orders` (status: `pending_payment`, `order_type: 'additional'`, `booking_id` wajib terisi)
2. Backend buat transaksi Midtrans terpisah, `expiry` 15 menit
3. Customer bayar via Midtrans
4. Webhook diterima & diverifikasi (idempotency check)
5. Update `menu_orders.payment_status` = `paid`, `menu_orders.status` = `scheduled`
6. Kirim WhatsApp notification ke customer dan owner
7. Selalu return HTTP 200 OK ke Midtrans (lihat 4.4)

### **5.3 Struktur Komisi**

**Booking Commission:**
* Platform mengambil persentase dari harga booking (dikonfigurasi oleh Super Admin, default: **15%**)
* Contoh:
  * Harga booking: Rp 100.000
  * Komisi platform: Rp 15.000 (15%)
  * Cafe menerima: Rp 85.000

**Menu Order Commission:**
* Platform mengambil persentase dari total order menu (dikonfigurasi oleh Super Admin, default: **10%**)
* Contoh:
  * Total order: Rp 200.000
  * Komisi platform: Rp 20.000 (10%)
  * Cafe menerima: Rp 180.000

**Perhitungan komisi disimpan di:**
* `bookings.commission` dan `bookings.cafe_receives`
* `menu_orders.commission` dan `menu_orders.cafe_receives`

**Payout ke Owner:**
* Di MVP: Payout dilakukan secara manual oleh Super Admin ke rekening bank owner
* Jadwal payout: dikonfigurasi oleh Super Admin (misal: weekly setiap Jumat)
* Phase 2: Payout otomatis via transfer bank API

### **5.4 Refund Policy**

| Kondisi | Kelayakan Refund | Proses |
|---|---|---|
| Customer cancel ≥ 3 jam sebelum booking | **Full Refund** (booking + menu orders yang belum `preparing`) | Otomatis (CC/eWallet) atau Manual (VA/Minimarket) |
| Customer cancel < 3 jam sebelum booking | **Tidak ada refund** | Tidak diproses |
| Owner cancel booking (kapan saja, termasuk H-jam) | **Full Refund**, selalu, tanpa syarat waktu (booking + menu orders terkait) | Otomatis (CC/eWallet) atau Manual via link form (VA/Minimarket, token 7 hari) |
| Blackout date auto-cancel (overlap booking existing) | **Full Refund**, selalu | Sama seperti owner cancel |
| Reschedule ke slot lebih murah | **Tidak ada refund** atas selisih; customer tetap bayar flat reschedule fee | — |
| Reschedule ke slot lebih mahal | Customer bayar flat fee + selisih | Transaksi Midtrans baru |
| Late webhook untuk booking yang sudah `cancelled` | **Full Refund otomatis** (`refunded_on_arrival`) | Otomatis, tanpa mengubah status booking |
| Timeout 15 menit (tidak bayar) | **Tidak berlaku** | Transaksi tidak pernah selesai |
| Extend booking (dibatalkan) | **Full Refund untuk extension** | Ikuti flow refund standar |

---

## **Notifications**

### **6.1 Integration**

* Menggunakan **Twilio WhatsApp Business API**
* Semua notifikasi dikirim secara async via **Laravel Queue** (tidak blocking request utama)
* Template pesan harus disetujui oleh WhatsApp Business sebelum digunakan
* Semua notifikasi yang dikirim dicatat di tabel `notifications`

### **6.2 Notification Triggers — TO CUSTOMER**

**1. Booking Confirmation**
* **Trigger:** Payment webhook berhasil, booking status = `confirmed`
* **Template:**
  ```
  Halo [Customer Name],

  Booking Anda confirmed! 🎉

  📍 [Cafe Name]
  📅 [Date] | ⏰ [Start Time] - [End Time]
  🪑 [Table Name] - [Capacity] orang
  💰 Rp [Price]

  Referensi: [Booking Reference]

  Lihat detail booking di: [App URL]/bookings/[id]

  Terima kasih sudah menggunakan CafeNow!
  ```

**2. 2-Hour Reminder**
* **Trigger:** Scheduled job — 2 jam sebelum `start_time` booking
* **Guard:** Jika saat booking dibuat, waktu pengiriman reminder ini (`start_time` − 2 jam) sudah terlewati, reminder **di-skip** — tidak dikirim mendadak atau telat
* **Template:**
  ```
  Halo [Customer Name],

  Pengingat: Booking Anda dimulai dalam 2 jam! 🕐

  📍 [Cafe Name] — [Cafe Address]
  ⏰ [Start Time]

  Referensi: [Booking Reference]

  Jangan sampai ketinggalan!
  ```

**3. 30-Minute Reminder**
* **Trigger:** Scheduled job — 30 menit sebelum `start_time` booking
* **Guard:** Sama seperti 2-Hour Reminder — jika waktu pengiriman sudah terlewati saat booking dibuat, reminder di-skip
* **Template:**
  ```
  Halo [Customer Name],

  Booking Anda dimulai dalam 30 menit! ⏰

  📍 [Cafe Name]
  ⏰ [Start Time]

  Referensi: [Booking Reference]

  Segera menuju ke lokasi!
  ```

**4. Menu Order Confirmation**
* **Trigger:** Menu order payment webhook berhasil
* **Template:**
  ```
  Halo [Customer Name],

  Pesanan menu Anda confirmed! ✅

  📍 [Cafe Name]

  Items:
  - [Item 1] x[Qty] — Rp [Price]
  - [Item 2] x[Qty] — Rp [Price]

  Total: Rp [Total Price]
  Referensi: [Order Reference]

  Pesanan akan disiapkan sesuai jadwal booking Anda.
  ```

**5. Booking Cancellation Confirmation**
* **Trigger:** Customer berhasil cancel booking
* **Template:**
  ```
  Halo [Customer Name],

  Booking Anda telah dibatalkan. ❌

  📍 [Cafe Name]
  📅 [Date] | ⏰ [Start Time]

  Referensi: [Booking Reference]

  Refund akan diproses ke metode pembayaran asal Anda.
  Estimasi: 1-3 hari kerja (CC/eWallet) atau 3×24 jam kerja (VA/Minimarket).

  Terima kasih!
  ```

**6. Refund Status Update (Manual Refund)**
* **Trigger:** Super Admin update status `refund_requests` menjadi `processed` atau `rejected`
* **Template (Processed):**
  ```
  Halo [Customer Name],

  Refund Anda sebesar Rp [Amount] telah dikirim! 💸

  Bank: [Bank Name]
  No. Rekening: [Account Number]
  a.n.: [Account Holder]

  Mohon cek saldo Anda dalam 1-3 hari kerja.
  Referensi Booking: [Booking Reference]
  ```
* **Template (Rejected):**
  ```
  Halo [Customer Name],

  Mohon maaf, permintaan refund Anda tidak dapat diproses.

  Alasan: [Admin Reason]
  Referensi Booking: [Booking Reference]

  Untuk bantuan lebih lanjut, hubungi support kami.
  ```

**7. Booking Dibatalkan oleh Cafe (Owner Cancellation / Blackout Date)**
* **Trigger:** Owner cancel booking secara manual, atau sistem auto-cancel akibat blackout date baru yang overlap
* **Template:**
  ```
  Halo [Customer Name],

  Mohon maaf, booking Anda dibatalkan oleh pihak cafe. 🙏

  📍 [Cafe Name]
  📅 [Date] | ⏰ [Start Time]
  Alasan: [Cancellation Reason]

  Referensi: [Booking Reference]

  Refund penuh (termasuk menu order jika ada) sedang diproses ke metode
  pembayaran Anda.
  ```
* **Jika payment method VA/Minimarket**, sertakan baris tambahan dengan link form refund:
  ```
  Untuk mempercepat proses refund, mohon isi data rekening Anda di:
  [App URL]/refund/[signed_token] (link berlaku 7 hari)
  ```

**8. Pembayaran Diterima, Meja Tidak Tersedia (Late Webhook)**
* **Trigger:** Webhook sukses diterima Midtrans untuk booking yang sudah `cancelled` (lihat 3.1.7 & 5.1)
* **Template:**
  ```
  Halo [Customer Name],

  Pembayaran Anda telah kami terima, namun meja yang Anda pilih sudah
  tidak tersedia karena melewati batas waktu pembayaran.

  💰 Rp [Amount]
  Referensi: [Booking Reference]

  Refund penuh sedang diproses secara otomatis ke metode pembayaran Anda.
  Mohon maaf atas ketidaknyamanannya.
  ```

### **6.3 Notification Triggers — TO CAFE OWNER**

**1. New Booking Alert**
* **Trigger:** Booking berhasil dikonfirmasi (payment success) — REAL-TIME
* **Template:**
  ```
  📢 Booking Baru!

  👤 [Customer Name] | 📞 [Phone]
  🪑 [Table Name] — [Capacity] orang
  📅 [Date] | ⏰ [Start Time] - [End Time]
  💰 Rp [Price] (Cafe menerima: Rp [Cafe Receives])

  Referensi: [Booking Reference]
  Catatan customer: [Customer Notes / "-"]

  Status: Confirmed
  ```
  > Booking selalu auto-confirmed setelah payment berhasil — tidak ada langkah approval owner

**2. New Menu Order Alert**
* **Trigger:** Menu order payment berhasil — REAL-TIME
* **Template:**
  ```
  📢 Pesanan Menu Baru!

  👤 [Customer Name]
  📍 Booking: [Booking Reference]

  Items:
  - [Item 1] x[Qty]
  - [Item 2] x[Qty]

  Total: Rp [Price]
  Referensi Order: [Order Reference]
  ```

**3. Booking Cancellation Alert**
* **Trigger:** Customer cancel booking (bukan owner sendiri yang cancel — owner tidak perlu notifikasi untuk aksi yang mereka lakukan sendiri)
* **Template:**
  ```
  ❌ Booking Dibatalkan

  👤 [Customer Name]
  🪑 [Table Name]
  📅 [Date] | ⏰ [Start Time]

  Referensi: [Booking Reference]

  Meja kini tersedia untuk booking lain.
  ```

**4. Daily Morning Summary**
* **Trigger:** Scheduled job — setiap pagi jam 08:00 **WIB**
* **Template:**
  ```
  📊 Ringkasan Hari Ini — [Cafe Name]

  Booking hari ini: [X] reservasi
  Tamu hari ini: ~[Y] orang
  Pending orders: [Z] pesanan menu

  Lihat detail: [App URL]/owner/dashboard
  ```

---

## **Database Schema (High Level)**

### **7.1 Core Tables**

**users**
* `id`, `email`, `password`, `phone`, `is_phone_verified` (boolean, default: false), `full_name`, `role` (enum: customer/owner/admin), `profile_pic`, `deleted_at` (timestamp, nullable — soft delete), `created_at`, `updated_at`

**cafes**
* `id`, `owner_id` (FK → users), `name`, `description`, `category`, `address`, `city`, `latitude`, `longitude`, `facilities` (JSON), `operational_hours` (JSON), `blackout_dates` (JSON), `approval_status` (enum: pending/active/suspended/rejected), `rejection_reason` (nullable), `submission_count` (integer, default: 1 — bertambah tiap resubmission, maks 3), `deleted_at` (timestamp, nullable — soft delete), `created_at`, `updated_at`

**tables**
* `id`, `cafe_id` (FK → cafes), `name`, `capacity`, `table_type`, `description`, `photo`, `is_active` (boolean, default: true), `deleted_at` (timestamp, nullable — soft delete), `created_at`, `updated_at`

**booking_rules**
* `id`, `table_id` (FK → tables) — *(catatan: field `cafe_id` sengaja tidak ada di sini karena redundant dengan `tables.cafe_id`; query yang butuh `cafe_id` menggunakan JOIN via `tables`)*
* `rule_type` (enum: 'fixed' / 'custom')
* *(untuk fixed)* `duration_minutes`, `price`
* *(untuk custom)* `min_duration_minutes`, `max_duration_minutes`, `base_price_per_hour`, `surge_rules` (JSON — lihat format di 3.2.5)
* `max_bookings_per_slot`, `is_active` (boolean)
* `reschedule_fee` (decimal, default: 5000 — flat fee reschedule per cafe, lihat 3.2.5)
* `created_at`, `updated_at`

**bookings**
* `id`, `cafe_id`, `table_id`, `customer_id`, `booking_rule_id`
* `booking_date`, `start_time`, `end_time`, `duration_minutes`, `guest_count`
* `status` (enum: pending / confirmed / completed / cancelled / no_show) — `pending` berarti menunggu pembayaran saja, bukan menunggu keputusan owner (lihat 3.2.6)
* `table_price` (decimal — harga meja saja)
* `menu_subtotal` (decimal, default: 0 — total harga pre-order menu, jika ada)
* `total_price` (= `table_price` + `menu_subtotal`), `commission`, `cafe_receives` — `commission` dihitung terpisah per komponen: `table_price` × commission rate booking (15%) + `menu_subtotal` × commission rate menu order (10%)
* `payment_status` (enum: unpaid / paid / refunded / partially_refunded)
* `payment_id` (FK → payments, nullable)
* `booking_reference` (unique string, format: BKG-YYYYMMDD-XXXXX)
* `lock_expires_at` (timestamp, nullable — diisi saat Redis lock dipasang)
* `check_in_time` (timestamp, nullable)
* `check_out_time` (timestamp, nullable — diisi otomatis via scheduled job saat `end_time` tercapai, atau manual override oleh owner, lihat 3.2.6)
* `extend_count` (integer, default: 0 — hanya di-increment setelah payment extension dikonfirmasi via webhook, lihat 3.1.10)
* `cancelled_by` (enum: customer / owner / system, nullable — menentukan aturan refund yang berlaku)
* `cancellation_reason` (text, nullable — wajib diisi jika `cancelled_by = owner`)
* `customer_notes` (text, nullable)
* `created_at`, `updated_at`

**menu_items**
* `id`, `cafe_id`, `name`, `description`, `category`, `price`, `photo`, `availability_status` (enum: available / out_of_stock), `allergen_notes` (nullable), `deleted_at` (timestamp, nullable — soft delete), `created_at`, `updated_at`

**menu_orders**
* `id`, `cafe_id`, `customer_id`, `booking_id` (FK → bookings, **NOT NULL** — setiap menu order wajib terhubung ke booking, karena tidak ada skenario order menu tanpa booking meja)
* `order_type` (enum: pre_order / additional — `pre_order` dibuat bersamaan dengan booking flow, `additional` dibuat setelah booking confirmed, lihat 3.1.9)
* `order_reference` (unique string, format: ORD-YYYYMMDD-XXXXX)
* `status` (enum: pending_payment / scheduled / preparing / ready / completed / cancelled)
* `total_price`, `commission`, `cafe_receives`
* `payment_status` (enum: unpaid / paid / refunded) — untuk `order_type: pre_order`, field ini mengikuti `payment_status` booking induknya (dibayar dalam 1 transaksi yang sama)
* `payment_id` (FK → payments, nullable — untuk `pre_order` merujuk ke payment record booking induknya; untuk `additional` merujuk ke payment record-nya sendiri)
* `prepare_at` (timestamp, nullable — waktu scheduled untuk mulai preparing, diisi saat order dibuat)
* `special_notes` (text, nullable)
* `created_at`, `updated_at`

**menu_order_items**
* `id`, `menu_order_id` (FK → menu_orders), `menu_item_id` (FK → menu_items), `quantity`, `unit_price`, `subtotal`

**payments**
* `id`, `payable_type` (enum: booking / menu_order) — `booking` mencakup transaksi gabungan meja + pre-order menu (jika ada); `menu_order` khusus untuk additional order, `payable_id`
* `amount`, `commission`, `status` (enum: pending / success / failed / refunded / refunded_on_arrival — status terakhir untuk kasus late webhook di booking yang sudah `cancelled`, lihat 5.1)
* `payment_method` (nullable — diisi setelah payment method dipilih)
* `gateway_reference` (Midtrans `transaction_id`, nullable)
* `midtrans_order_id` (unique — untuk idempotency check webhook)
* `created_at`, `updated_at`

**refund_requests** *(untuk manual refund VA/Minimarket)*
* `id`, `booking_id` (FK → bookings), `customer_id` (FK → users)
* `amount`, `bank_name` (nullable — kosong sampai customer isi form), `account_number` (nullable), `account_holder_name` (nullable)
* `status` (enum: pending / processed / rejected)
* `initiated_by` (enum: customer / owner / system — sumber pembatalan yang memicu refund request ini; tampil di admin refund queue, lihat 3.3.6)
* `form_token` (string, nullable — signed token untuk link form refund yang dikirim ke customer, expired 7 hari, khusus untuk kasus owner/system cancellation)
* `admin_notes` (text, nullable)
* `processed_at` (timestamp, nullable)
* `created_at`, `updated_at`

**notifications**
* `id`, `recipient_id` (FK → users), `recipient_type` (enum: customer / owner)
* `subject`, `message`, `notification_type` (e.g., booking_confirmed, order_placed, refund_processed)
* `related_entity_type` (e.g., booking / menu_order), `related_entity_id`
* `sent_at` (timestamp), `delivery_status` (enum: sent / failed)
* `created_at`

**favorites**
* `id`, `customer_id` (FK → users), `cafe_id` (FK → cafes), `created_at`
* Unique constraint: `(customer_id, cafe_id)`

**search_history**
* `id`, `customer_id` (FK → users), `cafe_id` (FK → cafes), `viewed_at`
* Index pada `(customer_id, viewed_at DESC)` untuk query 20 cafe terakhir dilihat

**commission_rules**
* `id`, `commission_type` (enum: booking / menu_order), `percentage` (decimal), `set_by_admin_id` (FK → users), `active_from` (timestamp), `active_to` (timestamp, nullable), `created_at`, `updated_at`

**admin_audit_logs**
* `id`, `admin_id` (FK → users)
* `action` (e.g., `approve_cafe`, `reject_cafe`, `process_refund`, `reject_refund`, `suspend_user`, `update_commission`, `add_featured_cafe`, `remove_featured_cafe`)
* `entity_type` (e.g., `cafe`, `booking`, `refund_request`, `user`, `featured_cafe`), `entity_id`
* `before_value` (JSON, nullable), `after_value` (JSON, nullable)
* `ip_address`, `created_at`

**featured_cafes**
* `id`, `cafe_id` (FK → cafes), `display_order` (integer)
* `active_from` (timestamp), `active_to` (timestamp, nullable — null berarti featured tanpa batas waktu)
* `created_by` (FK → users, admin yang menambahkan), `created_at`, `updated_at`

---

## **API Endpoints (High Level)**

### **8.1 Authentication Endpoints**

```
POST   /api/auth/register              - Customer registration
POST   /api/auth/login                 - Customer login
POST   /api/auth/social-login          - Login via Google/Facebook
POST   /api/auth/logout                - Logout
POST   /api/auth/refresh-token         - Refresh JWT/session token
POST   /api/auth/verify-otp            - Verifikasi OTP nomor telepon
POST   /api/auth/resend-otp            - Resend OTP (rate-limited: 60 detik)
POST   /api/auth/forgot-password       - Request link reset password (email)
POST   /api/auth/reset-password        - Reset password via token
GET    /api/customer/profile           - Get profil customer
PUT    /api/customer/profile           - Update profil customer

POST   /api/owner/register             - Owner registration
POST   /api/owner/login                - Owner login
POST   /api/owner/forgot-password      - Request link reset password (email)
POST   /api/owner/reset-password       - Reset password via token
GET    /api/owner/profile              - Get profil owner
PUT    /api/owner/profile              - Update profil owner

POST   /api/admin/login                - Super Admin login
```

### **8.2 Cafe Endpoints**

```
GET    /api/cafes                      - List cafes (dengan filter, search, sorting)
GET    /api/cafes/{id}                 - Get detail cafe
GET    /api/cafes/{id}/availability    - Get ketersediaan 7 hari ke depan
POST   /api/owner/cafes                - Buat cafe baru (owner)
PUT    /api/owner/cafes/{id}           - Update info cafe
POST   /api/owner/cafes/{id}/hours     - Set jam operasional
POST   /api/owner/cafes/{id}/blackout  - Set blackout dates
POST   /api/owner/cafes/{id}/photos    - Upload foto cafe (multipart/form-data)
DELETE /api/owner/cafes/{id}/photos/{photo_id} - Hapus foto cafe
```

### **8.3 Table Endpoints**

```
GET    /api/cafes/{cafe_id}/tables          - List meja suatu cafe
GET    /api/cafes/{cafe_id}/tables/{id}/slots - Slot waktu & ketersediaan suatu meja
POST   /api/owner/tables                    - Buat meja baru
PUT    /api/owner/tables/{id}               - Update info meja
DELETE /api/owner/tables/{id}               - Hapus meja (soft delete, jika tidak ada booking aktif)
POST   /api/owner/tables/{id}/booking-rules - Set/update pricing rules meja
```

### **8.4 Booking Endpoints**

```
GET    /api/bookings/availability          - Cek ketersediaan (date, table_id, start_time, duration)
POST   /api/bookings                       - Buat booking (trigger Redis Lock)
GET    /api/bookings/{id}                  - Get detail booking
GET    /api/customer/bookings              - List booking milik customer (dengan filter)
GET    /api/owner/bookings                 - List booking di cafe owner (dengan filter)
PUT    /api/bookings/{id}/cancel           - Cancel booking oleh customer
PUT    /api/bookings/{id}/reschedule       - Reschedule booking
POST   /api/bookings/{id}/checkin          - Customer check-in
POST   /api/bookings/{id}/extend           - Extend durasi booking (trigger Redis Lock)
POST   /api/bookings/{id}/refund-request   - Customer submit data rekening untuk refund manual
PUT    /api/owner/bookings/{id}/cancel     - Owner cancel booking (wajib sertakan reason di body; kapan saja, termasuk H-jam)
PUT    /api/owner/bookings/{id}/no-show    - Owner tandai no-show
PUT    /api/owner/bookings/{id}/checkout   - Owner tandai checkout manual (catat check_out_time)
```

### **8.5 Menu Endpoints**

```
GET    /api/cafes/{cafe_id}/menus          - List menu cafe (untuk customer)
POST   /api/owner/menus                    - Buat menu item baru
PUT    /api/owner/menus/{id}               - Update menu item
DELETE /api/owner/menus/{id}               - Hapus menu item
PUT    /api/owner/menus/{id}/toggle        - Toggle ketersediaan menu item
PUT    /api/owner/menus/bulk-toggle        - Bulk toggle ketersediaan per kategori
```

### **8.6 Order Endpoints**

```
POST   /api/orders                         - Buat menu order (submit cart)
GET    /api/orders/{id}                    - Get detail order
GET    /api/customer/orders                - List orders milik customer
GET    /api/owner/orders                   - List orders di cafe owner
PUT    /api/owner/orders/{id}/status       - Update status order (preparing/ready/completed)
```

### **8.7 Payment Endpoints**

```
POST   /api/payments                       - Inisiasi payment → dapat payment_url Midtrans
POST   /api/payments/webhook               - Midtrans webhook (konfirmasi payment) [PUBLIC, no auth]
GET    /api/payments/{id}/status           - Cek status payment
```

### **8.8 Favorites & Recently Viewed**

```
POST   /api/favorites                      - Tambah cafe ke favorites
DELETE /api/favorites/{cafe_id}            - Hapus cafe dari favorites
GET    /api/customer/favorites             - List favorites customer
GET    /api/customer/search-history        - Get recently viewed cafe (20 terbaru)
DELETE /api/customer/search-history        - Clear semua recently viewed
DELETE /api/customer/search-history/{cafe_id} - Hapus satu item recently viewed
```

### **8.9 Analytics Endpoints**

```
GET    /api/owner/analytics/dashboard      - Dashboard stats owner
GET    /api/owner/analytics/revenue        - Revenue analytics (dengan date range)
GET    /api/owner/analytics/bookings       - Booking trends & occupancy
GET    /api/owner/analytics/menus          - Menu performance (top items)
GET    /api/admin/analytics/platform       - Platform-wide stats (admin only)
GET    /api/admin/analytics/commission     - Laporan komisi (admin only)
```

### **8.10 Super Admin Endpoints**

```
GET    /api/admin/cafe-registrations                    - List pending cafe approvals
POST   /api/admin/cafe-registrations/{id}/approve       - Approve cafe
POST   /api/admin/cafe-registrations/{id}/reject        - Reject cafe (dengan alasan)
GET    /api/admin/cafes                                 - List semua cafe
PUT    /api/admin/cafes/{id}/suspend                    - Suspend cafe
GET    /api/admin/commission-rules                      - Get commission rules
PUT    /api/admin/commission-rules                      - Update commission rules
GET    /api/admin/bookings                              - View semua booking
GET    /api/admin/orders                                - View semua order
GET    /api/admin/refunds                               - List pending refund requests
POST   /api/admin/refunds/{id}/process                  - Approve & proses refund manual
POST   /api/admin/refunds/{id}/reject                   - Reject refund request (dengan alasan)

GET    /api/admin/users                                 - List semua customer
PUT    /api/admin/users/{id}/suspend                    - Suspend/deactivate customer

GET    /api/admin/featured-cafes                        - List featured cafes
POST   /api/admin/featured-cafes                        - Tambah cafe ke featured
PUT    /api/admin/featured-cafes/{id}                   - Update display_order/periode
DELETE /api/admin/featured-cafes/{id}                   - Hapus dari featured
```

---

## **Timeline & Milestones**

### **9.1 Development Phases**

**Phase 1: MVP (8–12 Minggu)**

* User authentication (customer, owner, admin) + OTP verifikasi
* Cafe browsing & search
* Table management & availability system (real-time via WebSocket)
* Booking flow dengan Midtrans payment + Redis lock
* Menu management & ordering
* WhatsApp notifications via Twilio
* Extend booking, check-in, refund manual
* Basic analytics untuk owner & admin
* Deployment & UAT

**Phase 2: Enhancement (4–6 Minggu)**

* Review & Rating system
* Promo code system
* Improved analytics & report export (PDF/Excel)
* Payout otomatis ke rekening owner
* Geolokasi untuk filter "Distance"
* Two-factor auth untuk Super Admin

**Phase 3: Advanced Features (Ongoing)**

* Mobile application (iOS & Android)
* In-app messaging antara customer & owner
* Loyalty program & poin reward
* ML-based recommendation ("Cafe untukmu")
* Multi-language support

### **9.2 Key Milestones**

| Milestone | Minggu | Deliverables |
|---|---|---|
| Setup & Architecture | 1–2 | Database design, API structure, project setup, environment konfigurasi |
| Authentication & User Mgmt | 3–4 | Login/register customer & owner, OTP, RBAC, admin login |
| Cafe & Table Management | 5–6 | Cafe CRUD, table management, jam operasional, blackout dates |
| Booking System | 7–8 | Availability logic, Redis lock, WebSocket real-time, booking flow |
| Payment Integration | 8–9 | Midtrans integration, webhook + idempotency, refund flow |
| Menu & Orders | 9–10 | Menu CRUD, order flow, status management, scheduled preparing trigger |
| Check-in & Extend Booking | 10 | Customer check-in, extend booking flow, analytics owner |
| Notifications | 10–11 | Twilio WhatsApp integration, semua template notifikasi, scheduled jobs |
| Super Admin Features | 11 | Dashboard admin, approval, commission, manual refund management |
| Testing & Bug Fixes | 11–12 | UAT, bug fixes, performance optimization |
| Deployment & Launch | 12–13 | Production deployment, monitoring setup, soft launch |

---

## **Appendix**

### **A. Glossary**

| Term | Definisi |
|---|---|
| Booking | Reservasi meja di cafe untuk waktu tertentu yang sudah dikonfirmasi dengan pembayaran |
| Surge Pricing | Harga yang lebih tinggi pada peak hours atau hari tertentu |
| Blackout Dates | Tanggal spesifik dimana cafe tidak menerima booking sama sekali |
| Commission | Persentase yang dipotong platform dari setiap transaksi booking/order |
| GMV | Gross Merchandise Value — total nilai seluruh transaksi sebelum potongan komisi |
| Webhook | HTTP callback dari Midtrans untuk konfirmasi status pembayaran |
| Redis Lock | Mekanisme penguncian sementara (TTL 15 menit) untuk mencegah double-booking |
| Idempotency | Properti dimana mengirim request yang sama berkali-kali menghasilkan efek yang sama (tidak ada duplikasi) |
| WebSocket | Protokol komunikasi dua arah untuk update real-time tanpa perlu refresh halaman |
| OTP | One Time Password — kode verifikasi 6 digit yang dikirim via WhatsApp untuk verifikasi nomor telepon |
| No-show | Customer yang tidak datang ke cafe sesuai waktu booking |
| Extend Booking | Perpanjangan durasi booking yang sudah aktif, dengan pembayaran tambahan |
| Pre-Order | Menu yang dipesan bersamaan dengan booking, dalam satu transaksi Midtrans yang sama |
| Additional Order | Menu yang dipesan setelah booking confirmed, sebagai transaksi Midtrans terpisah |
| Owner Cancellation | Pembatalan booking oleh pihak cafe (kapan saja), selalu disertai full refund ke customer |
| Reschedule | Edit jadwal pada booking yang sudah ada (bukan cancel + booking baru), dikenakan flat fee + selisih surge jika ada |
| Featured Cafe | Cafe yang dikurasi Super Admin untuk tampil di section rekomendasi home page |

### **B. Performance Considerations**

* Cache data cafe (nama, foto, fasilitas) di Redis — invalidate saat owner update
* Lazy loading untuk gambar gallery
* CDN untuk semua static assets & foto yang di-upload
* Database indexing pada kolom yang sering diquery (lihat 4.3)
* Rate limiting pada semua public API endpoint
* WebSocket channel per-cafe-per-tanggal untuk minimasi broadcast scope

### **C. Design Considerations**

* **Mobile-responsive:** Prioritas utama — web app harus nyaman digunakan di mobile browser
* **Fast loading:** Target < 2 detik untuk halaman utama (gunakan caching & CDN)
* **Intuitive navigation:** Alur booking harus selesai dalam ≤ 5 klik
* **Clear CTA:** Tombol aksi utama (Book Now, Pay, Check In) harus prominent & mudah ditemukan

### **D. Legal & Compliance**

* Terms of Service (ToS) yang jelas untuk customer dan owner
* Privacy Policy sesuai regulasi perlindungan data Indonesia (UU PDP)
* PCI DSS compliance untuk keamanan data pembayaran
* Kebijakan cancellation & refund harus ditampilkan jelas sebelum customer checkout

### **E. Known Open Issues (Belum Diselesaikan)**

Enam isu minor berikut ditemukan pada audit PRD namun **belum dibahas/diputuskan** hingga revisi 1.3 ini. Dicatat di sini agar tidak hilang dan bisa didiskusikan sebelum implementasi fitur terkait:

| # | Isu | Lokasi Terkait |
|---|---|---|
| OPEN-01 | `commission_rules` tidak punya unique constraint yang memastikan hanya satu rule aktif per `commission_type` pada satu waktu — berpotensi ambiguitas jika ada dua rule yang `active_from`-nya overlap | §7.1 — tabel `commission_rules` |
| OPEN-02 | Extend booking pada meja dengan Fixed-Time Slots belum didefinisikan — meja fixed-time tidak punya `max_duration`, jadi belum jelas apakah tombol "Extend" berlaku untuk tipe meja ini | §3.1.10 — Extend Booking |
| OPEN-03 | Tidak ada database-level unique constraint (defense-in-depth) untuk mencegah dua booking `confirmed` di `(table_id, booking_date, start_time)` yang sama — saat ini hanya mengandalkan Redis lock | §7.1 — tabel `bookings` |
| OPEN-04 | Endpoint `POST /api/owner/cafes/{id}/hours` menggunakan method `POST` padahal ini operasi update, bukan create — sebaiknya `PUT`/`PATCH` mengikuti REST convention | §8.2 |
| OPEN-05 | `PUT /api/owner/menus/bulk-toggle` berpotensi konflik routing dengan `PUT /api/owner/menus/{id}` jika router menginterpretasi "bulk-toggle" sebagai `{id}` | §8.5 |
| OPEN-06 | `notifications.delivery_status` hanya punya enum `sent`/`failed`, terlalu sederhana untuk status WhatsApp yang sebenarnya lebih granular (`queued`, `delivered`, `read`, dll) — berdampak ke kemampuan troubleshooting & SLA monitoring | §7.1 — tabel `notifications` |

---

**Document Version:** 1.3
**Based on:** v1.2 (2026-06-08) + Audit Round 2 & Revisions (30 temuan: 5 Critical + 11 Major selesai, 8 dari 14 Minor selesai)
**Last Updated:** 2026-07-10
**Status:** Final — Ready for Development (6 isu minor non-blocking tercatat di Appendix E)
**Prepared By:** Product Team & Technical Mentor