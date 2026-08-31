<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AdminAuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $dto = $request->toDto();

        $user = User::where('email', $dto['email'])->first();

        if ($user === null || ! Hash::check($dto['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah'],
            ]);
        }

        if ($user->role !== UserRole::Admin) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'Akun ini bukan admin'],
            ], 403);
        }

        $token = $user->createToken('admin-token', ['role:admin'])->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $token,
                'user' => new UserResource($user),
            ],
        ]);
    }
}
