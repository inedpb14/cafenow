<?php

namespace App\Providers;

use App\Events\BookingCancelled;
use App\Events\BookingCheckIn;
use App\Events\BookingConfirmed;
use App\Events\BookingExtended;
use App\Events\BookingRescheduled;
use App\Events\OrderPlaced;
use App\Events\PaymentReceived;
use App\Listeners\SendBookingCancelledNotification;
use App\Listeners\SendBookingCheckInNotification;
use App\Listeners\SendBookingConfirmedNotification;
use App\Listeners\SendBookingExtendedNotification;
use App\Listeners\SendBookingRescheduledNotification;
use App\Listeners\SendOrderPlacedNotification;
use App\Listeners\SendPaymentReceivedNotification;
use App\Models\Booking;
use App\Models\MenuOrder;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Relation::morphMap([
            'booking' => Booking::class,
            'menu_order' => MenuOrder::class,
        ]);

        $this->configureDefaults();
        $this->configureRateLimiting();
        $this->registerSqliteMathFunctions();
        $this->registerEventListeners();
    }

    /**
     * Register event→listener mappings.
     */
    private function registerEventListeners(): void
    {
        Event::listen(BookingConfirmed::class, SendBookingConfirmedNotification::class);
        Event::listen(BookingCancelled::class, SendBookingCancelledNotification::class);
        Event::listen(BookingRescheduled::class, SendBookingRescheduledNotification::class);
        Event::listen(BookingExtended::class, SendBookingExtendedNotification::class);
        Event::listen(BookingCheckIn::class, SendBookingCheckInNotification::class);
        Event::listen(PaymentReceived::class, SendPaymentReceivedNotification::class);
        Event::listen(OrderPlaced::class, SendOrderPlacedNotification::class);
    }

    /**
     * Register math functions for SQLite (acos, cos, radians, sin).
     */
    private function registerSqliteMathFunctions(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            return;
        }

        $pdo = DB::connection()->getPdo();

        $pdo->sqliteCreateFunction('radians', fn ($deg) => deg2rad($deg));
        $pdo->sqliteCreateFunction('degrees', fn ($rad) => rad2deg($rad));
        $pdo->sqliteCreateFunction('acos', fn ($v) => acos($v));
        $pdo->sqliteCreateFunction('cos', fn ($v) => cos($v));
        $pdo->sqliteCreateFunction('sin', fn ($v) => sin($v));
        $pdo->sqliteCreateFunction('asin', fn ($v) => asin($v));
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    /**
     * Configure rate limiting for API endpoints.
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(5)->by($request->ip()),
        );

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)->by($request->user()->id ?? $request->ip()),
        );

        RateLimiter::for('orders', fn (Request $request) => Limit::perMinute(30)->by($request->user()->id ?? $request->ip()),
        );
    }
}
