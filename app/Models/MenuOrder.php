<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $cafe_id
 * @property int $customer_id
 * @property int|null $booking_id
 * @property string $order_type
 * @property string $order_reference
 * @property string $status
 * @property string $total_price
 * @property string $commission
 * @property string $cafe_receives
 * @property string $payment_status
 * @property string|null $payment_id
 * @property \Illuminate\Support\Carbon|null $prepare_at
 * @property string|null $special_notes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Cafe $cafe
 * @property-read User $customer
 * @property-read Booking|null $booking
 * @property-read Payment|null $payment
 * @property-read \Illuminate\Database\Eloquent\Collection<int, MenuOrderItem> $items
 */
class MenuOrder extends Model
{
    protected $fillable = [
        'cafe_id', 'customer_id', 'booking_id', 'order_type',
        'order_reference', 'status', 'total_price', 'commission',
        'cafe_receives', 'payment_status', 'payment_id',
        'prepare_at', 'special_notes',
    ];

    protected function casts(): array
    {
        return [
            'total_price' => 'decimal:2',
            'commission' => 'decimal:2',
            'cafe_receives' => 'decimal:2',
            'prepare_at' => 'datetime',
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
    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    /**
     * @return BelongsTo<Booking, $this>
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * @return BelongsTo<Payment, $this>
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * @return HasMany<MenuOrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(MenuOrderItem::class);
    }
}
