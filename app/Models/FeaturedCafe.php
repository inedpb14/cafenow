<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $cafe_id
 * @property int $display_order
 * @property \Illuminate\Support\Carbon|null $active_from
 * @property \Illuminate\Support\Carbon|null $active_to
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Cafe $cafe
 * @property-read User|null $createdBy
 */
class FeaturedCafe extends Model
{
    protected $fillable = [
        'cafe_id', 'display_order', 'active_from', 'active_to', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'display_order' => 'integer',
            'active_from' => 'datetime',
            'active_to' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Cafe, $this>
     */
    public function cafe(): BelongsTo
    {
        return $this->belongsTo(Cafe::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @param \Illuminate\Database\Eloquent\Builder<static> $query
     * @return \Illuminate\Database\Eloquent\Builder<static>
     */
    public function scopeActive(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('active_from', '<=', now())
            ->where(function ($q) {
                $q->where('active_to', '>=', now())
                    ->orWhereNull('active_to');
            })
            ->orderBy('display_order');
    }
}
