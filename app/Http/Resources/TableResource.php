<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Table;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Table
 */
class TableResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'cafe_id' => $this->cafe_id,
            'name' => $this->name,
            'capacity' => $this->capacity,
            'table_type' => $this->table_type,
            'description' => $this->description,
            'photo' => $this->photo,
            'is_active' => $this->is_active,
            'booking_rule' => new BookingRuleResource($this->whenLoaded('bookingRule')),
        ];
    }
}
