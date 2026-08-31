# CafeNow Admin Panel Development Plan

**Project:** CafeNow Super Admin Backend  
**Status:** Planning Phase  
**Date:** 2026-07-24  
**Framework:** Laravel 13 + React 19 + Inertia.js  
**Design System:** Tapis Coffee Admin (Brown/Parchment/Gold palette)

---

## 1. System Overview

### Purpose
CafeNow Admin Panel is a comprehensive super-admin dashboard for managing:
- Cafe registrations & approvals
- User management & audit logs
- Booking oversight & cancellations
- Refund request processing
- Commission management
- Featured cafe curation
- Platform analytics

### Target Users
- Platform administrators
- Regional managers
- Business analysts

### Tech Stack
- **Backend:** Laravel 13, MySQL, Eloquent ORM
- **Frontend:** React 19, TypeScript, Inertia.js
- **UI Framework:** Radix UI + Tailwind CSS
- **State:** React Context + Inertia props
- **Auth:** Laravel Sanctum + Fortify

---

## 2. Design System Reference

### Color Palette
| Name | Hex | Usage |
|------|-----|-------|
| Ink (Primary) | #3C2A1E | Sidebar, headers, text |
| Parchment (Surface) | #F7F1E6 | Main background |
| Gold (Accent) | #B8863B | CTAs, active states, progress |
| Taupe (Border) | #DCD2C0 | Dividers, input borders |
| Success | #5C6E4A | Status badges, confirmations |
| Alert | #A6472F | Error badges, warnings |

### Typography
- **Headlines:** Bricolage Grotesque, 32px/600wt (display), 24px/600wt (page title)
- **Body:** Plus Jakarta Sans, 16px/400wt (text), 14px/400wt (compact)
- **Labels:** Plus Jakarta Sans, 12px/600wt, uppercase

### Spacing Grid
- Base unit: 4px
- Container padding: 32px
- Card gap: 20px
- Sidebar width: 280px
- Gutter: 24px

### Shapes
- Cards: 14px border-radius
- Buttons/inputs: 8px border-radius
- Full: 9999px

---

## 3. Feature Breakdown & Page Inventory

### Module 1: Dashboard & Analytics

#### Page 1.1: Dashboard Admin (Overview)
**Route:** `/admin/dashboard`  
**Purpose:** Real-time platform metrics and alerts

**Key Metrics:**
- Total Cafes (count)
- Revenue Today (Rp currency)
- Active Bookings (count)
- Pending Approvals (count + alert)
- New Customers (count)
- New Orders (count)

**Components:**
- KPI cards (4 columns)
- Trend chart (booking volume last 30 days)
- Recent alerts section (3 items)
- Quick actions bar

**Interactions:**
- Load page → fetch metrics from `/api/admin/dashboard`
- Auto-refresh every 5 minutes
- Click metric card → navigate to relevant detail page

---

#### Page 1.2: Analitik Platform (Analytics)
**Route:** `/admin/analytics`  
**Purpose:** Detailed platform performance analysis

**Sections:**
1. **Revenue Trend** — Line chart with date range picker
   - Fields: Start date, End date
   - Button: Export CSV
   - Metric: Total revenue with % change indicator

2. **Top Cafes** — Ranked list with revenue breakdown
   - Columns: Cafe name, Revenue, Booking count, Avg rating
   - Sortable: Yes
   - Filterable by date range

3. **Booking Status Overview** — Donut chart
   - Completed, Pending, Cancelled counts

4. **Booking Trend by Day** — Time-series chart
   - Shows completed vs cancelled

**Interactions:**
- Date range picker → refresh all sections
- Export button → download CSV with revenue data
- Click cafe name → navigate to cafe detail

**API Dependencies:**
- GET `/api/admin/analytics/revenue?start_date=&end_date=`
- GET `/api/admin/analytics/cafes?top=10`
- GET `/api/admin/analytics/bookings/status`

---

### Module 2: Cafe Management

#### Page 2.1: Persetujuan Cafe (Cafe Approvals)
**Route:** `/admin/cafe-approvals`  
**Purpose:** Review and approve cafe registrations

**Layout:**
- Left: Status filter tabs (Pending, Approved, Rejected)
- Center: Cafe registration list (table)
- Right: Selected cafe detail drawer

**Table Columns:**
| Column | Format | Sortable | Notes |
|--------|--------|----------|-------|
| Cafe Name | Text | Yes | Linked to detail |
| Location | Text | No | City, province |
| Owner | Text | No | Contact person |
| Submission Date | Date | Yes | YYYY-MM-DD |
| Status | Badge | No | Pending/Approved/Rejected |

**Detail Drawer Content (on row click):**
- Cafe name, owner info, location, contact
- Business license photo (thumbnail gallery)
- Menu sample, table layout
- Owner verification status
- Approval action buttons: **Approve** (gold), **Reject** (gray)
- Admin notes textarea (optional)

**Interactions:**
- Load → fetch pending approvals by default
- Filter by status tab → refresh table
- Click row → open detail drawer
- Click Approve → show confirmation, POST to `/api/admin/cafes/{id}/approve`
- Click Reject → modal with reason input, POST to `/api/admin/cafes/{id}/reject`
- Success → toast notification, remove from list, refresh counts

**API Dependencies:**
- GET `/api/admin/cafes/approvals?status=pending&page=1`
- POST `/api/admin/cafes/{id}/approve`
- POST `/api/admin/cafes/{id}/reject`

---

#### Page 2.2: Manajemen Cafe Unggulan (Featured Cafes)
**Route:** `/admin/featured-cafes`  
**Purpose:** Curate and manage featured cafes

**Layout:**
- Top: Action bar with "Add Featured Cafe" button
- Main: Grid of featured cafe cards (3 columns)
- Each card: Cafe photo, name, current ranking, remove button

**Form (Modal on "Add" click):**
- Cafe dropdown (searchable, autocomplete)
- Display order (priority number)
- Featured period start/end dates
- Description textarea
- Button: Save, Cancel

**Card Interactions:**
- Hover card → show remove icon
- Click remove icon → confirm delete → DELETE `/api/admin/featured-cafes/{id}`
- Drag to reorder → PATCH `/api/admin/featured-cafes/{id}` with new order
- Success → toast, refresh list

**API Dependencies:**
- GET `/api/admin/featured-cafes`
- GET `/api/admin/cafes` (for dropdown)
- POST `/api/admin/featured-cafes`
- PATCH `/api/admin/featured-cafes/{id}`
- DELETE `/api/admin/featured-cafes/{id}`

---

#### Page 2.3: Manajemen Cafe (Cafe Management)
**Route:** `/admin/cafes`  
**Purpose:** Full CRUD and oversight of all cafes

**Table:**
| Column | Type | Sortable | Filterable |
|--------|------|----------|-----------|
| Cafe Name | Link | Yes | Yes (search) |
| Owner | Text | Yes | Yes (dropdown) |
| Location | Text | No | Yes (dropdown by city) |
| Status | Badge | Yes | Yes (Approved/Suspended) |
| Monthly Revenue | Currency | Yes | No |
| Booking Count | Number | Yes | No |
| Action | Buttons | No | No (Edit, Suspend, Details) |

**Search/Filter:**
- Keyword search (name, owner)
- Status filter (Approved, Suspended)
- Location filter (city/province)
- Button: Reset filters

**Row Actions:**
- **Edit** → navigate to `/admin/cafes/{id}/edit`
- **Suspend** → modal confirm → POST `/api/admin/cafes/{id}/suspend`
- **Details** → drawer with cafe info, photos, menu, bookings

**Pagination:** Default 25 items/page

**API Dependencies:**
- GET `/api/admin/cafes?keyword=&status=&city=&page=1&per_page=25`
- POST `/api/admin/cafes/{id}/suspend`
- GET `/api/admin/cafes/{id}`

---

### Module 3: Booking Management

#### Page 3.1: Pengawasan Booking (Booking Oversight)
**Route:** `/admin/bookings`  
**Purpose:** Monitor all bookings, handle cancellations

**Table Columns:**
| Column | Format | Sortable | Notes |
|--------|--------|----------|-------|
| Booking ID | Code (BKNG-XXXX) | Yes | Linked to detail |
| Cafe | Text | Yes | Cafe name |
| Customer | Text | Yes | Customer name |
| Date | Date | Yes | Booking date |
| Time | Time | No | HH:MM |
| Status | Badge | Yes | Completed/Pending/Cancelled |
| Notes | Text (truncated) | No | Show full in modal |

**Filter/Search:**
- Cafe filter (dropdown)
- Status filter (multi-select: Completed, Pending, Cancelled)
- Date range picker
- Customer name search
- Button: Reset

**Row Actions:**
- Click row → detail modal showing full booking details, customer info, table assigned, payment status
- **Cancel Booking** button (red) → modal for cancellation reason → POST `/api/admin/bookings/{id}/cancel`
- **Refund** button (conditional, if applicable) → link to refund detail

**Pagination:** 50 items/page

**API Dependencies:**
- GET `/api/admin/bookings?cafe_id=&status=&date_from=&date_to=&keyword=&page=1`
- POST `/api/admin/bookings/{id}/cancel`
- GET `/api/admin/bookings/{id}`

---

### Module 4: Refund Management

#### Page 4.1: Antrean Refund (Refund Queue)
**Route:** `/admin/refunds`  
**Purpose:** Process refund requests

**Layout:**
- Top: Status filter tabs (Pending, In Progress, Completed, Rejected)
- Main: Refund queue cards (list view)

**Card Content (per refund request):**
- Booking ID, customer name
- Refund amount (Rp)
- Reason (short text)
- Request date
- Status badge
- Action buttons (Process, Reject)

**Detail View (click card):**
- Full refund details
- Bank account info
- Detailed reason
- Attached proof (images)
- Status timeline
- Admin notes textarea
- Buttons: **Process Refund**, **Reject**, **Revert**

**Interactions:**
- Tab click → filter by status
- Click Process → modal confirm with note → POST `/api/admin/refunds/{id}/process`
- Click Reject → modal with reason → POST `/api/admin/refunds/{id}/reject`
- Success → update status, toast notification

**API Dependencies:**
- GET `/api/admin/refunds?status=pending&page=1`
- POST `/api/admin/refunds/{id}/process`
- POST `/api/admin/refunds/{id}/reject`
- GET `/api/admin/refunds/{id}`

---

### Module 5: Commission Management

#### Page 5.1: Manajemen Komisi (Commission Management)
**Route:** `/admin/commissions`  
**Purpose:** Set and monitor commission rates

**Top Section: Current Rates**
- Booking commission: 15% (editable card with Update button)
- Menu order commission: 10% (editable card with Update button)
- Last updated date

**Bottom Section: Commission History**
- Table with columns: Type, Rate (%), Effective Date, Set by (admin name), Action
- Sortable by date
- Previous rates (read-only)

**Interactions:**
- Click Update button on rate card → inline edit mode → input new %, Save button
- POST `/api/admin/commissions/{type}` with new rate
- Success → refresh rates, show success toast

**API Dependencies:**
- GET `/api/admin/commissions/rates`
- GET `/api/admin/commissions/history?type=&page=1`
- PATCH `/api/admin/commissions/rates/{type}`

---

### Module 6: User Management

#### Page 6.1: Manajemen Pengguna (User Management)
**Route:** `/admin/users`  
**Purpose:** Manage platform users (customers, owners, admins)

**Table Columns:**
| Column | Type | Sortable | Notes |
|--------|------|----------|-------|
| Name | Text | Yes | User full name |
| Email | Email | Yes | Account email |
| Phone | Phone | Yes | Contact number |
| Role | Badge | Yes | Customer/Owner/Admin |
| Registered | Date | Yes | Sign-up date |
| Status | Badge | Yes | Active/Suspended |
| Action | Buttons | No | Edit, Suspend/Unsuspend |

**Search/Filter:**
- Keyword (name, email, phone)
- Role filter (multi-select)
- Status filter (Active, Suspended)
- Date range (registered after, before)

**Row Actions:**
- **Edit** → drawer with user details, editable email, role (dropdown)
- **Suspend** → modal confirm → POST `/api/admin/users/{id}/suspend`
- **Unsuspend** → POST `/api/admin/users/{id}/unsuspend` (if suspended)

**API Dependencies:**
- GET `/api/admin/users?keyword=&role=&status=&page=1`
- PATCH `/api/admin/users/{id}`
- POST `/api/admin/users/{id}/suspend`
- POST `/api/admin/users/{id}/unsuspend`

---

#### Page 6.2: Admin Audit Logs
**Route:** `/admin/audit-logs`  
**Purpose:** Track all admin actions for compliance

**Table Columns:**
| Column | Type | Sortable | Notes |
|--------|------|----------|-------|
| Date/Time | DateTime | Yes | YYYY-MM-DD HH:MM |
| Admin | Text | Yes | Who performed action |
| Action | Badge | Yes | Approved/Rejected/Updated/Deleted |
| Entity | Text | Yes | Cafe/Booking/User/Commission |
| Entity ID | Code | No | Reference ID |
| Changes | Text (expand) | No | Before/after values |

**Filter:**
- Admin filter (dropdown)
- Action filter (multi-select)
- Entity type filter (multi-select)
- Date range picker

**Pagination:** 100 items/page

**API Dependencies:**
- GET `/api/admin/audit-logs?admin_id=&action=&entity_type=&date_from=&page=1`

---

## 4. Navigation Structure

### Sidebar Menu (280px fixed)
1. **Dashboard** → `/admin/dashboard`
2. **Cafe Management**
   - Approvals → `/admin/cafe-approvals`
   - Management → `/admin/cafes`
   - Featured → `/admin/featured-cafes`
3. **Bookings** → `/admin/bookings`
4. **Refunds** → `/admin/refunds`
5. **Analytics** → `/admin/analytics`
6. **Commission** → `/admin/commissions`
7. **Users** → `/admin/users`
8. **Audit Logs** → `/admin/audit-logs`
9. **Logout**

---

## 5. Development Phases

### Phase 1: Foundation (Week 1)
- [ ] Laravel admin routes & middleware setup
- [ ] React layout component (sidebar, header, main content area)
- [ ] Navigation component with Inertia routing
- [ ] Auth guard for admin role
- [ ] Design system component library (buttons, badges, cards, modals)

### Phase 2: Dashboard & Analytics (Week 2)
- [ ] Dashboard page with KPI cards
- [ ] Analytics page with charts
- [ ] API endpoints for dashboard metrics
- [ ] API endpoints for analytics

### Phase 3: Cafe Management (Week 2-3)
- [ ] Cafe approvals page
- [ ] Cafe management page
- [ ] Featured cafes page
- [ ] Backend controllers & endpoints
- [ ] Database queries

### Phase 4: Booking & Refund (Week 3-4)
- [ ] Booking oversight page
- [ ] Refund queue page
- [ ] Backend controllers & endpoints

### Phase 5: Commission & Users (Week 4-5)
- [ ] Commission management page
- [ ] User management page
- [ ] Audit logs page
- [ ] Backend controllers & endpoints

### Phase 6: Polish & Testing (Week 5)
- [ ] Form validation & error handling
- [ ] Loading states & spinners
- [ ] Toast notifications
- [ ] Responsive design tweaks
- [ ] End-to-end testing

---

## 6. API Specification Summary

### Authentication
- Routes: `/api/admin/*` all require auth + admin role
- Middleware: `auth:sanctum`, `can:admin`

### Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

### Error Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Pagination
- Default: 25 items/page
- Query params: `page`, `per_page`
- Response meta: `total`, `per_page`, `current_page`, `last_page`

---

## 7. Component Architecture

### Directory Structure
```
resources/js/
├── Pages/
│   └── Admin/
│       ├── Dashboard.tsx
│       ├── Analytics.tsx
│       ├── Cafe/
│       │   ├── Approvals.tsx
│       │   ├── Management.tsx
│       │   └── Featured.tsx
│       ├── Booking/
│       │   └── Oversight.tsx
│       ├── Refund/
│       │   └── Queue.tsx
│       ├── Commission/
│       │   └── Management.tsx
│       ├── User/
│       │   ├── Management.tsx
│       │   └── AuditLogs.tsx
│       └── Layout.tsx
├── Components/
│   ├── Admin/
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       ├── KpiCard.tsx
│       ├── DataTable.tsx
│       ├── FilterBar.tsx
│       ├── Modal.tsx
│       └── Drawer.tsx
│   └── ...
└── ...
```

### State Management
- Inertia props for server state
- React Context for UI state (modals, filters, selected items)
- No external state lib needed (keep it lazy)

---

## 8. UI/UX Patterns

### Data Table
- Columns with sort arrows
- Hover row highlight
- Checkbox for multi-select
- Pagination at bottom

### Form Modals
- Overlay with form fields
- Cancel & Save buttons
- Validation error messages

### Notifications
- Toast in top-right corner
- Auto-dismiss after 3 seconds
- Success (green), Error (red), Info (gold)

### Loading States
- Spinner overlay on data fetch
- Disabled buttons during submission
- Skeleton loading for cards

### Empty States
- Icon + message when no data
- CTA button to create first item

---

## 9. Testing Strategy

- [ ] Unit tests for React components
- [ ] Integration tests for API calls
- [ ] E2E tests for critical workflows (approve cafe, process refund)
- [ ] Manual testing checklist per page

---

## 10. Success Criteria

- [ ] All 8 pages functional with working APIs
- [ ] Design system compliance (colors, typography, spacing)
- [ ] Form validation on all inputs
- [ ] Error handling & toast notifications
- [ ] Responsive layout (works on 1366px+ screens)
- [ ] Admin role permission enforcement
- [ ] Audit logs recorded for all actions
- [ ] Performance: page load < 2s, API response < 500ms

---

## 11. Known Constraints & Decisions

- **No external state lib:** Using Inertia + React Context keeps code lean
- **Timezone handling:** All dates in server timezone (Asia/Jakarta)
- **Currency:** All money in Rp (Indonesian Rupiah)
- **Language:** UI in Bahasa Indonesia
- **Browsers:** Chrome, Firefox, Safari (desktop only)

---

## Appendix: Enums & Constants

### User Roles
```
Admin = 'admin'
Owner = 'owner'
Customer = 'customer'
```

### Cafe Status
```
Pending = 'pending'
Approved = 'approved'
Rejected = 'rejected'
Suspended = 'suspended'
```

### Booking Status
```
Completed = 'completed'
Pending = 'pending'
Cancelled = 'cancelled'
```

### Refund Status
```
Pending = 'pending'
InProgress = 'in_progress'
Completed = 'completed'
Rejected = 'rejected'
```

### Commission Types
```
Booking = 'booking'
Menu = 'menu_order'
```

---

**Next Steps:**
1. Review and approve this plan
2. Begin Phase 1 foundation work
3. Set up project structure and design system components
4. Create admin routes and controllers
