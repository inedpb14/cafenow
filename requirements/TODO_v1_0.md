# CafeNow — Todo List v1.0

> Daftar pekerjaan berdasarkan gap analysis PRD vs kode yang sudah dibangun.
> Dieksekusi berdasarkan prioritas: Critical → High → Medium → Low.

---

## 🔴 Critical (1 item)

- [x] Fix LockService syntax error (`Cache::->` → `Cache::`)

---

## 🟠 High (4 items)

- [x] Fiksasi booking lifecycle: checkIn, checkout, noShow, extend sesuai status enum
- [x] Daftarkan 3 scheduler command ke `routes/console.php`
- [x] Perbaiki AvailabilityService: baca `operational_hours` cafe, cek `blackout_dates`
- [x] Hubungkan surge pricing: panggil `CalculateSurgePrice` dari `BookingService`

---

## 🟡 Medium (6 items)

- [x] Rate limiting: tambahkan throttle middleware pada auth + booking endpoints
- [x] Search history auto-save saat logged-in user search cafe
- [x] Featured cafe prioritization di `CafeController@index`
- [x] Geolocation/nearby sorting di `CafeController@index`
- [x] Email notifications: booking confirmed, cancelled, rescheduled, refund, order updates
- [x] Event listeners + Reverb broadcasting wiring
- [x] In-app notification endpoint (list/read notifications)

---

## 🟢 Low (9 items)

- [ ] Perbaiki schema drift (15+ field name/value mismatch PRD vs migration)
- [ ] Social login: integrasi Socialite atau buat implementasi nyata
- [ ] Frontend React: halaman customer (browse, booking, payment, orders)
- [ ] Frontend React: halaman owner (dashboard, cafe mgmt, bookings, analytics)
- [ ] Frontend React: halaman admin (panel, registrations, refunds, users)
- [ ] Takeaway order tanpa `booking_id`
- [ ] Admin cancel booking endpoint
- [ ] Tests: feature + unit tests

---

*Terakhir diupdate: 18 July 2026*
