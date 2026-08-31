# Firebase Integration Plan — CafeNow

> **Status:** Plan v1 — disetujui 29 Juli 2026
> **Scope:** Email transport (Firestore + Trigger Email + SendGrid), Google Auth web (Firebase Auth SDK + Admin SDK), notifikasi FCM = phase terpisah (nanti)
> **Total:** 4 file baru + 7 file diubah = ~3-4 jam

---

## 1. Prasyarat

| Item | Status | Catatan |
|------|--------|---------|
| Firebase project | ✅ sudah ada | — |
| SendGrid account | ❌ perlu daftar | SendGrid tier gratis (100 email/hari) cukup |
| Firebase Admin SDK (service account JSON) | ❌ perlu download | Firebase Console → Project Settings → Service Accounts → Generate |
| Google Client ID (untuk Firebase Auth web) | ❌ perlu | Google Cloud Console → OAuth consent + Web client |

## 2. Arsitektur

```
┌─────────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Laravel            │     │  Firebase         │     │  SendGrid    │
│                     │     │                   │     │              │
│  Mail::send() ──────┼──┐  │  Firestore        │     │  Kirim email │
│  (via custom        │  │  │  (collection mail)│─────┤  ke user     │
│   FirestoreTransport)│  │  │  ↑ Trigger Email  │     │  sungguhan   │
│                     │  │  │  extension         │     │              │
│  Auth: Fortify      │  │  │  memproses dokumen │     └──────────────┘
│  + Google btn       │  │  │                    │
│  (Firebase Auth SDK)│  │  └──────────────────┘
└──────┬──────────────┘  │
       │                 │
       └─────────────────┘
```

## 3. Pendekatan — Custom Symfony Transport

Semua kode email **existing tidak berubah**. Cukup:

1. Buat `FirestoreTransport` — Symfony transport yang menulis ke Firestore
2. Daftarkan di `config/mail.php` sebagai mailer baru
3. Ubah `MAIL_MAILER=firestore`
4. Semua `Mail::send()`, Mailable, Fortify email verification, OTP, booking notification → otomatis pakai Firestore

**File 0 perubahan:** OtpService, BookingNotificationMail, 7 listeners, Fortify provider.

---

## 4. Task Breakdown

### Phase 1 — Infrastruktur Firebase

| # | Task | File | Est |
|:-:|:-----|:-----|:---:|
| **P1.1** | `composer require kreait/laravel-firebase` | `composer.json` | 5m |
| **P1.2** | Publish config & download service account JSON | `config/firebase.php`, `.env` | 10m |
| **P1.3** | Daftar SendGrid, dapatkan API key | (external) | 10m |
| **P1.4** | Install Firebase Extension "Trigger Email" di Firebase Console | (Firebase console) | 15m |
| **P1.5** | Test koneksi Firebase dari Laravel (CLI) | — | 5m |

### Phase 2 — Custom Email Transport ke Firestore

| # | Task | File | Est |
|:-:|:-----|:-----|:---:|
| **P2.1** | Buat `FirestoreTransport` — implement `Symfony\Component\Mailer\Transport\TransportInterface` | **Baru** `app/Transports/FirestoreTransport.php` | 30m |
| **P2.2** | Ubah `send()`: baca `Envelope` → tulis ke Firestore collection `mail`: `to`, `from`, `subject`, `htmlBody`, `textBody` | (dalam P2.1) | — |
| **P2.3** | Daftarkan mailer `firestore` di `config/mail.php` | `config/mail.php` | 5m |
| **P2.4** | Ubah `MAIL_MAILER=firestore` di `.env`, hapus baris Mailtrap | `.env` | 2m |
| **P2.5** | Test: register customer → OTP → cek Firestore Console → cek SendGrid activity | — | 10m |

### Phase 3 — Google Auth (Web)

| # | Task | File | Est |
|:-:|:-----|:-----|:---:|
| **P3.1** | Tambah Firebase JS SDK (`npm install firebase`) + buat `firebase.ts` config | **Baru** `resources/js/firebase.ts` | 10m |
| **P3.2** | Tambah tombol "Masuk dengan Google" di `login.tsx` (Firebase Auth popup) | `resources/js/pages/auth/login.tsx` | 45m |
| **P3.3** | Buat `GoogleAuthController@handleGoogleLogin` — terima ID token, verifikasi via Firebase Admin SDK, login/create user | **Baru** `app/Http/Controllers/Auth/GoogleAuthController.php` | 30m |
| **P3.4** | Tambah route `POST /auth/google` | `routes/web.php` | 5m |
| **P3.5** | Tambah `firebase_uid` di migration users table | Migration baru | 10m |
| **P3.6** | Test: login dengan Google → sesi terbuat → redirect ke dashboard | — | 10m |

---

## 5. Ringkasan File

| Status | File | Keterangan |
|:------:|:-----|:-----------|
| 🆕 | `app/Transports/FirestoreTransport.php` | Custom Symfony transport |
| 🆕 | `resources/js/firebase.ts` | Firebase JS SDK config |
| 🆕 | `app/Http/Controllers/Auth/GoogleAuthController.php` | Handle Google ID token |
| 🆕 | Migration: add `firebase_uid` ke `users` table | — |
| ✏️ | `composer.json` | Add `kreait/laravel-firebase` |
| ✏️ | `config/firebase.php` | Published package config |
| ✏️ | `config/mail.php` | Added `firestore` mailer |
| ✏️ | `.env` | Firebase creds, SendGrid, hapus Mailtrap |
| ✏️ | `resources/js/pages/auth/login.tsx` | Google Sign-In button |
| ✏️ | `routes/web.php` | `POST /auth/google` |
| ✏️ | `package.json` | Add `firebase` JS package |
| 0️⃣ | `app/Services/Auth/OtpService.php` | No changes |
| 0️⃣ | `app/Mail/BookingNotificationMail.php` | No changes |
| 0️⃣ | 7 listener files | No changes |
| 0️⃣ | `app/Providers/FortifyServiceProvider.php` | No changes |

**Total:** 4 baru + 7 diubah = ~3-4 jam

---

## 6. Prioritas Eksekusi

```
Fase 1 — Infrastruktur (45m)
  P1.1 → P1.2 → P1.3 → P1.4 → P1.5

Fase 2 — Email Transport (50m)
  P2.1 + P2.2 → P2.3 → P2.4 → P2.5

Fase 3 — Google Auth (1.5j)
  P3.1 → P3.3 + P3.4 + P3.5 → P3.2 → P3.6
```
