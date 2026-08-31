<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Notification
 */
class NotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'subject' => $this->subject,
            'message' => $this->message,
            'notification_type' => $this->notification_type,
            'related_entity_type' => $this->related_entity_type,
            'related_entity_id' => $this->related_entity_id,
            'sent_at' => $this->sent_at,
            'read_at' => $this->read_at,
        ];
    }
}
