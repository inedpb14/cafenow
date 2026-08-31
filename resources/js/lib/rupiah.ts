import type { ChangeEvent } from 'react';

/**
 * Grouping ribuan dihitung dari belakang (kanan ke kiri): sisipkan '.' tiap
 * 3 digit selama belum mentok di digit paling kiri.
 * - \B      : posisi antar-digit (bukan awal string) -> mencegah titik nyasar di depan.
 * - (?=(\d{3})+(?!\d)) : sisakan kelipatan 3 digit tepat di belakang titik.
 */
export const groupThousands = (rawDigits: string): string =>
    rawDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * Langkah 1 — filter strict: buang semua karakter selain digit (termasuk saat paste).
 * Langkah 2 — hapus leading zero: "007500" -> "7500", tapi "0" tunggal tetap "0".
 * Langkah 3 — grouping ribuan dari belakang.
 */
export const formatRupiahInt = (raw: string): string => {
    let digits = raw.replace(/[^\d]/g, '');
    digits = digits.replace(/^0+(?=\d)/, '');
    return groupThousands(digits);
};

/**
 * Handler input rupiah live (Langkah 1-4). Input bersifat uncontrolled (tanpa
 * `value`), jadi React tidak akan meng-reset kursor — handler ini yang mengatur
 * DOM + selection secara manual.
 *
 * Langkah 4 — reposisi kursor:
 * 1. Hitung jumlah DIGIT di sebelah kiri caret lama (bukan jumlah karakter —
 *    titik pemisah diskip).
 * 2. Setelah string baru terformat, cari karakter ke-N tempat jumlah digit
 *    yang dilewati == angka dari langkah 1.
 * 3. Letakkan caret di posisi itu (di belakang digit terakhir yang dihitung).
 */
export const handleRupiahInput = (
    e: ChangeEvent<HTMLInputElement>,
    onChange: (formatted: string) => void
): void => {
    const input = e.target;
    const caret = input.selectionStart ?? input.value.length;
    const digitsLeft = (input.value.slice(0, caret).match(/\d/g) || []).length;

    const formatted = formatRupiahInt(input.value);

    if (formatted !== input.value) {
        let pos = 0;
        let seen = 0;
        while (pos < formatted.length && seen < digitsLeft) {
            if (formatted[pos] >= '0' && formatted[pos] <= '9') seen++;
            pos++;
        }
        input.value = formatted;
        input.setSelectionRange(pos, pos);
    }

    onChange(formatted);
};

/** Balikkan string terformat ("1.234.567") menjadi digit murni ("1234567") untuk dikirim ke server. */
export const toRawDigits = (formatted: string): string => formatted.replace(/[^\d]/g, '');