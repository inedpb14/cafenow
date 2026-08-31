<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\UserRole;
use App\Models\Cafe;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

readonly class EnsureCafeApproved
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if (! $user || $user->role !== UserRole::Owner) {
            abort(403, 'Tidak memiliki akses');
        }

        // ponytail: gate unlocks when owner has at least ONE active/approved cafe
        $hasActiveCafe = Cafe::where('owner_id', $user->id)
            ->whereIn('approval_status', ['active', 'approved'])
            ->exists();

        if (! $hasActiveCafe) {
            return redirect()->route('owner.cafes.index')
                ->with('error', 'Cafe Anda belum disetujui. Lengkapi dan ajukan cafe untuk mengakses fitur ini.');
        }

        return $next($request);
    }
}
