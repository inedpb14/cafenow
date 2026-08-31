<?php

declare(strict_types=1);

namespace App\Services\Auth;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use RuntimeException;

readonly class OtpService
{
    private const TTL = 300;

    private const RESEND_TTL = 60;

    public function generate(string $identifier, string $channel = 'email'): string
    {
        $otp = (string) random_int(100000, 999999);

        Cache::put("otp:{$channel}:{$identifier}", $otp, self::TTL);
        Cache::put("otp:{$channel}:{$identifier}:resend", true, self::RESEND_TTL);

        return $otp;
    }

    public function validate(string $identifier, string $otp, string $channel = 'email'): bool
    {
        $cached = Cache::get("otp:{$channel}:{$identifier}");

        if ($cached === null || $cached !== $otp) {
            return false;
        }

        Cache::forget("otp:{$channel}:{$identifier}");
        Cache::forget("otp:{$channel}:{$identifier}:resend");

        return true;
    }

    public function canResend(string $identifier, string $channel = 'email'): bool
    {
        return Cache::has("otp:{$channel}:{$identifier}:resend") === false;
    }

    public function sendEmailOtp(string $email, string $otp): void
    {
        try {
            Mail::raw("Kode OTP Anda adalah: {$otp}\nKode berlaku selama 5 menit.", function ($message) use ($email): void {
                $message->to($email)->subject('Kode OTP CafeNow');
            });
        } catch (RuntimeException $exception) {
            Log::warning('Gagal mengirim OTP email', ['email' => $email, 'error' => $exception->getMessage()]);
        }
    }

    public function sendEmailResetLink(string $email, string $token): void
    {
        $url = config('app.url')."/reset-password?token={$token}&email={$email}";

        try {
            Mail::raw("Klik link berikut untuk mereset password Anda: {$url}", function ($message) use ($email): void {
                $message->to($email)->subject('Reset Password CafeNow');
            });
        } catch (RuntimeException $exception) {
            Log::warning('Gagal mengirim email reset password', ['email' => $email, 'error' => $exception->getMessage()]);
        }
    }

    public function generateResetToken(): string
    {
        return Str::random(64);
    }
}
