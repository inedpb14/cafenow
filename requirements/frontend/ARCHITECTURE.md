# CafeNow Admin Panel - Architecture & Technical Design

**Document Version:** 1.0  
**Date:** 2026-07-24  
**Status:** Final  

---

## 1. System Architecture Overview

### High-Level Flow
```
User (Admin)
    ↓
React Frontend (Inertia.js)
    ↓
Laravel Backend (REST API)
    ↓
MySQL Database
    ↓
Cache (optional: Redis)
```

### Technology Stack Decision Rationale

| Component | Technology | Why |
|-----------|-----------|-----|
| Frontend | React 19 + TypeScript | Type safety, component reusability, modern patterns |
| Routing | Inertia.js | Server-driven UI, zero JS bundle for routes, Eloquent prop sharing |
| Styling | Tailwind CSS | Utility-first, design tokens align with system, no CSS-in-JS overhead |
| UI Components | Radix UI | Headless, accessible, works with Tailwind |
| Backend | Laravel 13 | Mature framework, excellent Eloquent ORM, built-in auth/middleware |
| Database | MySQL 8+ | ACID transactions, relational integrity, scalable |
| Auth | Sanctum | Token-based, stateless, built for SPAs |
| State Management | Inertia props + React Context | Minimal—server handles state, client handles UI state only |
| Charts | Recharts | React-native, composable, Tailwind-compatible |

### Why NOT Include
- **Redux/Zustand:** Overkill—server manages data state via Inertia
- **Next.js API routes:** Already have Laravel; avoid dual backends
- **GraphQL:** REST is simpler for this admin dashboard; added complexity not justified
- **Webpack:** Vite handles bundling; fast HMR, small bundle

---

## 2. Directory Structure

```
cafe-now/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── Admin/
│   │   │       ├── DashboardController.php
│   │   │       ├── AnalyticsController.php
│   │   │       ├── CafeController.php
│   │   │       ├── CafeApprovalController.php
│   │   │       ├── FeaturedCafeController.php
│   │   │       ├── BookingController.php
│   │   │       ├── RefundController.php
│   │   │       ├── CommissionController.php
│   │   │       ├── UserController.php
│   │   │       └── AuditLogController.php
│   │   ├── Middleware/
│   │   │   └── AdminMiddleware.php
│   │   └── Resources/
│   │       └── Admin/ (API responses)
│   ├── Models/
│   │   ├── Cafe.php
│   │   ├── Booking.php
│   │   ├── RefundRequest.php
│   │   ├── CommissionRule.php
│   │   ├── FeaturedCafe.php
│   │   ├── AdminAuditLog.php
│   │   └── User.php (existing)
│   ├── Services/
│   │   ├── Admin/
│   │   │   ├── DashboardService.php
│   │   │   ├── AnalyticsService.php
│   │   │   ├── CafeService.php
│   │   │   ├── BookingService.php
│   │   │   ├── RefundService.php
│   │   │   └── CommissionService.php
│   └── Policies/
│       └── AdminPolicy.php
├── routes/
│   ├── admin.php (new—admin routes)
│   ├── api.php (existing—API routes)
│   └── web.php (existing—web routes)
├── database/
│   └── migrations/
│       ├── create_featured_cafes_table.php (new)
│       └── create_admin_audit_logs_table.php (new—if not exists)
├── resources/js/
│   ├── Pages/
│   │   └── Admin/
│   │       ├── Layout.tsx
│   │       ├── Dashboard.tsx
│   │       ├── Analytics.tsx
│   │       ├── Cafe/
│   │       │   ├── Approvals.tsx
│   │       │   ├── Management.tsx
│   │       │   └── Featured.tsx
│   │       ├── Booking/
│   │       │   └── Oversight.tsx
│   │       ├── Refund/
│   │       │   └── Queue.tsx
│   │       ├── Commission/
│   │       │   └── Management.tsx
│   │       └── User/
│   │           ├── Management.tsx
│   │           └── AuditLogs.tsx
│   ├── Components/
│   │   ├── Admin/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── AdminLayout.tsx
│   │   ├── DataTable.tsx
│   │   ├── Modal.tsx
│   │   ├── Drawer.tsx
│   │   ├── Toast.tsx
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── DatePicker.tsx
│   │   └── Spinner.tsx
│   ├── Hooks/
│   │   ├── useToast.ts
│   │   ├── useAuth.ts
│   │   └── useAdmin.ts
│   ├── Contexts/
│   │   ├── ToastContext.tsx
│   │   └── AdminContext.tsx
│   ├── Types/
│   │   ├── admin.ts
│   │   ├── cafe.ts
│   │   ├── booking.ts
│   │   ├── user.ts
│   │   └── index.ts
│   ├── Utils/
│   │   ├── formatCurrency.ts
│   │   ├── formatDate.ts
│   │   └── api.ts
│   └── app.tsx (entry—already exists)
├── tests/
│   ├── Feature/
│   │   └── Admin/
│   │       ├── DashboardControllerTest.php
│   │       ├── CafeControllerTest.php
│   │       └── ... (one test per controller)
│   └── Unit/
│       └── Admin/
│           ├── DashboardServiceTest.php
│           └── ... (service tests)
└── requirements/
    └── frontend/
        ├── ADMIN_PANEL_DEVELOPMENT_PLAN.md (this document)
        ├── TASK_CHECKLIST.md
        └── ARCHITECTURE.md (this file)
```

---

## 3. Data Flow Architecture

### Request/Response Cycle

```
1. User clicks button in React component
                ↓
2. Event handler dispatches Inertia.post/get/patch/delete
                ↓
3. Request routed to admin route in routes/admin.php
                ↓
4. AdminMiddleware checks auth + admin role
                ↓
5. Controller handles logic (delegates to Service layer)
                ↓
6. Service queries Models (Eloquent) or external APIs
                ↓
7. Controller returns JSON response (or Inertia::render for page loads)
                ↓
8. React component receives response via Inertia
                ↓
9. State updated, component re-renders
                ↓
10. Toast notification shows success/error
```

### Example: Approve Cafe

**Frontend (React):**
```typescript
// Pages/Admin/Cafe/Approvals.tsx
const handleApprove = async (cafeId: number, notes: string) => {
  try {
    await router.post(`/api/admin/cafes/${cafeId}/approve`, { notes });
    toast.success("Cafe approved successfully");
    refetch(); // refresh list
  } catch (error) {
    toast.error(error.message);
  }
};
```

**Backend (Laravel):**
```php
// Controllers/Admin/CafeApprovalController.php
public function approve(Request $request, Cafe $cafe)
{
    $request->validate(['notes' => 'nullable|string|max:1000']);
    
    $this->cafeService->approve($cafe, $request->notes);
    
    AdminAuditLog::log('approved', 'Cafe', $cafe->id, auth()->id());
    
    return response()->json(['message' => 'Cafe approved']);
}
```

**Database:**
```sql
-- Cafe model has status column
UPDATE cafes SET status = 'approved', updated_at = NOW() WHERE id = ?;

-- Audit log records action
INSERT INTO admin_audit_logs 
  (admin_id, action, entity_type, entity_id, before_value, after_value, created_at)
VALUES (?, 'approved', 'Cafe', ?, NULL, JSON, NOW());
```

---

## 4. Component Hierarchy

### Layout Tree
```
AdminLayout
├── Sidebar
│   ├── Logo
│   ├── NavItems
│   │   ├── NavLink → /admin/dashboard
│   │   ├── NavLink → /admin/cafe-approvals
│   │   └── ... (8 total)
│   └── Logout
├── Header
│   ├── Search (global)
│   ├── Notifications
│   └── UserProfile
└── MainContent
    └── Page Component (e.g., Dashboard, Cafe Approvals)
        ├── PageHeader (title, filters)
        ├── PageContent
        │   ├── DataTable / Cards / Charts
        │   ├── Modal (for forms)
        │   └── Drawer (for details)
        └── Toast Notifications
```

### Reusable Component Slots
| Component | Used By | Variants |
|-----------|---------|----------|
| DataTable | All list pages | Sortable, Filterable, Paginated |
| Modal | Forms, Confirmations | Default, Danger, Wide |
| Drawer | Details, Editing | Right-aligned, Scrollable |
| Badge | Status columns | Success, Pending, Danger, Info |
| Button | CTAs, Actions | Primary, Secondary, Danger, Disabled |
| Card | Dashboard, Lists | Elevated, Flat, with Icon |

---

## 5. State Management Pattern

### Server State (Managed by Laravel/Inertia)
- User info, roles, permissions
- Page data (tables, lists, forms)
- Database state (cafes, bookings, users)

**Flow:** Database → Controller → Inertia Props → React Component

### Client State (Managed by React)
- UI state: modal open/closed, form values, selected rows
- UI feedback: loading, error messages, notifications

**Flow:** Event → useState/Context → Component Render

### NO External Redux/Zustand (Intentional)
- Inertia already handles server state caching
- React Context sufficient for UI state
- Reduces complexity, keeps codebase lean

**Example - Toast Context:**
```typescript
// Contexts/ToastContext.tsx
export const ToastContext = createContext({
  show: (type, message) => {}
});

// Hook
export const useToast = () => useContext(ToastContext);

// Usage in component
const toast = useToast();
toast.show('success', 'Cafe approved!');
```

---

## 6. API Response Contracts

### Successful Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Kopi Niko",
    "status": "approved",
    "created_at": "2026-07-20T10:30:00Z"
  },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Cafe not found",
  "code": "RESOURCE_NOT_FOUND",
  "details": null
}
```

### Validation Error Response
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "name": ["Name is required"],
    "email": ["Email must be valid"]
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Cafe 1" },
    { "id": 2, "name": "Cafe 2" }
  ],
  "pagination": {
    "total": 100,
    "per_page": 25,
    "current_page": 1,
    "last_page": 4,
    "from": 1,
    "to": 25
  }
}
```

---

## 7. Authentication & Authorization

### Token Flow
```
1. User logs in via /login (non-admin)
2. Get JWT token via Sanctum
3. Token stored in localStorage or httpOnly cookie
4. All requests include: Authorization: Bearer {token}
5. Middleware checks token + admin role
6. If unauthorized, return 403 Forbidden
```

### Middleware Chain
```php
// routes/admin.php
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    // All admin routes here
});

// app/Http/Middleware/AdminMiddleware.php
public function handle($request, $next)
{
    if (!auth()->user() || auth()->user()->role !== UserRole::Admin) {
        abort(403, 'Unauthorized');
    }
    return $next($request);
}
```

### Permission Matrix
| Resource | Customer | Owner | Admin |
|----------|----------|-------|-------|
| Dashboard | ✗ | ✗ | ✓ |
| Cafe Approvals | ✗ | ✗ | ✓ |
| User Management | ✗ | ✗ | ✓ |
| Audit Logs | ✗ | ✗ | ✓ |

---

## 8. Database Schema (New Tables)

### featured_cafes
```sql
CREATE TABLE featured_cafes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  cafe_id BIGINT NOT NULL UNIQUE,
  priority INT DEFAULT 1,
  featured_from DATE,
  featured_until DATE,
  description TEXT,
  admin_id BIGINT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id)
);
```

### admin_audit_logs (if new)
```sql
CREATE TABLE admin_audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  admin_id BIGINT NOT NULL,
  action VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id BIGINT,
  before_value JSON,
  after_value JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (admin_id, created_at),
  INDEX (entity_type, entity_id)
);
```

---

## 9. Error Handling Strategy

### Frontend
```typescript
// Try-catch pattern
try {
  const response = await router.post('/api/endpoint', data);
  toast.success('Success!');
} catch (error) {
  if (error.response?.status === 422) {
    // Validation error—show field errors
    setFieldErrors(error.response.data.details);
  } else {
    // General error
    toast.error(error.response?.data?.error || 'Something went wrong');
  }
}
```

### Backend
```php
// Controller error handling
try {
    $cafe = Cafe::findOrFail($id);
    $this->cafeService->approve($cafe);
    return response()->json(['message' => 'Approved'], 200);
} catch (ModelNotFoundException $e) {
    return response()->json(['error' => 'Cafe not found'], 404);
} catch (Exception $e) {
    Log::error('Cafe approval error', ['error' => $e->message]);
    return response()->json(['error' => 'Server error'], 500);
}
```

### Network Error Recovery
- Show error toast with message
- Provide retry button in error state
- Log to monitoring service (Sentry optional)

---

## 10. Performance Optimization

### Frontend
- **Code splitting:** Separate bundle per route (Inertia handles this)
- **Lazy loading:** Charts load on viewport intersection
- **Memoization:** React.memo for expensive components (DataTable, Charts)
- **Debouncing:** Search input debounced 300ms
- **Pagination:** Default 25-50 items/page (avoid huge lists)

### Backend
- **Database indexes:** ON (admin_id, created_at) for audit logs
- **Query optimization:** Use select() to fetch only needed columns
- **Caching:** Cache dashboard metrics for 5 minutes
- **Pagination:** Always paginate lists (50 max per page)
- **Eager loading:** Use with() to avoid N+1 queries

### Example Query Optimization
```php
// ❌ Bad: N+1 queries
$cafes = Cafe::all();
foreach ($cafes as $cafe) {
    echo $cafe->owner->name; // One query per cafe
}

// ✓ Good: Eager load
$cafes = Cafe::with('owner')->paginate(50);
foreach ($cafes as $cafe) {
    echo $cafe->owner->name; // All loaded in 1 query
}
```

---

## 11. Testing Strategy

### Unit Tests (PHP)
- Service classes: `AdminServiceTest`
- Models: Relationships, scopes, accessors
- Command: Test database seeding

### Feature Tests (PHP)
- Each controller: `DashboardControllerTest`, `CafeControllerTest`, etc.
- Test: auth required, wrong role rejected, correct response
- Test: CRUD operations, validation errors

### Component Tests (React)
- Render components with props
- Simulate user interactions (clicks, form fills)
- Assert output
- Use: Vitest + React Testing Library

### E2E Tests (Optional)
- Critical workflows: approve cafe, process refund
- Use: Playwright or Cypress

### Example Test (PHP)
```php
// tests/Feature/Admin/CafeControllerTest.php
class CafeControllerTest extends TestCase
{
    public function test_requires_admin_role()
    {
        $user = User::factory()->create(['role' => 'customer']);
        $this->actingAs($user)
            ->get('/api/admin/cafes')
            ->assertStatus(403);
    }

    public function test_list_cafes()
    {
        Cafe::factory()->count(5)->create();
        $response = $this->get('/api/admin/cafes');
        
        $this->assertTrue($response['success']);
        $this->assertCount(5, $response['data']);
    }
}
```

---

## 12. Deployment Checklist

### Pre-Deploy
- [ ] All tests passing
- [ ] ESLint warnings resolved
- [ ] PHPStan checks passing
- [ ] Type safety: TS strict mode
- [ ] Environment variables set (.env)
- [ ] Database migrations created
- [ ] Secrets not committed

### Deploy Steps
```bash
# 1. Backend
php artisan migrate --force
php artisan cache:clear
php artisan config:cache

# 2. Frontend
npm run build
php artisan serve  # or use production server
```

### Post-Deploy
- [ ] Check admin dashboard loads
- [ ] Test one workflow end-to-end
- [ ] Monitor error logs
- [ ] Verify audit logs recording

---

## 13. Monitoring & Observability

### Logging
- Laravel logs to `storage/logs/laravel.log`
- Admin actions logged to `admin_audit_logs` table
- Frontend errors logged (optional: Sentry)

### Metrics to Track
- API response times (target: < 500ms)
- Database query times (target: < 100ms)
- Page load time (target: < 2s)
- Error rates (target: < 0.1%)

### Log Example
```
[2026-07-24 15:30:45] admin.INFO: Admin 5 approved cafe 12
[2026-07-24 15:31:22] admin.ERROR: Failed to process refund 45: insufficient funds
```

---

## 14. Known Limitations & Future Improvements

### Current Scope
- ✓ Admin dashboard & analytics
- ✓ Cafe approval workflow
- ✓ Booking oversight
- ✓ Refund processing
- ✗ Real-time notifications (WebSocket)
- ✗ Bulk operations (CSV import/export)
- ✗ Advanced reporting/BI integration

### Future Enhancements (Post-MVP)
1. WebSocket for real-time updates
2. Scheduled reports (daily, weekly)
3. Custom dashboard widgets
4. Advanced filtering & saved views
5. Mobile app for approvals on-the-go
6. Integration with payment gateways
7. Machine learning for fraud detection

---

## 15. Security Considerations

### Input Validation
- Client-side: provide UX feedback
- Server-side: ALWAYS validate (primary defense)
- Use Laravel validation rules: `required`, `email`, `integer`, etc.

### Output Escaping
- React auto-escapes by default
- Double-check when using dangerouslySetInnerHTML (don't use unless necessary)

### CSRF Protection
- Laravel middleware: `VerifyCsrfToken`
- Inertia handles CSRF tokens automatically

### SQL Injection
- Use Eloquent (parameterized queries)
- Never use raw SQL with string concatenation

### Rate Limiting (Optional)
```php
// throttle:60,1 = 60 requests per minute per user
Route::post('/api/admin/cafes/{id}/approve')
    ->middleware('throttle:60,1');
```

### Secrets Management
- Environment variables in `.env`
- Never commit `.env` or keys
- Use `.env.example` as template

---

## 16. Maintenance & Onboarding

### For New Developers
1. Clone repo, run `composer install && npm install`
2. Copy `.env.example` to `.env`
3. Run `php artisan key:generate`
4. Run migrations: `php artisan migrate`
5. Seed test data: `php artisan db:seed`
6. Start dev server: `npm run dev` (frontend) + `php artisan serve` (backend)
7. Open http://localhost:3000, login as admin@test.local (password: generated at seed time — lihat `requirements/akun.md` / output seeder)

### Architecture Documentation
- Keep this ARCHITECTURE.md updated as patterns evolve
- Document major refactors in commit messages
- Use JSDoc for complex functions

### Code Review Checklist
- [ ] Tests added/updated
- [ ] No console.log or dd() calls
- [ ] Type safety maintained
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] Error handling complete

---

## Summary

This architecture balances **simplicity** with **scalability**:
- Minimal state management (Inertia + Context)
- Clear separation of concerns (Controllers → Services → Models)
- Type safety (TypeScript + PHP types)
- Comprehensive error handling
- Audit trail for compliance
- Performance-conscious design

**Key Principle:** Keep it simple, audit everything, test thoroughly.

---

**Document Owner:** Dev Team  
**Last Updated:** 2026-07-24  
**Review Schedule:** Quarterly or post-major refactor
