<?php

declare(strict_types=1);

namespace App\Http\Requests\Menu;

use Illuminate\Foundation\Http\FormRequest;

class StoreMenuItemRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'description' => ['sometimes', 'string', 'max:2000'],
            'category' => ['required', 'string', 'max:100'],
            'price' => ['required', 'numeric', 'min:0'],
            'photo' => ['sometimes', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'availability_status' => ['sometimes', 'string', 'in:available,out_of_stock'],
            'allergen_notes' => ['sometimes', 'string', 'max:500'],
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
