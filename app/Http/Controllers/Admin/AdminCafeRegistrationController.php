<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\CafeApprovalStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\CafeResource;
use App\Models\AdminAuditLog;
use App\Models\Cafe;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Inertia\Pagination\LengthAwarePaginator;

class AdminCafeRegistrationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Cafe::with(['owner', 'photos', 'tables', 'menuItems']);

        if ($request->filled('status')) {
            $status = $request->string('status')->toString();

            $query->where(
                $status === 'approved'
                    ? fn ($q) => $q->whereIn('approval_status', ['approved', 'active'])
                    : fn ($q) => $q->where('approval_status', $status)
            );
        }

        $query->latest();

        $perPage = min(max($request->integer('per_page', 15), 1), 100);
        $cafes = $query->paginate($perPage);

        $data = $cafes->getCollection()->map(fn (Cafe $c) => $this->formatCafe($c));

        return response()->json([
            'success' => true,
            'data' => $data,
            'pagination' => [
                'current_page' => $cafes->currentPage(),
                'last_page' => $cafes->lastPage(),
                'total' => $cafes->total(),
            ],
        ]);
    }

    public function show(Cafe $cafe): JsonResponse
    {
        $cafe->load(['owner', 'photos', 'tables', 'menuItems']);

        return response()->json([
            'success' => true,
            'data' => $this->formatCafe($cafe),
        ]);
    }

    public function showPage(Cafe $cafe): Response
    {
        $cafe->load(['owner', 'photos', 'tables', 'menuItems']);

        return Inertia::render('admin/Cafe/ApprovalDetail', [
            'cafe' => $this->formatCafe($cafe),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatCafe(Cafe $c): array
    {
        $primaryPhoto = $c->photos->first()?->photo_path
            ? asset('storage/'.$c->photos->first()->photo_path)
            : null;

        return [
            'id' => $c->id,
            'name' => $c->name,
            'description' => $c->description,
            'address' => $c->address,
            'city' => $c->city,
            'phone' => $c->contact_whatsapp,
            'location' => $c->address ?: ($c->city ?: ''),
            'status' => $c->approval_status,
            'rejection_reason' => $c->rejection_reason,
            'submission_count' => $c->submission_count ?? 1,
            'created_at' => $c->created_at,
            'owner_name' => $c->owner?->name,
            'owner_email' => $c->owner?->email,
            'facilities' => $c->facilities ?? [],
            'operational_hours' => $c->operationalHoursList(),
            'primary_photo' => $primaryPhoto,
            'photos' => $c->photos->map(fn ($p) => asset('storage/'.$p->photo_path))->values(),
            'tables' => $c->tables->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'type' => $t->table_type ?? 'regular',
                'capacity' => $t->capacity,
                'min_spend' => (float) ($t->min_spend ?? 0),
                'is_active' => (bool) $t->is_active,
                'photo' => $t->photo ? asset('storage/'.$t->photo) : null,
            ])->values(),
            'menu_items' => $c->menuItems->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'category' => $m->category,
                'price' => (float) $m->price,
                'image' => $m->photo ? asset('storage/'.$m->photo) : null,
            ])->values(),
        ];
    }

    public function approve(Request $request, Cafe $cafe): JsonResponse
    {
        $request->validate(['notes' => ['nullable', 'string', 'max:1000']]);
        $notes = $request->string('notes')->trim()->value();

        $before = ['approval_status' => $cafe->approval_status];

        $cafe->transitionTo(CafeApprovalStatus::Active);
        $cafe->update(['rejection_reason' => null]);

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'approve_cafe',
            'entity_type' => 'cafe',
            'entity_id' => $cafe->id,
            'before_value' => $before,
            'after_value' => ['approval_status' => 'active', 'notes' => $notes ?: null],
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        Notification::create([
            'recipient_id' => $cafe->owner_id,
            'recipient_type' => 'owner',
            'subject' => 'Cafe Disetujui',
            'message' => "Cafe {$cafe->name} Anda telah disetujui dan sekarang aktif.",
            'notification_type' => 'cafe_approved',
            'related_entity_type' => 'cafe',
            'related_entity_id' => $cafe->id,
            'sent_at' => now(),
            'delivery_status' => 'sent',
        ]);

        return response()->json([
            'success' => true,
            'data' => new CafeResource($cafe),
        ]);
    }

    public function reject(Request $request, Cafe $cafe): JsonResponse
    {
        $request->validate(['reason' => ['required', 'string', 'max:1000']]);

        $before = ['approval_status' => $cafe->approval_status];
        $reason = $request->string('reason');

        $cafe->transitionTo(CafeApprovalStatus::Rejected);
        $cafe->update(['rejection_reason' => $reason]);

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'reject_cafe',
            'entity_type' => 'cafe',
            'entity_id' => $cafe->id,
            'before_value' => $before,
            'after_value' => ['approval_status' => 'rejected', 'rejection_reason' => $reason],
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        Notification::create([
            'recipient_id' => $cafe->owner_id,
            'recipient_type' => 'owner',
            'subject' => 'Cafe Ditolak',
            'message' => "Cafe {$cafe->name} Anda ditolak. Alasan: {$reason}",
            'notification_type' => 'cafe_rejected',
            'related_entity_type' => 'cafe',
            'related_entity_id' => $cafe->id,
            'sent_at' => now(),
            'delivery_status' => 'sent',
        ]);

        return response()->json([
            'success' => true,
            'data' => new CafeResource($cafe),
        ]);
    }
}
