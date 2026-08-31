<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $booking_id
 * @property int $customer_id
 * @property string $amount
 * @property string $bank_name
 * @property string $account_number
 * @property string $account_holder_name
 * @property string $status
 * @property string $initiated_by
 * @property string|null $form_token
 * @property string|null $admin_notes
 * @property string|null $reason
 * @property int|null $processed_by
 * @property \Illuminate\Support\Carbon|null $processed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Booking $booking
 * @property-read User $customer
 */
class RefundRequest extends Model
{
    protected $fillable = [
        'booking_id', 'customer_id', 'amount', 'bank_name',
        'account_number', 'account_holder_name', 'status',
        'initiated_by', 'form_token', 'admin_notes', 'reason',
        'processed_by', 'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'processed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Booking, $this>
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }
}
