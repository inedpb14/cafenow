# CafeNow — Product Specification v1.0

> **Cafe Table Reservation & Menu Ordering Platform**
> Built with Laravel 12 + React + Inertia + Reverb + SQLite

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [API Specifications](#5-api-specifications)
6. [Enums & Constants](#6-enums--constants)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Booking System](#8-booking-system)
9. [Payment System](#9-payment-system)
10. [Menu & Ordering System](#10-menu--ordering-system)
11. [Favorites & Search](#11-favorites--search)
12. [Commission System](#12-commission-system)
13. [Notifications](#13-notifications)
14. [Analytics & Admin](#14-analytics--admin)
15. [Real-time Features](#15-real-time-features)
16. [Scheduled Jobs](#16-scheduled-jobs)
17. [Error Handling](#17-error-handling)
18. [Security](#18-security)
19. [Installation & Setup](#19-installation--setup)
20. [Project Structure](#20-project-structure)

---

## 1. Project Overview

CafeNow connects cafe customers with cafe owners through a digital platform for table reservations and menu ordering.

### User Roles

| Role | Description |
|------|-------------|
| **Customer** | Registers, browses cafes, books tables, orders food, manages favorites |
| **Owner** | Registers/manages cafes, manages tables & menus, views analytics, processes orders |
| **Admin** | Approves/rejects cafe registrations, manages commissions, handles refunds, views platform analytics |

### Core Flows

1. **Customer** → Browse cafes → View availability → Reserve table → Pay → Order menu → Check in → Enjoy → Check out
2. **Owner** → Register cafe → Configure tables → Set pricing → Manage menu → Accept bookings → Serve orders → Analytics
3. **Admin** → Review registrations → Manage commissions → Handle refunds → Oversee platform

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| **Backend Framework** | Laravel 12 (PHP 8.4) |
| **Frontend** | React + Inertia.js + Ziggy |
| **Database** | SQLite (dev) / MySQL (prod-ready) |
| **Cache** | File (dev) / Redis (prod-ready) |
| **Queue** | Sync (dev) / Database (prod-ready) |
| **Broadcasting** | Laravel Reverb |
| **Authentication** | Laravel Fortify + Sanctum |
| **Payment Gateway** | Midtrans (Snap API) |
| **Passkeys** | Laravel Passkeys (WebAuthn) |
| **2FA** | Laravel Fortify Two-Factor Authentication |

---

## 3. System Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React UI  │────▶│  Inertia.js  │────▶│ Laravel API │
│  (Frontend) │     │  (Middleware) │     │  (Backend)  │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                    ┌───────────────────────────┼───────────────────┐
                    │                           │                   │
               ┌────▼────┐              ┌──────▼──────┐    ┌──────▼──────┐
               │ SQLite  │              │   Redis     │    │   Reverb    │
               │ (MySQL) │              │ (Cache/Lock)│    │ Broadcast   │
               └─────────┘              └─────────────┘    └─────────────┘

```

### Key Design Patterns

- **Readonly classes** for services and actions (immutable by design)
- **toDto() pattern** on Form Requests — separates validated data from HTTP
- **Consistent API envelope** — `{success, data, error, meta}` on all API responses
- **Action classes** — single-responsibility invokable classes for business logic
- **Service layer** — orchestration of multiple actions and sub-services
- **Event-driven** — booking lifecycle events for decoupled workflows

---

## 4. Database Schema

### Entity Relationship Summary

```
User (1) ──< Cafe (owner_id)
Cafe (1) ──< CafePhoto
Cafe (1) ──< Table
Cafe (1) ──< MenuItem
Table (1) ──< BookingRule
Table (1) ──< Booking
Booking (1) ──< Payment (polymorphic: payable)
Booking (1) ──< RefundRequest
Booking (1) ──< MenuOrder
MenuOrder (1) ──< MenuOrderItem
MenuItem (1) ──< MenuOrderItem
User (1) ──< Favorite
User (1) ──< SearchHistory
User (1) ──< AdminAuditLog (admin_id)
User (1) ──< Notification (polymorphic: recipient)
```

### Table Details

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint AI | |
| name | string | |
| email | string | unique |
| password | string | hashed |
| role | string | customer/owner/admin |
| phone | string? | |
| avatar | string? | |
| email_verified_at | timestamp? | |
| two_factor_secret | text? | |
| two_factor_recovery_codes | text? | |
| two_factor_confirmed_at | timestamp? | |
| remember_token | string? | |
| timestamps | | |

#### `cafes`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint AI | |
| owner_id | FK→users | |
| name | string | |
| slug | string | unique |
| description | text? | |
| address | string | |
| latitude | decimal(10,7) | |
| longitude | decimal(10,7) | |
| operating_hours | JSON | {mon: [{open,close}], ...} |
| approval_status | string | pending/approved/rejected/suspended |
| rejection_reason | text? | |
| average_rating | decimal(2,1) | default 0.0 |
| total_reviews | int | default 0 |
| timestamps | | |
| soft_deletes | | |

#### `cafe_photos`
| Column | Type |
|--------|------|
| id | bigint AI |
| cafe_id | FK→cafes |
| photo_url | string |
| is_primary | bool (default false) |

#### `tables`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint AI | |
| cafe_id | FK→cafes | |
| table_number | string | within cafe |
| capacity | int | max guests |
| status | string | active/inactive/maintenance |
| unique | (cafe_id, table_number) | |

#### `booking_rules`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint AI | |
| table_id | FK→tables | unique |
| rule_type | string | fixed/custom |
| price | decimal(10,2)? | if fixed |
| base_price_per_hour | decimal(10,2)? | if custom |
| surge_rules | JSON? | [{days, start_time, end_time, type, value}] |
| min_duration_minutes | int? | default 60 |
| max_duration_minutes | int? | |
| min_advance_hours | int? | default 2 |

#### `bookings`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint AI | |
| cafe_id | FK→cafes | |
| table_id | FK→tables | |
| customer_id | FK→users | |
| booking_rule_id | FK→booking_rules? | |
| booking_reference | string | unique (BKG-YYYYMMDD-XXXXX) |
| booking_date | date | |
| start_time | time | |
| end_time | time | |
| duration_minutes | int | |
| guest_count | int | |
| status | string | pending/confirmed/checked_in/checked_out/cancelled/no_show/extended |
| table_price | decimal(10,2) | |
| menu_subtotal | decimal(10,2) | default 0 |
| total_price | decimal(10,2) | |
| commission | decimal(10,2) | |
| cafe_receives | decimal(10,2) | |
| payment_status | string | unpaid/paid/refunded/partial_refund |
| cancelled_by | string? | customer/owner/admin/system |
| cancellation_reason | text? | |
| customer_notes | text? | |
| lock_expires_at | timestamp? | 15-min lock window |
| checked_in_at | timestamp? | |
| checked_out_at | timestamp? | |
| timestamps | | |

#### `payments`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint AI | |
| payable_id | int | polymorphic |
| payable_type | string | booking/menu_order |
| amount | decimal(10,2) | |
| payment_method | string? | |
| status | string | pending/success/failed/expired/refund |
| midtrans_order_id | string? | |
| midtrans_transaction_id | string? | |
| snap_token | string? | |
| snap_redirect_url | string? | |
| payment_channel | string? | |
| paid_at | timestamp? | |
| timestamps | | |

#### `menu_items`
| Column | Type |
|--------|------|
| id | bigint AI |
| cafe_id | FK→cafes |
| name | string |
| description | text? |
| price | decimal(10,2) |
| category | string (food/beverage/snack/dessert) |
| image_url | string? |
| availability_status | string (available/unavailable) |
| timestamps | |
| soft_deletes | |

#### `menu_orders`
| Column | Type |
|--------|------|
| id | bigint AI |
| booking_id | FK→bookings? |
| cafe_id | FK→cafes |
| customer_id | FK→users |
| order_type | string (dine_in/takeaway) |
| status | string (pending/confirmed/preparing/ready/served/cancelled) |
| subtotal | decimal(10,2) |
| timestamps | |

#### `menu_order_items`
| Column | Type |
|--------|------|
| id | bigint AI |
| menu_order_id | FK→menu_orders |
| menu_item_id | FK→menu_items |
| quantity | int |
| unit_price | decimal(10,2) |
| subtotal | decimal(10,2) |
| notes | text? |

#### `refund_requests`
| Column | Type |
|--------|------|
| id | bigint AI |
| booking_id | FK→bookings |
| amount | decimal(10,2) |
| reason | text |
| status | string (pending/approved/rejected) |
| processed_by | FK→users? |
| processed_at | timestamp? |
| timestamps | |

#### `notifications`
| Column | Type |
|--------|------|
| id | bigint AI |
| recipient_type | string (customer/owner) |
| recipient_id | int |
| type | string |
| title | string |
| body | text |
| data | JSON? |
| is_read | bool (default false) |
| read_at | timestamp? |
| timestamps | |

#### `favorites`
| Column | Type |
|--------|------|
| id | bigint AI |
| customer_id | FK→users |
| cafe_id | FK→cafes |
| unique | (customer_id, cafe_id) |

#### `search_history`
| Column | Type |
|--------|------|
| id | bigint AI |
| customer_id | FK→users |
| keyword | string |
| cafe_id | FK→cafes? |
| timestamps | |

#### `commission_rules`
| Column | Type | Notes |
|--------|------|-------|
| id | bigint AI | |
| commission_type | string | percentage/fixed |
| value | decimal(5,2) | |
| min_amount | decimal(10,2)? | |
| max_amount | decimal(10,2)? | |
| active_from | datetime? | |
| active_until | datetime? | |

#### `admin_audit_logs`
| Column | Type |
|--------|------|
| id | bigint AI |
| admin_id | FK→users |
| action | string |
| entity_type | string |
| entity_id | int? |
| old_values | JSON? |
| new_values | JSON? |
| ip_address | string? |
| user_agent | string? |
| timestamps | |

#### `featured_cafes`
| Column | Type |
|--------|------|
| id | bigint AI |
| cafe_id | FK→cafes |
| position | int |
| starts_at | datetime |
| ends_at | datetime |

---

## 5. API Specifications

### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register customer |
| POST | `/api/auth/login` | Public | Login customer |
| POST | `/api/auth/social-login` | Public | Social login (Google/Apple) |
| POST | `/api/auth/verify-otp` | Public | Verify email OTP |
| POST | `/api/auth/resend-otp` | Public | Resend verification OTP |
| POST | `/api/auth/forgot-password` | Public | Request password reset |
| POST | `/api/auth/reset-password` | Public | Reset password |
| POST | `/api/auth/logout` | Sanctum | Logout |
| POST | `/api/auth/refresh-token` | Sanctum | Refresh token |
| GET | `/api/customer/profile` | Sanctum | Get customer profile |
| PUT | `/api/customer/profile` | Sanctum | Update customer profile |
| POST | `/api/owner/register` | Public | Register cafe owner |
| POST | `/api/owner/login` | Public | Login owner |
| POST | `/api/owner/forgot-password` | Public | Owner forgot password |
| POST | `/api/owner/reset-password` | Public | Owner reset password |
| GET | `/api/owner/profile` | Sanctum | Get owner profile |
| PUT | `/api/owner/profile` | Sanctum | Update owner profile |
| POST | `/api/admin/login` | Public | Admin login |

### Cafe Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cafes` | Public | List cafes (search/filter) |
| GET | `/api/cafes/{cafe}` | Public | Cafe detail w/ photos |
| GET | `/api/cafes/{cafe}/availability` | Public | Check availability |
| GET | `/api/cafes/{cafe}/tables` | Public | List cafe tables |
| GET | `/api/cafes/{cafe}/tables/{table}/slots` | Public | Get time slots |
| GET | `/api/cafes/{cafe}/menus` | Public | List cafe menus |
| POST | `/api/owner/cafes` | Owner | Register cafe |
| PUT | `/api/owner/cafes/{cafe}` | Owner | Update cafe |
| POST | `/api/owner/cafes/{cafe}/hours` | Owner | Set operating hours |
| POST | `/api/owner/cafes/{cafe}/blackout` | Owner | Set blackout dates |
| POST | `/api/owner/cafes/{cafe}/photos` | Owner | Upload photos |
| DELETE | `/api/owner/cafes/{cafe}/photos/{photoId}` | Owner | Delete photo |

### Table Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/owner/tables` | Owner | Add table |
| PUT | `/api/owner/tables/{table}` | Owner | Update table |
| DELETE | `/api/owner/tables/{table}` | Owner | Remove table |
| POST | `/api/owner/tables/{table}/booking-rules` | Owner | Set pricing rules |

### Booking Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bookings/availability` | Sanctum | Check slot availability |
| POST | `/api/bookings` | Sanctum | Create booking |
| GET | `/api/bookings/{booking}` | Sanctum | Booking detail |
| PUT | `/api/bookings/{booking}/cancel` | Sanctum | Cancel booking |
| PUT | `/api/bookings/{booking}/reschedule` | Sanctum | Reschedule booking |
| POST | `/api/bookings/{booking}/checkin` | Sanctum | Check in |
| POST | `/api/bookings/{booking}/extend` | Sanctum | Extend duration |
| POST | `/api/bookings/{booking}/refund-request` | Sanctum | Request refund |
| GET | `/api/customer/bookings` | Sanctum | Customer's bookings |
| GET | `/api/owner/bookings` | Owner | Owner's bookings |
| PUT | `/api/owner/bookings/{booking}/cancel` | Owner | Cancel booking |
| PUT | `/api/owner/bookings/{booking}/no-show` | Owner | Mark no-show |
| PUT | `/api/owner/bookings/{booking}/checkout` | Owner | Check out |

### Menu & Order Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/owner/menus` | Owner | Add menu item |
| PUT | `/api/owner/menus/{menuItem}` | Owner | Update menu item |
| DELETE | `/api/owner/menus/{menuItem}` | Owner | Remove menu item |
| PUT | `/api/owner/menus/{menuItem}/toggle` | Owner | Toggle availability |
| PUT | `/api/owner/menus/bulk-toggle` | Owner | Bulk toggle availability |
| POST | `/api/orders` | Sanctum | Place menu order |
| GET | `/api/orders/{menuOrder}` | Sanctum | Order detail |
| GET | `/api/customer/orders` | Sanctum | Customer's orders |
| GET | `/api/owner/orders` | Owner | Owner's orders |
| PUT | `/api/owner/orders/{menuOrder}/status` | Owner | Update order status |

### Payment Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payments` | Sanctum | Initiate payment |
| GET | `/api/payments/{payment}/status` | Sanctum | Payment status |
| POST | `/api/payments/webhook` | Public | Midtrans webhook |

### Favorites & Search

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/favorites` | Customer | Add favorite |
| DELETE | `/api/favorites/{cafe}` | Customer | Remove favorite |
| GET | `/api/customer/favorites` | Customer | List favorites |
| GET | `/api/customer/search-history` | Customer | Search history |
| DELETE | `/api/customer/search-history` | Customer | Clear history |
| DELETE | `/api/customer/search-history/{cafe}` | Customer | Delete one entry |

### Analytics Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/owner/analytics/dashboard` | Owner | Owner dashboard |
| GET | `/api/owner/analytics/revenue` | Owner | Revenue report |
| GET | `/api/owner/analytics/bookings` | Owner | Bookings report |
| GET | `/api/owner/analytics/menus` | Owner | Menu performance |
| GET | `/api/admin/analytics/platform` | Admin | Platform overview |
| GET | `/api/admin/analytics/commission` | Admin | Commission report |

### Admin Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/cafe-registrations` | Admin | List registrations |
| POST | `/api/admin/cafe-registrations/{cafe}/approve` | Admin | Approve cafe |
| POST | `/api/admin/cafe-registrations/{cafe}/reject` | Admin | Reject cafe |
| GET | `/api/admin/cafes` | Admin | List all cafes |
| PUT | `/api/admin/cafes/{cafe}/suspend` | Admin | Suspend cafe |
| GET | `/api/admin/commission-rules` | Admin | Get commission config |
| PUT | `/api/admin/commission-rules` | Admin | Update commission config |
| GET | `/api/admin/bookings` | Admin | All bookings |
| GET | `/api/admin/orders` | Admin | All orders |
| GET | `/api/admin/refunds` | Admin | Refund requests |
| POST | `/api/admin/refunds/{refundRequest}/process` | Admin | Approve refund |
| POST | `/api/admin/refunds/{refundRequest}/reject` | Admin | Reject refund |
| GET | `/api/admin/users` | Admin | All users |
| PUT | `/api/admin/users/{user}/suspend` | Admin | Suspend user |
| GET | `/api/admin/featured-cafes` | Admin | Featured cafes |
| POST | `/api/admin/featured-cafes` | Admin | Add featured cafe |
| PUT | `/api/admin/featured-cafes/{featuredCafe}` | Admin | Update featured |
| DELETE | `/api/admin/featured-cafes/{featuredCafe}` | Admin | Remove featured |

---

## 6. Enums & Constants

### `UserRole`
- `customer` — end user who books and orders
- `owner` — cafe manager/owner
- `admin` — platform administrator

### `BookingStatus`
- `pending` — waiting for payment
- `confirmed` — paid and confirmed
- `checked_in` — customer arrived
- `checked_out` — session ended
- `cancelled` — cancelled by any party
- `no_show` — customer didn't arrive
- `extended` — duration extended

### `PaymentStatus`
- `pending` — awaiting Midtrans response
- `success` — payment completed
- `failed` — payment declined/failed
- `expired` — payment window expired
- `refund` — refunded

### `MenuOrderStatus`
- `pending` — order placed
- `confirmed` — accepted by owner
- `preparing` — being prepared
- `ready` — ready to serve
- `served` — delivered
- `cancelled` — cancelled

### `CafeApprovalStatus`
- `pending` — awaiting admin review
- `approved` — active on platform
- `rejected` — registration rejected
- `suspended` — temporarily disabled

### `BookingRuleType`
- `fixed` — flat price per booking
- `custom` — hourly rate with optional surge

### `CommissionType`
- `percentage` — percent of booking value
- `fixed` — flat amount per booking

---

## 7. Authentication & Authorization

### Authentication Layers

1. **Sanctum Token-based API auth** — all API routes use `auth:sanctum` middleware
2. **Fortify** — handles login, registration, password reset, email verification, 2FA
3. **Passkeys (WebAuthn)** — passwordless authentication via device biometrics
4. **OTP Verification** — email verification via OTP code
5. **Social Login** — Google/Apple OAuth endpoints ready

### Route Middleware

| Middleware | Applied To |
|-----------|------------|
| `auth:sanctum` | All protected API routes |
| `role:customer` | Customer-specific endpoints (favorites, customer profile) |
| `role:owner` | Owner endpoints (cafe management, orders, analytics) |
| `role:admin` | Admin endpoints (cafe approval, commissions, users) |
| `verified` | Web dashboard routes |

### Auth Controllers (planned)

- `CustomerAuthController` — register, login, socialLogin, verifyOtp, resendOtp, forgotPassword, resetPassword, logout, refreshToken
- `OwnerAuthController` — register, login, forgotPassword, resetPassword
- `AdminAuthController` — login
- `CustomerProfileController` — show, update
- `OwnerProfileController` — show, update

---

## 8. Booking System

### Booking Flow

```
1. Availability Check ─── Customer queries date/time → system checks slots
2. Temporary Lock    ─── Server locks slot for 15 min (Redis TTL)
3. Create Booking    ─── Booking record created (status: pending)
4. Initiate Payment  ─── Midtrans Snap token generated
5. Payment Webhook   ─── Midtrans notifies server
6. Confirm Booking   ─── Status → confirmed, Lock released
7. Event Dispatch    ─── BookingConfirmed event
8. Check In          ─── Customer arrives → status → checked_in
9. Check Out         ─── Duration ends / owner checks out
10. Auto-Complete    ─── Cron job marks past bookings
```

### Key Components

#### `LockService`
- Redis-based distributed lock per (table_id, date, start_time)
- TTL: 900 seconds (15 minutes)
- Methods: `acquire()`, `release()`, `releaseForBooking()`

#### `AvailabilityService`
- Checks if a slot is free (not booked, not locked)
- Generates available time slots for a table on a given date
- Respects operating hours and blackout dates

#### `BookingService`
- Orchestrates the full booking lifecycle
- Coordinates Lock → Availability → Commission → DB transaction
- Handles: create, confirmPayment, cancel, reschedule

#### `CheckBookingEligibility` (Action)
- Validates booking is at least 2 hours in advance
- Prevents past-date bookings

#### `CalculateSurgePrice` (Action)
- Applies time-based surcharge for custom-priced tables
- Supports per-day-of-week rules with multiplier or percentage types

### Cancellation Rules
- **Customer**: can cancel up to 3 hours before start
- **Owner**: can cancel anytime
- **Admin**: can cancel anytime
- **System**: auto-cancels unpaid bookings after 15 min

### Rescheduling
- Customer can reschedule to another available slot
- Original slot is released, new slot is locked
- Price recalculated if needed

### Extend
- Customer can request extension during active session
- Owner can approve or deny
- Additional payment may be required

---

## 9. Payment System

### Midtrans Integration

```
┌──────────┐     ┌──────────┐     ┌───────────┐
│  Client  │────▶│  Server  │────▶│  Midtrans │
│ (React)  │     │ (Laravel)│     │   API     │
└──────────┘     └──────────┘     └───────────┘
     │               │                  │
     │◀──Snap Token──│                  │
     │               │                  │
     │──── Redirect to Midtrans ───────▶│
     │               │                  │
     │◀── Webhook POST ────────────────│
     │               │                  │
     │◀─── Payment Status ─────────────│
```

#### `MidtransService`
- `createTransaction(array)` — charge via Midtrans Snap API
- `verifySignature(orderId, statusCode, grossAmount, signatureKey)` — SHA-512 verification
- `refund(orderId, amount)` — process refund
- `status(orderId)` — check transaction status
- Sandbox/Production mode via config

### Payment Flow

1. Booking created (status: pending, payment_status: unpaid)
2. POST `/api/payments` → Midtrans snap token generated
3. Client redirects to Midtrans Snap page
4. Customer completes payment on Midtrans
5. Midtrans sends webhook POST to `/api/payments/webhook`
6. Signature verified → Booking confirmed
7. `BookingConfirmed` event dispatched

### Webhook Security
- SHA-512 signature verification using server key
- Order ID validation against existing bookings
- `WebhookSignatureException` on mismatch

---

## 10. Menu & Ordering System

### Menu Management (Owner)

- CRUD menu items per cafe
- Categories: food, beverage, snack, dessert
- Toggle individual or bulk availability
- Soft deletes for menu items

### Order Flow

1. Customer places order (dine_in or takeaway)
2. Order status: pending
3. Owner views incoming orders
4. Owner confirms → confirmed
5. Auto-schedule preparing (cron)
6. Owner marks ready → ready
7. Served → served

### Order types
- `dine_in` — linked to a booking
- `takeaway` — no table required

---

## 11. Favorites & Search

### Favorites
- Customers can save cafes as favorites
- One-click toggle (add/remove)
- Unique constraint per (customer, cafe)
- Dedicated listing endpoint

### Search History
- Auto-saves customer search keywords
- Optionally links to cafe if customer clicked through
- Customers can view, clear all, or delete individual entries
- Limited entries (automatic cleanup)

---

## 12. Commission System

### `CommissionService`
- `calculateBookingCommission(price)` — applies active commission rule
- `calculateOrderCommission(subtotal)` — for menu orders

### Commission Rules
- Type: percentage or fixed
- Min/max amount caps
- Date-bound activation periods
- Single active rule (singleton)

### Revenue Distribution
- `commission` = platform fee
- `cafe_receives` = total_price - commission
- Both stored per booking for audit trail

---

## 13. Notifications

### Types
- Booking confirmed, cancelled, rescheduled, extended
- Reminder before booking time
- Order status updates
- Refund status changes
- Cafe approval/rejection

### Storage
- Polymorphic recipient (customer or owner)
- Read/unread tracking
- JSON data payload for context

### Delivery (future)
- In-app notification via Reverb
- Email (via Mail)
- Push notification (via Firebase)

---

## 14. Analytics & Admin

### Owner Analytics
- **Dashboard** — summary cards (total bookings, revenue, active reservations)
- **Revenue** — daily/weekly/monthly breakdown
- **Bookings** — booking trends, peak hours, table utilization
- **Menus** — popular items, order frequency

### Admin Platform
- **Platform** — total users, cafes, bookings, revenue
- **Commission** — total commissions, outstanding

### Admin Management
- Cafe registration approval workflow
- Commission rule configuration
- Refund request processing
- User/cafe suspension
- Featured cafe management
- Full audit log of admin actions

### Audit Log
- Records all admin actions with old/new values
- Tracks IP address and user agent
- Immutable history for compliance

---

## 15. Real-time Features

### Reverb Channels

| Channel | Event | Payload |
|---------|-------|---------|
| `cafe.{id}.availability.{date}` | availability:updated | { table_id, slots } |
| `booking.{id}` | booking:status | { status, payment_status } |

### Broadcasting Events

| Event | Data |
|-------|------|
| `BookingConfirmed` | booking_id, customer_id, cafe_id, table_id, reference |
| `BookingCancelled` | booking_id, cancelled_by, reason |
| `BookingRescheduled` | booking_id, old_date, new_date, old_start, new_start |
| `BookingExtended` | booking_id, additional_minutes |
| `BookingCheckIn` | booking_id, checked_in_at |
| `OrderPlaced` | order_id, cafe_id, customer_id |
| `PaymentReceived` | payment_id, booking_id, amount, status |

---

## 16. Scheduled Jobs

| Command | Schedule | Description |
|---------|----------|-------------|
| `AutoCompleteBookings` | Every minute | Scans `checked_in` bookings past end_time → marks `checked_out` |
| `CancelExpiredPendingBookings` | Every minute | Cancels `pending` bookings older than 15 min |
| `AutoScheduleMenuPreparing` | Every minute | Changes `confirmed` orders near booking time → `preparing` |

All commands are registered in `routes/console.php` and use Kernel schedule.

---

## 17. Error Handling

### Consistent API Response Format

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validasi gagal",
    "fields": {
      "email": ["Email wajib diisi"]
    }
  }
}
```

### Error Codes

| Exception | Code | HTTP Status |
|-----------|------|-------------|
| ValidationException | VALIDATION_ERROR | 422 |
| ModelNotFoundException | NOT_FOUND | 404 |
| AuthenticationException | UNAUTHENTICATED | 401 |
| AuthorizationException | FORBIDDEN | 403 |
| BookingTimeWindowException | BOOKING_TIME_WINDOW | 422 |
| SlotNotAvailableException | SLOT_NOT_AVAILABLE | 409 |
| CancellationTimeExpiredException | CANCELLATION_EXPIRED | 422 |
| ExtendBookingLimitException | EXTEND_LIMIT | 422 |
| PaymentFailedException | PAYMENT_FAILED | 402 |
| WebhookSignatureException | WEBHOOK_INVALID | 401 |
| HttpException | HTTP_ERROR | varies |
| Default | SERVER_ERROR | 500 |

### Handler Design
- Custom `Handler` extends Laravel's `ExceptionHandler`
- All API responses follow the same envelope
- Indonesian error messages for user-facing errors
- HTTP status codes match the problem

---

## 18. Security

### Authentication
- Sanctum token-based API authentication
- Fortify for web authentication with 2FA support
- Passkeys (WebAuthn) for passwordless login
- OTP verification for email confirmation

### Authorization
- Role-based middleware: `role:customer`, `role:owner`, `role:admin`
- Route groups scoped by role
- Owner can only manage their own cafes

### Payment Security
- Midtrans SHA-512 signature verification
- Server-side webhook validation
- No payment credentials exposed to client

### Data Protection
- Password hashed via Laravel's built-in hashing
- 2FA secrets encrypted
- API tokens stored hashed by Sanctum
- SQL injection prevention via Eloquent ORM

### Rate Limiting (planned)
- API rate limiting on auth endpoints
- Booking creation rate limiting

---

## 19. Installation & Setup

### Requirements
- PHP 8.4+
- Composer 2.x
- Node.js 18+
- SQLite (dev) / MySQL 8+ (prod)
- Redis (for locks + cache in production)

### Setup Commands

```bash
# 1. Install dependencies
composer install --no-interaction
npm install

# 2. Environment
cp .env.example .env
php artisan key:generate

# 3. Database
touch database/cafe_now.sqlite
php artisan migrate

# 4. Dev server
php artisan serve
npm run dev

# 5. Reverb (real-time)
php artisan reverb:start
```

### Environment Variables

| Key | Value (Dev) | Notes |
|-----|-------------|-------|
| DB_CONNECTION | sqlite | mysql for prod |
| DB_DATABASE | `database/cafe_now.sqlite` | |
| BROADCAST_CONNECTION | reverb | |
| QUEUE_CONNECTION | sync | database for prod |
| CACHE_STORE | file | redis for prod |
| REVERB_APP_ID | app-key | Generate for prod |
| REVERB_APP_KEY | key | Generate for prod |
| REVERB_APP_SECRET | secret | Generate for prod |

---

## 20. Project Structure

```
cafe-now/
├── app/
│   ├── Actions/
│   │   ├── CalculateSurgePrice.php
│   │   ├── CheckBookingEligibility.php
│   │   └── Fortify/
│   │       ├── CreateNewUser.php
│   │       └── ResetUserPassword.php
│   ├── Console/
│   │   └── Commands/
│   │       ├── AutoCompleteBookings.php
│   │       ├── AutoScheduleMenuPreparing.php
│   │       └── CancelExpiredPendingBookings.php
│   ├── Enums/
│   │   ├── AdminAction.php
│   │   ├── BookingPaymentStatus.php
│   │   ├── BookingRuleType.php
│   │   ├── BookingStatus.php
│   │   ├── CafeApprovalStatus.php
│   │   ├── CancelledBy.php
│   │   ├── CommissionType.php
│   │   ├── EntityType.php
│   │   ├── InitiatedBy.php
│   │   ├── MenuAvailabilityStatus.php
│   │   ├── MenuOrderStatus.php
│   │   ├── MenuOrderType.php
│   │   ├── NotificationType.php
│   │   ├── PayableType.php
│   │   ├── PaymentStatus.php
│   │   ├── RecipientType.php
│   │   ├── RefundRequestStatus.php
│   │   └── UserRole.php
│   ├── Events/
│   │   ├── BookingCancelled.php
│   │   ├── BookingCheckIn.php
│   │   ├── BookingConfirmed.php
│   │   ├── BookingExtended.php
│   │   ├── BookingRescheduled.php
│   │   ├── OrderPlaced.php
│   │   └── PaymentReceived.php
│   ├── Exceptions/
│   │   ├── BookingTimeWindowException.php
│   │   ├── CancellationTimeExpiredException.php
│   │   ├── ExtendBookingLimitException.php
│   │   ├── Handler.php
│   │   ├── PaymentFailedException.php
│   │   ├── SlotNotAvailableException.php
│   │   └── WebhookSignatureException.php
│   ├── Http/
│   │   ├── Requests/
│   │   │   ├── Admin/
│   │   │   │   └── RejectCafeRequest.php
│   │   │   ├── Auth/
│   │   │   │   ├── ForgotPasswordRequest.php
│   │   │   │   ├── LoginRequest.php
│   │   │   │   ├── RegisterRequest.php
│   │   │   │   ├── ResendOtpRequest.php
│   │   │   │   ├── ResetPasswordRequest.php
│   │   │   │   └── VerifyOtpRequest.php
│   │   │   ├── Booking/
│   │   │   │   ├── CancelBookingRequest.php
│   │   │   │   ├── ExtendBookingRequest.php
│   │   │   │   ├── OwnerCancelBookingRequest.php
│   │   │   │   ├── RescheduleBookingRequest.php
│   │   │   │   └── StoreBookingRequest.php
│   │   │   ├── Cafe/
│   │   │   │   └── StoreCafeRequest.php
│   │   │   ├── Menu/
│   │   │   │   └── StoreMenuItemRequest.php
│   │   │   ├── Order/
│   │   │   │   ├── StoreOrderRequest.php
│   │   │   │   └── UpdateOrderStatusRequest.php
│   │   │   ├── Settings/
│   │   │   │   ├── PasswordUpdateRequest.php
│   │   │   │   ├── ProfileDeleteRequest.php
│   │   │   │   ├── ProfileUpdateRequest.php
│   │   │   │   └── TwoFactorAuthenticationRequest.php
│   │   │   └── Table/
│   │   │       └── SetBookingRulesRequest.php
│   │   └── Resources/
│   │       ├── BookingResource.php
│   │       ├── BookingRuleResource.php
│   │       ├── CafePhotoResource.php
│   │       ├── CafeResource.php
│   │       ├── MenuItemResource.php
│   │       ├── MenuOrderItemResource.php
│   │       ├── MenuOrderResource.php
│   │       ├── PaymentResource.php
│   │       ├── TableResource.php
│   │       └── UserResource.php
│   ├── Models/
│   │   ├── AdminAuditLog.php
│   │   ├── Booking.php
│   │   ├── BookingRule.php
│   │   ├── Cafe.php
│   │   ├── CafePhoto.php
│   │   ├── CommissionRule.php
│   │   ├── Favorite.php
│   │   ├── FeaturedCafe.php
│   │   ├── MenuItem.php
│   │   ├── MenuOrder.php
│   │   ├── MenuOrderItem.php
│   │   ├── Notification.php
│   │   ├── Payment.php
│   │   ├── RefundRequest.php
│   │   ├── SearchHistory.php
│   │   ├── Table.php
│   │   └── User.php
│   └── Services/
│       ├── Admin/
│       ├── Analytics/
│       ├── Auth/
│       ├── Booking/
│       │   ├── AvailabilityService.php
│       │   ├── BookingService.php
│       │   └── LockService.php
│       ├── Cafe/
│       ├── Favorite/
│       ├── Menu/
│       ├── Notification/
│       ├── Order/
│       ├── Payment/
│       │   ├── CommissionService.php
│       │   └── MidtransService.php
│       └── Table/
├── config/
│   ├── broadcasting.php
│   └── services.php
├── database/
│   ├── cafe_now.sqlite
│   └── migrations/
│       ├── 0001_01_01_000000_create_users_table.php
│       ├── 0001_01_01_000001_create_cache_table.php
│       ├── 0001_01_01_000001_create_personal_access_tokens_table.php
│       ├── 0001_01_01_000002_create_jobs_table.php
│       ├── 0001_01_01_000010_create_cafes_table.php
│       ├── 0001_01_01_000011_create_cafe_photos_table.php
│       ├── 0001_01_01_000020_create_tables_table.php
│       ├── 0001_01_01_000021_create_booking_rules_table.php
│       ├── 0001_01_01_000030_create_bookings_table.php
│       ├── 0001_01_01_000040_create_payments_table.php
│       ├── 0001_01_01_000050_create_menu_items_table.php
│       ├── 0001_01_01_000060_create_menu_orders_table.php
│       ├── 0001_01_01_000061_create_menu_order_items_table.php
│       ├── 0001_01_01_000070_create_refund_requests_table.php
│       ├── 0001_01_01_000080_create_notifications_table.php
│       ├── 0001_01_01_000090_create_favorites_table.php
│       ├── 0001_01_01_000091_create_search_history_table.php
│       ├── 0001_01_01_000100_create_commission_rules_table.php
│       ├── 0001_01_01_000101_create_admin_audit_logs_table.php
│       ├── 0001_01_01_000102_create_featured_cafes_table.php
│       ├── 2024_01_01_000000_create_passkeys_table.php
│       └── 2025_08_14_170933_add_two_factor_columns_to_users_table.php
├── routes/
│   ├── api.php
│   ├── api/
│   │   ├── admin.php
│   │   ├── analytics.php
│   │   ├── auth.php
│   │   ├── bookings.php
│   │   ├── cafes.php
│   │   ├── favorites.php
│   │   ├── menus.php
│   │   ├── orders.php
│   │   ├── payments.php
│   │   └── tables.php
│   ├── channels.php
│   ├── console.php
│   ├── settings.php
│   └── web.php
└── requirements/
    ├── ARCHITECTURE_BREAKDOWN.md
    ├── PRD_CafeNow_v1_3.md
    └── PRODUCT_SPECIFICATION_v1_0.md
```

---

*Document generated: 14 July 2026*
*CafeNow v1.0 — Product Specification*
