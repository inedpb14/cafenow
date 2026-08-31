<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Booking
 */
class BookingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'booking_reference' => $this->booking_reference,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'booking_date' => $this->booking_date,
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'duration_minutes' => $this->duration_minutes,
            'guest_count' => $this->guest_count,
            'table_price' => $this->table_price,
            'menu_subtotal' => $this->menu_subtotal,
            'total_price' => $this->total_price,
            'commission' => $this->commission,
            'cafe_receives' => $this->cafe_receives,
            'customer_notes' => $this->customer_notes,
            'cancelled_by' => $this->cancelled_by,
            'cancellation_reason' => $this->cancellation_reason,
            'check_in_time' => $this->check_in_time,
            'check_out_time' => $this->check_out_time,
            'extend_count' => $this->extend_count,
            'cafe' => new CafeResource($this->whenLoaded('cafe')),
            'table' => new TableResource($this->whenLoaded('table')),
            'customer' => new UserResource($this->whenLoaded('customer')),
            'menu_orders' => MenuOrderResource::collection($this->whenLoaded('menuOrders')),
            'payment' => new PaymentResource($this->whenLoaded('payment')),
            'created_at' => $this->created_at,
        ];
    }
}
