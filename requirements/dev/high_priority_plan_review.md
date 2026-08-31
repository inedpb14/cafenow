# 🔍 Analisis Review — HIGH_PRIORITY_PLAN.md

> Review dilakukan: **2026-07-19 16:02 WIB** — memverifikasi setiap item plan terhadap kode aktual.

---

## 📊 Ringkasan Eksekusi

| Item | Status di Plan | Verifikasi Aktual | Catatan |
|------|---------------|-------------------|---------|
| 1. Booking Lifecycle | ✅ Executed | ✅ **Terverifikasi** | Semua fix diterapkan |
| 2. Scheduler Commands | ✅ Executed | ✅ **Terverifikasi** | 3 schedule terdaftar |
| 3. Operational Hours | ✅ Executed | ✅ **Terverifikasi** | getSlots sudah baca operational_hours |
| 4. Surge Pricing | ✅ Executed | ⚠️ **Ada Bug Logika** | calculatePrice untuk `custom` salah flow |

---

## Item 1: Booking Lifecycle ✅ Terverifikasi

### Verifikasi per method:

| Method | Yang Direncanakan | Kondisi Aktual | Status |
|--------|------------------|----------------|--------|
| `BookingController@checkIn` | Dispatch `BookingCheckIn` event | `BookingCheckIn::dispatch($booking->id)` → ✅ Line 135 | ✅ Benar |
| `BookingController@extend` | Dispatch `BookingExtended` event | `BookingExtended::dispatch($booking->id, $additionalMinutes)` → ✅ Line 182 | ✅ Benar |
| `OwnerBookingController@checkout` | Cek `check_in_time !== null` | `if ($booking->check_in_time === null)` → ✅ Line 107 | ✅ Benar |
| `OwnerBookingController@noShow` | Gunakan `BookingStatus::NoShow` | `BookingStatus::NoShow->value` → ✅ Line 88 | ✅ Benar |
| `AvailabilityService@isAvailable` | Exclude status `no_show` | `whereIn('status', ['confirmed', 'pending', 'no_show'])` → ✅ Line 26 | ✅ Benar |

> **Catatan positif**: Import `BookingCheckIn` dan `BookingExtended` sudah ada di header `BookingController`. `BookingStatus` enum juga sudah punya `case NoShow = 'no_show'`.

---

## Item 2: Scheduler Commands ✅ Terverifikasi

### `routes/console.php`:
```php
Schedule::command('bookings:cancel-expired-pending')->everyMinute(); // ✅
Schedule::command('orders:auto-schedule-preparing')->everyMinute();  // ✅
Schedule::command('bookings:auto-complete')->everyMinute();          // ✅
```

### Command files yang ada:
| Command | File | Status |
|---------|------|--------|
| `bookings:auto-complete` | `AutoCompleteBookings.php` | ✅ Ada |
| `orders:auto-schedule-preparing` | `AutoScheduleMenuPreparing.php` | ✅ Ada |
| `bookings:cancel-expired-pending` | `CancelExpiredPendingBookings.php` | ✅ Ada |

### Fix `AutoCompleteBookings` — Plan vs Aktual:

Plan menyebutkan: _"tambah `check_in_time is not null` (jangan auto-complete yang belum check-in)"_

Kondisi aktual di `AutoCompleteBookings.php`:
```php
Booking::where('status', 'confirmed')
    ->where('end_time', '<=', Carbon::now()->format('H:i:s'))
    ->where('booking_date', '<=', today())
    ->whereNotNull('check_in_time')   // ✅ Sudah ada
    ->whereNull('check_out_time')     // ✅ Bonus check
    ->update([...]);
```

> ✅ Fix sudah diterapkan dengan benar, bahkan ada **bonus guard** `whereNull('check_out_time')`.

---

## Item 3: Operational Hours ✅ Terverifikasi

### `AvailabilityService@getSlots` — Plan vs Aktual:

Plan:
```
getSlots(tableId, date, cafeId, $cafeOperationalHours)
→ Parse day → cari open/close → generate slot
→ Jika hari tutup → return empty collection
```

Implementasi aktual:
```php
public function getSlots(int $tableId, string $date, int $cafeId, ?array $operationalHours = null): Collection
{
    $day = strtolower(Carbon::parse($date)->format('D')); // 'mon', 'tue', dst
    $hours = $operationalHours[$day] ?? null;

    if (empty($hours)) {
        return collect(); // ✅ Return kosong jika tutup
    }

    $open  = $hours[0]['open']  ?? '08:00';
    $close = $hours[0]['close'] ?? '22:00';
    // ... generate slots ...
}
```

✅ Semua flow sesuai rencana. `BookingController@availability` sudah passing `$cafe->operational_hours`.

> ⚠️ **Catatan minor**: Fallback `?? '08:00'` dan `?? '22:00'` masih ada jika key `open`/`close` null di dalam array. Ini bisa jadi safety net atau potensi silent bug tergantung data. Pertimbangkan untuk throw exception jika format `operational_hours` invalid.

---

## Item 4: Surge Pricing ⚠️ Ada Bug Logika

### Plan yang Direncanakan:

```
Flow calculatePrice baru (rule_type = 'custom'):
  1. Base = $rule->base_price_per_hour * ($duration / 60)
  2. Surge = CalculateSurgePrice($rule, $date, $startTime, $duration)  ← surcharge
  3. Return base + surge
```

### Implementasi Aktual di `BookingService@calculatePrice`:

```php
'custom' => ($this->calculateSurgePrice)($rule, $data['booking_date'], $data['start_time'], $duration),
```

### Implementasi Aktual di `CalculateSurgePrice::__invoke()`:

```php
$hourlyRate = $rule->base_price_per_hour;
$finalPrice = $hourlyRate * ($durationMinutes / 60);  // ← Base price dihitung DISINI
// ... apply surge multiplier ...
return $highestPrice;  // ← Return sudah include base price
```

### 🐛 Bug yang Terdeteksi:

`CalculateSurgePrice` **sudah menghitung base price di dalamnya** dan me-return **total harga** (bukan surcharge saja).

Tapi plan mengatakan:
> `"Total = base price + surge surcharge"` — implying `CalculateSurgePrice` return hanya surcharge.

**Hasilnya**: Flow di `calculatePrice` saat ini sudah menghasilkan nilai yang **benar secara fungsional** karena `CalculateSurgePrice` sudah include base price. Namun **tidak sesuai dengan deskripsi plan** yang menyebutkan "base + surge". Ini bisa membingungkan developer berikutnya.

> Jika plan diinterpretasi secara harfiah: `calculatePrice` seharusnya memanggil `base + CalculateSurgePrice(...)` — ini akan menjadi **double-counting base price**.

---

## 🔎 Temuan Lain di Luar Scope Plan

### 1. `OwnerBookingController@cancel` — Tidak pakai `BookingService@cancel`
```php
// Aktual (langsung update):
$booking->update(['status' => 'cancelled', 'cancelled_by' => 'owner', ...]);

// Seharusnya (via service agar dispatch BookingCancelled event):
$this->bookingService->cancel($booking, 'owner', $reason);
```
> ⚠️ Event `BookingCancelled` tidak di-dispatch saat owner membatalkan booking. Ini kemungkinan bug yang terlewat.

### 2. `BookingController@checkIn` — Tidak cek `check_in_time` sudah diisi
```php
// Tidak ada guard untuk double check-in:
$booking->update(['check_in_time' => now()]);
```
> Jika customer/owner memanggil checkIn dua kali, `check_in_time` akan ter-overwrite.

### 3. `AutoCompleteBookings` — Query `end_time` bisa bermasalah lintas hari
```php
->where('end_time', '<=', Carbon::now()->format('H:i:s'))
->where('booking_date', '<=', today())
```
> Jika booking tanggal kemarin yang `end_time`-nya sudah lewat tapi belum di-complete, bisa ikut terpull. Perlu kombinasi `booking_date + end_time` sebagai datetime penuh.

---

## 📋 Rekomendasi Tindakan

| Prioritas | Masalah | Rekomendasi |
|-----------|---------|-------------|
| 🔴 High | `OwnerBookingController@cancel` tidak dispatch event | Refactor agar pakai `BookingService@cancel($booking, 'owner', ...)` |
| 🟠 Medium | Logika `CalculateSurgePrice` vs deskripsi plan tidak sinkron | Klarifikasi: apakah action return **total** atau **surcharge saja**? Update komentar/dokumentasi |
| 🟡 Low | `checkIn` tidak guard double check-in | Tambah `if ($booking->check_in_time !== null) return error` |
| 🟡 Low | `AutoCompleteBookings` query `end_time` lintas hari | Gunakan `booking_date + end_time` sebagai datetime penuh |
| 🟢 Info | Fallback `?? '08:00'` di `getSlots` | Pertimbangkan validasi format `operational_hours` di level request/model |

---

## ✅ Kesimpulan

- **3 dari 4 item** plan sudah terimplementasi dengan benar dan sesuai rencana.
- **Item 4** (Surge Pricing) secara fungsional **sudah bekerja**, namun ada inkonsistensi antara deskripsi plan dengan implementasi aktual di `CalculateSurgePrice` yang perlu dikomunikasikan ke tim.
- Ada **1 bug yang terlewat** di `OwnerBookingController@cancel` yang tidak men-dispatch event — ini butuh perhatian segera.
