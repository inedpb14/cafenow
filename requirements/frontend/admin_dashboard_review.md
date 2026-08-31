# Admin Dashboard — Comprehensive Review

**Date:** 2026-07-29  
**Scope:** All admin pages, controllers, layout, routes, and responsive behavior

---

## 1. Structure Overview

### 10 Pages, 11 Controllers, 1 Layout

| # | Page | Controller | Data Flow | Filters / Features |
|---|------|-----------|-----------|-------------------|
| 1 | `dashboard.tsx` | `AdminDashboardController` | Inertia SSR (metrics) + client fetch (activity) | Quick action shortcuts, 6 metric cards, activity feed |
| 2 | `Analytics.tsx` | `AdminAnalyticsController` | Client fetch (3 endpoints) | Date range, custom SimpleLineChart, top cafes, booking status bars |
| 3 | `Booking/Oversight.tsx` | `AdminBookingController` | Client fetch | 4 filters + 2 date inputs + DataTable + cancel modal |
| 4 | `Cafe/Approvals.tsx` | `AdminCafeRegistrationController` | Client fetch | Status tabs (pending/approved/rejected), card list, approve/reject modals |
| 5 | `Cafe/Management.tsx` | `AdminCafeController` | Client fetch | 3 filters + DataTable + suspend modal |
| 6 | `Cafe/Featured.tsx` | `AdminFeaturedCafeController` | Client fetch | Card grid + add/delete modal |
| 7 | `Commission/Management.tsx` | `AdminCommissionController` | Client fetch | Inline edit rates + history modal with DataTable |
| 8 | `Refund/Queue.tsx` | `AdminRefundController` | Client fetch | Status tabs (4), card list, process/reject modals |
| 9 | `User/Management.tsx` | `AdminUserController` | Client fetch | 3 filters + DataTable + suspend/unsuspend modal |
| 10 | `User/AuditLogs.tsx` | `AdminAuditLogController` | Client fetch | 3 filters + 2 date inputs + DataTable + before/after JSON detail modal |

### Controllers Without Frontend Pages

- **`AdminOrderController`** — methods exist for listing, showing, and managing orders, but no frontend page or sidebar link.

### Routes (web.php — admin group)

All under `midleware(['auth', 'verified', 'role:admin'])`:

| Route | Controller |
|-------|-----------|
| `/admin/dashboard` | `AdminDashboardController@index` |
| `/admin/cafe-approvals` | `AdminCafeRegistrationController@index` |
| `/admin/cafes` | `AdminCafeController@index` |
| `/admin/featured-cafes` | `AdminFeaturedCafeController@index` |
| `/admin/bookings` | `AdminBookingController@index` |
| `/admin/refunds` | `AdminRefundController@index` |
| `/admin/analytics` | `AdminAnalyticsController@index` |
| `/admin/commissions` | `AdminCommissionController@index` |
| `/admin/users` | `AdminUserController@index` |
| `/admin/audit-logs` | `AdminAuditLogController@index` |

### Layout

`AdminLayout.tsx` (`resources/js/components/Admin/AdminLayout.tsx`)

- Sidebar: 10 menu items, collapsible (`w-[280px]` / `w-0`), no mobile overlay
- Header: toggle button + user avatar/name
- All admin pages use `<AdminLayout user={user!}>` wrapper
- Active link detection via `url === href || url.startsWith(href + '?')`

---

## 2. Critical Issues

### P0 — Sidebar Responsive: Broken on Mobile

- The sidebar uses `w-0` collapse — no overlay `<div>`, no backdrop, no `z-index` drawer.
- On mobile screens, toggling the sidebar simply shifts content left/right abruptly.
- There is no way to navigate on a phone unless the sidebar is kept open (which eats 280px).

**Fix:** Add a mobile drawer pattern — overlay `<div>` with opacity + sidebar positioned absolute/fixed when `sidebarOpen` is true on small screens.

### P0 — Missing Order Management Page

- `AdminOrderController.php` exists with `index`, `show`, `cancel` methods.
- But `resources/js/pages/admin/Order/` does not exist.
- Orders are completely invisible in the admin dashboard.

**Fix:** Create `resources/js/pages/admin/Order/Oversight.tsx` following the Booking/Oversight.tsx pattern, add route and sidebar link.

### P1 — Hardcoded Colors vs Design Tokens

- 6 pages use hardcoded hex values: `#3c2a1e`, `#b8863b`, `#dcd2c0`, `#a6472f`, `#5c6e4a`, `#b8863b`.
- Only `dashboard.tsx` uses Tailwind theme classes (`text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`, `text-primary`).
- Theme changes (dark mode, rebranding) will not propagate to most pages.

**Fix:** Replace all hardcoded hex with Tailwind CSS variable classes.

### P1 — Inconsistent Filter UX

- **Status filter:** `Cafe/Approvals.tsx` and `Refund/Queue.tsx` use styled `<button>` tabs. `Cafe/Management.tsx`, `Booking/Oversight.tsx`, `User/Management.tsx`, `User/AuditLogs.tsx` use `<select>` dropdowns.
- **Date filter:** `Analytics.tsx` uses native `<input type="date">`. Others use the `<Input>` component.
- **Emoji in UI:** `Analytics.tsx` has `📥 Export CSV` button. `Cafe/Management.tsx` shows `⭐ {rating}`.
- This creates a disjointed admin experience.

### P1 — Pagination: Repeated, Not Shared

- 6 pages (`Approvals`, `Management`, `Oversight`, `Queue`, `Management` (User), `AuditLogs`) implement identical pagination JSX:

```jsx
<div className="flex justify-center gap-2">
  <button onClick={...} disabled={page === 1}>← Previous</button>
  <span className="px-4 py-2">Page {page} of {totalPages}</span>
  <button onClick={...} disabled={page === totalPages}>Next →</button>
</div>
```

- Plus `Commission/Management.tsx` has a separate copy inside the history modal.

**Fix:** Extract a shared `<Pagination page totalPages onPageChange />` component.

### P1 — fetch() Without response.ok Check

- `Cafe/Approvals.tsx:48` uses `fetch()` directly, no `.ok` check — silent failures.
- `Booking/Oversight.tsx:74` same issue.
- `Cafe/Management.tsx:57` same issue.
- Pages using `api()` wrapper (`Cafe/Approvals.tsx:69`, `Booking/Oversight.tsx:113`) do check `response.ok`.

**Fix:** Either use `api()` everywhere or add explicit `if (!response.ok) throw...` to raw `fetch()` calls.

---

## 3. Medium Issues

### P2 — DataTable: No Mobile Responsive Strategy

- Tables have 5-6 columns (Booking: booking_code, cafe, customer, date, time, status).
- On mobile (<640px), columns overflow horizontally with no scroll indicator.
- No `overflow-x-auto` wrapper or horizontal scroll hint visible in the DataTable component.

### P2 — Dashboard Metrics: No API Endpoint

- `AdminDashboardController@index` returns `Inertia::render('admin/dashboard', ['metrics' => $metrics])` — SSR only.
- There is no `/api/admin/dashboard/metrics` endpoint.
- If mobile app or external service needs dashboard data, there's no way to get it.

**Fix:** Add a dedicated API endpoint or reuse the existing controller logic.

### P2 — Commission: Inline Edit Inconsistent With Rest of App

- Commission rates are edited inline with an input appearing directly on the card.
- Every other admin action opens a modal (approve, reject, suspend, add, delete).
- This inconsistency may confuse admins.

### P2 — AuditLogs: before_value / after_value Not Typed

- `AuditLog.ts:20-21`: `before_value: unknown`, `after_value: unknown`
- These should be typed or at least documented what shape they take.

### P3 — Orphaned AdminMiddleware

- `app/Http/Middleware/AdminMiddleware.php` exists but is never registered in `Kernel.php` or route groups.
- All admin protection uses `CheckRole` via `role:admin` middleware alias.
- `AdminMiddleware` should either be removed or registered.

### P3 — Inertia Render vs Client Fetch Inconsistency

- Only `dashboard.tsx` receives Inertia SSR props (`metrics`).
- All other pages are fully client-side rendered via `useEffect` + `fetch()`.
- This means every admin page (except dashboard) shows a loading spinner on navigation.
- Consider: either make all pages SSR (faster initial load) or accept the current SPA-like pattern.

---

## 4. Summary of Recommended Actions

| Priority | Action | Est. Effort |
|----------|--------|-------------|
| P0 | Sidebar mobile drawer with backdrop overlay | 2h |
| P0 | Create Order management page + route + sidebar link | 4h |
| P1 | Consolidate all hardcoded hex to Tailwind CSS variables | 3h |
| P1 | Extract shared `<Pagination>` component, replace in 6 pages | 1h |
| P1 | Normalize filter UX (tabs vs selects — pick one standard) | 2h |
| P1 | Add `response.ok` guards to raw `fetch()` calls | 0.5h |
| P2 | Audit DataTable responsive (add `overflow-x-auto` wrappers) | 1h |
| P2 | Add `/api/admin/dashboard/metrics` endpoint | 1h |
| P2 | Commission edit: change to modal pattern | 1h |
| P3 | Remove or register orphaned `AdminMiddleware` | 0.5h |
| P3 | Type `AuditLog.before_value` / `.after_value` | 0.5h |
