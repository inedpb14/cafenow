<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\BookingFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int $cafe_id
 * @property int $table_id
 * @property int $customer_id
 * @property int|null $booking_rule_id
 * @property \Illuminate\Support\Carbon $booking_date
 * @property \Illuminate\Support\Carbon $start_time
 * @property \Illuminate\Support\Carbon $end_time
 * @property int $duration_minutes
 * @property int $guest_count
 * @property string $status
 * @property string $table_price
 * @property string $menu_subtotal
 * @property string $total_price
 * @property string $commission
 * @property string $cafe_receives
 * @property string $payment_status
 * @property string|null $payment_id
 * @property string $booking_reference
 * @property \Illuminate\Support\Carbon|null $lock_expires_at
 * @property \Illuminate\Support\Carbon|null $check_in_time
 * @property \Illuminate\Support\Carbon|null $check_out_time
 * @property int $extend_count
 * @property string|null $cancelled_by
 * @property string|null $cancellation_reason
 * @property string|null $customer_notes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Cafe $cafe
 * @property-read Table $table
 * @property-read User $customer
 * @property-read BookingRule|null $bookingRule
 * @property-read Payment|null $payment
 * @property-read \Illuminate\Database\Eloquent\Collection<int, MenuOrder> $menuOrders
 * @property-read RefundRequest|null $refundRequest
 */
class Booking extends Model
{
    /** @use HasFactory<BookingFactory> */
    use HasFactory;

    protected $fillable = [
        'cafe_id', 'table_id', 'customer_id', 'booking_rule_id',
        'booking_date', 'start_time', 'end_time', 'duration_minutes', 'guest_count',
        'status', 'table_price', 'menu_subtotal', 'total_price',
        'commission', 'cafe_receives', 'payment_status', 'payment_id',
        'booking_reference', 'lock_expires_at',
        'check_in_time', 'check_out_time', 'extend_count',
        'cancelled_by', 'cancellation_reason', 'customer_notes',
    ];

    protected function casts(): array
    {
        return [
            'booking_date' => 'date',
            'start_time' => 'datetime:H:i',
            'end_time' => 'datetime:H:i',
            'duration_minutes' => 'integer',
            'guest_count' => 'integer',
            'table_price' => 'decimal:2',
            'menu_subtotal' => 'decimal:2',
            'total_price' => 'decimal:2',
            'commission' => 'decimal:2',
            'cafe_receives' => 'decimal:2',
            'extend_count' => 'integer',
            'lock_expires_at' => 'datetime',
            'check_in_time' => 'datetime',
            'check_out_time' => 'datetime',
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
     * @return BelongsTo<Table, $this>
     */
    public function table(): BelongsTo
    {
        return $this->belongsTo(Table::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    /**
     * @return BelongsTo<BookingRule, $this>
     */
    public function bookingRule(): BelongsTo
    {
        return $this->belongsTo(BookingRule::class);
    }

    /**
     * @return BelongsTo<Payment, $this>
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * @return HasMany<MenuOrder, $this>
     */
    public function menuOrders(): HasMany
    {
        return $this->hasMany(MenuOrder::class);
    }

    /**
     * @return HasOne<RefundRequest, $this>
     */
    public function refundRequest(): HasOne
    {
        return $this->hasOne(RefundRequest::class);
    }
}
