<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\BookingRule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin BookingRule
 */
class BookingRuleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'table_id' => $this->table_id,
            'rule_type' => $this->rule_type,
            'duration_minutes' => $this->when($this->rule_type === 'fixed', $this->duration_minutes),
            'price' => $this->when($this->rule_type === 'fixed', $this->price),
            'min_duration_minutes' => $this->when($this->rule_type === 'custom', $this->min_duration_minutes),
            'max_duration_minutes' => $this->when($this->rule_type === 'custom', $this->max_duration_minutes),
            'base_price_per_hour' => $this->when($this->rule_type === 'custom', $this->base_price_per_hour),
            'surge_rules' => $this->when($this->rule_type === 'custom', $this->surge_rules),
            'max_bookings_per_slot' => $this->max_bookings_per_slot,
        ];
    }
}
