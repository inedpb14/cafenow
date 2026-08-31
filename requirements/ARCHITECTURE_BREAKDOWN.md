# Arsitektur CafeNow — Breakdown per Modul

Berdasarkan PRD v1.3 — Laravel 11 + PHP 8.4

---

## 1. AUTHENTICATION MODULE

### Models
- `App\Models\User` — roles: customer, owner, admin

### Controllers

| Controller | Method | Endpoint |
|---|---|---|
| `CustomerAuthController` | register | `POST /api/auth/register` |
| `CustomerAuthController` | login | `POST /api/auth/login` |
| `CustomerAuthController` | socialLogin | `POST /api/auth/social-login` |
| `CustomerAuthController` | logout | `POST /api/auth/logout` |
| `CustomerAuthController` | refreshToken | `POST /api/auth/refresh-token` |
| `CustomerAuthController` | verifyOtp | `POST /api/auth/verify-otp` |
| `CustomerAuthController` | resendOtp | `POST /api/auth/resend-otp` |
| `CustomerAuthController` | forgotPassword | `POST /api/auth/forgot-password` |
| `CustomerAuthController` | resetPassword | `POST /api/auth/reset-password` |
| `CustomerProfileController` | show | `GET /api/customer/profile` |
| `CustomerProfileController` | update | `PUT /api/customer/profile` |
| `OwnerAuthController` | register | `POST /api/owner/register` |
| `OwnerAuthController` | login | `POST /api/owner/login` |
| `OwnerAuthController` | forgotPassword | `POST /api/owner/forgot-password` |
| `OwnerAuthController` | resetPassword | `POST /api/owner/reset-password` |
| `OwnerProfileController` | show | `GET /api/owner/profile` |
| `OwnerProfileController` | update | `PUT /api/owner/profile` |
| `AdminAuthController` | login | `POST /api/admin/login` |

### Services
- `App\Services\Auth\AuthService` — register, login, token management
- `App\Services\Auth\OTPService` — generate OTP, send via Twilio, verify, rate-limit resend
- `App\Services\Auth\SocialLoginService` — Google/Facebook token validation
- `App\Services\Auth\PasswordResetService` — generate signed token, send email, validate + reset

### Form Requests
- `RegisterRequest`, `LoginRequest`, `VerifyOtpRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest`

### Notifications (Mail)
- `ResetPasswordLink` — mailed notification with signed URL

---

## 2. CAFE MODULE

### Models
- `App\Models\Cafe` — soft-deletes, approval_status enum
- `App\Models\CafePhoto` — polymorphic or separate table

### Controllers

| Controller | Method | Endpoint |
|---|---|---|
| `CafeController` | index | `GET /api/cafes` |
| `CafeController` | show | `GET /api/cafes/{id}` |
| `CafeController` | availability | `GET /api/cafes/{id}/availability` |
| `OwnerCafeController` | store | `POST /api/owner/cafes` |
| `OwnerCafeController` | update | `PUT /api/owner/cafes/{id}` |
| `OwnerCafeController` | setHours | `POST /api/owner/cafes/{id}/hours` |
| `OwnerCafeController` | setBlackout | `POST /api/owner/cafes/{id}/blackout` |
| `OwnerCafeController` | uploadPhotos | `POST /api/owner/cafes/{id}/photos` |
| `OwnerCafeController` | deletePhoto | `DELETE /api/owner/cafes/{id}/photos/{photoId}` |

### Services
- `App\Services\Cafe\CafeService` — CRUD, search, filter, sort
- `App\Services\Cafe\CafeSearchService` — autocomplete, full-text search

### Form Requests
- `StoreCafeRequest`, `UpdateCafeRequest`, `SetHoursRequest`, `SetBlackoutRequest`

---

## 3. TABLE MODULE

### Models
- `App\Models\Table` — soft-deletes, is_active boolean
- `App\Models\BookingRule` — rule_type: fixed/custom, surge_rules JSON

### Controllers

| Controller | Method | Endpoint |
|---|---|---|
| `TableController` | index | `GET /api/cafes/{cafeId}/tables` |
| `TableController` | slots | `GET /api/cafes/{cafeId}/tables/{id}/slots` |
| `OwnerTableController` | store | `POST /api/owner/tables` |
| `OwnerTableController` | update | `PUT /api/owner/tables/{id}` |
| `OwnerTableController` | destroy | `DELETE /api/owner/tables/{id}` |
| `OwnerTableController` | setBookingRules | `POST /api/owner/tables/{id}/booking-rules` |

### Services
- `App\Services\Table\TableService` — CRUD, activate/deactivate
- `App\Services\Table\BookingRuleService` — manage fixed/custom pricing rules
- `App\Services\Table\PricingService` — calculate real-time price with surge multiplier

### Actions (single-purpose invokable)
- `App\Actions\CalculateSurgePrice` — given rule + time, return final price

### Form Requests
- `StoreTableRequest`, `UpdateTableRequest`, `SetBookingRulesRequest`

---

## 4. BOOKING MODULE

### Models
- `App\Models\Booking` — status enum, payment_status enum, soft-deletes not needed

### Controllers

| Controller | Method | Endpoint |
|---|---|---|
| `BookingController` | availability | `GET /api/bookings/availability` |
| `BookingController` | store | `POST /api/bookings` |
| `BookingController` | show | `GET /api/bookings/{id}` |
| `BookingController` | cancel | `PUT /api/bookings/{id}/cancel` |
| `BookingController` | reschedule | `PUT /api/bookings/{id}/reschedule` |
| `BookingController` | checkIn | `POST /api/bookings/{id}/checkin` |
| `BookingController` | extend | `POST /api/bookings/{id}/extend` |
| `BookingController` | refundRequest | `POST /api/bookings/{id}/refund-request` |
| `CustomerBookingController` | index | `GET /api/customer/bookings` |
| `OwnerBookingController` | index | `GET /api/owner/bookings` |
| `OwnerBookingController` | cancel | `PUT /api/owner/bookings/{id}/cancel` |
| `OwnerBookingController` | noShow | `PUT /api/owner/bookings/{id}/no-show` |
| `OwnerBookingController` | checkout | `PUT /api/owner/bookings/{id}/checkout` |

### Services
- `App\Services\Booking\BookingService` — create booking, cancel, status management
- `App\Services\Booking\AvailabilityService` — check time slot availability across tables
- `App\Services\Booking\LockService` — Redis temporary lock (TTL 15 min), release, extend
- `App\Services\Booking\RescheduleService` — validate availability, calculate fee + surge diff
- `App\Services\Booking\ExtendService` — validate next slot, charge additional payment

### Actions
- `App\Actions\CheckBookingEligibility` — validate 2-hour min window, guest count
- `App\Actions\AutoCompleteBooking` — scheduled job: end_time <= now → completed
- `App\Actions\CancelPendingPayments` — scheduled job: lock_expires_at < now → cancelled

### Form Requests
- `StoreBookingRequest`, `CancelBookingRequest`, `RescheduleBookingRequest`, `ExtendBookingRequest`

---

## 5. MENU MODULE

### Models
- `App\Models\MenuItem` — soft-deletes, availability_status enum

### Controllers

| Controller | Method | Endpoint |
|---|---|---|
| `MenuController` | index | `GET /api/cafes/{cafeId}/menus` |
| `OwnerMenuController` | store | `POST /api/owner/menus` |
| `OwnerMenuController` | update | `PUT /api/owner/menus/{id}` |
| `OwnerMenuController` | destroy | `DELETE /api/owner/menus/{id}` |
| `OwnerMenuController` | toggle | `PUT /api/owner/menus/{id}/toggle` |
| `OwnerMenuController` | bulkToggle | `PUT /api/owner/menus/bulk-toggle` |

### Services
- `App\Services\Menu\MenuService` — CRUD, toggle availability, bulk operations

### Form Requests
- `StoreMenuItemRequest`, `UpdateMenuItemRequest`, `BulkToggleRequest`

---

## 6. ORDER MODULE

### Models
- `App\Models\MenuOrder` — order_type: pre_order/additional, status enum
- `App\Models\MenuOrderItem` — pivot with quantity, unit_price, subtotal

### Controllers

| Controller | Method | Endpoint |
|---|---|---|
| `OrderController` | store | `POST /api/orders` |
| `OrderController` | show | `GET /api/orders/{id}` |
| `CustomerOrderController` | index | `GET /api/customer/orders` |
| `OwnerOrderController` | index | `GET /api/owner/orders` |
| `OwnerOrderController` | updateStatus | `PUT /api/owner/orders/{id}/status` |

### Services
- `App\Services\Order\OrderService` — create additional order, connect to booking
- `App\Services\Order\OrderStatusService` — transition validation, scheduled preparing trigger

### Actions
- `App\Actions\AutoSchedulePreparing` — scheduled job: 30 min before start_time OR check-in → preparing

### Form Requests
- `StoreOrderRequest`, `UpdateOrderStatusRequest`

---

## 7. PAYMENT MODULE

### Models
- `App\Models\Payment` — payable polymorphic (booking/menu_order)
- `App\Models\RefundRequest` — initiated_by enum, form_token for VA/Minimarket

### Controllers

| Controller | Method | Endpoint |
|---|---|---|
| `PaymentController` | initiate | `POST /api/payments` |
| `PaymentController` | webhook | `POST /api/payments/webhook` (no auth) |
| `PaymentController` | status | `GET /api/payments/{id}/status` |

### Services
- `App\Services\Payment\PaymentService` — initiate transaction, create payment record
- `App\Services\Payment\MidtransService` — adapter for Midtrans API (create transaction, refund, status check)
- `App\Services\Payment\WebhookService` — verify signature, idempotency check, status update
- `App\Services\Payment\RefundService` — auto-refund (CC/eWallet), create manual refund request (VA/Minimarket)
- `App\Services\Payment\CommissionService` — calculate & store commission split (booking 15%, menu 10%)

### Actions
- `App\Actions\HandleLateWebhook` — refund_on_arrival for cancelled booking payments
- `App\Actions\ExpirePendingPayments` — scheduled job: scan pending + expired lock → cancel

### Form Requests
- `InitiatePaymentRequest`

---

## 8. NOTIFICATION MODULE

### Model
- `App\Models\Notification`

### Services
- `App\Services\Notification\NotificationService` — orchestrator: queue, log, dispatch
- `App\Services\Notification\TwilioService` — adapter for Twilio WhatsApp Business API

### Notifications (Laravel)
- `BookingConfirmed`, `BookingReminder2h`, `BookingReminder30m`, `OrderConfirmed`, `BookingCancelled`, `BookingCancelledByOwner`, `RefundProcessed`, `RefundRejected`, `NewBookingAlert`, `NewOrderAlert`, `DailyMorningSummary`, `LateWebhookRefund`

### Scheduled Jobs (Kernel)
- `SendBookingReminder2h` — every minute, check + skip guard
- `SendBookingReminder30m` — every minute, check + skip guard
- `SendDailyMorningSummary` — 08:00 WIB daily

---

## 9. FAVORITE & RECENTLY VIEWED MODULE

### Models
- `App\Models\Favorite` — unique(customer_id, cafe_id)
- `App\Models\SearchHistory` — index(customer_id, viewed_at DESC)

### Controllers

| Controller | Method | Endpoint |
|---|---|---|
| `FavoriteController` | store | `POST /api/favorites` |
| `FavoriteController` | destroy | `DELETE /api/favorites/{cafeId}` |
| `CustomerFavoriteController` | index | `GET /api/customer/favorites` |
| `SearchHistoryController` | index | `GET /api/customer/search-history` |
| `SearchHistoryController` | destroyAll | `DELETE /api/customer/search-history` |
| `SearchHistoryController` | destroyOne | `DELETE /api/customer/search-history/{cafeId}` |

### Services
- `App\Services\Favorite\FavoriteService`
- `App\Services\Favorite\SearchHistoryService` — auto-log view, limit 20, clear

---

## 10. ANALYTICS MODULE

### Controllers

| Controller | Method | Endpoint |
|---|---|---|
| `OwnerAnalyticsController` | dashboard | `GET /api/owner/analytics/dashboard` |
| `OwnerAnalyticsController` | revenue | `GET /api/owner/analytics/revenue` |
| `OwnerAnalyticsController` | bookings | `GET /api/owner/analytics/bookings` |
| `OwnerAnalyticsController` | menus | `GET /api/owner/analytics/menus` |
| `AdminAnalyticsController` | platform | `GET /api/admin/analytics/platform` |
| `AdminAnalyticsController` | commission | `GET /api/admin/analytics/commission` |

### Services
- `App\Services\Analytics\OwnerAnalyticsService` — revenue per period, top tables, peak hours, menu performance, occupancy rate, no-show rate
- `App\Services\Analytics\AdminAnalyticsService` — GMV, MAU, total commission, cafe ranking

---

## 11. SUPER ADMIN MODULE

### Models
- `App\Models\FeaturedCafe` — display_order, active_from/active_to
- `App\Models\CommissionRule` — commission_type enum, percentage, active period
- `App\Models\AdminAuditLog` — action, entity_type, before/after JSON, ip_address

### Controllers

| Controller | Method | Endpoint |
|---|---|---|
| `AdminCafeRegistrationController` | index | `GET /api/admin/cafe-registrations` |
| `AdminCafeRegistrationController` | approve | `POST /api/admin/cafe-registrations/{id}/approve` |
| `AdminCafeRegistrationController` | reject | `POST /api/admin/cafe-registrations/{id}/reject` |
| `AdminCafeController` | index | `GET /api/admin/cafes` |
| `AdminCafeController` | suspend | `PUT /api/admin/cafes/{id}/suspend` |
| `AdminCommissionController` | show | `GET /api/admin/commission-rules` |
| `AdminCommissionController` | update | `PUT /api/admin/commission-rules` |
| `AdminBookingController` | index | `GET /api/admin/bookings` |
| `AdminOrderController` | index | `GET /api/admin/orders` |
| `AdminRefundController` | index | `GET /api/admin/refunds` |
| `AdminRefundController` | process | `POST /api/admin/refunds/{id}/process` |
| `AdminRefundController` | reject | `POST /api/admin/refunds/{id}/reject` |
| `AdminUserController` | index | `GET /api/admin/users` |
| `AdminUserController` | suspend | `PUT /api/admin/users/{id}/suspend` |
| `AdminFeaturedCafeController` | index | `GET /api/admin/featured-cafes` |
| `AdminFeaturedCafeController` | store | `POST /api/admin/featured-cafes` |
| `AdminFeaturedCafeController` | update | `PUT /api/admin/featured-cafes/{id}` |
| `AdminFeaturedCafeController` | destroy | `DELETE /api/admin/featured-cafes/{id}` |

### Services
- `App\Services\Admin\CafeApprovalService` — approve/reject with reason, handle resubmission limit
- `App\Services\Admin\CommissionService` — update rates, store history
- `App\Services\Admin\RefundManagementService` — process/reject manual refunds
- `App\Services\Admin\FeaturedCafeService` — curate order, schedule period
- `App\Services\Admin\AuditLogService` — log all admin actions

### Form Requests
- `RejectCafeRequest`, `ProcessRefundRequest`, `RejectRefundRequest`, `StoreFeaturedCafeRequest`, `UpdateFeaturedCafeRequest`

---

## STRUKTUR FOLDER

```
app/
├── Actions/
│   ├── CalculateSurgePrice.php
│   ├── CheckBookingEligibility.php
│   ├── AutoCompleteBooking.php
│   ├── CancelPendingPayments.php
│   ├── AutoSchedulePreparing.php
│   └── HandleLateWebhook.php
│
├── Models/
│   ├── User.php
│   ├── Cafe.php
│   ├── CafePhoto.php
│   ├── Table.php
│   ├── BookingRule.php
│   ├── Booking.php
│   ├── MenuItem.php
│   ├── MenuOrder.php
│   ├── MenuOrderItem.php
│   ├── Payment.php
│   ├── RefundRequest.php
│   ├── Notification.php
│   ├── Favorite.php
│   ├── SearchHistory.php
│   ├── FeaturedCafe.php
│   ├── CommissionRule.php
│   └── AdminAuditLog.php
│
├── Http/
│   ├── Controllers/
│   │   ├── Auth/
│   │   │   ├── CustomerAuthController.php
│   │   │   ├── CustomerProfileController.php
│   │   │   ├── OwnerAuthController.php
│   │   │   ├── OwnerProfileController.php
│   │   │   └── AdminAuthController.php
│   │   ├── Cafe/
│   │   │   ├── CafeController.php
│   │   │   └── OwnerCafeController.php
│   │   ├── Table/
│   │   │   ├── TableController.php
│   │   │   └── OwnerTableController.php
│   │   ├── Booking/
│   │   │   ├── BookingController.php
│   │   │   ├── CustomerBookingController.php
│   │   │   └── OwnerBookingController.php
│   │   ├── Menu/
│   │   │   ├── MenuController.php
│   │   │   └── OwnerMenuController.php
│   │   ├── Order/
│   │   │   ├── OrderController.php
│   │   │   ├── CustomerOrderController.php
│   │   │   └── OwnerOrderController.php
│   │   ├── Payment/
│   │   │   └── PaymentController.php
│   │   ├── Favorite/
│   │   │   ├── FavoriteController.php
│   │   │   └── CustomerFavoriteController.php
│   │   ├── SearchHistory/
│   │   │   └── SearchHistoryController.php
│   │   ├── Analytics/
│   │   │   ├── OwnerAnalyticsController.php
│   │   │   └── AdminAnalyticsController.php
│   │   └── Admin/
│   │       ├── AdminCafeRegistrationController.php
│   │       ├── AdminCafeController.php
│   │       ├── AdminCommissionController.php
│   │       ├── AdminBookingController.php
│   │       ├── AdminOrderController.php
│   │       ├── AdminRefundController.php
│   │       ├── AdminUserController.php
│   │       └── AdminFeaturedCafeController.php
│   │
│   ├── Requests/ (Form Requests)
│   │   ├── Auth/
│   │   │   ├── RegisterRequest.php
│   │   │   ├── LoginRequest.php
│   │   │   ├── VerifyOtpRequest.php
│   │   │   ├── ForgotPasswordRequest.php
│   │   │   └── ResetPasswordRequest.php
│   │   ├── Cafe/
│   │   │   ├── StoreCafeRequest.php
│   │   │   ├── UpdateCafeRequest.php
│   │   │   ├── SetHoursRequest.php
│   │   │   └── SetBlackoutRequest.php
│   │   ├── Table/
│   │   │   ├── StoreTableRequest.php
│   │   │   ├── UpdateTableRequest.php
│   │   │   └── SetBookingRulesRequest.php
│   │   ├── Booking/
│   │   │   ├── StoreBookingRequest.php
│   │   │   ├── CancelBookingRequest.php
│   │   │   ├── RescheduleBookingRequest.php
│   │   │   └── ExtendBookingRequest.php
│   │   ├── Menu/
│   │   │   ├── StoreMenuItemRequest.php
│   │   │   ├── UpdateMenuItemRequest.php
│   │   │   └── BulkToggleRequest.php
│   │   ├── Order/
│   │   │   ├── StoreOrderRequest.php
│   │   │   └── UpdateOrderStatusRequest.php
│   │   ├── Payment/
│   │   │   └── InitiatePaymentRequest.php
│   │   └── Admin/
│   │       ├── RejectCafeRequest.php
│   │       ├── ProcessRefundRequest.php
│   │       ├── RejectRefundRequest.php
│   │       ├── StoreFeaturedCafeRequest.php
│   │       └── UpdateFeaturedCafeRequest.php
│   │
│   └── Resources/ (API Resources)
│       ├── CafeResource.php
│       ├── TableResource.php
│       ├── BookingResource.php
│       ├── MenuItemResource.php
│       ├── MenuOrderResource.php
│       ├── PaymentResource.php
│       ├── FavoriteResource.php
│       ├── UserResource.php
│       └── AnalyticsResource.php
│
├── Services/
│   ├── Auth/
│   │   ├── AuthService.php
│   │   ├── OTPService.php
│   │   ├── SocialLoginService.php
│   │   └── PasswordResetService.php
│   ├── Cafe/
│   │   ├── CafeService.php
│   │   └── CafeSearchService.php
│   ├── Table/
│   │   ├── TableService.php
│   │   ├── BookingRuleService.php
│   │   └── PricingService.php
│   ├── Booking/
│   │   ├── BookingService.php
│   │   ├── AvailabilityService.php
│   │   ├── LockService.php
│   │   ├── RescheduleService.php
│   │   └── ExtendService.php
│   ├── Menu/
│   │   └── MenuService.php
│   ├── Order/
│   │   ├── OrderService.php
│   │   └── OrderStatusService.php
│   ├── Payment/
│   │   ├── PaymentService.php
│   │   ├── MidtransService.php
│   │   ├── WebhookService.php
│   │   ├── RefundService.php
│   │   └── CommissionService.php
│   ├── Notification/
│   │   ├── NotificationService.php
│   │   └── TwilioService.php
│   ├── Favorite/
│   │   ├── FavoriteService.php
│   │   └── SearchHistoryService.php
│   ├── Analytics/
│   │   ├── OwnerAnalyticsService.php
│   │   └── AdminAnalyticsService.php
│   └── Admin/
│       ├── CafeApprovalService.php
│       ├── CommissionService.php
│       ├── RefundManagementService.php
│       ├── FeaturedCafeService.php
│       └── AuditLogService.php
│
└── Console/
    └── Commands/
        ├── SendBookingReminder2h.php
        ├── SendBookingReminder30m.php
        ├── SendDailyMorningSummary.php
        ├── AutoCompleteBookings.php
        ├── CancelExpiredPendingBookings.php
        └── AutoScheduleMenuPreparing.php
```

---

## MIDDLEWARE

| Middleware | Fungsi | Routes |
|---|---|---|
| `auth:sanctum` | Authentikasi via Sanctum token | Semua route terproteksi |
| `role:customer` | Hanya untuk role customer | `/api/customer/*`, `/api/favorites/*` |
| `role:owner` | Hanya untuk role owner | `/api/owner/*` |
| `role:admin` | Hanya untuk role admin | `/api/admin/*` |
| `throttle:5,15` | Rate limit login (5 attempts/15 menit) | `auth/login`, `auth/register` |
| `throttle:60,1` | Rate limit umum | Semua API |
| `verified.phone` | Verifikasi OTP sudah dilakukan | `/api/bookings`, `/api/orders` |

---

## EVENT & LISTENER MAP

| Event | Listener |
|---|---|
| `BookingConfirmed` | `SendBookingConfirmation`, `SendNewBookingAlert`, `EmitAvailabilityUpdate` |
| `BookingCancelled` | `SendBookingCancellation`, `SendCancellationAlert`, `ReleaseRedisLock`, `EmitAvailabilityUpdate` |
| `BookingCancelledByOwner` | `SendBookingCancelledByOwner`, `ProcessRefund`, `EmitAvailabilityUpdate` |
| `BookingRescheduled` | `SendRescheduleNotification`, `EmitAvailabilityUpdate` |
| `BookingExtended` | `SendExtendConfirmation`, `EmitAvailabilityUpdate` |
| `BookingCheckIn` | `TriggerOrderPreparing`, `EmitCheckInEvent` |
| `OrderPlaced` | `SendOrderConfirmation`, `SendNewOrderAlert` |
| `OrderStatusUpdated` | `SendOrderStatusNotification` |
| `PaymentReceived` | `UpdateBookingStatus`, `CalculateCommission`, `EmitAvailabilityUpdate` |
| `PaymentWebhookReceived` | `VerifySignature`, `ProcessPaymentWebhook` |
| `CafeApproved` | `SendCafeApprovedNotification` |
| `CafeRejected` | `SendCafeRejectedNotification` |
| `RefundProcessed` | `SendRefundProcessedNotification` |
| `RefundRejected` | `SendRefundRejectedNotification` |
| `LateWebhookReceived` | `ProcessLateWebhookRefund`, `SendLateWebhookNotification` |

---

## SCHEDULED JOBS (Console Kernel)

| Command | Schedule | Description |
|---|---|---|
| `bookings:send-reminder-2h` | `* * * * *` (every min) | Kirim reminder 2 jam sebelum booking |
| `bookings:send-reminder-30m` | `* * * * *` (every min) | Kirim reminder 30 menit sebelum booking |
| `bookings:auto-complete` | `* * * * *` (every min) | Complete booking dengan end_time <= now() |
| `bookings:cancel-expired-pending` | `* * * * *` (every min) | Cancel pending booking yang lock-nya expired |
| `orders:auto-schedule-preparing` | `* * * * *` (every min) | Set preparing untuk order 30 menit sebelum start_time |
| `notifications:daily-summary` | `dailyAt('08:00')` WIB | Kirim ringkasan harian ke owner |

---

## DATABASE: ELOQUENT RELATIONSHIPS

```php
// User
hasMany(Cafe::class, 'owner_id')           // jika role owner
hasMany(Booking::class, 'customer_id')     // jika role customer
hasMany(Favorite::class, 'customer_id')
hasMany(SearchHistory::class, 'customer_id')
hasMany(MenuOrder::class, 'customer_id')
hasMany(Notification::class, 'recipient_id')

// Cafe
belongsTo(User::class, 'owner_id')
hasMany(Table::class)
hasMany(MenuItem::class)
hasMany(CafePhoto::class)
hasMany(FeaturedCafe::class)
hasMany(Booking::class)
hasMany(Favorite::class)
hasMany(SearchHistory::class)

// Table
belongsTo(Cafe::class)
hasOne(BookingRule::class)
hasMany(Booking::class)

// BookingRule
belongsTo(Table::class)

// Booking
belongsTo(Cafe::class)
belongsTo(Table::class)
belongsTo(User::class, 'customer_id')
belongsTo(BookingRule::class)
belongsTo(Payment::class, 'payment_id')
hasMany(MenuOrder::class)
hasOne(RefundRequest::class)

// MenuItem
belongsTo(Cafe::class)
hasMany(MenuOrderItem::class)

// MenuOrder
belongsTo(Cafe::class)
belongsTo(User::class, 'customer_id')
belongsTo(Booking::class)
belongsTo(Payment::class, 'payment_id')
hasMany(MenuOrderItem::class)

// MenuOrderItem
belongsTo(MenuOrder::class)
belongsTo(MenuItem::class)

// Payment
morphTo('payable')                          // Booking or MenuOrder

// RefundRequest
belongsTo(Booking::class)
belongsTo(User::class, 'customer_id')

// Favorite
belongsTo(User::class, 'customer_id')
belongsTo(Cafe::class)

// SearchHistory
belongsTo(User::class, 'customer_id')
belongsTo(Cafe::class)

// FeaturedCafe
belongsTo(Cafe::class)
belongsTo(User::class, 'created_by')

// CommissionRule
belongsTo(User::class, 'set_by_admin_id')

// AdminAuditLog
belongsTo(User::class, 'admin_id')
```
