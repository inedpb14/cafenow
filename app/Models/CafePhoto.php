<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $cafe_id
 * @property string $photo_path
 * @property int $display_order
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Cafe $cafe
 */
class CafePhoto extends Model
{
    protected $fillable = ['cafe_id', 'photo_path', 'display_order'];

    protected function casts(): array
    {
        return [
            'display_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Cafe, $this>
     */
    public function cafe(): BelongsTo
    {
        return $this->belongsTo(Cafe::class);
    }
}
