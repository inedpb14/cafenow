# 🔍 Review Mendalam — LOW_PRIORITY_PLAN.md

> Review dilakukan: **2026-07-20 20:31 WIB**  
> Verifikasi langsung ke kode aktual untuk setiap item.

---

## 📊 Ringkasan Status

| Item | Status di Plan | Verifikasi Aktual | Catatan |
|------|---------------|-------------------|---------|
| 1. Schema Drift | ✅ Done | ✅ **Sebagian besar benar** | Ada 1 item (1b: reason) yang tidak disimpan di controller |
| 2. Takeaway Order | ✅ Done | ✅ **Terverifikasi** | Implementasi melampaui plan |
| 3. Admin Cancel Booking | ✅ Done | ⚠️ **Ada Bug Baru** | `CancelledBy` enum tidak punya `admin` case |
| 4. Social Login | ✅ Done | ⚠️ **Tidak sesuai plan** | `SocialLoginService.php` tidak dibuat; logika langsung di controller |
| 5. Tests | ✅ Done | 🔴 **Tidak lengkap** | Hanya 3 dari 7 file test yang dibuat, banyak yang hilang |
| 6+7+8. Frontend React | ⬜ Pending | ⬜ Ditunda — normal | Sesuai keputusan plan |

---

## Item 1: Schema Drift — Critical Fixes ✅ Sebagian Besar Benar

### Verifikasi Migration `2026_07_19_093926_fix_schema_drift.php`

| Sub-fix | Deskripsi | Migration | Model Updated | Status |
|---------|-----------|-----------|---------------|--------|
| 1a | `menu_orders.booking_id` nullable | ✅ `->nullable()->change()` | ✅ `MenuOrder` fillable punya `booking_id` | ✅ |
| 1b | `refund_requests.reason` | ✅ `->text('reason')->nullable()` | ✅ `RefundRequest` fillable punya `reason` | ⚠️ **Bug** |
| 1c | `refund_requests.processed_by` FK | ✅ `->foreignId('processed_by')->nullable()->constrained('users')` | ✅ `RefundRequest` fillable punya `processed_by` | ✅ |
| 1d | `payments` + 5 Midtrans columns | ✅ Semua 5 kolom ditambah | ✅ `Payment` fillable + casts sudah diupdate | ✅ |
| 1e | `booking_rules.min_advance_hours` | ✅ `->integer('min_advance_hours')->nullable()` | ✅ `BookingRule` fillable + casts ada | ✅ |
| 1f | `notifications.data` JSON | ✅ `->json('data')->nullable()` | ✅ `Notification` fillable + `'data' => 'array'` cast | ✅ |
| 1g | `tables` unique `(cafe_id, name)` | ✅ `->unique(['cafe_id', 'name'])` | ✅ (constraint only) | ✅ |
| 1h | `PaymentStatus::Expired` | ✅ `case Expired = 'expired'` di enum | N/A | ✅ |

### 🐛 Bug Item 1b — `reason` tidak disimpan di `BookingController@refundRequest`

Plan: _"Refund request simpan `reason`"_

Implementasi aktual di `BookingController@refundRequest` (line 212–238):
```php
$request->validate([
    'bank_name'           => ['required', 'string', 'max:255'],
    'account_number'      => ['required', 'string', 'max:50'],
    'account_holder_name' => ['required', 'string', 'max:255'],
    // ❌ 'reason' tidak ada di validation
]);

RefundRequest::create([
    'booking_id'           => $booking->id,
    'bank_name'            => $request->string('bank_name'),
    // ...
    // ❌ 'reason' tidak di-create
]);
```

Kolom `reason` sudah ada di migration dan di `$fillable` model, tapi **tidak pernah dikumpulkan dari request dan tidak disimpan**.

---

## Item 2: Takeaway Order ✅ Terverifikasi (Melampaui Plan)

### `StoreOrderRequest`:
```php
'booking_id' => ['nullable', 'exists:bookings,id'], // ✅
```

### `OrderController@store`:
```php
$isTakeaway = $dto['booking_id'] === null; // ✅ deteksi otomatis

if ($isTakeaway) {
    // ✅ ambil cafe dari menu item pertama
    $firstItem = MenuItem::with('cafe')->findOrFail($dto['items'][0]['menu_item_id']);
    $cafeId = $firstItem->cafe_id;
} else {
    $booking = Booking::findOrFail($dto['booking_id']);
    // ✅ validasi ownership booking
}
```

> **Bonus implementasi yang melebihi plan**:
> 1. Ada validasi cross-cafe — menu item harus dari cafe yang sama (`->where('cafe_id', $cafeId)`)
> 2. Ada logic `if (! $isTakeaway)` yang update `booking->menu_subtotal` dan `booking->total_price` — menjaga sinkronisasi harga booking secara real-time

---

## Item 3: Admin Cancel Booking ⚠️ Ada Bug Baru

### Controller — `AdminBookingController@cancel`:
```php
$this->bookingService->cancel($booking, 'admin', $request->string('cancellation_reason'));
```
✅ Menggunakan pattern yang benar via `BookingService@cancel`.
✅ Route `PUT /admin/bookings/{booking}/cancel` ada di `routes/api/admin.php` (line 31).

### 🐛 Bug — `CancelledBy` enum tidak punya case `Admin`

`BookingService@cancel` melakukan:
```php
$booking->update([
    'status'               => 'cancelled',
    'cancelled_by'         => $cancelledBy, // ← 'admin' (string)
    ...
]);
```

`CancelledBy` enum aktual:
```php
enum CancelledBy: string
{
    case Customer = 'customer';
    case Owner    = 'owner';
    case System   = 'system';
    // ❌ TIDAK ADA: case Admin = 'admin'
}
```

Plan sendiri mengakui ini sebagai drift yang "bisa ditambah kapan saja" dan mendiamkannya. Namun setelah `AdminBookingController@cancel` dibuat dengan passing string `'admin'` ke `BookingService`, ini sekarang menjadi **data inconsistency aktif** — kolom `cancelled_by` di database akan berisi `'admin'` yang tidak ada di enum.

> Ini tidak langsung error karena `cancelled_by` disimpan sebagai string, bukan melalui enum casting di model. Tapi jika ada kode yang mencoba melakukan `CancelledBy::from($booking->cancelled_by)` untuk admin-cancelled booking, akan terjadi `ValueError`.

---

## Item 4: Social Login ⚠️ Tidak Sesuai Plan Persis

### Apa yang ada vs yang direncanakan:

| Yang Direncanakan | Kondisi Aktual |
|------------------|----------------|
| `SocialLoginService.php` (baru) | ❌ **Tidak dibuat** — tidak ada di `app/Services/Auth/` |
| Socialite logic di `CustomerAuthController` | ✅ Ada di method `socialLogin()` (line 91–138) |
| `laravel/socialite` di `composer.json` | ✅ Ada (`"laravel/socialite": "^5.28"`) |
| Google config di `config/services.php` | ✅ Ada |
| Apple config di `config/services.php` | ✅ Ada |

### Analisis Implementasi `socialLogin()`:

```php
$socialUser = Socialite::driver($request->string('provider'))
    ->stateless()
    ->userFromToken($request->string('access_token'));

$user = User::firstOrCreate(
    ['email' => $email],
    [
        'name'              => $socialUser->getName() ?? explode('@', $email)[0],
        'role'              => 'customer',  // ← hardcode string, tidak pakai UserRole::Customer
        'email_verified_at' => now(),
        'password'          => bcrypt(Str::random(32)),
    ]
);
```

> **Catatan**: Tidak pakai `SocialLoginService` tapi logikanya benar. Ini acceptable pattern selama controller tidak terlalu gemuk — dalam kasus ini method cukup pendek (48 baris).

### ⚠️ Masalah Minor Social Login:

1. **`role` di-set sebagai string `'customer'`** — tidak konsisten dengan `UserRole::Customer` yang digunakan di method `register()`. Jika ada casting enum di model, ini bisa menjadi masalah.

2. **`full_name` tidak diisi** — di `register()`, field `full_name` dan `name` keduanya diisi. Di `socialLogin()`, hanya `name` yang diisi. Jika `full_name` punya `NOT NULL` constraint di database, akan error.

3. **Apple Sign In tidak support `userFromToken($access_token)`** — Apple menggunakan `identity_token` (JWT), bukan access token biasa. `Socialite::driver('apple')->userFromToken()` membutuhkan library tambahan (seperti `laravel/socialite-apple`) atau implementasi custom. Saat ini akan gagal silently untuk provider `apple`.

---

## Item 5: Tests 🔴 Tidak Lengkap

### Plan vs Aktual — 7 Test Files yang Dijanjikan:

| File Test (dari plan) | Status Aktual |
|-----------------------|---------------|
| `tests/Feature/Auth/RegistrationTest.php` | ⚠️ **Ada tapi BUKAN test yang dimaksud** — ini test lama Fortify (registration screen + redirect), bukan test API `POST /api/auth/register` + OTP flow |
| `tests/Feature/Auth/LoginTest.php` | ❌ **Tidak ada** — tidak ditemukan di direktori |
| `tests/Feature/Booking/CreateBookingTest.php` | ❌ **Tidak ada** — tidak ditemukan |
| `tests/Feature/Booking/BookingLifecycleTest.php` | ✅ **Ada dan relevan** — test checkIn, checkout, noShow, double check-in |
| `tests/Feature/Cafe/CafeListingTest.php` | ✅ **Ada dan relevan** — test listing, search query, search city |
| `tests/Feature/Order/CreateOrderTest.php` | ❌ **Tidak ada** — direktori `tests/Feature/Order/` tidak ada |
| `tests/Unit/Services/BookingServiceTest.php` | ❌ **Tidak ada** — `tests/Unit/` hanya punya `ExampleTest.php` |

**Scorecard: 2/7 file test sesuai plan. 1 file ada tapi tidak relevan. 4 file hilang.**

### Analisis Test yang Ada:

**`BookingLifecycleTest.php`** — Coverage yang baik:
- ✅ `test_owner_can_mark_no_show`
- ✅ `test_owner_can_checkout_checked_in_booking`
- ✅ `test_checkout_fails_when_not_checked_in`
- ✅ `test_double_checkin_returns_error`

**`CafeListingTest.php`** — Coverage minimal:
- ✅ `test_lists_active_cafes`
- ✅ `test_search_by_query`
- ✅ `test_search_by_city`
- ❌ Missing: test geolocation (lat/lng), test featured prioritization

**`RegistrationTest.php`** (auth test yang ada) — **Salah context**:
- Ini test Fortify web-based registration (form submit → redirect)
- Bukan test API `POST /api/auth/register` yang return JSON + OTP
- Test ini akan **gagal atau tidak relevan** untuk API-only mode

### Test Count di Plan vs Aktual:

Plan: _"46 tests all pass"_

Yang bisa diverifikasi: test structure menunjukkan jauh lebih sedikit dari 46 test yang spesifik untuk CafeNow. Kemungkinan hitungan 46 termasuk semua test bawaan Laravel starter kit yang tidak relevan.

---

## 📋 Ringkasan Temuan & Rekomendasi

| Prioritas | Temuan | File | Rekomendasi |
|-----------|--------|------|-------------|
| 🔴 High | `reason` tidak disimpan di refund request | `BookingController.php` | Tambah validasi + simpan `reason` field |
| 🔴 High | 4 dari 7 test file yang dijanjikan hilang | `tests/` | Buat: `LoginTest`, `CreateBookingTest`, `CreateOrderTest`, `BookingServiceTest` |
| 🟠 Medium | `CancelledBy` enum tidak punya case `Admin` | `Enums/CancelledBy.php` | Tambah `case Admin = 'admin'` |
| 🟠 Medium | Social login `role` menggunakan string bukan Enum | `CustomerAuthController.php` | Ganti `'role' => 'customer'` dengan `'role' => UserRole::Customer` |
| 🟠 Medium | Social login Apple Sign In akan gagal | `CustomerAuthController.php` | Perlu library tambahan atau implementasi custom untuk Apple token |
| 🟠 Medium | `full_name` tidak diisi di social login | `CustomerAuthController.php` | Tambah `'full_name' => $socialUser->getName()` |
| 🟡 Low | `RegistrationTest.php` adalah Fortify web test, bukan API test | `tests/Feature/Auth/RegistrationTest.php` | Buat API-specific registration test |
| 🟡 Low | `CafeListingTest` tidak cover geolocation & featured | `CafeListingTest.php` | Tambah test untuk fitur-fitur baru |
| 🟡 Low | `SocialLoginService` tidak dibuat (logic langsung di controller) | `CustomerAuthController.php` | Acceptable untuk sekarang, pertimbangkan extract ke service saat logic bertambah |

---

## ✅ Kesimpulan

- **Item 1 (Schema Drift)**: 7/8 sub-fix benar. Bug 1b (`reason` tidak disimpan) luput dari implementasi meskipun schema dan model sudah siap.
- **Item 2 (Takeaway)**: ✅ Implementasi terbaik — melampaui plan dengan validasi cross-cafe dan sinkronisasi booking price.
- **Item 3 (Admin Cancel)**: Fungsional tapi menyisakan potensi `ValueError` karena `CancelledBy` enum tidak punya case `Admin`.
- **Item 4 (Social Login)**: Fungsional untuk Google, tapi **Apple Sign In hampir pasti gagal** karena perbedaan mekanisme token. `SocialLoginService` tidak dibuat tapi tidak kritis.
- **Item 5 (Tests)**: **Paling bermasalah** — hanya 2 dari 7 test file yang sesuai plan. Klaim "46 tests all pass" perlu diverifikasi apakah 46 itu adalah test relevan atau gabungan dengan test bawaan starter kit.

> **Prioritas paling mendesak untuk di-fix**: Bug refund reason (#1b), tambah `CancelledBy::Admin`, dan lengkapi test suite (terutama `CreateBookingTest` dan `BookingServiceTest`).
