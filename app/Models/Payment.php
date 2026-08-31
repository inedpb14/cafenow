<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @property int $id
 * @property string $payable_type
 * @property int $payable_id
 * @property string $amount
 * @property string $commission
 * @property string $status
 * @property string $payment_method
 * @property string|null $gateway_reference
 * @property string|null $midtrans_order_id
 * @property string|null $midtrans_transaction_id
 * @property string|null $snap_token
 * @property string|null $snap_redirect_url
 * @property string|null $payment_channel
 * @property \Illuminate\Support\Carbon|null $paid_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class Payment extends Model
{
    protected $fillable = [
        'payable_type', 'payable_id', 'amount', 'commission', 'status',
        'payment_method', 'gateway_reference', 'midtrans_order_id',
        'midtrans_transaction_id', 'snap_token', 'snap_redirect_url',
        'payment_channel', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'commission' => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function payable(): MorphTo
    {
        return $this->morphTo();
    }
}
