<?php

declare(strict_types=1);

namespace App\Http\Requests\Table;

use Illuminate\Foundation\Http\FormRequest;

class SetBookingRulesRequest extends FormRequest
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
            'rule_type' => ['required', 'string', 'in:fixed,custom'],
            'duration_minutes' => ['required_if:rule_type,fixed', 'integer', 'min:30'],
            'price' => ['required_if:rule_type,fixed', 'numeric', 'min:0'],
            'min_duration_minutes' => ['required_if:rule_type,custom', 'integer', 'min:30'],
            'max_duration_minutes' => ['required_if:rule_type,custom', 'integer', 'min:30', 'gte:min_duration_minutes'],
            'base_price_per_hour' => ['required_if:rule_type,custom', 'numeric', 'min:0'],
            'surge_rules' => ['sometimes', 'array'],
            'surge_rules.rules' => ['sometimes', 'array'],
            'surge_rules.rules.*.name' => ['required_with:surge_rules.rules', 'string'],
            'surge_rules.rules.*.days' => ['required_with:surge_rules.rules', 'array'],
            'surge_rules.rules.*.start_time' => ['required_with:surge_rules.rules', 'date_format:H:i'],
            'surge_rules.rules.*.end_time' => ['required_with:surge_rules.rules', 'date_format:H:i', 'after:surge_rules.rules.*.start_time'],
            'surge_rules.rules.*.type' => ['required_with:surge_rules.rules', 'string', 'in:multiplier,add_percent'],
            'surge_rules.rules.*.value' => ['required_with:surge_rules.rules', 'numeric', 'min:0'],
            'max_bookings_per_slot' => ['sometimes', 'integer', 'min:1'],
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
