<?php

declare(strict_types=1);

namespace App\Services\Cafe;

/**
 * Single source of truth for the owner cafe profile input contract.
 *
 * The sanitize middleware (layer 2) and the controller validation (layer 3) both
 * read from here, so the character whitelist and the length limits can never drift
 * apart from the `cafes` table definition.
 */
final class CafeProfileInput
{
    /**
     * Rejected everywhere, on top of each field whitelist: control characters,
     * markup/shell metacharacters that have no business in a cafe profile.
     */
    public const DENIED_PATTERN = '/[\x00-\x1F\x7F<>{}[\]\\\\|^~$]/u';

    /**
     * field => [label, required, min, max, allowed characters, human hint, example]
     *
     * @var array<string, array{label: string, required: bool, min: int, max: int, allow: string, hint: string, example: string}>
     */
    public const FIELDS = [
        'name' => [
            'label' => 'Nama Cafe',
            'required' => true,
            'min' => 3,
            'max' => 255,
            'allow' => '\p{L}\p{N} .,\'&()\-/',
            'hint' => 'huruf, angka, spasi, dan . , \' & ( ) / -',
            'example' => 'Kopi Nusantara',
        ],
        'address' => [
            'label' => 'Alamat',
            'required' => true,
            'min' => 5,
            'max' => 255,
            'allow' => '\p{L}\p{N} .,\'\-\/#()',
            'hint' => 'huruf, angka, spasi, dan . , \' / # ( ) -',
            'example' => 'Jl. Sudirman No. 1',
        ],
        'city' => [
            'label' => 'Kota',
            'required' => true,
            'min' => 3,
            'max' => 100,
            'allow' => '\p{L}\p{N} .,\'\-',
            'hint' => 'huruf, angka, spasi, dan . , \' -',
            'example' => 'Jakarta Pusat',
        ],
        'phone' => [
            'label' => 'No. Telepon',
            'required' => false,
            'min' => 8,
            'max' => 20,
            'allow' => '\+?\d ()\-',
            'hint' => 'angka, spasi, dan + - ( )',
            'example' => '0812 3456 7890',
        ],
        'description' => [
            'label' => 'Deskripsi',
            'required' => false,
            'min' => 0,
            'max' => 1000,
            'allow' => '\p{L}\p{N} .,\'"!\?:;\-()\/&%+@#',
            'hint' => 'huruf, angka, spasi, dan . , \' " ! ? : ; ( ) & % + @ # / -',
            'example' => 'Cafe kopi premium dengan suasana nyaman.',
        ],
    ];

    /**
     * Whitelist regex for a single field. Delimiter is `~` because the allowed
     * character sets contain `/` and `#`.
     */
    public static function whitelist(string $field): string
    {
        return '~^['.self::FIELDS[$field]['allow'].']+$~u';
    }

    /**
     * Laravel validation rules: type + length + whitelist, straight from FIELDS.
     *
     * @return array<string, list<string>>
     */
    public static function rules(): array
    {
        $rules = [];

        foreach (self::FIELDS as $field => $meta) {
            $rules[$field] = [
                $meta['required'] ? 'required' : 'nullable',
                'string',
                'min:'.$meta['min'],
                'max:'.$meta['max'],
                'regex:'.self::whitelist($field),
            ];
        }

        return $rules;
    }

    /**
     * Trim and collapse whitespace; anything non-string collapses to null so the
     * validator reports a type error instead of a silent cast.
     */
    public static function clean(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        return trim(preg_replace('/\s+/u', ' ', $value) ?? $value);
    }

    /**
     * Layer 2 checks: required, type, length, denied characters, per-field whitelist.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, string> field => error message
     */
    public static function inspect(array $input): array
    {
        $errors = [];

        foreach (self::FIELDS as $field => $meta) {
            // ponytail: field wajib yang tidak dikirim sama sekali tetap ditolak di sini,
            // agar pesannya ramah — bukan bocor ke controller dengan pesan Inggris bawaan.
            if (! array_key_exists($field, $input)) {
                if ($meta['required']) {
                    $errors[$field] = $meta['label'].' wajib diisi.';
                }

                continue;
            }

            $raw = $input[$field];

            if ($raw === null || $raw === '') {
                if ($meta['required']) {
                    $errors[$field] = $meta['label'].' wajib diisi.';
                }

                continue;
            }

            if (! is_string($raw)) {
                $errors[$field] = $meta['label'].' harus berupa teks.';

                continue;
            }

            $value = self::clean($raw);

            if (mb_strlen((string) $value) < $meta['min']) {
                $errors[$field] = $meta['label'].' minimal '.$meta['min'].' karakter.';

                continue;
            }

            if (mb_strlen((string) $value) > $meta['max']) {
                $errors[$field] = $meta['label'].' maksimal '.$meta['max'].' karakter.';

                continue;
            }

            if (preg_match(self::DENIED_PATTERN, (string) $value) === 1) {
                $errors[$field] = $meta['label'].' mengandung karakter yang tidak diizinkan (< > { } [ ] \ | ^ ~ $). Contoh yang benar: '.$meta['example'];

                continue;
            }

            if (preg_match(self::whitelist($field), (string) $value) !== 1) {
                $errors[$field] = $meta['label'].' hanya boleh '.$meta['hint'].'. Contoh: '.$meta['example'];
            }
        }

        return $errors;
    }
}
