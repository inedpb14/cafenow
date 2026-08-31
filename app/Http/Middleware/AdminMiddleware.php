<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! auth()->check() || auth()->user()->role !== UserRole::Admin) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized',
                'code' => 'UNAUTHORIZED',
            ], 403);
        }

        return $next($request);
    }
}
