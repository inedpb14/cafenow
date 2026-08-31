<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Cafe;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Cafe
 */
class CafeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $primaryPhoto = $this->relationLoaded('photos') && $this->photos->isNotEmpty()
            ? asset('storage/'.$this->photos->first()->photo_path)
            : 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80';

        $minPrice = $this->relationLoaded('tables')
            ? ($this->tables->min('min_spend') ?: 35000)
            : 35000;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'category' => $this->category,
            'address' => $this->address,
            'city' => $this->city,
            'facilities' => $this->facilities ?? ['High-Speed WiFi', 'AC Room', 'Parkir Luas'],
            'rating' => '4.9',
            'price_starting' => (int) $minPrice,
            'badge' => in_array($this->approval_status, ['approved', 'active']) ? 'Mitra Terverifikasi' : 'Baru Bergabung',
            'primary_photo' => $primaryPhoto,
            'operational_hours' => $this->operationalHoursList(),
            'approval_status' => $this->approval_status,
            'rejection_reason' => $this->rejection_reason,
            'submission_count' => $this->submission_count ?? 1,
            'created_at' => $this->created_at,
        ];
    }
}
