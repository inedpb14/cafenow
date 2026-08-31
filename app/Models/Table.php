<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\TableFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $cafe_id
 * @property string $name
 * @property int $capacity
 * @property string $table_type
 * @property string|null $description
 * @property string|null $photo
 * @property bool $is_active
 * @property string|null $min_spend
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read Cafe $cafe
 * @property-read BookingRule|null $bookingRule
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Booking> $bookings
 */
class Table extends Model
{
    /** @use HasFactory<TableFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'cafe_id', 'name', 'capacity', 'table_type',
        'description', 'photo', 'is_active', 'min_spend',
    ];

    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
            'is_active' => 'boolean',
            'min_spend' => 'decimal:2',
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
     * @return HasOne<BookingRule, $this>
     */
    public function bookingRule(): HasOne
    {
        return $this->hasOne(BookingRule::class);
    }

    /**
     * @return HasMany<Booking, $this>
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * @param \Illuminate\Database\Eloquent\Builder<static> $query
     * @return \Illuminate\Database\Eloquent\Builder<static>
     */
    public function scopeActive(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('is_active', true);
    }
}
