# Frontend React — Implementation Plan

> **Target**: Semua halaman bisnis untuk Customer, Owner, dan Admin.
> **Stack**: Inertia 3 + React 19 + TypeScript + Tailwind 4 + shadcn/ui
> **Backend**: Semua API endpoint sudah siap (62 tests pass)

---

## 📦 Yang Sudah Ada

| Area | Status |
|------|--------|
| Auth pages (login, register, forgot/reset password, 2FA) | ✅ 7 pages |
| Settings pages (profile, security, appearance) | ✅ 3 pages |
| Layout (sidebar shell, nav, breadcrumbs) | ✅ `app-layout.tsx` |
| UI components (~28) | ✅ shadcn/ui: sidebar, dialogs, buttons, dll |
| Wayfinder routes | ✅ Hanya auth — perlu tambah routes bisnis |
| `routes/web.php` | ✅ Hanya `/` + `/dashboard` — perlu tambah |

---

## 🏗️ Fase 1: Customer Pages (Prioritas Tertinggi)

### Routes Web Baru
```
GET  /cafes                     → CafeController@index    (inertia)
GET  /cafes/{cafe}              → CafeController@show     (inertia)
GET  /cafes/{cafe}/book         → BookingController@create (inertia)
POST /cafes/{cafe}/book         → BookingController@store  (API, existing)
GET  /bookings                  → CustomerBookingController@index (inertia)
GET  /bookings/{booking}        → BookingController@show   (inertia)
GET  /orders                    → CustomerOrderController@index (inertia)
GET  /payment/{booking}/confirm → PaymentController@showConfirm (inertia)
```

### Halaman

| Halaman | File | API Endpoint (existing) |
|---------|------|------------------------|
| **Browse Cafes** — search, filter city, featured, geolocation sort | `pages/cafes/index.tsx` | `GET /api/cafes` |
| **Cafe Detail** — info cafe, daftar menu, pilih meja + waktu | `pages/cafes/[id].tsx` | `GET /api/cafes/{cafe}`, `GET /api/tables?cafe_id=`, `GET /api/bookings/availability` |
| **Booking Wizard** — pilih meja, date, time, guest count, pre-order menu | `pages/cafes/[id]/book.tsx` | `POST /api/bookings` + midtrans initiate |
| **My Bookings** — daftar booking + status | `pages/bookings/index.tsx` | `GET /api/customer/bookings` |
| **Booking Detail** — detail, menu orders, QR check-in, cancel, extend | `pages/bookings/[id].tsx` | `GET /api/bookings/{booking}`, `PUT /api/bookings/{booking}/cancel`, dll |
| **My Orders** — daftar order (dine-in + takeaway) | `pages/orders/index.tsx` | `GET /api/customer/orders` |
| **Payment Confirmation** — handle Snap redirect, tampilkan status | `pages/payment/[booking]/confirm.tsx` | `POST /api/payments/initiate`, `GET /api/payments/status` |
| **Favorites** — daftar cafe favorit | `pages/favorites/index.tsx` | `GET /api/favorites` |

### Komponen Baru (shared)

| Komponen | Fungsi |
|----------|--------|
| `components/cafe-card.tsx` | Card cafe di grid |
| `components/cafe-search.tsx` | Search bar + filter city |
| `components/table-picker.tsx` | Pilih meja + slot waktu |
| `components/booking-timeline.tsx` | Visual status booking |
| `components/menu-picker.tsx` | Pilih menu + quantity |
| `components/order-summary.tsx` | Ringkasan pesanan + harga |

---

## 🏪 Fase 2: Owner Pages

### Routes Web Baru
```
GET  /owner/dashboard             → OwnerDashboardController@index (inertia)
GET  /owner/cafes                 → OwnerCafeController@index      (inertia)
GET  /owner/cafes/create          → OwnerCafeController@create     (inertia)
POST /owner/cafes                 → OwnerCafeController@store      (API, existing)
GET  /owner/cafes/{cafe}/edit     → OwnerCafeController@edit       (inertia)
PUT  /owner/cafes/{cafe}          → OwnerCafeController@update     (API, existing)
GET  /owner/cafes/{cafe}/menus    → OwnerMenuController@index      (inertia)
GET  /owner/cafes/{cafe}/tables   → OwnerTableController@index     (inertia)
GET  /owner/bookings              → OwnerBookingController@index   (inertia)
GET  /owner/orders                → OwnerOrderController@index     (inertia)
GET  /owner/analytics             → OwnerAnalyticsController@index (inertia)
```

### Halaman

| Halaman | File |
|---------|------|
| **Owner Dashboard** — ringkasan booking hari ini, pendapatan | `pages/owner/dashboard.tsx` |
| **Cafe List** — daftar cafe milik owner | `pages/owner/cafes/index.tsx` |
| **Cafe Form** — create/edit cafe | `pages/owner/cafes/form.tsx` |
| **Menu Management** — daftar kategori + item, CRUD | `pages/owner/cafes/[id]/menus.tsx` |
| **Table Management** — daftar meja + booking rules | `pages/owner/cafes/[id]/tables.tsx` |
| **Owner Bookings** — daftar booking + actions (check-in, checkout, no-show, cancel) | `pages/owner/bookings/index.tsx` |
| **Owner Orders** — daftar order + update status | `pages/owner/orders/index.tsx` |
| **Analytics** — grafik booking, pendapatan, menu populer | `pages/owner/analytics.tsx` |

---

## 🛡️ Fase 3: Admin Pages

### Routes Web Baru
```
GET  /admin/dashboard              → AdminDashboardController@index (inertia)
GET  /admin/cafes                  → AdminCafeController@index      (inertia)
GET  /admin/registrations          → AdminRegistrationController@index (inertia)
POST /admin/registrations/{cafe}/approve → AdminRegistrationController@approve (API)
POST /admin/registrations/{cafe}/reject  → AdminRegistrationController@reject (API)
GET  /admin/refunds                → AdminRefundController@index    (inertia)
POST /admin/refunds/{refund}/process → AdminRefundController@process (API)
GET  /admin/users                  → AdminUserController@index      (inertia)
GET  /admin/commissions            → AdminCommissionController@index (inertia)
PUT  /admin/commissions            → AdminCommissionController@update (API)
```

### Halaman

| Halaman | File |
|---------|------|
| **Admin Dashboard** — ringkasan platform (total cafe, users, revenue) | `pages/admin/dashboard.tsx` |
| **Cafe List (Admin)** — semua cafe, filter status | `pages/admin/cafes/index.tsx` |
| **Registration Approvals** — daftar pending registration + approve/reject | `pages/admin/registrations.tsx` |
| **Refund Requests** — daftar refund + proses | `pages/admin/refunds.tsx` |
| **User Management** — daftar users | `pages/admin/users.tsx` |
| **Commission Settings** — lihat/ubah komisi | `pages/admin/commissions.tsx` |

---

## 🧩 Dependencies Baru

| Package | Untuk |
|---------|-------|
| `laravel-echo` + `pusher-js` | Subscribe Reverb channel real-time availability |
| (none others) | Gunakan fetch API langsung — no axios needed (Inertia punya `router` built-in) |

---

## 📋 Dependency & Urutan

```
Fase 1 (Customer) ──┬── Cafe Browse ──┬── Cafe Detail ──┬── Booking Wizard ──┬── Payment
                     │                 │                  │                   │
                     │                 │                  ├── My Bookings ────┘
                     │                 │                  └── My Orders
                     │                 └── Favorites
                     │
Fase 2 (Owner) ──────┼── Dashboard ──┬── Cafe Mgmt ──┬── Menus
                     │               │                ├── Tables
                     │               ├── Bookings
                     │               ├── Orders
                     │               └── Analytics
                     │
Fase 3 (Admin) ──────┴── Dashboard ──┬── Registrations
                                     ├── Refunds
                                     ├── Users
                                     └── Commissions
```

---

## ⏱️ Estimasi

| Fase | Pages | Komponen Baru | Estimasi |
|------|-------|---------------|----------|
| Fase 1: Customer | 8 halaman | ~6 komponen | ~4-5 jam |
| Fase 2: Owner | 8 halaman | ~4 komponen | ~3-4 jam |
| Fase 3: Admin | 6 halaman | ~2 komponen | ~2-3 jam |
| **Total** | **22 halaman** | **~12 komponen** | **~9-12 jam** |

---

## Catatan

1. **Gunakan Inertia form helper** (`useForm`, `router.post`) — konsisten dengan auth pages yang sudah ada
2. **API call via Inertia** untuk halaman → `router.visit()`, `router.post()`. Untuk polling real-time → fetch langsung
3. **Wayfinder routes** perlu regenerate setelah tambah routes web (`php artisan wayfinder:generate`)
4. **shadcn/ui** sudah terinstall — tambah komponen baru via `npx shadcn add` jika perlu (dialog, table, dll)
5. **Tailwind 4** — jangan tambah CSS manual, pakai utility classes seperti existing pages

---

*Dibuat: 20 July 2026*
