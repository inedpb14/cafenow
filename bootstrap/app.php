<?php

use App\Exceptions\BookingTimeWindowException;
use App\Exceptions\CafeNotActiveException;
use App\Exceptions\CancellationTimeExpiredException;
use App\Exceptions\InvalidCafeStatusTransitionException;
use App\Exceptions\SlotNotAvailableException;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\CheckDatabaseConnection;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\EnsureCafeApproved;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // ponytail: allow first-party web session auth on /api/* routes (admin/owner pages fetch /api/admin/*)
        $middleware->statefulApi();

        // ponytail: trust all proxies so ngrok/https requests get correct scheme+host
        $middleware->trustProxies(at: '*');

        $middleware->web(prepend: [
            CheckDatabaseConnection::class,
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => CheckRole::class,
            'admin' => AdminMiddleware::class,
            'cafe.approved' => EnsureCafeApproved::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->renderable(function (InvalidCafeStatusTransitionException $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'INVALID_STATUS_TRANSITION', 'message' => $e->getMessage()],
            ], 422);
        });

        $exceptions->renderable(function (CafeNotActiveException $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'CAFE_NOT_ACTIVE', 'message' => $e->getMessage() ?: 'Cafe tidak tersedia untuk pemesanan saat ini'],
            ], 422);
        });

        $exceptions->renderable(function (SlotNotAvailableException $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'SLOT_NOT_AVAILABLE', 'message' => $e->getMessage()],
            ], 409);
        });

        $exceptions->renderable(function (BookingTimeWindowException $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'BOOKING_TIME_WINDOW', 'message' => $e->getMessage()],
            ], 422);
        });

        $exceptions->renderable(function (CancellationTimeExpiredException $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'CANCELLATION_TIME_EXPIRED', 'message' => $e->getMessage()],
            ], 422);
        });
    })->create();
