<?php

declare(strict_types=1);

namespace App\Http\Requests\Cafe;

use Illuminate\Foundation\Http\FormRequest;

class StoreCafeRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'description' => ['sometimes', 'string', 'max:2000'],
            'category' => ['sometimes', 'string', 'max:100'],
            'address' => ['required', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:100'],
            'postal_code' => ['sometimes', 'string', 'max:10'],
            'latitude' => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'numeric', 'between:-180,180'],
            'facilities' => ['sometimes', 'array'],
            'contact_whatsapp' => ['sometimes', 'string', 'max:20'],
            'contact_email' => ['sometimes', 'email', 'max:255'],
            'instagram' => ['sometimes', 'string', 'max:255'],
            'website' => ['sometimes', 'url', 'max:255'],
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
