<?php

declare(strict_types=1);

namespace App\Traits;

use App\Models\AdminAuditLog;
use Illuminate\Http\Request;

trait LogsAdminActions
{
    /**
     * @param array<string, mixed> $before
     * @param array<string, mixed> $after
     */
    protected function logAdminAction(
        Request $request,
        string $action,
        string $entityType,
        int $entityId,
        array $before = [],
        array $after = [],
    ): void {
        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'before_value' => $before,
            'after_value' => $after,
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);
    }
}
