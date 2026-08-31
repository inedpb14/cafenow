<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class CheckDatabaseConnection
{
    /**
     * Render the maintenance page when the database is unreachable,
     * without leaking the raw connection error to the user.
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            DB::connection()->getPdo();
        } catch (Throwable) {
            return response()->view('maintenance', [], 503);
        }

        return $next($request);
    }
}
