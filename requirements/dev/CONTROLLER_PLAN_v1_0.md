# CafeNow — Controller Implementation Plan v1.0

> Detailed specification for all 31 controller classes
> Each controller maps routes → services/actions/models following the established patterns

---

## Table of Contents

1. [Architecture & Conventions](#1-architecture--conventions)
2. [Auth Module](#2-auth-module)
3. [Cafe Module](#3-cafe-module)
4. [Table Module](#4-table-module)
5. [Booking Module](#5-booking-module)
6. [Menu Module](#6-menu-module)
7. [Order Module](#7-order-module)
8. [Payment Module](#8-payment-module)
9. [Favorite Module](#9-favorite-module)
10. [Analytics Module](#10-analytics-module)
11. [Admin Module](#11-admin-module)
12. [File Generation Order](#12-file-generation-order)

---

## 1. Architecture & Conventions

### 1.1 Pattern per Controller

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Module;

use App\Http\Controllers\Controller;
use App\Http\Requests\Module\ActionRequest;
use App\Http\Resources\SomeResource;
use App\Models\SomeModel;
use App\Services\SomeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SomeController extends Controller
{
    public function __construct(
        private readonly SomeService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $items = SomeModel::query()
            ->where(...)
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => SomeResource::collection($items),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function store(ActionRequest $request): JsonResponse
    {
        $result = $this->service->create($request->toDto());

        return response()->json([
            'success' => true,
            'data' => new SomeResource($result),
        ], 201);
    }

    public function show(SomeModel $someModel): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new SomeResource($someModel),
        ]);
    }
}
```

### 1.2 Response Envelope

```json
{
  "success": true|false,
  "data": { ... } | [ ... ] | null,
  "error": { "code": "...", "message": "..." } | null,
  "meta": { "current_page": 1, "last_page": 5, "total": 100 } | null
}
```

### 1.3 Error Handling

| Condition | HTTP Code | Pattern |
|-----------|-----------|---------|
| Validation error | 422 | Via FormRequest (automatic) |
| Not found | 404 | ModelNotFoundException → Handler |
| Unauthenticated | 401 | Sanctum → Handler |
| Forbidden role | 403 | CheckRole middleware → abort(403) |
| Domain error | 422/409 | Throw exception → Handler catches |
| Server error | 500 | Fallback in Handler |

### 1.4 Authorization Pattern

```php
// Route level (middleware)
Route::middleware(['auth:sanctum', 'role:owner'])->group(function () {
    Route::post('/owner/cafes', [OwnerCafeController::class, 'store']);
});

// Controller level (ownership check)
$cafe = Cafe::findOrFail($id);
if ($cafe->owner_id !== auth()->id()) {
    abort(403);
}
```

### 1.5 Key Differences: User Flows vs Actual Models

Beberapa field di model memiliki nama berbeda dari user flow document:

| User Flow (dokumen) | Model (aktual) |
|---------------------|----------------|
| `operating_hours` | `operational_hours` |
| `table_number` | `name` |
| `checked_in_at` | `check_in_time` |
| `checked_out_at` | `check_out_time` |
| `dine_in` / `takeaway` | `pre_order` / `additional` |
| `approved` status | `active` status |
| DTO akan menggunakan `toDto()` dari FormRequest |

Controller akan mengacu pada **model aktual**, bukan user flow.

---

## 2. Auth Module

### Files: 5 controllers

```
app/Http/Controllers/Auth/
├── CustomerAuthController.php
├── CustomerProfileController.php
├── OwnerAuthController.php
├── OwnerProfileController.php
└── AdminAuthController.php
```

---

### 2.1 CustomerAuthController

**Path:** `Controllers/Auth/CustomerAuthController.php`

#### `register(RegisterRequest $request): JsonResponse`
- **Method:** POST /api/auth/register
- **Request:** `RegisterRequest`
- **Flow:**
  1. Validate via `RegisterRequest` → `toDto()`
  2. Create User with role=UserRole::Customer, email_verified_at=null
  3. Generate OTP → store in cache (or DB) with 5 min TTL
  4. Send OTP via email (Mail facade)
  5. Return 201: `{ user_id, email, message: "OTP telah dikirim" }`
- **Errors:**
  - Email already exists (422)

#### `login(LoginRequest $request): JsonResponse`
- **Method:** POST /api/auth/login
- **Request:** `LoginRequest` → toDto()
- **Flow:**
  1. Attempt auth with email + password
  2. If fails → 401: "Email atau password salah"
  3. If email_verified_at is null → 403: "Silakan verifikasi email terlebih dahulu"
  4. Create Sanctum token with ability: `role:customer`
  5. Return `{ token, user: UserResource }`
- **Errors:**
  - Invalid credentials (401)
  - Email not verified (403)

#### `socialLogin(Request $request): JsonResponse`
- **Method:** POST /api/auth/social-login
- **Request:** `{ provider: "google"|"apple", access_token }`
- **Flow:**
  1. Verify token with provider API
  2. Extract email + name + avatar
  3. Find or create user by email (role=customer, email_verified_at=now)
  4. Create Sanctum token
  5. Return `{ token, user, is_new }`
- **Errors:**
  - Invalid provider token (401)
  - Unsupported provider (422)

#### `verifyOtp(VerifyOtpRequest $request): JsonResponse`
- **Method:** POST /api/auth/verify-otp
- **Request:** `VerifyOtpRequest`
- **Flow:**
  1. Validate OTP from cache/DB (email + code)
  2. If expired/wrong → 422
  3. Mark email_verified_at = now()
  4. Create Sanctum token
  5. Return `{ token, user }`
- **Errors:**
  - Invalid/expired OTP (422)

#### `resendOtp(ResendOtpRequest $request): JsonResponse`
- **Method:** POST /api/auth/resend-otp
- **Request:** `ResendOtpRequest`
- **Flow:**
  1. Find user by email
  2. Check rate limit (1 min between resends)
  3. Generate new OTP, update cache
  4. Send email
  5. Return `{ message: "OTP telah dikirim ulang" }`
- **Errors:**
  - Email not found (404)
  - Too many requests (429)

#### `forgotPassword(ForgotPasswordRequest $request): JsonResponse`
- **Method:** POST /api/auth/forgot-password
- **Request:** `ForgotPasswordRequest`
- **Flow:**
  1. Find user by email
  2. Generate password reset token
  3. Send reset link via email
  4. Return `{ message: "Link reset password telah dikirim" }`
- **Errors:**
  - Email not found (404 - sekuriti: tetap 200? PRD: kirim sukses)

#### `resetPassword(ResetPasswordRequest $request): JsonResponse`
- **Method:** POST /api/auth/reset-password
- **Request:** `ResetPasswordRequest`
- **Flow:**
  1. Validate token
  2. Update password
  3. Return `{ message: "Password berhasil direset" }`
- **Errors:**
  - Invalid/expired token (422)

#### `logout(Request $request): JsonResponse`
- **Method:** POST /api/auth/logout
- **Middleware:** auth:sanctum
- **Flow:**
  1. Revoke current token
  2. Return `{ message: "Logout berhasil" }`

#### `refreshToken(Request $request): JsonResponse`
- **Method:** POST /api/auth/refresh-token
- **Middleware:** auth:sanctum
- **Flow:**
  1. Revoke current token
  2. Create new token
  3. Return `{ token }`

---

### 2.2 CustomerProfileController

**Path:** `Controllers/Auth/CustomerProfileController.php`

#### `show(Request $request): JsonResponse`
- **Method:** GET /api/customer/profile
- **Middleware:** auth:sanctum
- **Flow:**
  1. Return UserResource of authenticated user

#### `update(ProfileUpdateRequest $request): JsonResponse`
- **Method:** PUT /api/customer/profile
- **Request:** `ProfileUpdateRequest` → toDto()
- **Middleware:** auth:sanctum
- **Flow:**
  1. Update user fields (name, email, phone)
  2. If email changed → reset email_verified_at = null, send OTP
  3. Return updated UserResource

---

### 2.3 OwnerAuthController

**Path:** `Controllers/Auth/OwnerAuthController.php`

#### `register(RegisterRequest $request): JsonResponse`
- **Method:** POST /api/owner/register
- **Flow:** Same as CustomerAuthController@register, but role=UserRole::Owner
- **No OTP** — langsung login setelah register (PRD: owner langsung aktif)
- Return `{ token, user }`

#### `login(LoginRequest $request): JsonResponse`
- **Method:** POST /api/owner/login
- **Flow:** Same as customer login, but check role=owner
- Token ability: `role:owner`
- **Errors:**
  - Bukan owner (403)

#### `forgotPassword(ForgotPasswordRequest $request): JsonResponse`
- **Method:** POST /api/owner/forgot-password
- **Flow:** Same as customer forgotPassword

#### `resetPassword(ResetPasswordRequest $request): JsonResponse`
- **Method:** POST /api/owner/reset-password
- **Flow:** Same as customer resetPassword

---

### 2.4 OwnerProfileController

**Path:** `Controllers/Auth/OwnerProfileController.php`

Same pattern as CustomerProfileController but for owner.

#### `show(Request $request): JsonResponse`
#### `update(ProfileUpdateRequest $request): JsonResponse`

---

### 2.5 AdminAuthController

**Path:** `Controllers/Auth/AdminAuthController.php`

#### `login(LoginRequest $request): JsonResponse`
- **Method:** POST /api/admin/login
- **Flow:**
  1. Attempt auth
  2. Check role=admin
  3. Create Sanctum token with ability: `role:admin`
  4. Return `{ token, user }`
- **Errors:**
  - Invalid credentials (401)
  - Not admin (403)

---

## 3. Cafe Module

### Files: 2 controllers

```
app/Http/Controllers/Cafe/
├── CafeController.php
└── OwnerCafeController.php
```

---

### 3.1 CafeController

**Path:** `Controllers/Cafe/CafeController.php`
**Dependencies:** none (query langsung ke model)

#### `index(Request $request): JsonResponse`
- **Method:** GET /api/cafes
- **Auth:** Public (guest)
- **Query params:**
  - `query` — search by name, city, address
  - `city` — filter by city
  - `category` — filter by category
  - `lat`, `lng` — nearby sorting
  - `per_page` — pagination (default 15)
- **Flow:**
  1. Query Cafe where approval_status=active
  2. If `query` → search by name/city/address (LIKE %query%)
  3. If `city` → filter by city
  4. If `category` → filter by category
  5. If `lat`+`lng` → order by distance (raw SQL or scope)
  6. Include featured cafes first (ordered by display_order)
  7. Include photos count
  8. Paginate
  9. Return CafeResource collection
- **Note:** Uses `CafeResource` which shows public info only

#### `show(Cafe $cafe): JsonResponse`
- **Method:** GET /api/cafes/{cafe}
- **Auth:** Public (guest)
- **Flow:**
  1. Load relationships: photos, tables (active only)
  2. Return CafeResource with all public details

#### `availability(Request $request, Cafe $cafe): JsonResponse`
- **Method:** GET /api/cafes/{cafe}/availability
- **Auth:** Public
- **Query params:** `date` (required, YYYY-MM-DD), `guests` (optional)
- **Flow:**
  1. Check cafe is active
  2. Check date is not in blackout_dates
  3. Check date has operational hours
  4. Query tables with capacity >= guests (if specified)
  5. For each table, check AvailabilityService
  6. Return `{ date, tables: [{ id, name, capacity, type, available_slots }] }`

---

### 3.2 OwnerCafeController

**Path:** `Controllers/Cafe/OwnerCafeController.php`

#### `store(StoreCafeRequest $request): JsonResponse`
- **Method:** POST /api/owner/cafes
- **Middleware:** auth:sanctum, role:owner
- **Request:** `StoreCafeRequest` → toDto()
- **Flow:**
  1. Check ownership limit (1 cafe per owner for now)
  2. Create Cafe: approval_status=pending, owner_id=auth user
  3. Upload photos if included → create CafePhoto records
  4. Return CafeResource (201)
- **Errors:**
  - Already have a cafe (409)
  - Name already exists (422)

#### `update(Cafe $cafe, StoreCafeRequest $request): JsonResponse`
- **Method:** PUT /api/owner/cafes/{cafe}
- **Middleware:** auth:sanctum, role:owner
- **Ownership check:** `$cafe->owner_id !== auth()->id()` → 403
- **Request:** `StoreCafeRequest` → toDto()
- **Flow:**
  1. Verify ownership
  2. If approved → can edit limited fields
  3. If pending → can edit all fields
  4. Update Cafe
  5. Return CafeResource

#### `setHours(Request $request, Cafe $cafe): JsonResponse`
- **Method:** POST /api/owner/cafes/{cafe}/hours
- **Middleware:** auth:sanctum, role:owner
- **Request:** `{ hours: { mon: [{open, close}], ... } }`
- **Flow:**
  1. Validate hours format (day + open/close per day)
  2. Update `operational_hours` JSON
  3. Return CafeResource

#### `setBlackout(Request $request, Cafe $cafe): JsonResponse`
- **Method:** POST /api/owner/cafes/{cafe}/blackout
- **Middleware:** auth:sanctum, role:owner
- **Request:** `{ dates: ["2026-12-25", ...] }`
- **Flow:**
  1. Validate date array
  2. Merge into existing blackout_dates
  3. Update Cafe
  4. Return CafeResource

#### `uploadPhotos(Request $request, Cafe $cafe): JsonResponse`
- **Method:** POST /api/owner/cafes/{cafe}/photos
- **Middleware:** auth:sanctum, role:owner
- **Request:** multipart (photos[])
- **Flow:**
  1. Validate file types (jpg, png, webp)
  2. Store via Storage facade
  3. Create CafePhoto records
  4. If first photo → set is_primary=true
  5. Return CafePhotoResource collection

#### `deletePhoto(Cafe $cafe, int $photoId): JsonResponse`
- **Method:** DELETE /api/owner/cafes/{cafe}/photos/{photo}
- **Middleware:** auth:sanctum, role:owner
- **Flow:**
  1. Find photo, verify belongs to cafe
  2. Delete file from storage
  3. Delete CafePhoto record
  4. Return success (200)

---

## 4. Table Module

### Files: 2 controllers

```
app/Http/Controllers/Table/
├── TableController.php
└── OwnerTableController.php
```

---

### 4.1 TableController

**Path:** `Controllers/Table/TableController.php`

#### `index(Cafe $cafe): JsonResponse`
- **Method:** GET /api/cafes/{cafe}/tables
- **Auth:** Public
- **Flow:**
  1. Query active tables for cafe
  2. Return TableResource collection (includes capacities, types)

#### `slots(Cafe $cafe, Table $table, Request $request): JsonResponse`
- **Method:** GET /api/cafes/{cafe}/tables/{table}/slots
- **Auth:** Public
- **Query params:** `date` (required, YYYY-MM-DD)
- **Flow:**
  1. Verify table belongs to cafe
  2. Get operational hours for date
  3. Get booking rule (duration, price)
  4. Generate time slots based on duration
  5. Check each slot against AvailabilityService
  6. Return `{ date, table, slots: [{ time, available, price }] }`

---

### 4.2 OwnerTableController

**Path:** `Controllers/Table/OwnerTableController.php`

#### `store(Request $request): JsonResponse`
- **Method:** POST /api/owner/tables
- **Middleware:** auth:sanctum, role:owner
- **Request:** `{ cafe_id, name, capacity, table_type, description, photo? }`
- **Flow:**
  1. Verify cafe ownership
  2. Create Table
  3. Return TableResource (201)
- **Errors:**
  - Duplicate name in same cafe (422)

#### `update(Table $table, Request $request): JsonResponse`
- **Method:** PUT /api/owner/tables/{table}
- **Flow:**
  1. Verify table → cafe → ownership
  2. Update table
  3. Return TableResource

#### `destroy(Table $table): JsonResponse`
- **Method:** DELETE /api/owner/tables/{table}
- **Flow:**
  1. Check no active/future bookings
  2. Soft delete
  3. Return 204 No Content
- **Errors:**
  - Has active bookings (409)

#### `setBookingRules(Table $table, SetBookingRulesRequest $request): JsonResponse`
- **Method:** POST /api/owner/tables/{table}/booking-rules
- **Request:** `SetBookingRulesRequest` → toDto()
- **Flow:**
  1. Verify table → cafe → ownership
  2. Upsert BookingRule
  3. Return BookingRuleResource

---

## 5. Booking Module

### Files: 3 controllers

```
app/Http/Controllers/Booking/
├── BookingController.php
├── CustomerBookingController.php
└── OwnerBookingController.php
```

---

### 5.1 BookingController

**Path:** `Controllers/Booking/BookingController.php`
**Dependencies:** `BookingService`, `AvailabilityService`

#### `availability(Request $request): JsonResponse`
- **Method:** GET /api/bookings/availability
- **Middleware:** auth:sanctum
- **Query params:** `cafe_id`, `date`, `guests?`, `start_time?`
- **Flow:**
  1. Validate params
  2. Get active tables for cafe
  3. Call AvailabilityService for each table
  4. Return available slots grouped by table

#### `store(StoreBookingRequest $request): JsonResponse`
- **Method:** POST /api/bookings
- **Middleware:** auth:sanctum
- **Request:** `StoreBookingRequest` → toDto()
- **Flow:**
  1. Inject customer_id from auth user
  2. Call `BookingService@create(dto, auth()->id())`
  3. Return BookingResource (201)
- **Error handling:**
  - `SlotNotAvailableException` → 409
  - `BookingTimeWindowException` → 422
  - `ModelNotFoundException` → 404 (table/cafe)

#### `show(Booking $booking): JsonResponse`
- **Method:** GET /api/bookings/{booking}
- **Middleware:** auth:sanctum
- **Flow:**
  1. Check access: customer (own booking) or owner (their cafe's booking)
  2. Load relationships (cafe, table, payment, menuOrders)
  3. Return BookingResource

#### `cancel(CancelBookingRequest $request, Booking $booking): JsonResponse`
- **Method:** PUT /api/bookings/{booking}/cancel
- **Middleware:** auth:sanctum
- **Request:** `CancelBookingRequest` → toDto()
- **Flow:**
  1. Check access: only customer who owns the booking
  2. Call `BookingService@cancel(booking, 'customer', reason)`
  3. Return updated BookingResource
- **Error handling:**
  - `CancellationTimeExpiredException` → 422
  - Booking already cancelled (409)
  - Not owner of booking (403)

#### `reschedule(RescheduleBookingRequest $request, Booking $booking): JsonResponse`
- **Method:** PUT /api/bookings/{booking}/reschedule
- **Middleware:** auth:sanctum
- **Request:** `RescheduleBookingRequest` → toDto()
- **Flow:**
  1. Check access: only customer who owns the booking
  2. Call `BookingService@reschedule(booking, dto)`
  3. Return updated BookingResource

#### `checkIn(Request $request, Booking $booking): JsonResponse`
- **Method:** POST /api/bookings/{booking}/checkin
- **Middleware:** auth:sanctum
- **Flow:**
  1. Check access: customer (own booking) or owner
  2. Verify status = confirmed
  3. Verify current time is within booking window
  4. Update: status → confirmed (via update field), check_in_time = now
     *Note: BookingStatus enum tidak punya checked_in case, gunakan 'confirmed' + check_in_time*
  5. Dispatch BookingCheckIn event
  6. Return BookingResource
- **Errors:**
  - Not confirmed (409)
  - Too early/late (422)

#### `extend(ExtendBookingRequest $request, Booking $booking): JsonResponse`
- **Method:** POST /api/bookings/{booking}/extend
- **Middleware:** auth:sanctum
- **Request:** `ExtendBookingRequest` → toDto()
- **Flow:**
  1. Check access
  2. Verify status is confirmed/checked_in
  3. Validate extension limit (max 2x total, max extend_count=3)
  4. Update duration_minutes, end_time, extend_count++
  5. Dispatch BookingExtended event
  6. Return BookingResource

#### `refundRequest(Request $request, Booking $booking): JsonResponse`
- **Method:** POST /api/bookings/{booking}/refund-request
- **Middleware:** auth:sanctum
- **Request:** `{ bank_name, account_number, account_holder_name }`
- **Flow:**
  1. Check access: customer who owns the booking
  2. Verify booking is paid
  3. Verify no pending refund request
  4. Create RefundRequest (status: pending, initiated_by: customer)
  5. Return RefundRequest resource
- **Errors:**
  - Not paid (422)
  - Already requested (409)

---

### 5.2 CustomerBookingController

**Path:** `Controllers/Booking/CustomerBookingController.php`

#### `index(Request $request): JsonResponse`
- **Method:** GET /api/customer/bookings
- **Middleware:** auth:sanctum
- **Query params:** `status`, `per_page`, `page`
- **Flow:**
  1. Query bookings where customer_id = auth()->id()
  2. Filter by status (if provided)
  3. Order by booking_date DESC, start_time DESC
  4. Paginate
  5. Return BookingResource collection

---

### 5.3 OwnerBookingController

**Path:** `Controllers/Booking/OwnerBookingController.php`

#### `index(Request $request): JsonResponse`
- **Method:** GET /api/owner/bookings
- **Middleware:** auth:sanctum, role:owner
- **Query params:** `status`, `date`, `cafe_id`, `per_page`
- **Flow:**
  1. Get all cafes owned by auth user
  2. Query bookings where cafe_id in owner's cafes
  3. Filter by status, date, cafe
  4. Order by booking_date DESC
  5. Paginate
  6. Return BookingResource collection

#### `cancel(OwnerCancelBookingRequest $request, Booking $booking): JsonResponse`
- **Method:** PUT /api/owner/bookings/{booking}/cancel
- **Middleware:** auth:sanctum, role:owner
- **Request:** `OwnerCancelBookingRequest` → toDto()
- **Flow:**
  1. Verify booking's cafe is owned by auth user
  2. Call `BookingService@cancel(booking, 'owner', reason)`
  3. Return BookingResource

#### `noShow(Request $request, Booking $booking): JsonResponse`
- **Method:** PUT /api/owner/bookings/{booking}/no-show
- **Middleware:** auth:sanctum, role:owner
- **Flow:**
  1. Verify cafe ownership
  2. Check booking is confirmed or checked_in
  3. Update status → cancelled, cancelled_by=owner, note="no_show" via field
     *Note: No dedicated enum case; gunakan cancelled_by + cancellation_reason*
  4. Release lock
  5. Return BookingResource

#### `checkout(Request $request, Booking $booking): JsonResponse`
- **Method:** PUT /api/owner/bookings/{booking}/checkout
- **Middleware:** auth:sanctum, role:owner
- **Flow:**
  1. Verify cafe ownership
  2. Check booking is confirmed/checked_in
  3. Update check_out_time = now
  4. Calculate final total (table_price + menu subtotal)
  5. Dispatch event
  6. Return BookingResource

---

## 6. Menu Module

### Files: 2 controllers

```
app/Http/Controllers/Menu/
├── MenuController.php
└── OwnerMenuController.php
```

---

### 6.1 MenuController

**Path:** `Controllers/Menu/MenuController.php`

#### `index(Cafe $cafe, Request $request): JsonResponse`
- **Method:** GET /api/cafes/{cafe}/menus
- **Auth:** Public
- **Query params:** `category` (food/beverage/snack/dessert)
- **Flow:**
  1. Query MenuItems where cafe_id = cafe, availability_status = available
  2. Filter by category (if provided)
  3. Return MenuItemResource collection

---

### 6.2 OwnerMenuController

**Path:** `Controllers/Menu/OwnerMenuController.php`

#### `store(StoreMenuItemRequest $request): JsonResponse`
- **Method:** POST /api/owner/menus
- **Middleware:** auth:sanctum, role:owner
- **Request:** `StoreMenuItemRequest` → toDto()
- **Flow:**
  1. Verify cafe ownership
  2. Create MenuItem
  3. Return MenuItemResource (201)

#### `update(MenuItem $menuItem, StoreMenuItemRequest $request): JsonResponse`
- **Method:** PUT /api/owner/menus/{menuItem}
- **Middleware:** auth:sanctum, role:owner
- **Flow:**
  1. Verify menu → cafe → ownership
  2. Update MenuItem
  3. Return MenuItemResource

#### `destroy(MenuItem $menuItem): JsonResponse`
- **Method:** DELETE /api/owner/menus/{menuItem}
- **Middleware:** auth:sanctum, role:owner
- **Flow:**
  1. Verify ownership
  2. Soft delete
  3. Return 204

#### `toggle(MenuItem $menuItem): JsonResponse`
- **Method:** PUT /api/owner/menus/{menuItem}/toggle
- **Flow:**
  1. Verify ownership
  2. Flip availability_status (available ↔ unavailable)
  3. Return MenuItemResource

#### `bulkToggle(Request $request): JsonResponse`
- **Method:** PUT /api/owner/menus/bulk-toggle
- **Request:** `{ ids: [1,2,3], cafe_id }`
- **Flow:**
  1. Verify cafe ownership
  2. Get all menu items by IDs
  3. Toggle each
  4. Return success with count

---

## 7. Order Module

### Files: 3 controllers

```
app/Http/Controllers/Order/
├── OrderController.php
├── CustomerOrderController.php
└── OwnerOrderController.php
```

---

### 7.1 OrderController

**Path:** `Controllers/Order/OrderController.php`

#### `store(StoreOrderRequest $request): JsonResponse`
- **Method:** POST /api/orders
- **Middleware:** auth:sanctum
- **Request:** `StoreOrderRequest` → toDto()
- **Flow:**
  1. Inject customer_id from auth
  2. Validate booking exists and belongs to customer (if booking_id provided)
  3. Validate menu items belong to cafe
  4. Create MenuOrder (status: pending_payment, order_type: pre_order)
  5. Create MenuOrderItems
  6. Calculate total_price (sum of items × quantity)
  7. Calculate commission via CommissionService
  8. Update booking's menu_subtotal if applicable
  9. Dispatch OrderPlaced event
  10. Return MenuOrderResource (201)

#### `show(MenuOrder $menuOrder): JsonResponse`
- **Method:** GET /api/orders/{menuOrder}
- **Middleware:** auth:sanctum
- **Flow:**
  1. Check access: customer (own) or owner (their cafe)
  2. Load relationships (items, cafe, booking)
  3. Return MenuOrderResource

---

### 7.2 CustomerOrderController

**Path:** `Controllers/Order/CustomerOrderController.php`

#### `index(Request $request): JsonResponse`
- **Method:** GET /api/customer/orders
- **Middleware:** auth:sanctum
- **Query params:** `status`, `per_page`
- **Flow:**
  1. Query orders where customer_id = auth()->id()
  2. Filter by status
  3. Order by created_at DESC
  4. Paginate
  5. Return MenuOrderResource collection

---

### 7.3 OwnerOrderController

**Path:** `Controllers/Order/OwnerOrderController.php`

#### `index(Request $request): JsonResponse`
- **Method:** GET /api/owner/orders
- **Middleware:** auth:sanctum, role:owner
- **Flow:**
  1. Get owner's cafe IDs
  2. Query orders where cafe_id in owner's cafes
  3. Filter by status, date
  4. Paginate
  5. Return MenuOrderResource collection

#### `updateStatus(UpdateOrderStatusRequest $request, MenuOrder $menuOrder): JsonResponse`
- **Method:** PUT /api/owner/orders/{menuOrder}/status
- **Request:** `UpdateOrderStatusRequest` → toDto() (status: confirmed|preparing|ready|completed|cancelled)
- **Flow:**
  1. Verify cafe ownership
  2. Validate status transition:
     - pending_payment → confirmed
     - confirmed → preparing
     - preparing → ready
     - ready → completed
     - Any → cancelled
  3. Update status
  4. If cancelled → update payment handling
  5. Return MenuOrderResource

---

## 8. Payment Module

### Files: 1 controller

```
app/Http/Controllers/Payment/
└── PaymentController.php
```

---

### 8.1 PaymentController

**Path:** `Controllers/Payment/PaymentController.php`
**Dependencies:** `MidtransService`, `BookingService`

#### `initiate(Request $request): JsonResponse`
- **Method:** POST /api/payments
- **Middleware:** auth:sanctum
- **Request:** `{ payable_type, payable_id }`
- **Flow:**
  1. Validate payable exists
  2. Check access: customer owns the booking/order
  3. Check not already paid
  4. Calculate amount (booking total_price or menu order total_price)
  5. Create Payment record (status: pending)
  6. Call MidtransService→createTransaction() → get snap_token
  7. Save snap_token to payment
  8. Return `{ snap_token, redirect_url, payment }`
- **Errors:**
  - Payable not found (404)
  - Already paid (409)
  - Midtrans connection error (502)

#### `status(Payment $payment): JsonResponse`
- **Method:** GET /api/payments/{payment}/status
- **Middleware:** auth:sanctum
- **Flow:**
  1. Check access
  2. Return PaymentResource with current status

#### `webhook(Request $request): JsonResponse`
- **Method:** POST /api/payments/webhook
- **Auth:** Public (verified by signature)
- **Request:** Midtrans notification payload
- **Flow:**
  1. Extract `order_id`, `status_code`, `gross_amount`, `signature_key`
  2. Call `MidtransService→verifySignature(order_id, status_code, gross_amount, signature_key)`
  3. Find Payment by midtrans_order_id
  4. Update payment status based on transaction_status:
     - `settlement`/`capture` → status=success
     - `deny`/`cancel`/`expire` → status=failed
     - `refund` → status=refunded
  5. If success → call BookingService→confirmPayment()
  6. Dispatch PaymentReceived event
  7. Return 200 OK
- **Error handling:**
  - `WebhookSignatureException` → 401
  - Payment not found → 200 (acknowledge but ignore)

---

## 9. Favorite Module

### Files: 2 controllers

```
app/Http/Controllers/Favorite/
├── FavoriteController.php
└── CustomerFavoriteController.php
```

---

### 9.1 FavoriteController

**Path:** `Controllers/Favorite/FavoriteController.php`

#### `store(Request $request): JsonResponse`
- **Method:** POST /api/favorites
- **Middleware:** auth:sanctum, role:customer
- **Request:** `{ cafe_id }`
- **Flow:**
  1. Check cafe exists
  2. Check not already favorited
  3. Create Favorite
  4. Return FavoriteResource (201)
- **Errors:**
  - Already favorited (409)
  - Cafe not found (404)

#### `destroy(Cafe $cafe): JsonResponse`
- **Method:** DELETE /api/favorites/{cafe}
- **Middleware:** auth:sanctum, role:customer
- **Flow:**
  1. Find favorite by (customer_id, cafe_id)
  2. Delete
  3. Return 204

---

### 9.2 CustomerFavoriteController

**Path:** `Controllers/Favorite/CustomerFavoriteController.php`

#### `index(Request $request): JsonResponse`
- **Method:** GET /api/customer/favorites
- **Middleware:** auth:sanctum, role:customer
- **Flow:**
  1. Query favorites where customer_id = auth()->id()
  2. Load cafe relationship
  3. Return CafeResource collection (favorited cafes)

---

### 9.3 SearchHistoryController

**Path:** `Controllers/SearchHistory/SearchHistoryController.php`

#### `index(Request $request): JsonResponse`
- **Method:** GET /api/customer/search-history
- **Middleware:** auth:sanctum, role:customer
- **Flow:**
  1. Query search history where customer_id = auth()->id()
  2. Order by created_at DESC
  3. Limit to 20 entries
  4. Return collection

#### `destroyAll(): JsonResponse`
- **Method:** DELETE /api/customer/search-history
- **Middleware:** auth:sanctum, role:customer
- **Flow:**
  1. Delete all search history for auth user
  2. Return 204

#### `destroyOne(int $cafe): JsonResponse`
- **Method:** DELETE /api/customer/search-history/{cafe}
- **Middleware:** auth:sanctum, role:customer
- **Flow:**
  1. Delete specific entry
  2. Return 204

---

## 10. Analytics Module

### Files: 2 controllers

```
app/Http/Controllers/Analytics/
├── OwnerAnalyticsController.php
└── AdminAnalyticsController.php
```

---

### 10.1 OwnerAnalyticsController

**Path:** `Controllers/Analytics/OwnerAnalyticsController.php`

#### `dashboard(Request $request): JsonResponse`
- **Method:** GET /api/owner/analytics/dashboard
- **Middleware:** auth:sanctum, role:owner
- **Flow:**
  1. Get owner's cafe IDs
  2. Count today's bookings (confirmed + checked_in)
  3. Count active (checked_in) customers
  4. Sum today's revenue (cafe_receives for completed bookings)
  5. Count pending orders
  6. Return `{ today_bookings, active_customers, today_revenue, pending_orders }`

#### `revenue(Request $request): JsonResponse`
- **Method:** GET /api/owner/analytics/revenue
- **Query params:** `period` (daily|weekly|monthly), `from`, `to`
- **Flow:**
  1. Query bookings for owner's cafes
  2. Group by period
  3. Sum total_price, commission, cafe_receives
  4. Return aggregated data

#### `bookings(Request $request): JsonResponse`
- **Method:** GET /api/owner/analytics/bookings
- **Flow:**
  1. Query bookings for owner's cafes
  2. Count by status, group by date
  3. Identify peak hours
  4. Return booking insights

#### `menus(Request $request): JsonResponse`
- **Method:** GET /api/owner/analytics/menus
- **Flow:**
  1. Query completed menu orders for owner's cafes
  2. Join with items to get frequency
  3. Return top items by count

---

### 10.2 AdminAnalyticsController

**Path:** `Controllers/Analytics/AdminAnalyticsController.php`

#### `platform(Request $request): JsonResponse`
- **Method:** GET /api/admin/analytics/platform
- **Middleware:** auth:sanctum, role:admin
- **Flow:**
  1. Count total users (by role)
  2. Count total cafes (by approval_status)
  3. Count total bookings (by status)
  4. Sum total revenue (platform-wide cafe_receives)
  5. Return `{ users, cafes, bookings, revenue }`

#### `commission(Request $request): JsonResponse`
- **Method:** GET /api/admin/analytics/commission
- **Flow:**
  1. Query all completed bookings
  2. Sum commission grouped by period
  3. Return commission report

---

## 11. Admin Module

### Files: 8 controllers

```
app/Http/Controllers/Admin/
├── AdminCafeRegistrationController.php
├── AdminCafeController.php
├── AdminCommissionController.php
├── AdminBookingController.php
├── AdminOrderController.php
├── AdminRefundController.php
├── AdminUserController.php
└── AdminFeaturedCafeController.php
```

---

### 11.1 AdminCafeRegistrationController

**Path:** `Controllers/Admin/AdminCafeRegistrationController.php`

#### `index(Request $request): JsonResponse`
- **Method:** GET /api/admin/cafe-registrations
- **Middleware:** auth:sanctum, role:admin
- **Query params:** `status` (pending/active/suspended/rejected)
- **Flow:**
  1. Query cafes where status matches (default: pending)
  2. Load owner + photos
  3. Paginate
  4. Return CafeResource collection

#### `approve(Cafe $cafe): JsonResponse`
- **Method:** POST /api/admin/cafe-registrations/{cafe}/approve
- **Flow:**
  1. Verify cafe is pending
  2. Update approval_status → active
  3. Log to AdminAuditLog (action: 'approve_cafe', before→after)
  4. Notify owner (Notification record)
  5. Return CafeResource

#### `reject(Cafe $cafe, RejectCafeRequest $request): JsonResponse`
- **Method:** POST /api/admin/cafe-registrations/{cafe}/reject
- **Request:** `RejectCafeRequest` → toDto() (rejection_reason required)
- **Flow:**
  1. Verify cafe is pending
  2. Update approval_status → rejected, rejection_reason
  3. Log audit
  4. Notify owner
  5. Return CafeResource

---

### 11.2 AdminCafeController

**Path:** `Controllers/Admin/AdminCafeController.php`

#### `index(Request $request): JsonResponse`
- **Method:** GET /api/admin/cafes
- **Flow:**
  1. Query all cafes (with filters: status, query, city)
  2. Paginate
  3. Return CafeResource collection

#### `suspend(Cafe $cafe): JsonResponse`
- **Method:** PUT /api/admin/cafes/{cafe}/suspend
- **Flow:**
  1. Toggle between suspended and previous status (active ↔ suspended)
  2. Log audit
  3. Return CafeResource

---

### 11.3 AdminCommissionController

**Path:** `Controllers/Admin/AdminCommissionController.php`

#### `show(): JsonResponse`
- **Method:** GET /api/admin/commission-rules
- **Flow:**
  1. Get latest active CommissionRule
  2. Return CommissionRule resource

#### `update(Request $request): JsonResponse`
- **Method:** PUT /api/admin/commission-rules
- **Request:** `{ commission_type, percentage, active_from? }`
- **Flow:**
  1. Validate percentage
  2. Deactivate current rule (set active_to = now)
  3. Create new rule
  4. Log audit
  5. Return new rule

---

### 11.4 AdminBookingController

**Path:** `Controllers/Admin/AdminBookingController.php`

#### `index(Request $request): JsonResponse`
- **Method:** GET /api/admin/bookings
- **Flow:**
  1. Query all bookings
  2. Filter by status, date, cafe
  3. Paginate
  4. Return BookingResource collection

---

### 11.5 AdminOrderController

**Path:** `Controllers/Admin/AdminOrderController.php`

#### `index(Request $request): JsonResponse`
- **Method:** GET /api/admin/orders
- **Flow:**
  1. Query all menu orders
  2. Filter by status, date
  3. Paginate
  4. Return MenuOrderResource collection

---

### 11.6 AdminRefundController

**Path:** `Controllers/Admin/AdminRefundController.php`

#### `index(Request $request): JsonResponse`
- **Method:** GET /api/admin/refunds
- **Flow:**
  1. Query all refund requests
  2. Filter by status (default: pending)
  3. Load booking + customer
  4. Paginate
  5. Return refund request data

#### `process(RefundRequest $refundRequest): JsonResponse`
- **Method:** POST /api/admin/refunds/{refundRequest}/process
- **Flow:**
  1. Verify refund is pending
  2. Process via MidtransService→refund()
  3. Update RefundRequest status → processed, processed_at=now
  4. Update Booking payment_status → refunded
  5. Log audit
  6. Notify customer
  7. Return updated refund data

#### `reject(RefundRequest $refundRequest, Request $request): JsonResponse`
- **Method:** POST /api/admin/refunds/{refundRequest}/reject
- **Request:** `{ admin_notes }`
- **Flow:**
  1. Verify refund is pending
  2. Update status → rejected, admin_notes
  3. Notify customer
  4. Return updated refund data

---

### 11.7 AdminUserController

**Path:** `Controllers/Admin/AdminUserController.php`

#### `index(Request $request): JsonResponse`
- **Method:** GET /api/admin/users
- **Flow:**
  1. Query all users
  2. Filter by role, query (name/email)
  3. Paginate
  4. Return UserResource collection

#### `suspend(User $user): JsonResponse`
- **Method:** PUT /api/admin/users/{user}/suspend
- **Flow:**
  1. Toggle is_suspended flag (prisma-style soft block)
     *Note: User model tidak punya field is_suspended; perlu ditambahkan atau pakai alternatif*
  2. Log audit
  3. Return UserResource

---

### 11.8 AdminFeaturedCafeController

**Path:** `Controllers/Admin/AdminFeaturedCafeController.php`

#### `index(): JsonResponse`
- **Method:** GET /api/admin/featured-cafes
- **Flow:**
  1. Query all featured entries (with cafe)
  2. Order by display_order
  3. Return collection

#### `store(Request $request): JsonResponse`
- **Method:** POST /api/admin/featured-cafes
- **Request:** `{ cafe_id, display_order, active_from, active_to? }`
- **Flow:**
  1. Validate cafe exists
  2. Check not already featured
  3. Create FeaturedCafe (created_by = auth admin)
  4. Log audit
  5. Return FeaturedCafe resource (201)

#### `update(FeaturedCafe $featuredCafe, Request $request): JsonResponse`
- **Method:** PUT /api/admin/featured-cafes/{featuredCafe}
- **Flow:**
  1. Update fields (display_order, active_from, active_to)
  2. Log audit
  3. Return updated resource

#### `destroy(FeaturedCafe $featuredCafe): JsonResponse`
- **Method:** DELETE /api/admin/featured-cafes/{featuredCafe}
- **Flow:**
  1. Delete
  2. Log audit
  3. Return 204

---

## 12. File Generation Order

### Phase 1: Core Infrastructure (5 files)

| Order | File | Reason |
|-------|------|--------|
| 1 | `Auth/CustomerAuthController.php` | Entry point for all users |
| 2 | `Auth/OwnerAuthController.php` | Second auth path |
| 3 | `Auth/AdminAuthController.php` | Admin auth |
| 4 | `Auth/CustomerProfileController.php` | Customer profile |
| 5 | `Auth/OwnerProfileController.php` | Owner profile |

### Phase 2: Master Data (5 files)

| Order | File | Reason |
|-------|------|--------|
| 6 | `Cafe/CafeController.php` | Public cafe listing |
| 7 | `Cafe/OwnerCafeController.php` | Owner cafe management |
| 8 | `Table/TableController.php` | Public table display |
| 9 | `Table/OwnerTableController.php` | Owner table management |
| 10 | `Menu/OwnerMenuController.php` | Owner menu management |

### Phase 3: Core Transactions (4 files)

| Order | File | Reason |
|-------|------|--------|
| 11 | `Booking/BookingController.php` | Main booking operations |
| 12 | `Booking/CustomerBookingController.php` | Customer booking list |
| 13 | `Booking/OwnerBookingController.php` | Owner booking management |
| 14 | `Payment/PaymentController.php` | Payment + webhook |

### Phase 4: Supporting Transactions (4 files)

| Order | File | Reason |
|-------|------|--------|
| 15 | `Order/OrderController.php` | Order operations |
| 16 | `Order/CustomerOrderController.php` | Customer order list |
| 17 | `Order/OwnerOrderController.php` | Owner order management |
| 18 | `Menu/MenuController.php` | Public menu display |

### Phase 5: Personalization (5 files)

| Order | File | Reason |
|-------|------|--------|
| 19 | `Favorite/FavoriteController.php` | Favorite toggle |
| 20 | `Favorite/CustomerFavoriteController.php` | Favorite list |
| 21 | `SearchHistory/SearchHistoryController.php` | Search history |
| 22 | `Analytics/OwnerAnalyticsController.php` | Owner analytics |
| 23 | `Analytics/AdminAnalyticsController.php` | Admin analytics |

### Phase 6: Admin (8 files)

| Order | File | Reason |
|-------|------|--------|
| 24 | `Admin/AdminCafeRegistrationController.php` | Registration approval |
| 25 | `Admin/AdminCafeController.php` | Cafe management |
| 26 | `Admin/AdminCommissionController.php` | Commission config |
| 27 | `Admin/AdminBookingController.php` | View all bookings |
| 28 | `Admin/AdminOrderController.php` | View all orders |
| 29 | `Admin/AdminRefundController.php` | Refund processing |
| 30 | `Admin/AdminUserController.php` | User management |
| 31 | `Admin/AdminFeaturedCafeController.php` | Featured cafes |

---

*Document generated: 18 July 2026*
*CafeNow v1.0 — Controller Implementation Plan*

---
### Perubahan Infrastructure yang Sudah Dieksekusi (18 July 2026)

Sebelum plan ini dibuat, 3 perubahan infrastructure telah dikerjakan:

1. **Migration `2026_07_18_000001_add_fields_to_users_table.php`**
   - Menambah kolom: `full_name`, `role` (default: customer), `phone` (unique), `is_phone_verified`, `profile_pic`, `date_of_birth`, `is_suspended` ke tabel `users`
   - Kolom `is_suspended` diperlukan oleh `AdminUserController::suspend`
   - Kolom `role` diperlukan oleh middleware `CheckRole` dan enum `UserRole`
   - Kolom `full_name`, `phone`, `is_phone_verified`, `profile_pic`, `date_of_birth` diperlukan oleh `UserResource` dan `RegisterRequest`

2. **Update `app/Models/User.php`**
   - `#[Fillable]` diperluas: menambah `full_name`, `phone`, `is_phone_verified`, `profile_pic`, `date_of_birth`, `is_suspended`
   - `casts()` diperluas: menambah `is_phone_verified => boolean`, `is_suspended => boolean`, `date_of_birth => date`

3. **Update `config/services.php`**
   - Menambah entri `midtrans`: `server_key`, `merchant_id`, `client_key`, `is_production`
   - Diperlukan oleh `MidtransService` yang sudah membaca `config('services.midtrans.*')`

### Progress Eksekusi (18 July 2026) — ✅ SELESAI

#### Fixes pada Existing Code
| File | Perubahan |
|------|-----------|
| `app/Services/Booking/LockService.php` | `Cache::store('redis')` → `Cache::` (default store) |
| `app/Exceptions/Handler.php` | Mapping 6 custom exceptions ke HTTP code + kode error |
| `app/Http/Requests/Auth/VerifyOtpRequest.php` | `phone` → `email` (sesuai controller plan) |
| `app/Http/Requests/Auth/ResendOtpRequest.php` | `phone` → `email` (sesuai controller plan) |
| `app/Models/User.php` | Tambah relasi `cafes()` — diperlukan oleh OwnerBookingController, OwnerOrderController |

#### Helper Files (7 file baru)
| File | Fungsi |
|------|--------|
| `app/Services/Auth/OtpService.php` | Generate, validate, resend OTP via Cache (5m TTL) + send email |
| `app/Http/Requests/Auth/ProfileUpdateRequest.php` | Validasi update profile customer |
| `app/Http/Requests/Auth/OwnerProfileUpdateRequest.php` | Validasi update profile owner |
| `app/Http/Resources/FavoriteResource.php` | Response favorite |
| `app/Http/Resources/SearchHistoryResource.php` | Response search history |
| `app/Http/Resources/RefundRequestResource.php` | Response refund request |
| `app/Http/Resources/FeaturedCafeResource.php` | Response featured cafe |

#### 31 Controller — ✅ SEMUA SELESAI

| Phase | File | Status |
|-------|------|--------|
| **1: Auth** | `CustomerAuthController`, `CustomerProfileController`, `OwnerAuthController`, `OwnerProfileController`, `AdminAuthController` | ✅ |
| **2: Master Data** | `CafeController`, `OwnerCafeController`, `TableController`, `OwnerTableController`, `OwnerMenuController` | ✅ |
| **3: Core Transactions** | `BookingController`, `CustomerBookingController`, `OwnerBookingController`, `PaymentController` | ✅ |
| **4: Supporting** | `OrderController`, `CustomerOrderController`, `OwnerOrderController`, `MenuController` | ✅ |
| **5: Personalization** | `FavoriteController`, `CustomerFavoriteController`, `SearchHistoryController`, `OwnerAnalyticsController`, `AdminAnalyticsController` | ✅ |
| **6: Admin** | `AdminCafeRegistrationController`, `AdminCafeController`, `AdminCommissionController`, `AdminBookingController`, `AdminOrderController`, `AdminRefundController`, `AdminUserController`, `AdminFeaturedCafeController` | ✅ |

Migration `2026_07_18_000001_add_fields_to_users_table` berjalan sukses. 90 route API terdaftar dan seluruh file lolos syntax check.
