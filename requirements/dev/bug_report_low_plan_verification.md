# ✅ Review Verifikasi — BUG_REPORT_LOW_PLAN.md

> Review dilakukan: **2026-07-20 20:54 WIB**  
> Verifikasi setiap bug langsung ke kode aktual, bukan hanya membaca laporan.

---

## 📊 Hasil Verifikasi — 12 Bug Diklaim Fixed

| Bug | Prioritas | Klaim | Verifikasi Aktual |
|-----|-----------|-------|-------------------|
| #1 `reason` di refund request | 🔴 High | ✅ Fixed | ✅ **Confirmed** |
| #2 `CancelledBy::Admin` enum | 🔴 High | ✅ Fixed | ✅ **Confirmed** |
| #3 `diffInHours` argumen terbalik | 🔴 High | ✅ Fixed | ✅ **Confirmed** |
| #4 invokable action syntax | 🔴 High | ✅ Fixed | ✅ **Confirmed** |
| #5 `LockService` Carbon → string | 🔴 High | ✅ Fixed | ✅ **Confirmed** |
| #6 Social login role string vs Enum | 🟠 Medium | ✅ Fixed | ✅ **Confirmed + bonus fix** |
| #7 `start_time` format di cancel | 🟠 Medium | ✅ Fixed | ✅ **Confirmed** |
| #8 `LoginRequest` missing `toDto()` | 🟠 Medium | ✅ Fixed | ✅ **Confirmed** |
| #9 4 test files hilang | 🟠 Medium | ✅ Fixed | ✅ **Confirmed** |
| #10 Apple Sign In (known issue) | 🟡 Low | ⏳ Known Issue | ⏳ **Benar, belum di-fix** |
| #11 `CafeFactory` operational_hours cast | 🟡 Low | ✅ Fixed | ✅ **Confirmed** |
| #12 `BookingFactory` table_price missing | 🟡 Low | ✅ Fixed | ✅ **Confirmed** |

**Hasil: 11/11 yang diklaim fixed → Terverifikasi. 1 Known Issue → Benar.**

---

## Detail Verifikasi Per Bug

### #1 — `reason` di Refund Request ✅

`BookingController@refundRequest` (line 212–241):
- `'reason' => ['required', 'string', 'max:1000']` ✅ ada di validasi
- `'reason' => $request->string('reason')` ✅ ada di `RefundRequest::create()`

---

### #2 — `CancelledBy::Admin` ✅

`CancelledBy.php` sekarang punya:
```php
case Customer = 'customer';
case Owner    = 'owner';
case Admin    = 'admin';   // ✅ Ditambahkan
case System   = 'system';
```

---

### #3 — `diffInHours` argumen terbalik ✅

`CheckBookingEligibility.php` (line 17):
```php
// SEBELUM: $bookingStart->diffInHours($now, false)   ← nilai negatif untuk booking masa depan
// SESUDAH: $now->diffInHours($bookingStart, false)   ← benar
if ($now->diffInHours($bookingStart, false) < $minAdvanceHours) {
```
✅ Fix sudah benar.

---

### #4 — Invokable Action Syntax ✅

`BookingService.php` (line 33):
```php
($this->checkEligibility)($data['booking_date'], $data['start_time']);
// ✅ Bungkus parentheses untuk invoke property bertipe invokable class
```

---

### #5 — `LockService` Carbon → string ✅

`LockService.php` (line 42–58):
```php
public function acquireForBooking(Booking $booking): bool
{
    return $this->acquire(
        $booking->table_id,
        $booking->booking_date->format('Y-m-d'),
        $booking->start_time->format('H:i'),   // ✅ format() ditambah
    );
}

public function releaseForBooking(Booking $booking): void
{
    $this->release(
        $booking->table_id,
        $booking->booking_date->format('Y-m-d'),
        $booking->start_time->format('H:i'),   // ✅ format() ditambah
    );
}
```

---

### #6 — Social Login role + full_name ✅ (Bonus lebih dari plan)

`CustomerAuthController.php` (line 119–128):
```php
$user = User::firstOrCreate(
    ['email' => $email],
    [
        'full_name' => $socialUser->getName() ?? explode('@', $email)[0],  // ✅ Ditambah
        'name'      => $socialUser->getName() ?? explode('@', $email)[0],
        'role'      => UserRole::Customer,   // ✅ Ganti string → Enum
        'email_verified_at' => now(),
        'password'  => bcrypt(Str::random(32)),
    ]
);
```

> **Bonus**: `full_name` juga ikut diisi, padahal plan hanya minta fix `role`. Ini lebih lengkap.

---

### #7 — `start_time` format di `BookingService@cancel` ✅

`BookingService.php` (line 103):
```php
$startTime = Carbon::parse(
    $booking->booking_date->format('Y-m-d') . ' ' . $booking->start_time->format('H:i')
);
// ✅ ->format('H:i') ditambahkan — mencegah double-date issue
```

---

### #8 — `LoginRequest::toDto()` ✅

`LoginRequest.php` (line 24–27):
```php
public function toDto(): array
{
    return $this->validated();  // ✅ Method ditambah
}
```

---

### #9 — 4 Test Files ✅

Semua 4 file yang hilang kini sudah ada:

| File | Dibuat | Jumlah Test |
|------|--------|-------------|
| `tests/Feature/Auth/LoginTest.php` | ✅ | 5 test (customer, wrong pw, nonexistent, owner, admin) |
| `tests/Feature/Booking/CreateBookingTest.php` | ✅ | 4 test (create, auth required, invalid cafe, cancel) |
| `tests/Feature/Order/CreateOrderTest.php` | ✅ | 2 test (auth required, validates items) |
| `tests/Unit/Services/BookingServiceTest.php` | ✅ | 5 test (cancel customer, owner, admin, with reason, 3hr window) |

Factory yang dibuat: `BookingRuleFactory`, `MenuItemFactory`, `BookingFactory` — semua ada.  
Model yang ditambah `HasFactory`: `Cafe`, `Table`, `Booking`, `MenuItem`, `BookingRule` — semua sudah ada trait.

---

### #10 — Apple Sign In ⏳

Dikonfirmasi masih `known issue`. Tidak ada perubahan di `CustomerAuthController` yang menangani ini secara khusus. Google-only untuk saat ini — dapat diterima.

---

### #11 — CafeFactory `operational_hours` cast ✅

`Cafe.php` model (line 24–35):
```php
protected function casts(): array
{
    return [
        'facilities'        => 'array',
        'operational_hours' => 'array',   // ✅ Cast ada
        'blackout_dates'    => 'array',
        // ...
    ];
}
```

`CafeFactory.php` masih mendefinisikan `operational_hours` sebagai PHP array — ini sekarang benar karena Eloquent akan auto-convert array ke JSON via cast saat menyimpan.

---

### #12 — `BookingFactory` `table_price` ✅

`BookingFactory.php` (line 29–30):
```php
'table_price' => 50000,   // ✅ Ditambah
'total_price' => 50000,
```

---

## 🔍 Temuan Baru Pasca-Review

### ⚠️ Temuan #1 — `BookingFactory` menggunakan `fake()->time()` untuk start/end time

```php
'start_time' => fake()->time('H:i'),
'end_time'   => fake()->time('H:i'),
```

`fake()->time()` menghasilkan waktu random yang **tidak terurut** — `end_time` bisa lebih kecil dari `start_time`. Ini bisa menyebabkan test yang bergantung pada validasi duration/end_time gagal secara random (flaky test).

**Rekomendasi**: Gunakan waktu deterministik, misalnya:
```php
'start_time' => '14:00',
'end_time'   => '15:00',
```

---

### ⚠️ Temuan #2 — `CreateBookingTest` bisa flaky karena `diffInHours`

`CreateBookingTest@test_customer_can_create_booking` menggunakan:
```php
'booking_date' => today()->addWeek()->format('Y-m-d'),
'start_time'   => '10:00',
```

Test ini akan **gagal jika dijalankan setelah pukul 10:00 malam** karena `diffInHours(now(), booking_start)` akan memberikan nilai kecil jika booking minggu depan jam 10 malam sudah melewati threshold. Ini aman di siang hari, tapi potensial flaky jika CI berjalan malam hari dengan timezone tertentu.

**Rekomendasi**: Gunakan waktu seperti `23:59` atau `addWeeks(2)` untuk margin yang lebih aman.

---

### ⚠️ Temuan #3 — `BookingServiceTest` adalah "Unit Test" tapi menggunakan database

`BookingServiceTest` menggunakan `RefreshDatabase` + factory — ini sebenarnya lebih tepat disebut **integration test** atau **feature test**, bukan unit test murni. Unit test seharusnya mock semua dependencies (BookingRepository, LockService, dll).

Ini bukan bug fungsional, tapi kategorisasi yang tidak tepat. Test tetap berjalan dengan benar.

---

### ✅ Verifikasi Tambahan — Ringkasan Bug Report

Bug report mengklaim **"13 bugs, 12 ✅ Fixed, 1 ⏳ Known Issue"** — namun tabel ringkasan di bagian bawah menunjukkan **"12 total, 11 ✅, 1 ⏳"**. Ada inkonsistensi hitungan antara heading (13) dan tabel (12). Bug #10 (Apple) di-list sebagai bug tetapi tidak masuk hitungan "fixed" — ini yang menyebabkan selisih 1.

---

## ✅ Kesimpulan

**Semua 12 bug yang diklaim fixed sudah terverifikasi di kode aktual.** Pre-existing bug kritis (#3 `diffInHours`, #4 invokable syntax, #5 LockService TypeError) sudah benar-benar diperbaiki — ini yang paling penting karena menyebabkan fitur booking tidak bisa digunakan sama sekali.

**Kualitas implementasi**: Baik. Bug #6 bahkan difix melebihi scope yang diminta (tambah `full_name`). Semua 4 test file yang dibuat memiliki coverage yang meaningful.

**Yang perlu diperhatikan**:
1. `BookingFactory` random time bisa menyebabkan flaky test
2. Inkonsistensi hitungan total bug di laporan (13 vs 12)
3. Apple Sign In masih tidak berfungsi (known issue)
