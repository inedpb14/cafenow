<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Payment
 */
class PaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'amount' => $this->amount,
            'commission' => $this->commission,
            'status' => $this->status,
            'payment_method' => $this->payment_method,
            'gateway_reference' => $this->gateway_reference,
            'midtrans_order_id' => $this->midtrans_order_id,
            'created_at' => $this->created_at,
        ];
    }
}
