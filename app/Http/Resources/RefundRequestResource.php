<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\RefundRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin RefundRequest
 */
class RefundRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'booking_id' => $this->booking_id,
            'customer_id' => $this->customer_id,
            'amount' => $this->amount,
            'bank_name' => $this->bank_name,
            'account_number' => $this->account_number,
            'account_holder_name' => $this->account_holder_name,
            'status' => $this->status,
            'initiated_by' => $this->initiated_by,
            'admin_notes' => $this->admin_notes,
            'processed_at' => $this->processed_at,
            'customer' => new UserResource($this->whenLoaded('customer')),
            'booking' => new BookingResource($this->whenLoaded('booking')),
            'created_at' => $this->created_at,
        ];
    }
}
