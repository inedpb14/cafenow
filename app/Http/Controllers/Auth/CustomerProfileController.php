<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ProfileUpdateRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CustomerProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new UserResource($request->user()),
        ]);
    }

    public function update(ProfileUpdateRequest $request): JsonResponse
    {
        $user = $request->user();
        $dto = $request->toDto();

        $user->fill($dto);

        // ponytail: email verification disabled; changing email no longer resets verified status
        if (($dto['profile_pic'] ?? null) !== null) {
            if ($user->profile_pic !== null) {
                Storage::delete($user->profile_pic);
            }

            $user->profile_pic = $dto['profile_pic']->store('profile-pics', 'public');
        }

        $user->save();

        return response()->json([
            'success' => true,
            'data' => new UserResource($user),
        ]);
    }
}
