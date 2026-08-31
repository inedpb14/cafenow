<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $recipient_id
 * @property string $recipient_type
 * @property string $subject
 * @property string $message
 * @property string $notification_type
 * @property string|null $related_entity_type
 * @property int|null $related_entity_id
 * @property \Illuminate\Support\Carbon|null $sent_at
 * @property \Illuminate\Support\Carbon|null $read_at
 * @property string $delivery_status
 * @property array<string, mixed> $data
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read User $recipient
 */
class Notification extends Model
{
    use SoftDeletes;

    public $timestamps = false;

    protected $fillable = [
        'recipient_id', 'recipient_type', 'subject', 'message',
        'notification_type', 'related_entity_type', 'related_entity_id',
        'sent_at', 'read_at', 'delivery_status', 'data',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'read_at' => 'datetime',
            'data' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }
}
