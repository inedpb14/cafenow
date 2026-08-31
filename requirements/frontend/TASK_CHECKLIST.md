# CafeNow Admin Panel - Development Task Checklist

**Status:** Ready to Start  
**Priority:** High  
**Start Date:** 2026-07-24

---

## Phase 1: Foundation (Week 1)

### 1.1 Laravel Admin Routes & Middleware
- [ ] Create `routes/admin.php` with all admin routes
- [ ] Setup route group with `auth:sanctum` + `admin` middleware
- [ ] Create `AdminMiddleware` to check admin role
- [ ] Test middleware with non-admin user (should 403)

### 1.2 React Admin Layout
- [ ] Create `Pages/Admin/Layout.tsx` wrapper component
- [ ] Implement responsive sidebar (280px on desktop, collapse on mobile)
- [ ] Create `Components/Admin/Sidebar.tsx` with menu items
- [ ] Create `Components/Admin/Header.tsx` with user profile + logout
- [ ] Setup navigation using Inertia Link
- [ ] Test layout renders on all pages

### 1.3 Design System Components
- [ ] Setup Tailwind config with design system colors
- [ ] Create color utility classes from palette
- [ ] Create `Components/Button.tsx` (primary, secondary, danger variants)
- [ ] Create `Components/Badge.tsx` (status colors)
- [ ] Create `Components/Card.tsx` with proper shadow
- [ ] Create `Components/Modal.tsx` with overlay
- [ ] Create `Components/Drawer.tsx` (right-side panel)
- [ ] Create `Components/Toast.tsx` notification system
- [ ] Create `Components/Spinner.tsx` loading indicator
- [ ] Create `Components/Input.tsx` with focus states
- [ ] Create `Components/Select.tsx` (dropdown)
- [ ] Create `Components/DatePicker.tsx`
- [ ] Document all components in Storybook (optional but nice)

### 1.4 Auth Guard
- [ ] Create admin permission policy in Laravel
- [ ] Create `useAuth()` hook in React to check admin role
- [ ] Wrap admin pages with auth check
- [ ] Test redirect to login for unauthenticated users
- [ ] Test redirect to home for non-admin users

### 1.5 Error Handling & Toast Notifications
- [ ] Create toast context + provider
- [ ] Add toast to Layout.tsx
- [ ] Test success/error/info toast messages
- [ ] Setup global error handler for API failures

---

## Phase 2: Dashboard & Analytics (Week 2)

### 2.1 Dashboard Page
- [ ] Create `Pages/Admin/Dashboard.tsx`
- [ ] Create `AdminDashboardController` in Laravel
- [ ] Create KPI card component with loading state
- [ ] Fetch & display: Total Cafes, Revenue Today, Active Bookings, Pending Approvals
- [ ] Implement trend chart (booking volume last 30 days)
- [ ] Add recent alerts section (fetch from DB)
- [ ] Setup auto-refresh every 5 minutes
- [ ] Test with mock data first, then live API
- [ ] Add error boundary with retry button

### 2.2 Analytics Page
- [ ] Create `Pages/Admin/Analytics.tsx`
- [ ] Create `AdminAnalyticsController` in Laravel
- [ ] Revenue trend line chart with date range picker
- [ ] Top cafes ranked list
- [ ] Booking status donut chart
- [ ] Booking trend by day chart
- [ ] Export CSV button (generate file in Laravel)
- [ ] Test chart responsiveness on different screen sizes
- [ ] Add loading skeletons for data sections

### 2.3 API Endpoints
- [ ] POST `/api/admin/dashboard` → return metrics
- [ ] GET `/api/admin/analytics/revenue?start_date=&end_date=`
- [ ] GET `/api/admin/analytics/cafes?top=10`
- [ ] GET `/api/admin/analytics/bookings/status`
- [ ] GET `/api/admin/analytics/export-csv?type=revenue&start_date=&end_date=`
- [ ] Write tests for each endpoint

---

## Phase 3: Cafe Management (Week 2-3)

### 3.1 Cafe Approvals Page
- [ ] Create `Pages/Admin/Cafe/Approvals.tsx`
- [ ] Create status filter tabs (Pending, Approved, Rejected)
- [ ] Implement cafe list table with pagination
- [ ] Create detail drawer component
- [ ] Add Approve/Reject buttons with modals
- [ ] Admin notes textarea
- [ ] Handle photo gallery in drawer
- [ ] Fetch pending cafes on page load
- [ ] Test filter by status, pagination

### 3.2 Cafe Management Page
- [ ] Create `Pages/Admin/Cafe/Management.tsx`
- [ ] Create data table with all columns
- [ ] Implement search input
- [ ] Add filters: status, location, owner
- [ ] Row actions: Edit, Suspend, Details
- [ ] Detail drawer with cafe info
- [ ] Suspension modal with confirmation
- [ ] Test sorting, filtering, pagination

### 3.3 Featured Cafes Page
- [ ] Create `Pages/Admin/Cafe/Featured.tsx`
- [ ] Create grid layout for featured cafes
- [ ] Implement "Add Featured Cafe" modal with form
- [ ] Cafe dropdown with search
- [ ] Display order input, date range, description
- [ ] Drag to reorder cards
- [ ] Remove button with confirmation
- [ ] Test add, edit, delete, reorder flows

### 3.4 API Endpoints
- [ ] GET `/api/admin/cafes/approvals?status=&page=1`
- [ ] POST `/api/admin/cafes/{id}/approve`
- [ ] POST `/api/admin/cafes/{id}/reject`
- [ ] GET `/api/admin/cafes?keyword=&status=&city=&page=1`
- [ ] GET `/api/admin/cafes/{id}`
- [ ] POST `/api/admin/cafes/{id}/suspend`
- [ ] GET `/api/admin/featured-cafes`
- [ ] POST `/api/admin/featured-cafes`
- [ ] PATCH `/api/admin/featured-cafes/{id}`
- [ ] DELETE `/api/admin/featured-cafes/{id}`
- [ ] Write controller methods & tests

---

## Phase 4: Booking & Refund (Week 3-4)

### 4.1 Booking Oversight Page
- [ ] Create `Pages/Admin/Booking/Oversight.tsx`
- [ ] Create data table with booking columns
- [ ] Implement search & filters
- [ ] Row click → detail modal
- [ ] Cancel booking button with reason modal
- [ ] Refund link (conditional)
- [ ] Status badge styling
- [ ] Test filtering, pagination, cancel flow

### 4.2 Refund Queue Page
- [ ] Create `Pages/Admin/Refund/Queue.tsx`
- [ ] Create status filter tabs
- [ ] Implement refund card list layout
- [ ] Detail view with full info
- [ ] Process/Reject action buttons
- [ ] Admin notes textarea
- [ ] Proof image gallery in detail
- [ ] Test status transitions, approval flow

### 4.3 API Endpoints
- [ ] GET `/api/admin/bookings?cafe_id=&status=&date_from=&date_to=&keyword=&page=1`
- [ ] POST `/api/admin/bookings/{id}/cancel`
- [ ] GET `/api/admin/bookings/{id}`
- [ ] GET `/api/admin/refunds?status=&page=1`
- [ ] POST `/api/admin/refunds/{id}/process`
- [ ] POST `/api/admin/refunds/{id}/reject`
- [ ] GET `/api/admin/refunds/{id}`
- [ ] Write controller methods & tests

---

## Phase 5: Commission & Users (Week 4-5)

### 5.1 Commission Management Page
- [ ] Create `Pages/Admin/Commission/Management.tsx`
- [ ] Display current rates (editable cards)
- [ ] Commission history table below
- [ ] Update rate buttons with inline edit
- [ ] Test rate update flow

### 5.2 User Management Page
- [ ] Create `Pages/Admin/User/Management.tsx`
- [ ] Create user data table
- [ ] Search & filters (role, status, date range)
- [ ] Row actions: Edit (drawer), Suspend
- [ ] Edit drawer with email, role fields
- [ ] Test CRUD operations

### 5.3 Audit Logs Page
- [ ] Create `Pages/Admin/User/AuditLogs.tsx`
- [ ] Create audit log table with all columns
- [ ] Filters: admin, action, entity type, date range
- [ ] Expandable rows to show before/after values
- [ ] Test filtering, viewing changes

### 5.4 API Endpoints
- [ ] GET `/api/admin/commissions/rates`
- [ ] GET `/api/admin/commissions/history?type=&page=1`
- [ ] PATCH `/api/admin/commissions/rates/{type}`
- [ ] GET `/api/admin/users?keyword=&role=&status=&page=1`
- [ ] PATCH `/api/admin/users/{id}`
- [ ] POST `/api/admin/users/{id}/suspend`
- [ ] POST `/api/admin/users/{id}/unsuspend`
- [ ] GET `/api/admin/audit-logs?admin_id=&action=&entity_type=&date_from=&page=1`
- [ ] Write controller methods & tests

---

## Phase 6: Polish & Testing (Week 5)

### 6.1 Form Validation
- [ ] Add client-side validation to all forms
- [ ] Server-side validation in Laravel (already there)
- [ ] Display validation errors inline
- [ ] Test required fields, format validation

### 6.2 Loading & Error States
- [ ] Add spinner/skeleton to all data tables
- [ ] Show error message on API failure
- [ ] Add retry button on error
- [ ] Test timeout handling

### 6.3 Notifications & UX
- [ ] Success toast on all CRUD operations
- [ ] Error toast with error message
- [ ] Confirmation modals for destructive actions
- [ ] Disable buttons during submission
- [ ] Test notification timings

### 6.4 Responsive Design
- [ ] Test all pages on 1366px+ screens
- [ ] Collapse sidebar on small screens (optional for phase 1)
- [ ] Test table responsiveness
- [ ] Test modal/drawer on different sizes

### 6.5 Performance
- [ ] Check page load times (target < 2s)
- [ ] Check API response times (target < 500ms)
- [ ] Add pagination to large lists
- [ ] Lazy load images/charts
- [ ] Test with Network throttling

### 6.6 Testing
- [ ] Write unit tests for components (30% coverage minimum)
- [ ] Write integration tests for API calls (50% coverage minimum)
- [ ] Manual testing checklist for each page
- [ ] Test all user flows end-to-end
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

### 6.7 Audit & Compliance
- [ ] Verify all admin actions logged in audit_admin_logs table
- [ ] Test audit log retrieval & filtering
- [ ] Verify admin middleware prevents unauthorized access
- [ ] Verify Sanctum token refresh works

---

## Cross-Cutting Concerns

### Code Quality
- [ ] ESLint passing on all React files
- [ ] PHPStan passing on all PHP files
- [ ] Prettier formatting consistent
- [ ] No console errors or warnings
- [ ] Type safety: TS strict mode enabled

### Security
- [ ] All inputs validated (server-side primary)
- [ ] CSRF tokens on all POST requests
- [ ] No secrets in frontend code
- [ ] Admin routes require auth + role
- [ ] SQL injection prevention (use Eloquent/prepared statements)

### Documentation
- [ ] API endpoints documented in README
- [ ] Component props documented with JSDoc
- [ ] Controller methods documented with PHPDoc
- [ ] Setup instructions for running locally
- [ ] Deploy checklist (if applicable)

---

## Dependencies & Setup

### Frontend
- [x] React 19
- [x] TypeScript 5.7
- [x] Tailwind CSS 4.0
- [x] Radix UI
- [x] Inertia.js
- [ ] Chart library: recharts (for analytics charts)
- [ ] Date picker: react-day-picker (already in package.json)
- [ ] Table library: TanStack Table (optional, for complex tables)

### Backend
- [x] Laravel 13
- [x] MySQL
- [x] Eloquent ORM
- [x] Sanctum
- [ ] Queue system (for async operations)
- [ ] Cache layer (Redis for performance)

### Install New Dependencies
```bash
npm install recharts
# or
npm install @tanstack/react-table
```

---

## File Checklist

### Routes
- [ ] `routes/admin.php` — Admin routes
- [ ] `routes/api.php` — API routes for admin endpoints

### Controllers
- [ ] `AdminDashboardController`
- [ ] `AdminAnalyticsController`
- [ ] `AdminCafeController`
- [ ] `AdminCafeApprovalController`
- [ ] `AdminFeaturedCafeController`
- [ ] `AdminBookingController`
- [ ] `AdminRefundController`
- [ ] `AdminCommissionController`
- [ ] `AdminUserController`
- [ ] `AdminAuditLogController`

### React Components
- [ ] `Pages/Admin/Layout.tsx`
- [ ] `Pages/Admin/Dashboard.tsx`
- [ ] `Pages/Admin/Analytics.tsx`
- [ ] `Pages/Admin/Cafe/Approvals.tsx`
- [ ] `Pages/Admin/Cafe/Management.tsx`
- [ ] `Pages/Admin/Cafe/Featured.tsx`
- [ ] `Pages/Admin/Booking/Oversight.tsx`
- [ ] `Pages/Admin/Refund/Queue.tsx`
- [ ] `Pages/Admin/Commission/Management.tsx`
- [ ] `Pages/Admin/User/Management.tsx`
- [ ] `Pages/Admin/User/AuditLogs.tsx`
- [ ] `Components/Admin/Sidebar.tsx`
- [ ] `Components/Admin/Header.tsx`
- [ ] `Components/DataTable.tsx`
- [ ] `Components/Modal.tsx`
- [ ] `Components/Drawer.tsx`

### Tests
- [ ] `tests/Feature/Admin/*` — API endpoint tests
- [ ] `resources/js/__tests__/Admin/*` — Component tests

---

## Success Metrics

- [ ] All 8 admin pages fully functional
- [ ] 100% of APIs working
- [ ] Form validation working (client + server)
- [ ] Error handling & toasts working
- [ ] Audit logs recording all actions
- [ ] No TypeScript or ESLint errors
- [ ] All test cases passing
- [ ] Performance metrics met
- [ ] Admin can successfully complete all core workflows

---

## Notes & Known Issues

- **None yet** — Update as you encounter blockers

---

**Last Updated:** 2026-07-24  
**Next Review:** After Phase 1 completion
