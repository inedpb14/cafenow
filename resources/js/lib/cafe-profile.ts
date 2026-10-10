/**
 * Frontend mirror of App\Services\Cafe\CafeProfileInput — same field list, same
 * length limits, same character whitelist. The backend stays authoritative; this
 * only spares the user a round trip.
 */
export interface CafeProfileForm {
    name: string;
    address: string;
    city: string;
    phone: string;
    description: string;
}

export type CafeProfileField = keyof CafeProfileForm | 'city';

type FieldRule = {
    label: string;
    required: boolean;
    min: number;
    max: number;
    allow: RegExp;
    /** Karakter yang boleh diketik, dalam bahasa manusia untuk pesan error. */
    allowedHint: string;
    /** Contoh isian yang valid. */
    example: string;
};

export const CAFE_PROFILE_FIELDS: Record<CafeProfileField, FieldRule> = {
    name: {
        label: 'Nama Cafe',
        required: true,
        min: 3,
        max: 255,
        allow: /^[\p{L}\p{N} .,'&()/ -]+$/u,
        allowedHint: "huruf, angka, spasi, dan . , ' & ( ) / -",
        example: 'Kopi Nusantara',
    },
    address: {
        label: 'Alamat',
        required: true,
        min: 5,
        max: 255,
        allow: /^[\p{L}\p{N} .,'/#() -]+$/u,
        allowedHint: "huruf, angka, spasi, dan . , ' / # ( ) -",
        example: 'Jl. Sudirman No. 1',
    },
    city: {
        label: 'Kota',
        required: true,
        min: 3,
        max: 100,
        allow: /^[\p{L}\p{N} .,' -]+$/u,
        allowedHint: "huruf, angka, spasi, dan . , ' -",
        example: 'Bandar Lampung',
    },
    phone: {
        label: 'No. Telepon',
        required: false,
        min: 8,
        max: 20,
        allow: /^\+?[\d ()-]+$/u,
        allowedHint: 'angka, spasi, dan + - ( )',
        example: '0812 3456 7890',
    },
    description: {
        label: 'Deskripsi',
        required: false,
        min: 0,
        max: 1000,
        allow: /^[\p{L}\p{N} .,'"!?:;()&%+@# /-]+$/u,
        allowedHint: "huruf, angka, spasi, dan . , ' \" ! ? : ; ( ) & % + @ # / -",
        example: 'Cafe kopi premium dengan suasana nyaman.',
    },
};

/** Rejected in every field, on top of the per-field whitelist. */
export const DENIED_CHARACTERS = /[\p{C}<>{}[\]\\|^~$]/u;

export function cleanCafeProfile(form: CafeProfileForm): Record<string, string> {
    const clean = (value: string) => value.replace(/\s+/gu, ' ').trim();

    return {
        name: clean(form.name),
        address: clean(form.address),
        city: clean(form.city),
        phone: clean(form.phone),
        description: clean(form.description),
    };
}

export function validateCafeProfile(form: CafeProfileForm): Partial<Record<CafeProfileField, string>> {
    const errors: Partial<Record<CafeProfileField, string>> = {};
    const cleaned = cleanCafeProfile(form);

    (Object.keys(CAFE_PROFILE_FIELDS) as CafeProfileField[]).forEach((field) => {
        const rule = CAFE_PROFILE_FIELDS[field];
        const value = cleaned[field];

        if (!value) {
            if (rule.required) {
                errors[field] = `${rule.label} wajib diisi`;
            }

            return;
        }

        if (value.length < rule.min) {
            errors[field] = `${rule.label} minimal ${rule.min} karakter`;

            return;
        }

        if (value.length > rule.max) {
            errors[field] = `${rule.label} maksimal ${rule.max} karakter`;

            return;
        }

        if (DENIED_CHARACTERS.test(value)) {
            errors[field] = `${rule.label} mengandung karakter yang tidak diizinkan (< > { } [ ] \\ | ^ ~ $). Contoh yang benar: ${rule.example}`;

            return;
        }

        if (!rule.allow.test(value)) {
            errors[field] = `${rule.label} hanya boleh ${rule.allowedHint}. Contoh: ${rule.example}`;
        }
    });

    return errors;
}