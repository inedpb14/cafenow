<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\MenuItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $cafe_id
 * @property string $name
 * @property string|null $description
 * @property string $category
 * @property string $price
 * @property string|null $photo
 * @property string $availability_status
 * @property string|null $allergen_notes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read Cafe $cafe
 */
class MenuItem extends Model
{
    /** @use HasFactory<MenuItemFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'cafe_id', 'name', 'description', 'category', 'price',
        'photo', 'availability_status', 'allergen_notes',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
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
