<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResendOtpRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Auth\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;

class CustomerAuthController extends Controller
{
    public function __construct(
        private readonly OtpService $otpService,
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $dto = $request->toDto();

        $user = User::create([
            'full_name' => $dto['full_name'],
            'name' => $dto['full_name'],
            'email' => $dto['email'],
            'phone' => $dto['phone'] ?? null,
            'date_of_birth' => $dto['date_of_birth'] ?? null,
            'password' => $dto['password'],
            'role' => UserRole::Customer,
            // ponytail: email verification disabled for now; re-enable OTP flow later
            'email_verified_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'user_id' => $user->id,
                'email' => $user->email,
                'message' => 'Registrasi berhasil. Silakan masuk dengan akun Anda.',
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $dto = $request->toDto();

        $user = User::where('email', $dto['email'])->first();

        if ($user === null || ! Hash::check($dto['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah'],
            ]);
        }

        $token = $user->createToken('customer-token', ['role:customer'])->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $token,
                'user' => new UserResource($user),
            ],
        ]);
    }

    public function socialLogin(Request $request): JsonResponse
    {
        $request->validate([
            'provider' => ['required', 'string', 'in:google,apple'],
            'access_token' => ['required', 'string'],
        ]);

        try {
            $driver = Socialite::driver((string) $request->string('provider'));
            /** @var \Laravel\Socialite\Two\AbstractProvider $driver */
            $socialUser = $driver->userFromToken((string) $request->string('access_token'));
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'SOCIAL_AUTH_FAILED', 'message' => 'Token sosial tidak valid'],
            ], 401);
        }

        $email = $socialUser->getEmail();
        if ($email === null) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'EMAIL_REQUIRED', 'message' => 'Email diperlukan untuk login sosial'],
            ], 422);
        }

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'full_name' => $socialUser->getName() ?? explode('@', $email)[0],
                'name' => $socialUser->getName() ?? explode('@', $email)[0],
                'role' => UserRole::Customer,
                'email_verified_at' => now(),
                'password' => bcrypt(Str::random(32)),
            ]
        );

        $token = $user->createToken('customer-token', ['role:customer'])->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $token,
                'user' => new UserResource($user),
            ],
        ]);
    }

    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        $dto = $request->validated();

        if ($this->otpService->validate($dto['email'], $dto['otp'], 'email') === false) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'INVALID_OTP', 'message' => 'Kode OTP tidak valid atau sudah kadaluarsa'],
            ], 422);
        }

        $user = User::where('email', $dto['email'])->firstOrFail();
        $user->update(['email_verified_at' => now()]);

        $token = $user->createToken('customer-token', ['role:customer'])->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $token,
                'user' => new UserResource($user),
            ],
        ]);
    }

    public function resendOtp(ResendOtpRequest $request): JsonResponse
    {
        $dto = $request->validated();

        $user = User::where('email', $dto['email'])->first();

        if ($user === null) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Email tidak ditemukan'],
            ], 404);
        }

        if ($this->otpService->canResend($user->email) === false) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'TOO_MANY_REQUESTS', 'message' => 'Silakan tunggu 1 menit sebelum mengirim ulang'],
            ], 429);
        }

        $otp = $this->otpService->generate($user->email);
        $this->otpService->sendEmailOtp($user->email, $otp);

        return response()->json([
            'success' => true,
            'data' => ['message' => 'OTP telah dikirim ulang'],
        ]);
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $dto = $request->validated();

        try {
            $status = Password::sendResetLink(['email' => $dto['email']]);
        } catch (\Throwable $e) {
            // ponytail: token sudah tersimpan di broker; gagal kirim email jangan jadi 500
            report($e);
            $status = Password::RESET_LINK_SENT;
        }

        return response()->json([
            'success' => true,
            'data' => ['message' => $status === Password::RESET_LINK_SENT
                ? 'Link reset password telah dikirim'
                : 'Jika email terdaftar, link reset akan dikirim'],
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $dto = $request->validated();

        $status = Password::reset(
            ['email' => $dto['email'], 'password' => $dto['password'], 'token' => $dto['token']],
            function (User $user, string $password): void {
                $user->forceFill(['password' => $password])->save();
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'INVALID_TOKEN', 'message' => 'Token tidak valid atau sudah kadaluarsa'],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'data' => ['message' => 'Password berhasil direset'],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'data' => ['message' => 'Logout berhasil'],
        ]);
    }

    public function refreshToken(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        $token = $request->user()->createToken('customer-token', ['role:customer'])->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => ['token' => $token],
        ]);
    }
}
