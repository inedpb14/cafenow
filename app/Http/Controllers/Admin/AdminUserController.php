<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AdminAction;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\LogsAdminActions;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminUserController extends Controller
{
    use LogsAdminActions;

    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->filled('keyword')) {
            $query->where('name', 'like', "%{$request->keyword}%")
                ->orWhere('email', 'like', "%{$request->keyword}%");
        }
        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->paginate($request->integer('per_page', 50));

        return response()->json([
            'success' => true,
            'data' => $users->items(),
            'pagination' => $this->paginationMeta($users),
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->only(['name', 'email']);
        $before = $user->only(['name', 'email']);

        $user->update($data);

        $this->logAdminAction(
            $request,
            AdminAction::UpdateUser->value,
            'user',
            $user->id,
            $before,
            $user->only(['name', 'email']),
        );

        return response()->json(['success' => true, 'data' => $user]);
    }

    public function suspend(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'CANNOT_SELF_SUSPEND', 'message' => 'Tidak dapat menonaktifkan akun sendiri'],
            ], 422);
        }

        if ($user->hasRole(UserRole::Admin) && ! $user->is_suspended) {
            $activeAdmins = User::where('role', UserRole::Admin->value)
                ->where('is_suspended', false)
                ->count();

            if ($activeAdmins <= 1) {
                return response()->json([
                    'success' => false,
                    'error' => ['code' => 'LAST_ADMIN', 'message' => 'Tidak dapat menonaktifkan admin terakhir yang aktif'],
                ], 422);
            }
        }

        $user->update(['is_suspended' => true]);

        $this->logAdminAction(
            $request,
            AdminAction::SuspendUser->value,
            'user',
            $user->id,
            ['is_suspended' => false],
            ['is_suspended' => true],
        );

        return response()->json(['success' => true, 'message' => 'User suspended']);
    }

    public function unsuspend(Request $request, User $user): JsonResponse
    {
        $user->update(['is_suspended' => false]);

        $this->logAdminAction(
            $request,
            AdminAction::UnsuspendUser->value,
            'user',
            $user->id,
            ['is_suspended' => true],
            ['is_suspended' => false],
        );

        return response()->json(['success' => true, 'message' => 'User unsuspended']);
    }

    /**
     * @param \Illuminate\Contracts\Pagination\LengthAwarePaginator<int, mixed> $paginated
     * @return array{total: int, per_page: int, current_page: int, last_page: int}
     */
    private function paginationMeta(\Illuminate\Contracts\Pagination\LengthAwarePaginator $paginated): array
    {
        return [
            'total' => $paginated->total(),
            'per_page' => $paginated->perPage(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
        ];
    }
}
