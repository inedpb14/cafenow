<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CafePhoto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CafePhoto
 */
class CafePhotoResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'photo_path' => $this->photo_path,
            'display_order' => $this->display_order,
        ];
    }
}
