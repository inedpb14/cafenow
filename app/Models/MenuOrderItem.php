<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $menu_order_id
 * @property int $menu_item_id
 * @property int $quantity
 * @property string $unit_price
 * @property string $subtotal
 * @property-read MenuOrder $menuOrder
 * @property-read MenuItem $menuItem
 */
class MenuOrderItem extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'menu_order_id', 'menu_item_id', 'quantity', 'unit_price', 'subtotal',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<MenuOrder, $this>
     */
    public function menuOrder(): BelongsTo
    {
        return $this->belongsTo(MenuOrder::class);
    }

    /**
     * @return BelongsTo<MenuItem, $this>
     */
    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class);
    }
}
