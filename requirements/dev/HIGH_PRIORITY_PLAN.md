# High Priority Fixes — Implementation Plan

> 4 item High priority dari gap analysis PRD vs codebase.

---

## Execution Status

| Item | Status | Tanggal | Files Changed |
|------|--------|---------|---------------|
| 1. Booking Lifecycle | ✅ **Executed** | 19 Jul 2026 | `BookingController`, `OwnerBookingController`, `AvailabilityService` |
| 2. Scheduler Commands | ✅ **Executed** | 19 Jul 2026 | `routes/console.php`, `AutoCompleteBookings` |
| 3. Operational Hours | ✅ **Executed** | 19 Jul 2026 | `AvailabilityService`, `BookingController`, `CafeController`, `TableController` |
| 4. Surge Pricing | ✅ **Executed** | 19 Jul 2026 | `BookingService` |

---

## Item 1: Booking Lifecycle — Status Flow Fix

### Masalah

| Method | Saat Ini (Salah) | Seharusnya |
|--------|------------------|------------|
| `BookingController@checkIn` | Status tetap `confirmed`, cuma set `check_in_time` | Status → `confirmed` (sudah benar karena enum tidak punya `checked_in`), **dispatch `BookingCheckIn` event** |
| `BookingController@extend` | Hanya izinkan extend saat status `confirmed` | Izinin saat status `confirmed` (sudah benar). **Tambah dispatch `BookingExtended` event** |
| `OwnerBookingController@checkout` | Cek status `confirmed`, langsung set `completed` | Cek **`check_in_time` tidak null** (sedang check-in), set `check_out_time` + `completed` |
| `OwnerBookingController@noShow` | Set status `cancelled` | Set status `no_show` (pakai enum `BookingStatus::NoShow`) |
| `BookingService@confirmPayment` | Tidak dispatch `BookingCheckIn` | Sudah benar — `BookingConfirmed` sudah di-dispatch |

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `app/Http/Controllers/Booking/BookingController.php` | checkIn: dispatch event. extend: dispatch event |
| `app/Http/Controllers/Booking/OwnerBookingController.php` | checkout: cek check_in_time, noShow: pakai status `no_show` |
| `app/Services/Booking/AvailabilityService.php` | isAvailable() method juga exclude status `no_show` |

---

## Item 2: Daftarkan Scheduler Command

### Masalah
3 command ada di `app/Console/Commands/` tapi tidak terdaftar di Laravel scheduler. Tidak akan jalan otomatis.

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `routes/console.php` | Tambah `Schedule` commands untuk 3 cron: `bookings:cancel-expired-pending` (everyMinute), `orders:auto-schedule-preparing` (everyMinute), `bookings:auto-complete` (everyMinute) |
| `app/Console/Commands/AutoCompleteBookings.php` | Fix query: tambah `check_in_time is not null` (jangan auto-complete yang belum check-in) |
| `app/Console/Kernel.php` | Jika file belum ada, gunakan `routes/console.php` (= sudah ada) |

### Schedule

```
* * * * * cd /path && php artisan bookings:cancel-expired-pending >> /dev/null 2>&1
* * * * * cd /path && php artisan orders:auto-schedule-preparing >> /dev/null 2>&1
* * * * * cd /path && php artisan bookings:auto-complete >> /dev/null 2>&1
```

---

## Item 3: AvailabilityService — Baca Operational Hours Cafe

### Masalah
`getSlots()` hardcode jam 08:00–22:00 dan tidak membaca `operational_hours` dari model Cafe. Akibatnya slot availability tidak akurat.

### Struktur `operational_hours` (JSON)
```json
{
  "mon": [{"open": "08:00", "close": "22:00"}],
  "tue": [{"open": "08:00", "close": "22:00"}],
  "wed": [{"open": "08:00", "close": "22:00"}],
  "thu": [{"open": "08:00", "close": "22:00"}],
  "fri": [{"open": "08:00", "close": "23:00"}],
  "sat": [{"open": "09:00", "close": "23:00"}],
  "sun": [{"open": "09:00", "close": "21:00"}]
}
```

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `app/Services/Booking/AvailabilityService.php` | getSlots: terima parameter `$cafeOperationalHours` array. Parse day → cari open/close. Generate slot berdasarkan range tersebut. Jika hari tutup → return empty collection |
| `app/Http/Controllers/Cafe/CafeController.php` | availability: passing `$cafe->operational_hours` ke `AvailabilityService@getSlots` |
| `app/Http/Controllers/Booking/BookingController.php` | availability: passing operational_hours ke `getSlots` |

### Flow getSlots baru
1. Parse day dari date (`Carbon::parse($date)->format('D')` → `Mon`, `Tue`, dll → lowercase)
2. Cari `$operationalHours[strtolower($day)]`
3. Jika tidak ada atau array kosong → return empty collection (cafe tutup)
4. Jika ada → parse open/close → generate slot 30 menit
5. Filter slot yang sudah lewat (past/now) → `unavailable`
6. Cek lock → `locked`, cek booking → `booked`

---

## Item 4: Surge Pricing — Hubungkan CalculateSurgePrice

### Masalah
`CalculateSurgePrice` action class sudah ada dan lengkap, tapi tidak pernah dipanggil dari `BookingService@calculatePrice`.

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `app/Services/Booking/BookingService.php` | Inject `CalculateSurgePrice`. Di method `calculatePrice`, setelah hitung base price, panggil `CalculateSurgePrice` untuk custom rule. Total = base price + surge surcharge. |

### Flow calculatePrice baru
1. Jika rule null → return 0
2. Jika `fixed` → return `$rule->price`
3. Jika `custom`:
   - Base = `$rule->base_price_per_hour * ($duration / 60)`
   - Surge = `CalculateSurgePrice($rule, $date, $startTime, $duration)`
   - Return base + surge

---

## Dependency Graph

```
Item 1 (Booking Lifecycle) ── independen
Item 2 (Scheduler) ───────── independen
Item 3 (Availability) ────── independen  
Item 4 (Surge Pricing) ───── independen
```

Semua item independen — bisa dikerjakan dalam urutan apapun.

---

## Estimasi

| Item | File Diubah | Estimasi |
|------|-------------|----------|
| 1. Booking Lifecycle | 3 file | ~15 menit |
| 2. Scheduler | 2 file | ~10 menit |
| 3. AvailabilityService | 2 file | ~15 menit |
| 4. Surge Pricing | 1 file | ~10 menit |
| **Total** | **~8 file** | **~50 menit** |

---

*Dibuat: 19 July 2026*
