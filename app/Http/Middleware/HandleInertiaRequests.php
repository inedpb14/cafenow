<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        // ponytail: multi-cafe rule — gate opens if ANY cafe is active/approved
        $cafeStatus = null;
        if ($user?->role === UserRole::Owner) {
            $statuses = $user->cafes()->orderBy('id')->pluck('approval_status');
            $cafeStatus = $statuses->contains(fn ($s) => in_array($s, ['active', 'approved'], true))
                ? 'active'
                : $statuses->first();
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
            ],
            'flash' => [
                'booking_success' => session('booking_success'),
                'booking_reference' => session('booking_reference'),
                'payment_url' => session('payment_url'),
                'error' => session('error'),
                'success' => session('success'),
            ],
            'cafe_status' => $cafeStatus,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
