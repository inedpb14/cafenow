<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class OwnerAuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $dto = $request->toDto();

        $user = User::create([
            'full_name' => $dto['full_name'],
            'name' => $dto['full_name'],
            'email' => $dto['email'],
            'phone' => $dto['phone'] ?? null,
            'password' => $dto['password'],
            'role' => UserRole::Owner,
            'email_verified_at' => now(),
        ]);

        $token = $user->createToken('owner-token', ['role:owner'])->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $token,
                'user' => new UserResource($user),
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

        if ($user->role !== UserRole::Owner) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'Akun ini bukan owner'],
            ], 403);
        }

        $token = $user->createToken('owner-token', ['role:owner'])->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $token,
                'user' => new UserResource($user),
            ],
        ]);
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $dto = $request->validated();

        try {
            Password::sendResetLink(['email' => $dto['email']]);
        } catch (\Throwable $e) {
            // ponytail: token sudah tersimpan di broker; gagal kirim email jangan jadi 500
            report($e);
        }

        return response()->json([
            'success' => true,
            'data' => ['message' => 'Jika email terdaftar, link reset akan dikirim'],
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
}
