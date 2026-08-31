<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\SearchHistory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SearchHistory
 */
class SearchHistoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer_id' => $this->customer_id,
            'cafe_id' => $this->cafe_id,
            'cafe' => new CafeResource($this->whenLoaded('cafe')),
            'viewed_at' => $this->viewed_at,
        ];
    }
}
