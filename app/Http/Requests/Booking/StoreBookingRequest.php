<?php

declare(strict_types=1);

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'cafe_id' => ['required', 'exists:cafes,id'],
            'table_id' => ['required', 'exists:tables,id'],
            'booking_rule_id' => ['required', 'exists:booking_rules,id'],
            'booking_date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'duration_minutes' => ['required', 'integer', 'min:30'],
            'guest_count' => ['required', 'integer', 'min:1'],
            'customer_notes' => ['sometimes', 'string', 'max:1000'],
            'menu_items' => ['sometimes', 'array'],
            'menu_items.*.menu_item_id' => ['required_with:menu_items', 'exists:menu_items,id'],
            'menu_items.*.quantity' => ['required_with:menu_items', 'integer', 'min:1'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDto(): array
    {
        return $this->validated();
    }
}
