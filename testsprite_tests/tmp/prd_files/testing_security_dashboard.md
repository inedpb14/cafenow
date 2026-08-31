# Security Testing Plan — Customer Dashboard (Agent Browser)

Semua skenario dirancang untuk dieksekusi oleh **agent browser** (Playwright/Puppeteer).
API calls dilakukan via `window.fetch()` langsung dari halaman web.

---

## 1. Authentication & Authorization

### 1.1 Direct URL Access Without Login

| Langkah | Action |
|---------|--------|
| 1 | Clear all cookies / new incognito session |
| 2 | Navigate to `GET /customer/dashboard` |
| 3 | Assert: redirect ke `/login` (cek URL) |
| 4 | Assert: **tidak** ada content dashboard yang tampil |
| 5 | Ulangi untuk: `/customer/bookings`, `/customer/bookings/1`, `/customer/orders`, `/customer/favorites`, `/customer/notifications` |

**Agent script:**
```js
// Clear cookies
await page.context().clearCookies();
// Navigate
await page.goto('/customer/dashboard');
// Assert redirect
await expect(page).toHaveURL(/\/login/);
```

### 1.2 Role-Based Access Control

| Langkah | Action |
|---------|--------|
| 1 | Login sebagai **Owner** (role: owner) |
| 2 | Navigate ke `GET /customer/dashboard` |
| 3 | Assert: 403 Forbidden atau redirect ke `/owner/dashboard` |
| 4 | Logout, login sebagai **Admin** |
| 5 | Navigate ke `GET /customer/dashboard` |
| 6 | Assert: 403 Forbidden atau redirect ke `/admin/dashboard` |

**Agent script:**
```js
// Login as owner
await page.goto('/login');
await page.fill('[name="email"]', 'owner@example.com');
await page.fill('[name="password"]', 'password');
await page.click('button[type="submit"]');
// Try customer dashboard
await page.goto('/customer/dashboard');
// Check response is 403 or redirected
const url = page.url();
expect(url).not.toContain('/customer/dashboard');
```

### 1.3 CSRF Protection

| Langkah | Action |
|---------|--------|
| 1 | Login as customer |
| 2 | Hapus/tamper CSRF token dari page (`document.querySelector('meta[name="csrf-token"]')?.remove()`) |
| 3 | Submit booking form |
| 4 | Assert: 419 Page Expired |

**Agent script:**
```js
await page.evaluate(() => {
  document.querySelector('meta[name="csrf-token"]')?.remove();
});
await page.click('button:has-text("Pesan Meja")');
await expect(page.locator('text=419')).toBeVisible();
```

---

## 2. IDOR — Insecure Direct Object References

### 2.1 Booking ID Milik Customer Lain

| Langkah | Action |
|---------|--------|
| 1 | Login sebagai Customer A |
| 2 | Buat booking → dapat booking_id (misal: 5) |
| 3 | Navigate ke `/customer/bookings/5` → harus sukses (milik A) |
| 4 | Navigate ke `/customer/bookings/1` (milik B) |
| 5 | Assert: 403 Forbidden atau data milik A tidak tampil |

### 2.2 Sequential ID Scraping Protection

| Langkah | Action |
|---------|--------|
| 1 | Login sebagai Customer A |
| 2 | Loop ID 1–100 via `fetch('/customer/bookings/{id}')` di console |
| 3 | Assert: response 403 untuk semua ID yang bukan milik A |

**Agent script:**
```js
const results = await page.evaluate(async () => {
  const responses = [];
  for (let i = 1; i <= 100; i++) {
    const res = await fetch(`/customer/bookings/${i}`, {
      headers: { 'X-Inertia': 'true' }
    });
    responses.push({ id: i, status: res.status });
  }
  return responses;
});
// Assert no 200 for IDs not owned by current user
const leaked = results.filter(r => r.status === 200);
expect(leaked.length).toBeLessThanOrEqual(1); // hanya ID milik sendiri
```

### 2.3 Cancel Booking Milik Orang Lain

| Langkah | Action |
|---------|--------|
| 1 | Login sebagai Customer A |
| 2 | Execute: `fetch('/customer/bookings/1/cancel', { method: 'PUT', headers: { 'X-CSRF-TOKEN': csrf, 'X-Inertia': 'true' } })` |
| 3 | Assert: 403 Forbidden |

### 2.4 Favorite Cafe Milik Customer Lain

| Langkah | Action |
|---------|--------|
| 1 | Login sebagai Customer B, add favorite cafe_id=3 |
| 2 | Login sebagai Customer A |
| 3 | Execute: `fetch('/favorites/3', { method: 'DELETE', headers: { 'X-CSRF-TOKEN': csrf } })` |
| 4 | Assert: 403 atau 404 (bukan 200) |

---

## 3. Input Validation & Injection

### 3.1 Stored XSS — Customer Notes

| Langkah | Action |
|---------|--------|
| 1 | Login sebagai customer |
| 2 | Submit booking dengan `customer_notes = <script>alert('XSS_1')</script>` |
| 3 | Navigate ke halaman booking detail |
| 4 | Assert: alert **tidak** muncul (nilai di-escape) |

### 3.2 Stored XSS — Profile Name

| Langkah | Action |
|---------|--------|
| 1 | Login, navigate ke `/settings/profile` |
| 2 | Update name menjadi `<img src=x onerror="alert('XSS_2')">` |
| 3 | Navigate ke halaman dashboard |
| 4 | Assert: alert **tidak** muncul |

### 3.3 Reflected XSS — Search Query

| Langkah | Action |
|---------|--------|
| 1 | Navigate ke `/cafes?query=<script>alert('XSS_3')</script>` |
| 2 | Assert: alert **tidak** muncul (encoded/filtered) |

### 3.4 SQL Injection via Filter Status

| Langkah | Action |
|---------|--------|
| 1 | Navigate ke `/customer/bookings?status=confirmed' UNION SELECT * FROM users--` |
| 2 | Assert: halaman tetap render normal, tidak error SQL |

### 3.5 SQL Injection via Search Query

| Langkah | Action |
|---------|--------|
| 1 | Navigate ke `/cafes?query=1' OR '1'='1` |
| 2 | Assert: halaman tetap render normal (tidak leak all data) |

### 3.6 Negative / Overflow Guest Count

| Langkah | Action |
|---------|--------|
| 1 | Submit booking dengan `guest_count = -1` via form manipulation |
| 2 | Assert: validasi gagal, error message muncul |
| 3 | Ulangi dengan `guest_count = 999999` |
| 4 | Assert: validasi gagal (melebihi max) |

**Agent script:**
```js
await page.fill('[name="guest_count"]', '-1');
await page.click('button:has-text("Pesan Meja")');
await expect(page.locator('text=min')).toBeVisible();
```

### 3.7 Past Date

| Langkah | Action |
|---------|--------|
| 1 | Set input date via JS: `document.querySelector('[name="date"]').value = '2020-01-01'` |
| 2 | Submit form |
| 3 | Assert: validasi gagal (date must be today or future) |

### 3.8 Empty / Null Inputs

| Langkah | Action |
|---------|--------|
| 1 | Submit booking tanpa tanggal (kosong) |
| 2 | Assert: error validasi muncul |
| 3 | Submit booking tanpa guest count |
| 4 | Assert: error validasi muncul |

---

## 4. Business Logic

### 4.1 Dua Booking Waktu Sama — Table Berbeda

| Langkah | Action |
|---------|--------|
| 1 | Booking table A di sesi 10:00–11:00 → sukses |
| 2 | Booking table B di sesi 10:00–11:00 yang sama |
| 3 | Assert: sukses (allowed — berbeda table) |

### 4.2 Dua Customer — Table Sama, Waktu Sama

| Langkah | Action |
|---------|--------|
| 1 | Login sebagai Customer A, booking table_id=5 tanggal besok jam 10:00 |
| 2 | Login sebagai Customer B, booking table_id=5 tanggal besok jam 10:00 |
| 3 | Assert: request ke-2 gagal (table already booked) |

**Agent script:**
```js
// Customer A books
await loginAs('customer_a');
await bookTable(5, '2026-07-29', '10:00');
// Logout, login as B
await logout();
await loginAs('customer_b');
const result = await bookTableAPI(5, '2026-07-29', '10:00');
expect(result.success).toBe(false);
expect(result.error).toContain('tidak tersedia');
```

### 4.3 Reschedule ke Masa Lalu

| Langkah | Action |
|---------|--------|
| 1 | Buat booking untuk besok |
| 2 | Di halaman booking detail, klik "Reschedule" |
| 3 | Set tanggal ke kemarin |
| 4 | Assert: validasi gagal, error message |

### 4.4 Cancel Booking yang Sudah Check-in

| Langkah | Action |
|---------|--------|
| 1 | Buat booking → check-in (simulasi by owner, atau via API) |
| 2 | Coba cancel booking tersebut dari halaman customer |
| 3 | Assert: tombol cancel tidak muncul, atau 400 Bad Request |

### 4.5 Extend Melebihi Jam Operasional

| Langkah | Action |
|---------|--------|
| 1 | Buat booking di jam 21:00–22:00 (cafe tutup 22:00) |
| 2 | Klik "Extend" → pilih 60 menit |
| 3 | Assert: error (melebihi jam operasional) |

### 4.6 Refund Request — Booking Belum Dibayar

| Langkah | Action |
|---------|--------|
| 1 | Buat booking dengan status "pending" (belum bayar) |
| 2 | Klik "Ajukan Refund" |
| 3 | Assert: error (cannot refund unpaid booking) atau tombol tidak ada |

### 4.7 Pre-Order Menu dengan Booking Invalid

| Langkah | Action |
|---------|--------|
| 1 | Coba akses `POST /orders` dengan booking_id yang sudah cancelled |
| 2 | Assert: 400 Bad Request |

---

## 5. Race Condition (Simulated)

### 5.1 Rapid Booking Submit — Table Sama, Waktu Sama

| Langkah | Action |
|---------|--------|
| 1 | Login sebagai customer |
| 2 | Execute 10 booking requests **tanpa await** (fire & forget) via `Promise.all()` |
| 3 | Assert: maksimal 1 booking sukses untuk table yang sama di sesi sama |

**Agent script:**
```js
const requests = Array.from({ length: 10 }, () => bookTableAPI(5, '2026-07-29', '10:00'));
const results = await Promise.all(requests);
const successCount = results.filter(r => r.success).length;
expect(successCount).toBeLessThanOrEqual(1);
```

---

## 6. Midtrans Payment (Simulated via Webhook)

### 6.1 Webhook Replay — Idempotency

| Langkah | Action |
|---------|--------|
| 1 | Booking + initiate payment → dapat `midtrans_order_id` |
| 2 | Kirim webhook callback manual via fetch: `POST /api/payments/webhook` dengan payload duplikat |
| 3 | Assert: status payment hanya berubah sekali (idempotent) |

**Agent script:**
```js
const payload = {
  transaction_status: 'settlement',
  order_id: midtransOrderId,
  transaction_id: 'test-trx-123',
  gross_amount: amount,
};
await fetch('/api/payments/webhook', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
await fetch('/api/payments/webhook', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const statusCheck = await fetch(`/api/payments/status?order_id=${midtransOrderId}`);
const data = await statusCheck.json();
expect(data.status).toBe('settlement'); // bukan double counted
```

---

## 7. Session & Cookie

### 7.1 Session After Logout — Back Button

| Langkah | Action |
|---------|--------|
| 1 | Login, navigate ke dashboard |
| 2 | Klik "Logout" |
| 3 | Tekan browser "Back" |
| 4 | Assert: redirect ke login (bukan dashboard) |

### 7.2 Cookie Security Flags

| Langkah | Action |
|---------|--------|
| 1 | Login, extract cookies via `page.context().cookies()` |
| 2 | Assert: session cookie has `HttpOnly=true`, `SameSite=Lax` |

**Agent script:**
```js
const cookies = await page.context().cookies();
const sessionCookie = cookies.find(c => c.name.includes('session'));
expect(sessionCookie.httpOnly).toBe(true);
expect(sessionCookie.sameSite).toBe('Lax');
```

### 7.3 Concurrent Session Independence

| Langkah | Action |
|---------|--------|
| 1 | Login as customer di **browser context A** |
| 2 | Login as **different user** di browser context B (new incognito) |
| 3 | Kedua session harus tetap valid (independen) |

---

## 8. Information Disclosure

### 8.1 Stack Trace on Error

| Langkah | Action |
|---------|--------|
| 1 | Kirim request invalid: `GET /customer/bookings/abc` (non-numeric ID) |
| 2 | Assert: error page tidak menampilkan stack trace / file path |

**Agent script:**
```js
await page.goto('/customer/bookings/abc');
const body = await page.textContent('body');
expect(body).not.toContain('Stack trace');
expect(body).not.toContain('/app/Http/');
expect(body).not.toContain('PDOException');
```

### 8.2 Debug Mode

| Langkah | Action |
|---------|--------|
| 1 | Akses halaman non-existent: `/customer/nonexistent-route` |
| 2 | Assert: tidak muncul `APP_DEBUG`, `APP_ENV`, atau detail konfigurasi |

### 8.3 API Response Data Leak

| Langkah | Action |
|---------|--------|
| 1 | Akses `GET /api/customer/bookings` via fetch |
| 2 | Assert: response hanya berisi booking milik user yang sedang login |
| 3 | Assert: tidak ada array semua booking dari semua customer |

---

## 9. Execution Plan

### 9.1 Test Flow Per Session

| Sesi | User | Yang Diuji |
|------|------|-----------|
| Sesi 1 | Guest (unauthenticated) | 1.1 Direct URL access |
| Sesi 2 | Customer A (with owned bookings) | 1.3 CSRF, 2.1-2.4 IDOR, 3.1-3.8 Injection, 4.1-4.7 Business logic, 5.1 Race, 6.1 Webhook, 7.1-7.3 Session, 8.1-8.3 Info disclosure |
| Sesi 3 | Owner | 1.2 RBAC (owner access customer area) |
| Sesi 4 | Admin | 1.2 RBAC (admin access customer area) |
| Sesi 5 | Customer B (competitor) | 2.1 IDOR (A tries B's data) |

### 9.2 Pre-requisites

| # | Persiapan |
|---|-----------|
| 1 | Seed data: minimal 2 customer akun (A & B), masing-masing punya 1-2 booking |
| 2 | Seed data: 1 owner akun, 1 admin akun |
| 3 | Minimal 2 cafe active dengan tables |
| 4 | Midtrans di mode sandbox (untuk payment simulation) |

### 9.3 Pass Criteria

| Area | Minimal Pass |
|------|-------------|
| Auth | 100% skenario pass |
| IDOR | 100% — tidak ada data leak |
| XSS | 100% — tidak ada script execution |
| SQL Injection | 100% — tidak ada error SQL |
| Business Logic | 90%+ pass |
| Session | 100% pass |
| Info Disclosure | 100% — tidak ada leak |

---

## 10. Ringkasan Skenario

| Kategori | Jumlah Skenario | Execution Method |
|----------|----------------|------------------|
| Auth & RBAC | 9 | Navigasi URL, form login, cookie manipulation |
| IDOR | 5 | URL manipulation + `fetch()` loop |
| XSS | 3 | Form input + eval check |
| SQL Injection | 2 | URL parameter + fetch |
| Input Validation | 4 | Form manipulation via JS |
| Business Logic | 7 | Full flow simulation + API fetch |
| Race Condition | 1 | `Promise.all()` via console |
| Payment | 1 | Webhook replay via fetch |
| Session | 3 | Cookie API + navigation |
| Info Disclosure | 3 | Page content + fetch response |
| **Total** | **38** | **100% agent browser** |
