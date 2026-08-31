# CafeNow — User Flows v1.0

> Flowchart-style documentation from user perspective
> Each flow describes step-by-step interactions across the system.

---

## Table of Contents

- [Customer Flows](#customer-flows)
  - [CF-01: Register & Email Verification](#cf-01-register--email-verification)
  - [CF-02: Login (Email)](#cf-02-login-email)
  - [CF-03: Social Login](#cf-03-social-login)
  - [CF-04: Browse & Search Cafes](#cf-04-browse--search-cafes)
  - [CF-05: View Cafe Detail & Check Availability](#cf-05-view-cafe-detail--check-availability)
  - [CF-06: Book a Table](#cf-06-book-a-table)
  - [CF-07: Pay Booking (Midtrans Snap)](#cf-07-pay-booking-midtrans-snap)
  - [CF-08: View My Bookings](#cf-08-view-my-bookings)
  - [CF-09: Cancel Booking (Customer)](#cf-09-cancel-booking-customer)
  - [CF-10: Reschedule Booking](#cf-10-reschedule-booking)
  - [CF-11: Check In / Extend](#cf-11-check-in--extend)
  - [CF-12: Order Menu (Dine-in)](#cf-12-order-menu-dine-in)
  - [CF-13: Order Menu (Takeaway)](#cf-13-order-menu-takeaway)
  - [CF-14: Request Refund](#cf-14-request-refund)
  - [CF-15: Manage Favorites](#cf-15-manage-favorites)
  - [CF-16: Manage Profile](#cf-16-manage-profile)
  - [CF-17: Logout](#cf-17-logout)
- [Owner Flows](#owner-flows)
  - [OF-01: Register & Login](#of-01-register--login)
  - [OF-02: Register Cafe](#of-02-register-cafe)
  - [OF-03: Manage Cafe Profile](#of-03-manage-cafe-profile)
  - [OF-04: Manage Tables](#of-04-manage-tables)
  - [OF-05: Set Pricing Rules](#of-05-set-pricing-rules)
  - [OF-06: Manage Menu Items](#of-06-manage-menu-items)
  - [OF-07: View Bookings](#of-07-view-bookings)
  - [OF-08: Process Booking (Owner)](#of-08-process-booking-owner)
  - [OF-09: View & Process Orders](#of-09-view--process-orders)
  - [OF-10: Analytics Dashboard](#of-10-analytics-dashboard)
- [Admin Flows](#admin-flows)
  - [AF-01: Login](#af-01-login)
  - [AF-02: Review Cafe Registrations](#af-02-review-cafe-registrations)
  - [AF-03: Manage Cafes](#af-03-manage-cafes)
  - [AF-04: Manage Commission Rules](#af-04-manage-commission-rules)
  - [AF-05: Process Refund Requests](#af-05-process-refund-requests)
  - [AF-06: Manage Featured Cafes](#af-06-manage-featured-cafes)
  - [AF-07: Manage Users](#af-07-manage-users)
  - [AF-08: Platform Analytics](#af-08-platform-analytics)
- [System Flows](#system-flows)
  - [SF-01: Auto-Complete Expired Bookings](#sf-01-auto-complete-expired-bookings)
  - [SF-02: Auto-Cancel Unpaid Bookings](#sf-02-auto-cancel-unpaid-bookings)
  - [SF-03: Auto-Schedule Menu Preparation](#sf-03-auto-schedule-menu-preparation)

---

# Customer Flows

---

## CF-01: Register & Email Verification

**Actor:** New Customer
**Trigger:** User visits register page

```
Step 1: Customer opens Register page
  │
Step 2: Customer fills form (name, email, password, confirm password)
  │         │
  │    [Validation Error] ← Form Request validates input
  │         │                  - name: required, max:255
  │         │                  - email: required, email, unique:users
  │         │                  - password: required, min:8, confirmed
  │         │
Step 3: POST /api/auth/register → RegisterRequest → toDto()
  │         │
  │    [Duplicate Email] ← return validation error "Email already registered"
  │         │
Step 4: User created (role: customer, email_verified_at: null)
  │
Step 5: Generate 6-digit OTP → send to email
  │
Step 6: Return response { success: true, data: { email, message: "OTP sent" } }
  │
Step 7: Redirect to OTP verification page
  │
Step 8: Customer enters OTP code
  │         │
Step 9: POST /api/auth/verify-otp → VerifyOtpRequest
  │         │
  │    [Wrong OTP/Expired] → return error "Kode OTP salah atau sudah expired"
  │         │
Step 10: Mark email_verified_at = now()
  │
Step 11: Generate Sanctum token → return { token, user }
  │
Step 12: Redirect to Dashboard
```

**API Calls:**
```
POST /api/auth/register        → CustomerAuthController@register
POST /api/auth/verify-otp      → CustomerAuthController@verifyOtp
POST /api/auth/resend-otp      → CustomerAuthController@resendOtp
```

**Error States:**
- Email already registered (409 Conflict)
- Invalid OTP (422 Unprocessable)
- OTP expired (422 Unprocessable)

---

## CF-02: Login (Email)

**Actor:** Existing Customer
**Trigger:** User opens login page

```
Step 1: Customer fills email + password
  │
Step 2: POST /api/auth/login → LoginRequest → toDto()
  │
Step 3: Validate credentials via Auth::attempt()
  │         │
  │    [Invalid] → return error "Email atau password salah" (401)
  │         │
Step 4: Check if email_verified_at is null
  │         │
  │    [Not Verified] → resend OTP → redirect to OTP page
  │         │
Step 5: Generate Sanctum token → return { token, user }
  │
Step 6: Store token on client (localStorage / HTTP-only cookie)
  │
Step 7: Redirect to Dashboard
```

**API:**
```
POST /api/auth/login → CustomerAuthController@login
```

---

## CF-03: Social Login

**Actor:** Customer with Google/Apple account
**Trigger:** User clicks "Sign in with Google" or "Sign in with Apple"

```
Step 1: Customer clicks social login button
  │
Step 2: Frontend initiates OAuth flow via Google/Apple SDK
  │
Step 3: User grants permission → receives OAuth token
  │
Step 4: Frontend sends token to backend
  │
Step 5: POST /api/auth/social-login
  │
Step 6: Backend verifies token with provider
  │         │
  │    [Invalid Token] → return error (401)
  │         │
Step 7: Look up user by provider_id
  │         │
  │    [New User] → Create user with provider data + email_verified_at = now
  │    [Existing]  → Update last_login
  │         │
Step 8: Generate Sanctum token → return { token, user, is_new }
  │
Step 9: Redirect based on is_new (profile completion) or Dashboard
```

**API:**
```
POST /api/auth/social-login → CustomerAuthController@socialLogin
```

---

## CF-04: Browse & Search Cafes

**Actor:** Customer (guest or logged in)
**Trigger:** User opens home page / search

```
Step 1: Customer sees list of cafes (paginated)
  │
Step 2: GET /api/cafes?lat=X&lng=Y&query=keyword&category=...
  │
Step 3: Backend returns CafeResource collection
  │         - Featured cafes (with position priority)
  │         - Nearby cafes (sorted by distance)
  │         - Search results (by name or address)
  │         - Each item: name, rating, address, photos[]
  │
Step 4: Customer can refine search:
  │         - By keyword (search_history auto-saved if logged in)
  │         - By location (lat/lng proximity)
  │         - By availability date/time
  │
Step 5: Customer clicks cafe → CF-05
```

**API:**
```
GET /api/cafes → CafeController@index
```

**Sort Options:**
- nearest (default)
- rating
- featured (admin-selected)

---

## CF-05: View Cafe Detail & Check Availability

**Actor:** Customer
**Trigger:** Click on a cafe card

```
Step 1: GET /api/cafes/{cafe}
  │
Step 2: Return CafeResource with:
  │         - Info (name, description, address, operating_hours)
  │         - Photos gallery
  │         - Rating & review count
  │         - List of tables with capacities
  │
Step 3: Customer selects date + guest count
  │
Step 4: GET /api/cafes/{cafe}/availability?date=YYYY-MM-DD&guests=N
  │
Step 5: System checks:
  │         - Operating hours for that day
  │         - Blackout dates
  │         - Available tables matching capacity
  │         - Booked/locked slots per table
  │
Step 6: Return available time slots per table
  │         e.g.: { tables: [ { id, table_number, capacity,
  │                    slots: ["10:00","10:30","11:00",...] } ] }
  │
Step 7: Customer selects table + time slot → CF-06
  │
Step 8: [Optional] Customer browses menu
  │         GET /api/cafes/{cafe}/menus → list MenuItemResource
```

**API:**
```
GET /api/cafes/{cafe}                     → CafeController@show
GET /api/cafes/{cafe}/availability        → CafeController@availability
GET /api/cafes/{cafe}/tables              → TableController@index
GET /api/cafes/{cafe}/menus               → MenuController@index
```

**Error States:**
- Cafe not found (404)
- Cafe suspended/not approved (403)
- Date is past / no operating hours (422)

---

## CF-06: Book a Table

**Actor:** Customer (authenticated)
**Trigger:** Customer clicks "Book Now" after selecting table + time

```
Step 1: Customer sees booking summary:
  │         - Cafe name, table number
  │         - Date, time, duration
  │         - Guest count
  │         - Price (table price + surge if applicable)
  │         - Optional: customer notes
  │
Step 2: POST /api/bookings → StoreBookingRequest → toDto()
  │         Payload: { table_id, booking_date, start_time,
  │                   duration_minutes, guest_count, customer_notes? }
  │
Step 3: BookingService@create()
  │
  │   a. CheckBookingEligibility → validate min 2 hours advance
  │         │ [Too Close] → BookingTimeWindowException (422)
  │         │
  │   b. AvailabilityService@isAvailable() → check slot
  │         │ [Not Available] → SlotNotAvailableException (409)
  │         │
  │   c. LockService@acquire() → Redis lock (TTL 900s)
  │         │ [Already Locked] → SlotNotAvailableException (409)
  │         │
  │   d. CalculatePrice → table rule + surge pricing
  │   e. CommissionService@calculateBookingCommission()
  │   f. DB Transaction → create Booking record
  │         │ - status: pending, payment_status: unpaid
  │         │ - booking_reference: BKG-YYYYMMDD-XXXXX
  │         │ - lock_expires_at: now + 15 min
  │         │
  │   g. Return BookingResource
  │
Step 4: Customer directed to payment (CF-07)
```

**API:**
```
POST /api/bookings → BookingController@store
```

**Error States:**
- Booking must be 2+ hours in advance (422)
- Slot not available (409)
- Table not found (404)
- Cannot book past closing time (422)

---

## CF-07: Pay Booking (Midtrans Snap)

**Actor:** Customer
**Trigger:** After booking created, customer clicks "Pay Now"

```
Step 1: Customer sees payment page with:
  │         - Booking reference
  │         - Amount: table_price + (future: menu_subtotal)
  │         - Payment methods: credit card, bank transfer, e-wallet, etc.
  │
Step 2: POST /api/payments → initiate payment
  │         Payload: { payable_id: booking_id, payable_type: "booking",
  │                   amount, customer_details }
  │
Step 3: PaymentController@initiate()
  │   a. Create Payment record (status: pending)
  │   b. MidtransService@createTransaction()
  │      Payload: { order_id, gross_amount, items, customer }
  │      → Return { snap_token, snap_redirect_url }
  │   c. Update payment record with snap_token
  │   d. Return { snap_token, snap_redirect_url }
  │
Step 4: Client opens Midtrans Snap popup/redirect
  │
Step 5: Customer completes payment on Midtrans page
  │         │
  │    [Success] → Midtrans redirects to success URL
  │    [Failed]  → Midtrans redirects to failure URL
  │    [Pending] → Midtrans shows pending status
  │
Step 6: [Async] Midtrans sends POST /api/payments/webhook
  │   a. Verify signature via MidtransService@verifySignature()
  │      │ [Invalid] → WebhookSignatureException (401)
  │   b. Update payment record (status, transaction_id, channel)
  │   c. BookingService@confirmPayment()
  │      │ - Update booking: status→confirmed, payment_status→paid
  │      │ - LockService@releaseForBooking()
  │      │ - Dispatch BookingConfirmed event
  │   d. Return 200 OK to Midtrans
  │
Step 7: Client polls GET /api/payments/{payment}/status
  │
Step 8: Customer redirected to booking detail / "Booking Confirmed" page
```

**API:**
```
POST /api/payments              → PaymentController@initiate
POST /api/payments/webhook      → PaymentController@webhook
GET  /api/payments/{id}/status  → PaymentController@status
```

**Error States:**
- Payable not found (404)
- Payment already completed (409)
- Midtrans connection failure (502)
- Invalid webhook signature (401)
- Amount mismatch (422)

---

## CF-08: View My Bookings

**Actor:** Customer (authenticated)
**Trigger:** Customer opens "My Bookings" page

```
Step 1: GET /api/customer/bookings?status=...&page=...
  │
Step 2: Query bookings where customer_id = auth user
  │         - Paginated results
  │         - Filterable by status (pending, confirmed, past, cancelled)
  │         - Sorted by booking_date DESC
  │
Step 3: Return paginated BookingResource
  │         Each item: reference, cafe name, table, date, time,
  │                    status, payment_status, total_price
  │
Step 4: Customer can click booking → detail view
  │         GET /api/bookings/{booking}
  │
Step 5: Based on status, available actions:
  │         - Pending + Unpaid → Pay Now (CF-07)
  │         - Confirmed + Upcoming → Cancel (CF-09), Reschedule (CF-10)
  │         - Checked In → Extend (CF-11)
  │         - Completed → Request Refund (CF-14)
  │         - Cancelled → View reason (no action)
```

**API:**
```
GET /api/customer/bookings → CustomerBookingController@index
GET /api/bookings/{booking} → BookingController@show
```

---

## CF-09: Cancel Booking (Customer)

**Actor:** Customer
**Trigger:** Customer clicks "Cancel Booking"

```
Step 1: Customer sees cancel confirmation dialog
  │         Warning: cancellation must be 3+ hours before booking
  │
Step 2: POST /api/bookings/{booking}/cancel
  │         Payload: { cancelled_by: "customer", reason?: "..." }
  │
Step 3: BookingService@cancel()
  │   a. Check cancelled_by === "customer"
  │   b. If start_time - now < 3 hours → CancellationTimeExpiredException (422)
  │   c. Update booking: status→cancelled, cancelled_by, cancellation_reason
  │   d. LockService@releaseForBooking()
  │   e. Dispatch BookingCancelled event
  │
Step 4: Return updated BookingResource
  │
Step 5: [Future] Handle refund if payment was already made
```

**API:**
```
PUT /api/bookings/{booking}/cancel → BookingController@cancel
```

**Error States:**
- Cancellation window expired (< 3 hours before) (422)
- Booking already cancelled/checked_out (409)
- Not your booking (403)
- Booking not found (404)

---

## CF-10: Reschedule Booking

**Actor:** Customer
**Trigger:** Customer clicks "Reschedule" on confirmed booking

```
Step 1: Customer sees current booking + new date/time picker
  │
Step 2: System shows available slots for same table
  │         (reuse availability check)
  │
Step 3: Customer selects new date + time + duration
  │
Step 4: PUT /api/bookings/{booking}/reschedule
  │         Payload: { booking_date, start_time, duration_minutes }
  │
Step 5: BookingService@reschedule()
  │   a. CheckBookingEligibility (min 2h)
  │   b. AvailabilityService@isAvailable()
  │   c. Update booking fields
  │   d. Dispatch BookingRescheduled event
  │         { booking_id, old_date, new_date, old_start, new_start }
  │
Step 6: Return updated BookingResource
```

**API:**
```
PUT /api/bookings/{booking}/reschedule → BookingController@reschedule
```

**Error States:**
- New slot not available (409)
- Cannot reschedule to past time (422)
- Only confirmed bookings can be rescheduled (409)

---

## CF-11: Check In / Extend

**Actor:** Customer
**Trigger:** Customer arrives at cafe / wants to extend stay

### Check In Flow:

```
Step 1: Customer at cafe, clicks "Check In"
  │
Step 2: POST /api/bookings/{booking}/checkin
  │
Step 3: BookingController@checkIn()
  │   a. Verify booking is confirmed
  │   b. Verify current time is within booking window
  │   c. Update: status→checked_in, checked_in_at→now
  │   d. Dispatch BookingCheckIn event
  │
Step 4: Return updated BookingResource
  │
Step 5: Owner notified (real-time or in-app)
```

### Extend Flow:

```
Step 1: Customer clicks "Extend Duration"
  │
Step 2: POST /api/bookings/{booking}/extend
  │         Payload: { additional_minutes }
  │
Step 3: BookingController@extend()
  │   a. Verify booking is checked_in
  │   b. Validate extension limit
  │   c. Update duration + end_time
  │   d. Recalculate price if needed
  │   e. Dispatch BookingExtended event
  │
Step 4: Return updated BookingResource
```

**API:**
```
POST /api/bookings/{booking}/checkin  → BookingController@checkIn
POST /api/bookings/{booking}/extend   → BookingController@extend
```

**Error States (Check In):**
- Booking not yet confirmed (409)
- Too early / too late for check-in (422)
- Already checked in (409)

**Error States (Extend):**
- Booking not checked in (409)
- Exceeds maximum extension limit (422)
- Cafe doesn't allow extensions (422)

---

## CF-12: Order Menu (Dine-in)

**Actor:** Customer (with active booking)
**Trigger:** Customer opens menu while checked in

```
Step 1: Customer sees cafe menu items grouped by category
  │         GET /api/cafes/{cafe}/menus → MenuItemResource[]
  │
Step 2: Customer selects items + quantities
  │
Step 3: POST /api/orders → StoreOrderRequest → toDto()
  │         Payload: { cafe_id, booking_id, order_type: "dine_in",
  │                   items: [{ menu_item_id, quantity, notes? }] }
  │
Step 4: OrderController@store()
  │   a. Validate booking belongs to customer
  │   b. Validate cafe is the one customer is at
  │   c. Create MenuOrder (status: pending)
  │   d. Create MenuOrderItems
  │   e. Calculate subtotal
  │   f. Dispatch OrderPlaced event
  │
Step 5: Owner sees incoming order in real-time (Reverb)
  │
Step 6: Customer can view order status
  │         GET /api/orders/{menuOrder}
  │
Step 7: Order progresses: pending → confirmed → preparing → ready → served
  │         (Owner updates status via OF-09)
```

**API:**
```
POST /api/orders             → OrderController@store
GET  /api/orders/{order}     → OrderController@show
GET  /api/customer/orders    → CustomerOrderController@index
GET  /api/cafes/{cafe}/menus → MenuController@index
```

**Error States:**
- Booking not active (409)
- Menu item unavailable (422)
- Cafe mismatch (422)
- Maximum order limit reached (422)

---

## CF-13: Order Menu (Takeaway)

**Actor:** Customer (any authenticated)
**Trigger:** Customer wants takeaway from any cafe

```
Step 1: Customer browses cafes → selects cafe
  │
Step 2: Views menu (same as CF-12 step 1)
  │
Step 3: Selects items + quantity
  │
Step 4: POST /api/orders
  │         Payload: { cafe_id, booking_id: null,
  │                   order_type: "takeaway",
  │                   items: [...] }
  │
Step 5: OrderController@store()
  │   a. No booking validation (takeaway)
  │   b. Create MenuOrder (status: pending)
  │   c. Create items
  │
Step 6: Customer notified when ready
  │
Step 7: [Future] Payment for takeaway orders
```

**API:**
```
POST /api/orders → OrderController@store
```

---

## CF-14: Request Refund

**Actor:** Customer
**Trigger:** Customer wants refund for cancelled/completed booking

```
Step 1: Customer opens booking detail
  │
Step 2: Clicks "Request Refund"
  │
Step 3: Form: reason for refund
  │
Step 4: POST /api/bookings/{booking}/refund-request
  │
Step 5: BookingController@refundRequest()
  │   a. Validate booking is paid & completed/cancelled
  │   b. Check no pending refund request exists
  │   c. Create RefundRequest (status: pending)
  │
Step 6: Admin reviews refund request (AF-05)
```

**API:**
```
POST /api/bookings/{booking}/refund-request → BookingController@refundRequest
```

**Error States:**
- Booking not paid (422)
- Refund already requested (409)
- Booking still active (422)
- Refund period expired (422)

---

## CF-15: Manage Favorites

**Actor:** Customer (authenticated)

### Add Favorite:
```
Step 1: Customer on cafe detail page
Step 2: Clicks heart/favorite icon
Step 3: POST /api/favorites → { cafe_id }
Step 4: Favorite created
Step 5: Heart icon filled
```

### Remove Favorite:
```
Step 1: Customer on favorite list or cafe detail
Step 2: Clicks filled heart icon
Step 3: DELETE /api/favorites/{cafe}
Step 4: Favorite removed
Step 5: Heart icon unfilled
```

### View Favorites:
```
Step 1: Customer opens "Favorites" page
Step 2: GET /api/customer/favorites
Step 3: Return list of CafeResource (favorited cafes)
Step 4: Click cafe → view detail (CF-05)
```

**API:**
```
POST /api/favorites                → FavoriteController@store
DELETE /api/favorites/{cafe}       → FavoriteController@destroy
GET /api/customer/favorites        → CustomerFavoriteController@index
```

---

## CF-16: Manage Profile

**Actor:** Customer (authenticated)

### View/Update Profile:
```
Step 1: Customer opens Settings → Profile
Step 2: GET /api/customer/profile → UserResource
Step 3: Customer edits name, email, phone
Step 4: PUT /api/customer/profile → ProfileUpdateRequest → toDto()
Step 5: Update user record
Step 6: Return updated UserResource
```

### Change Password:
```
Step 1: Customer opens Settings → Security
Step 2: Form: current_password, new_password, confirm_password
Step 3: PUT /api/settings/password → PasswordUpdateRequest
Step 4: Validate current_password matches
Step 5: Update password (hashed)
Step 6: Return success
```

### Delete Account:
```
Step 1: Customer opens Settings → Danger Zone
Step 2: Confirm password
Step 3: DELETE /api/settings/profile → ProfileDeleteRequest
Step 4: Soft delete user + revoke tokens
Step 5: Redirect to home
```

### Two-Factor Authentication:
```
Step 1: Customer enables 2FA
Step 2: Scan QR code with authenticator app
Step 3: Enter code to confirm
Step 4: 2FA enabled (via Fortify)
```

**API:**
```
GET  /api/customer/profile    → CustomerProfileController@show
PUT  /api/customer/profile    → CustomerProfileController@update
PUT  /api/settings/password   → Settings\PasswordUpdateRequest
     (via Fortify route)
DELETE /api/settings/profile
```

---

## CF-17: Logout

**Actor:** Customer (authenticated)
**Trigger:** Customer clicks "Logout"

```
Step 1: POST /api/auth/logout
  │
Step 2: Revoke current Sanctum token
  │
Step 3: Clear token on client
  │
Step 4: Redirect to home/login page
```

**API:**
```
POST /api/auth/logout → CustomerAuthController@logout
```

---

# Owner Flows

---

## OF-01: Register & Login

**Actor:** New Cafe Owner

### Register:
```
Step 1: Owner opens register page → selects "Cafe Owner"
  │
Step 2: POST /api/owner/register
  │         Payload: { name, email, password, password_confirmation }
  │
Step 3: User created (role: owner)
  │
Step 4: Return token + user data
  │
Step 5: Redirect to owner dashboard
```

### Login:
```
Step 1: POST /api/owner/login
Step 2: Validate credentials + role === owner
Step 3: Return token + user data
Step 4: Redirect to owner dashboard
```

**API:**
```
POST /api/owner/register        → OwnerAuthController@register
POST /api/owner/login           → OwnerAuthController@login
POST /api/owner/forgot-password → OwnerAuthController@forgotPassword
POST /api/owner/reset-password  → OwnerAuthController@resetPassword
GET  /api/owner/profile         → OwnerProfileController@show
PUT  /api/owner/profile         → OwnerProfileController@update
```

---

## OF-02: Register Cafe

**Actor:** Owner (authenticated)
**Trigger:** Owner clicks "Register New Cafe"

```
Step 1: Owner fills cafe registration form:
  │         - Name
  │         - Description
  │         - Address (with map picker for lat/lng)
  │         - Operating hours (per day: open/close, or closed)
  │         - Photos (upload up to 10)
  │
Step 2: POST /api/owner/cafes → StoreCafeRequest → toDto()
  │         Payload: { name, description, address, latitude,
  │                   longitude, operating_hours, photos[] }
  │
Step 3: OwnerCafeController@store()
  │   a. Create Cafe (approval_status: pending)
  │   b. Upload photos → store URLs → create CafePhoto records
  │   c. Return CafeResource
  │
Step 4: Owner redirected to cafe detail page
  │         Banner: "Cafe sedang ditinjau admin"
  │
Step 5: [Async] Admin reviews → approves/rejects (AF-02)
  │
Step 6: Owner notified of approval/rejection
  │
Step 7: If approved → cafe visible to customers
  │         If rejected → see rejection reason → edit & resubmit
```

**API:**
```
POST /api/owner/cafes → OwnerCafeController@store
```

**Error States:**
- Owner already has cafe pending (409)
- Name already taken (422)
- Operating hours invalid format (422)
- Image upload failed (422)

---

## OF-03: Manage Cafe Profile

**Actor:** Owner
**Trigger:** Owner opens cafe settings

### Update Cafe:
```
Step 1: Owner edits cafe info (name, description, address)
Step 2: PUT /api/owner/cafes/{cafe}
Step 3: Update cafe record
Step 4: If name changed → regenerate slug
```

### Set Operating Hours:
```
Step 1: Owner sets hours per day
Step 2: POST /api/owner/cafes/{cafe}/hours
  │         Payload: { hours: { mon: [{open:"09:00", close:"17:00"}],
  │                             tue: [{open:"09:00", close:"17:00"}],
  │                             ... } }
Step 3: Update operating_hours JSON
```

### Set Blackout Dates:
```
Step 1: Owner adds dates when cafe is closed
Step 2: POST /api/owner/cafes/{cafe}/blackout
  │         Payload: { dates: ["2026-12-25", "2026-01-01"] }
Step 3: Store blackout dates
```

### Manage Photos:
```
Step 1: Upload photos → POST /api/owner/cafes/{cafe}/photos
Step 2: Delete photo → DELETE /api/owner/cafes/{cafe}/photos/{photoId}
Step 3: Reorder/set primary (future)
```

**API:**
```
PUT  /api/owner/cafes/{cafe}                → OwnerCafeController@update
POST /api/owner/cafes/{cafe}/hours          → OwnerCafeController@setHours
POST /api/owner/cafes/{cafe}/blackout       → OwnerCafeController@setBlackout
POST /api/owner/cafes/{cafe}/photos         → OwnerCafeController@uploadPhotos
DELETE /api/owner/cafes/{cafe}/photos/{id}  → OwnerCafeController@deletePhoto
```

---

## OF-04: Manage Tables

**Actor:** Owner
**Trigger:** Owner opens table management

### Add Table:
```
Step 1: Owner fills: table_number, capacity, status
Step 2: POST /api/owner/tables → { cafe_id, table_number, capacity }
Step 3: Table created (default: active)
```

### Update Table:
```
Step 1: PUT /api/owner/tables/{table}
Step 2: Owner can edit: table_number, capacity, status
```

### Delete Table:
```
Step 1: DELETE /api/owner/tables/{table}
Step 2: Soft delete (if no future bookings)
         │ [Has Active Bookings] → error: cannot delete
```

**API:**
```
POST   /api/owner/tables         → OwnerTableController@store
PUT    /api/owner/tables/{table}  → OwnerTableController@update
DELETE /api/owner/tables/{table}  → OwnerTableController@destroy
```

---

## OF-05: Set Pricing Rules

**Actor:** Owner
**Trigger:** Owner opens pricing for a table

```
Step 1: POST /api/owner/tables/{table}/booking-rules
  │         → SetBookingRulesRequest → toDto()
  │
Step 2: Two pricing models:
  │
  │   [Fixed Price]
  │   ─────────────
  │   Payload: { rule_type: "fixed", price: 50000 }
  │   → Booking costs flat 50,000 per slot
  │
  │   [Custom (Per Hour)]
  │   ──────────────────
  │   Payload: { rule_type: "custom",
  │              base_price_per_hour: 25000,
  │              min_duration_minutes: 60,
  │              max_duration_minutes: 180,
  │              surge_rules: {
  │                rules: [
  │                  { days: ["saturday","sunday"],
  │                    start_time: "18:00", end_time: "23:00",
  │                    type: "multiplier", value: 1.5 }
  │                ]
  │              }
  │            }
  │   → Base: 25,000/hour
  │   → Weekend evening: 37,500/hour (1.5x)
  │
Step 3: Upsert BookingRule for table
```

**API:**
```
POST /api/owner/tables/{table}/booking-rules → OwnerTableController@setBookingRules
```

---

## OF-06: Manage Menu Items

**Actor:** Owner
**Trigger:** Owner opens menu management

### Add Menu Item:
```
Step 1: Owner fills: name, description, price, category, image
Step 2: POST /api/owner/menus → StoreMenuItemRequest → toDto()
Step 3: MenuItem created (availability_status: available by default)
```

### Update Menu Item:
```
Step 1: PUT /api/owner/menus/{menuItem}
Step 2: Owner edits any field
```

### Delete Menu Item:
```
Step 1: DELETE /api/owner/menus/{menuItem}
Step 2: Soft delete
```

### Toggle Availability:
```
Step 1: Owner toggles item availability
Step 2: PUT /api/owner/menus/{menuItem}/toggle
Step 3: Flip availability_status (available ↔ unavailable)
```

### Bulk Toggle:
```
Step 1: Owner selects multiple items
Step 2: PUT /api/owner/menus/bulk-toggle → { ids: [1,2,3] }
Step 3: All toggled at once
```

**API:**
```
POST   /api/owner/menus                   → OwnerMenuController@store
PUT    /api/owner/menus/{menuItem}         → OwnerMenuController@update
DELETE /api/owner/menus/{menuItem}         → OwnerMenuController@destroy
PUT    /api/owner/menus/{menuItem}/toggle  → OwnerMenuController@toggle
PUT    /api/owner/menus/bulk-toggle        → OwnerMenuController@bulkToggle
```

---

## OF-07: View Bookings

**Actor:** Owner
**Trigger:** Owner opens "My Bookings" page

```
Step 1: GET /api/owner/bookings?status=...&date=...&page=...
  │
Step 2: Query bookings where cafe.owner_id = auth user
  │         - Filter by status, date range
  │         - Sorted by booking_date DESC, start_time ASC
  │         - Paginated
  │
Step 3: Return paginated BookingResource
  │         Each item: customer name, table, date, time,
  │                    guest_count, status, total_price
  │
Step 4: Owner can filter:
  │         - Today's bookings
  │         - Upcoming bookings
  │         - Active (checked_in)
  │         - Past bookings
  │         - By status
```

**API:**
```
GET /api/owner/bookings → OwnerBookingController@index
```

---

## OF-08: Process Booking (Owner)

**Actor:** Owner
**Trigger:** Owner takes action on a booking

### Cancel Booking:
```
Step 1: Owner views booking detail
Step 2: Clicks "Cancel" → provides reason
Step 3: PUT /api/owner/bookings/{booking}/cancel
Step 4: Booking cancelled (cancelled_by: owner)
```

### Mark No-Show:
```
Step 1: Customer didn't arrive
Step 2: PUT /api/owner/bookings/{booking}/no-show
Step 3: Booking status → no_show
Step 4: Table released
```

### Checkout:
```
Step 1: Customer finished
Step 2: PUT /api/owner/bookings/{booking}/checkout
Step 3: Booking status → checked_out, checked_out_at→now
Step 4: Update menu_subtotal + total_price if orders exist
```

**API:**
```
PUT /api/owner/bookings/{booking}/cancel   → OwnerBookingController@cancel
PUT /api/owner/bookings/{booking}/no-show  → OwnerBookingController@noShow
PUT /api/owner/bookings/{booking}/checkout → OwnerBookingController@checkout
```

---

## OF-09: View & Process Orders

**Actor:** Owner
**Trigger:** Owner opens order management

### View Orders:
```
Step 1: GET /api/owner/orders?status=...&page=...
  │
Step 2: Query orders for owner's cafes
  │         - Filterable by status, date
  │         - Sorted by created_at DESC
  │
Step 3: Return paginated MenuOrderResource with items
```

### Update Status:
```
Step 1: Owner sees incoming order (real-time notification via Reverb)
  │
Step 2: Owner clicks "Confirm" → PUT /api/owner/orders/{order}/status
  │         status: pending → confirmed
  │
Step 3: [Auto] System changes: confirmed → preparing (near time)
  │
Step 4: Owner clicks "Ready" → PUT /api/owner/orders/{order}/status
  │         status: preparing → ready
  │         → Customer notified
  │
Step 5: Owner serves → status: ready → served
```

**Order Status Progression:**
```
pending → confirmed → preparing → ready → served
  │                                  │
  └── cancelled (anytime) ──────────┘
```

**API:**
```
GET  /api/owner/orders               → OwnerOrderController@index
PUT  /api/owner/orders/{order}/status → OwnerOrderController@updateStatus
```

---

## OF-10: Analytics Dashboard

**Actor:** Owner
**Trigger:** Owner opens analytics page

### Dashboard Overview:
```
Step 1: GET /api/owner/analytics/dashboard
  │
Step 2: Return summary:
  │         - Total bookings today
  │         - Active (checked-in) customers
  │         - Today's revenue
  │         - Pending orders count
```

### Revenue Report:
```
Step 1: GET /api/owner/analytics/revenue?period=daily&from=...&to=...
  │
Step 2: Return revenue data:
  │         - Daily/weekly/monthly breakdown
  │         - Total revenue, commissions, cafe_receives
  │         - Chart data points
```

### Bookings Report:
```
Step 1: GET /api/owner/analytics/bookings?period=...&from=...&to=...
  │
Step 2: Return booking insights:
  │         - Total bookings, cancellation rate
  │         - Peak hours / peak days
  │         - Table utilization rate
```

### Menu Performance:
```
Step 1: GET /api/owner/analytics/menus?from=...&to=...
  │
Step 2: Return menu stats:
  │         - Most ordered items
  │         - Revenue per category
  │         - Items by order frequency
```

**API:**
```
GET /api/owner/analytics/dashboard → OwnerAnalyticsController@dashboard
GET /api/owner/analytics/revenue   → OwnerAnalyticsController@revenue
GET /api/owner/analytics/bookings  → OwnerAnalyticsController@bookings
GET /api/owner/analytics/menus     → OwnerAnalyticsController@menus
```

---

# Admin Flows

---

## AF-01: Login

**Actor:** Admin
**Trigger:** Admin opens admin login page

```
Step 1: POST /api/admin/login
  │         Payload: { email, password }
  │
Step 2: Validate credentials + role === admin
  │         │ [Not Admin] → Forbidden (403)
  │
Step 3: Generate Sanctum token with admin abilities
  │
Step 4: Redirect to admin dashboard
```

**API:**
```
POST /api/admin/login → AdminAuthController@login
```

---

## AF-02: Review Cafe Registrations

**Actor:** Admin
**Trigger:** Admin opens "Cafe Registrations" page

```
Step 1: GET /api/admin/cafe-registrations
  │
Step 2: List cafes with approval_status = pending
  │         Each: owner info, cafe details, photos, operating_hours
  │
Step 3: Admin reviews cafe details
  │
Step 4: Decision:
  │
  │   [Approve]
  │   POST /api/admin/cafe-registrations/{cafe}/approve
  │   → approval_status: approved
  │   → Cafe visible to customers
  │   → Audit log: { action: "approve_cafe", cafe_id }
  │   → Notification to owner
  │
  │   [Reject]
  │   POST /api/admin/cafe-registrations/{cafe}/reject
  │   → RejectCafeRequest: rejection_reason (required)
  │   → approval_status: rejected
  │   → Audit log: { action: "reject_cafe", reason }
  │   → Notification to owner with reason
  │
Step 5: Move to next pending registration
```

**API:**
```
GET  /api/admin/cafe-registrations                 → AdminCafeRegistrationController@index
POST /api/admin/cafe-registrations/{cafe}/approve  → AdminCafeRegistrationController@approve
POST /api/admin/cafe-registrations/{cafe}/reject   → AdminCafeRegistrationController@reject
```

**Audit Log Entry:**
```
admin_id, action: "approve_cafe"|"reject_cafe",
entity_type: "cafe", entity_id: cafe->id,
old_values: { approval_status: "pending" },
new_values: { approval_status: "approved"|"rejected" }
```

---

## AF-03: Manage Cafes

**Actor:** Admin
**Trigger:** Admin opens "All Cafes" page

```
Step 1: GET /api/admin/cafes?status=...&query=...&page=...
  │
Step 2: List all cafes with filters
  │         - By status (approved, rejected, suspended, pending)
  │         - Search by name/owner
  │         - Paginated
  │
Step 3: Admin clicks "Suspend" on a cafe
  │
Step 4: PUT /api/admin/cafes/{cafe}/suspend
  │         → approval_status: suspended
  │         → Cafe hidden from customers
  │         → Future bookings cancelled? (configurable)
  │         → Audit log
```

**API:**
```
GET  /api/admin/cafes            → AdminCafeController@index
PUT  /api/admin/cafes/{cafe}/suspend → AdminCafeController@suspend
```

---

## AF-04: Manage Commission Rules

**Actor:** Admin
**Trigger:** Admin opens commission settings

```
Step 1: GET /api/admin/commission-rules → current CommissionRule
  │
Step 2: Admin edits commission:
  │         - Type: percentage (e.g., 10%) or fixed (e.g., 5000)
  │         - Min and max amount caps
  │         - Activation period (start_date, end_date)
  │
Step 3: PUT /api/admin/commission-rules
  │         Payload: { commission_type, value, min_amount, max_amount }
  │
Step 4: Update or create CommissionRule record
  │
Step 5: Audit log
```

**Commission Calculation:**
```
If type = percentage:
  commission = min(max(total_price × value%, min_amount), max_amount)
If type = fixed:
  commission = min(value, max_amount)
cafe_receives = total_price - commission
```

**API:**
```
GET  /api/admin/commission-rules → AdminCommissionController@show
PUT  /api/admin/commission-rules → AdminCommissionController@update
```

---

## AF-05: Process Refund Requests

**Actor:** Admin
**Trigger:** Admin opens "Refund Requests" page

```
Step 1: GET /api/admin/refunds?status=pending&page=...
  │
Step 2: List refund requests:
  │         - Customer info
  │         - Booking reference, amount paid
  │         - Reason
  │         - Date requested
  │
Step 3: Admin reviews request
  │
Step 4: Decision:
  │
  │   [Approve]
  │   POST /api/admin/refunds/{refundRequest}/process
  │   → MidtransService@refund(order_id, amount)
  │   → RefundRequest status: approved, processed_at: now
  │   → Booking payment_status: refunded
  │   → Notification to customer
  │   → Audit log
  │
  │   [Reject]
  │   POST /api/admin/refunds/{refundRequest}/reject
  │   → RefundRequest status: rejected
  │   → Notification to customer with reason
```

**API:**
```
GET  /api/admin/refunds                         → AdminRefundController@index
POST /api/admin/refunds/{refundRequest}/process  → AdminRefundController@process
POST /api/admin/refunds/{refundRequest}/reject   → AdminRefundController@reject
```

---

## AF-06: Manage Featured Cafes

**Actor:** Admin
**Trigger:** Admin opens "Featured Cafes" page

```
Step 1: GET /api/admin/featured-cafes → list current featured
  │
Step 2: Admin adds cafe to featured:
  │         POST /api/admin/featured-cafes
  │         Payload: { cafe_id, position, starts_at, ends_at }
  │
Step 3: Admin edits featured entry:
  │         PUT /api/admin/featured-cafes/{featuredCafe}
  │
Step 4: Admin removes featured:
  │         DELETE /api/admin/featured-cafes/{featuredCafe}
  │
Step 5: Featured cafes displayed first in customer search (CF-04)
  │         Ordered by position ASC
```

**API:**
```
GET    /api/admin/featured-cafes                → AdminFeaturedCafeController@index
POST   /api/admin/featured-cafes                → AdminFeaturedCafeController@store
PUT    /api/admin/featured-cafes/{featuredCafe}  → AdminFeaturedCafeController@update
DELETE /api/admin/featured-cafes/{featuredCafe}  → AdminFeaturedCafeController@destroy
```

---

## AF-07: Manage Users

**Actor:** Admin
**Trigger:** Admin opens "Users" page

```
Step 1: GET /api/admin/users?role=...&query=...&page=...
  │
Step 2: List all users (customers and owners)
  │         - Filter by role
  │         - Search by name/email
  │
Step 3: Admin clicks "Suspend"
  │
Step 4: PUT /api/admin/users/{user}/suspend
  │         → User suspended (cannot login)
  │         → Audit log
```

**API:**
```
GET  /api/admin/users            → AdminUserController@index
PUT  /api/admin/users/{user}/suspend → AdminUserController@suspend
```

---

## AF-08: Platform Analytics

**Actor:** Admin
**Trigger:** Admin opens analytics

### Platform Overview:
```
Step 1: GET /api/admin/analytics/platform
  │
Step 2: Return metrics:
  │         - Total users (customers, owners, admins)
  │         - Total cafes (approved, pending, suspended)
  │         - Total bookings (by status)
  │         - Total revenue (platform-wide)
  │         - Growth trends (compared to previous period)
```

### Commission Report:
```
Step 1: GET /api/admin/analytics/commission?from=...&to=...
  │
Step 2: Return commission data:
  │         - Total commissions collected
  │         - Commission by cafe
  │         - Commission trends (daily/weekly/monthly)
```

**API:**
```
GET /api/admin/analytics/platform   → AdminAnalyticsController@platform
GET /api/admin/analytics/commission → AdminAnalyticsController@commission
```

---

# System Flows

---

## SF-01: Auto-Complete Expired Bookings

**Schedule:** Every minute (cron)
**Command:** `AutoCompleteBookings`

```
Step 1: Query bookings WHERE:
  │         status = checked_in
  │         AND end_time <= now
  │
Step 2: For each matching booking:
  │   a. Update: status → checked_out, checked_out_at → now
  │   b. Table marked available again
  │
Step 3: Log completion count
```

---

## SF-02: Auto-Cancel Unpaid Bookings

**Schedule:** Every minute (cron)
**Command:** `CancelExpiredPendingBookings`

```
Step 1: Query bookings WHERE:
  │         status = pending
  │         AND payment_status = unpaid
  │         AND lock_expires_at <= now
  │
Step 2: For each matching booking:
  │   a. Update: status → cancelled, cancelled_by → system
  │   b. LockService@releaseForBooking()
  │   c. Dispatch BookingCancelled event
  │
Step 3: Log cancellation count
```

---

## SF-03: Auto-Schedule Menu Preparation

**Schedule:** Every minute (cron)
**Command:** `AutoScheduleMenuPreparing`

```
Step 1: Query orders WHERE:
  │         status = confirmed
  │         AND order_type = dine_in
  │         AND booking.start_time - 15 min <= now
  │
Step 2: For each matching order:
  │   a. Update: status → preparing
  │   b. Notification to owner
  │
Step 3: Log count
```

---

## Flow Summary

```
CF-01 Register → CF-02 Login → CF-04 Browse Cafes →
  ↓                          ↓
CF-05 View Cafe       CF-16 Profile/Settings
  ↓
CF-06 Book Table
  ↓
CF-07 Pay
  ↓
CF-08 My Bookings → CF-09 Cancel
  ↓                    CF-10 Reschedule
CF-11 Check In → CF-12 Order Menu (Dine-in)
  ↓               CF-13 Order Menu (Takeaway)
CF-11 Extend
  ↓
CF-14 Request Refund
---
OF-01 Register/Login → OF-02 Register Cafe → [AF-02 Approve] → OF-03 Manage Cafe
  ↓
OF-04 Manage Tables → OF-05 Set Pricing
  ↓
OF-06 Manage Menu
  ↓
OF-07 View Bookings → OF-08 Process (cancel/no-show/checkout)
  ↓
OF-09 View Orders → Process (confirm/ready/served)
  ↓
OF-10 Analytics
---
AF-01 Login → AF-02 Review Cafes → AF-03 Manage Cafes
  ↓           AF-04 Commission
  ↓           AF-05 Refunds
  ↓           AF-06 Featured Cafes
  ↓           AF-07 Users
  ↓           AF-08 Analytics
```

---

*Document generated: 16 July 2026*
*CafeNow v1.0 — User Flows*
