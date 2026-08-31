<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\FeaturedCafe;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin FeaturedCafe
 */
class FeaturedCafeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'cafe_id' => $this->cafe_id,
            'display_order' => $this->display_order,
            'active_from' => $this->active_from,
            'active_to' => $this->active_to,
            'cafe' => new CafeResource($this->whenLoaded('cafe')),
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
