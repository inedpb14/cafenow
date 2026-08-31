<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $admin_id
 * @property string $action
 * @property string $entity_type
 * @property int $entity_id
 * @property array<string, mixed> $before_value
 * @property array<string, mixed> $after_value
 * @property string $ip_address
 * @property \Illuminate\Support\Carbon $created_at
 * @property-read User $admin
 */
class AdminAuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'admin_id', 'action', 'entity_type', 'entity_id',
        'before_value', 'after_value', 'ip_address', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'before_value' => 'array',
            'after_value' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
