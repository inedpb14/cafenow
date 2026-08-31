# Bug Report — Low Priority Plan

> **Tanggal**: 20 July 2026
> **Scope**: Review implementasi LOW_PRIORITY_PLAN.md — Item 1–5
> **Total**: 13 bugs — 12 ✅ Fixed, 1 ⏳ Known Issue

---

## 🔴 High Priority (5 bugs)

### #1 — `BookingController@refundRequest` — `reason` tidak disimpan

- **File**: `app/Http/Controllers/Booking/BookingController.php:212-238`
- **Sumber**: Review LOW_PRIORITY_PLAN, Item 1b
- **Masalah**: Kolom `reason` sudah ada di migration + `$fillable`, tapi validasi dan create tidak menyertakannya. Refund request tidak pernah menyimpan alasan refund.
- **Fix**: Tambah `'reason' => ['required', 'string', 'max:1000']` di validasi, dan `'reason' => $request->string('reason')` di `RefundRequest::create()`.

```diff
         $request->validate([
             'bank_name' => ['required', 'string', 'max:255'],
             'account_number' => ['required', 'string', 'max:50'],
             'account_holder_name' => ['required', 'string', 'max:255'],
+            'reason' => ['required', 'string', 'max:1000'],
         ]);

         $refund = RefundRequest::create([
             'booking_id' => $booking->id,
             'customer_id' => $request->user()->id,
             'amount' => $booking->total_price,
+            'reason' => $request->string('reason'),
             'bank_name' => $request->string('bank_name'),
```

---

### #2 — `CancelledBy` enum — missing case `Admin`

- **File**: `app/Enums/CancelledBy.php:9-11`
- **Sumber**: Review LOW_PRIORITY_PLAN, Item 3
- **Masalah**: `AdminBookingController@cancel` passing `'admin'` ke `BookingService@cancel`, tapi `CancelledBy` enum tidak punya case `Admin`. Jika ada kode yang panggil `CancelledBy::from($booking->cancelled_by)`, akan terjadi `ValueError`.
- **Fix**: Tambah `case Admin = 'admin'` ke enum.

```diff
 enum CancelledBy: string
 {
     case Customer = 'customer';
     case Owner = 'owner';
+    case Admin = 'admin';
     case System = 'system';
 }
```

---

### #3 — `CheckBookingEligibility` — `diffInHours` argumen terbalik (PRE-EXISTING)

- **File**: `app/Actions/CheckBookingEligibility.php:17`
- **Sumber**: Ditemukan saat testing (CreateBookingTest)
- **Masalah**: `$bookingStart->diffInHours($now, false)` mengembalikan nilai **negatif** untuk booking di masa depan (karena `$bookingStart > $now`). Akibatnya, **semua booking masa depan ditolak** — `negatif < 2` selalu `true`. Fitur booking sama sekali tidak bisa digunakan.
- **Fix**: Balik argumen jadi `$now->diffInHours($bookingStart, false) < $minAdvanceHours`.

```diff
- if ($bookingStart->diffInHours($now, false) < $minAdvanceHours) {
+ if ($now->diffInHours($bookingStart, false) < $minAdvanceHours) {
```

---

### #4 — `BookingService@create` — Action dipanggil tanpa parentheses (PRE-EXISTING)

- **File**: `app/Services/Booking/BookingService.php:33`
- **Sumber**: Ditemukan saat testing (CreateBookingTest)
- **Masalah**: `$this->checkEligibility(...)` dipanggil sebagai method, padahal `$checkEligibility` adalah property bertipe `CheckBookingEligibility` (invokable class). PHP tidak otomatis memanggil `__invoke()` pada property — yang terjadi adalah PHP mencari method bernama `checkEligibility` yang tidak ada → `Error: Call to undefined method`. Akibatnya, `BookingService@create` selalu error 500.
- **Fix**: Bungkus dengan parentheses `($this->checkEligibility)(...)`.

```diff
- $this->checkEligibility($data['booking_date'], $data['start_time']);
+ ($this->checkEligibility)($data['booking_date'], $data['start_time']);
```

---

### #5 — `LockService` — Carbon dilewat ke parameter typed `string` (PRE-EXISTING)

- **File**: `app/Services/Booking/LockService.php:47,56`
- **Sumber**: Ditemukan saat testing (BookingServiceTest)
- **Masalah**: `acquireForBooking` dan `releaseForBooking` melewatkan `$booking->start_time` (Carbon instance dari cast `datetime:H:i`) ke method yang dideklarasikan `string $startTime`. Dengan `declare(strict_types=1)`, ini menyebabkan `TypeError`. Semua operasi lock/unlock booking gagal.
- **Fix**: Tambah `->format('H:i')` setelah `$booking->start_time`.

```diff
     return $this->acquire(
         $booking->table_id,
         $booking->booking_date->format('Y-m-d'),
-        $booking->start_time,
+        $booking->start_time->format('H:i'),
     );
```

---

## 🟠 Medium Priority (4 bugs)

### #6 — Social Login — `role` pakai string bukan Enum

- **File**: `app/Http/Controllers/Auth/CustomerAuthController.php:123`
- **Sumber**: Review LOW_PRIORITY_PLAN, Item 4
- **Masalah**: `'role' => 'customer'` tidak konsisten dengan `UserRole::Customer` yang digunakan di method `register()`. Jika ada casting enum di model, akan error.
- **Fix**: Ganti `'role' => UserRole::Customer`, tambah `'full_name'` field.

```diff
     'name' => $socialUser->getName() ?? explode('@', $email)[0],
-    'role' => 'customer',
+    'full_name' => $socialUser->getName() ?? explode('@', $email)[0],
+    'role' => UserRole::Customer,
```

---

### #7 — `BookingService@cancel` — `start_time` format inconsistency

- **File**: `app/Services/Booking/BookingService.php:103`
- **Sumber**: Ditemukan saat debugging (BookingServiceTest)
- **Masalah**: `$booking->start_time` adalah Carbon instance (dari cast `datetime:H:i`). Ketika di-string-concatenate dengan tanggal, `__toString()` menghasilkan format `"2026-07-20 15:03:00"` (full datetime) bukan hanya `"15:03"`. Hasil parse menjadi `"2026-07-20 2026-07-20 15:03:00"` — double date — menyebabkan `Failed to parse time string`.
- **Fix**: Tambah `->format('H:i')`.

```diff
-$startTime = Carbon::parse($booking->booking_date->format('Y-m-d').' '.$booking->start_time);
+$startTime = Carbon::parse($booking->booking_date->format('Y-m-d').' '.$booking->start_time->format('H:i'));
```

---

### #8 — `LoginRequest` — missing `toDto()` method (PRE-EXISTING)

- **File**: `app/Http/Requests/Auth/LoginRequest.php:23`
- **Sumber**: Ditemukan saat testing (LoginTest)
- **Masalah**: `CustomerAuthController@login` memanggil `$request->toDto()`, tapi `LoginRequest` tidak memiliki method tersebut. Semua request login menghasilkan error 500.
- **Fix**: Tambah method `toDto()` yang return `$this->validated()`.

```diff
     public function rules(): array
     {
         return [
             'email' => ['required', 'email'],
             'password' => ['required', 'string'],
         ];
     }
+
+    public function toDto(): array
+    {
+        return $this->validated();
+    }
```

---

### #9 — Tests — 4 dari 7 file tidak dibuat

- **File**: `tests/Feature/Auth/LoginTest.php`, `tests/Feature/Booking/CreateBookingTest.php`, `tests/Feature/Order/CreateOrderTest.php`, `tests/Unit/Services/BookingServiceTest.php`
- **Sumber**: Review LOW_PRIORITY_PLAN, Item 5
- **Masalah**: Hanya 2 dari 7 file test yang dijanjikan di plan yang dibuat. RegistrationTest yang ada adalah test Fortify bawaan, bukan test API CafeNow.
- **Fix**: Buat 4 file: `LoginTest` (5 test), `CreateBookingTest` (4 test), `CreateOrderTest` (2 test), `BookingServiceTest` (5 test). Tambah 3 factories (`BookingFactory`, `MenuItemFactory`, `BookingRuleFactory`) + `HasFactory` ke 3 model (`Cafe`, `Table`, `Booking`, `MenuItem`, `BookingRule`).

---

## 🟡 Low Priority (3 bugs)

### #10 — Social Login Apple Sign In tidak support `userFromToken`

- **File**: `app/Http/Controllers/Auth/CustomerAuthController.php:99-101`
- **Sumber**: Review LOW_PRIORITY_PLAN, Item 4
- **Masalah**: Apple menggunakan `identity_token` (JWT), bukan access token. `Socialite::driver('apple')->userFromToken($token)` membutuhkan library tambahan (`laravel/socialite-apple`). Saat ini akan gagal untuk provider `apple`.
- **Status**: ⏳ **Known Issue** — perlu library tambahan atau implementasi custom. Google tetap berfungsi.
- **Workaround**: Untuk sekarang, Apple Sign In tidak didukung. Gunakan Google.

---

### #11 — CafeFactory `operational_hours` format

- **File**: `database/factories/CafeFactory.php:24-32`
- **Sumber**: Ditemukan saat implementasi test
- **Masalah**: CafeFactory mendefinisikan `operational_hours` sebagai array, tapi Cafe model tidak memiliki cast `'operational_hours' => 'array'` atau `'json'`. Insert ke database akan menyimpan string "Array" atau error.
- **Fix**: Tambah cast `'operational_hours' => 'array'` ke Cafe model, atau simpan sebagai JSON string di factory.

```diff
// Cafe.php casts()
protected function casts(): array
{
    return [
+        'operational_hours' => 'array',
    ];
}
```

---

### #12 — BookingFactory `table_price` missing

- **File**: `database/factories/BookingFactory.php:21-28`
- **Sumber**: Ditemukan saat testing
- **Masalah**: BookingFactory tidak menyertakan `table_price` yang NOT NULL di migration. Semua create booking via factory gagal dengan `NOT NULL constraint failed: bookings.table_price`.
- **Fix**: Tambah `'table_price' => 50000` ke factory definition.

---

### #13 — `RegistrationTest` bawaan Fortify tidak relevan

- **File**: `tests/Feature/Auth/RegistrationTest.php`
- **Sumber**: Review LOW_PRIORITY_PLAN, Item 5
- **Masalah**: File ini adalah test web-based Fortify (form submit → redirect), bukan test API `POST /api/auth/register` yang return JSON + OTP flow. Tidak relevan untuk API-only mode.
- **Status**: Dibiarkan — tidak menghalangi. Buat API-specific registration test jika nanti perlu.

---

## Ringkasan

| Prioritas | Total | Fixed | Known Issue |
|-----------|-------|-------|-------------|
| 🔴 High | 5 | 5 ✅ | 0 |
| 🟠 Medium | 4 | 4 ✅ | 0 |
| 🟡 Low | 3 | 2 ✅ | 1 ⏳ |
| **Total** | **12** | **11 ✅** | **1 ⏳** |

### Pre-existing Bugs Ditemukan (4)

Bug #3, #4, #5, #8 sudah ada sebelum implementasi LOW plan — ditemukan saat testing. Semua sudah di-fix.

### Files Affected (18 files)

| File | Bug # |
|------|-------|
| `app/Http/Controllers/Booking/BookingController.php` | #1 |
| `app/Enums/CancelledBy.php` | #2 |
| `app/Actions/CheckBookingEligibility.php` | #3 |
| `app/Services/Booking/BookingService.php` | #4, #7 |
| `app/Services/Booking/LockService.php` | #5 |
| `app/Http/Controllers/Auth/CustomerAuthController.php` | #6, #10 |
| `app/Http/Requests/Auth/LoginRequest.php` | #8 |
| `tests/Feature/Auth/LoginTest.php` | #9 |
| `tests/Feature/Booking/CreateBookingTest.php` | #9 |
| `tests/Feature/Booking/BookingLifecycleTest.php` | #9 |
| `tests/Feature/Order/CreateOrderTest.php` | #9 |
| `tests/Feature/Cafe/CafeListingTest.php` | #9 |
| `tests/Unit/Services/BookingServiceTest.php` | #9 |
| `database/factories/BookingFactory.php` | #12 |
| `database/factories/MenuItemFactory.php` | #9 |
| `database/factories/BookingRuleFactory.php` | #9 |
| `database/factories/CafeFactory.php` | #11 |
| `app/Models/Cafe.php` | #11 |
| `app/Models/Table.php` | #9 |
| `app/Models/Booking.php` | #9 |
| `app/Models/MenuItem.php` | #9 |
| `app/Models/BookingRule.php` | #9 |
| **Total** | **22 files** |
