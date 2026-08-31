<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\MenuOrder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MenuOrder
 */
class MenuOrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_reference' => $this->order_reference,
            'order_type' => $this->order_type,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'total_price' => $this->total_price,
            'special_notes' => $this->special_notes,
            'prepare_at' => $this->prepare_at,
            'items' => MenuOrderItemResource::collection($this->whenLoaded('items')),
            'booking_id' => $this->booking_id,
            'created_at' => $this->created_at,
        ];
    }
}
