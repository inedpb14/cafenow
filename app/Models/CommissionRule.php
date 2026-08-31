<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $commission_type
 * @property string $percentage
 * @property int $set_by_admin_id
 * @property \Illuminate\Support\Carbon|null $active_from
 * @property \Illuminate\Support\Carbon|null $active_to
 * @property-read User $setByAdmin
 */
class CommissionRule extends Model
{
    protected $fillable = [
        'commission_type', 'percentage', 'set_by_admin_id',
        'active_from', 'active_to',
    ];

    protected function casts(): array
    {
        return [
            'percentage' => 'decimal:2',
            'active_from' => 'datetime',
            'active_to' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function setByAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'set_by_admin_id');
    }
}
