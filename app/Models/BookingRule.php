<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\BookingRuleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $table_id
 * @property string $rule_type
 * @property int $duration_minutes
 * @property string $price
 * @property int $min_duration_minutes
 * @property int $max_duration_minutes
 * @property string $base_price_per_hour
 * @property array<string, mixed> $surge_rules
 * @property int $max_bookings_per_slot
 * @property int $min_advance_hours
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Table $table
 */
class BookingRule extends Model
{
    /** @use HasFactory<BookingRuleFactory> */
    use HasFactory;

    protected $fillable = [
        'table_id', 'rule_type', 'duration_minutes', 'price',
        'min_duration_minutes', 'max_duration_minutes', 'base_price_per_hour',
        'surge_rules', 'max_bookings_per_slot', 'min_advance_hours', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'duration_minutes' => 'integer',
            'price' => 'decimal:2',
            'min_duration_minutes' => 'integer',
            'max_duration_minutes' => 'integer',
            'base_price_per_hour' => 'decimal:2',
            'surge_rules' => 'array',
            'max_bookings_per_slot' => 'integer',
            'min_advance_hours' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Table, $this>
     */
    public function table(): BelongsTo
    {
        return $this->belongsTo(Table::class);
    }
}
