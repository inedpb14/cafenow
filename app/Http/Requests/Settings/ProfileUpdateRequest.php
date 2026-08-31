<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = $this->profileRules($this->user()->id);

        $rules['phone'] = ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s]+$/'];
        $rules['avatar'] = ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'];

        return $rules;
    }
}
