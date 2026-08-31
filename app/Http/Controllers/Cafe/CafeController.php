<?php

declare(strict_types=1);

namespace App\Http\Controllers\Cafe;

use App\Http\Controllers\Controller;
use App\Http\Resources\CafeResource;
use App\Models\Cafe;
use App\Models\MenuItem;
use App\Models\SearchHistory;
use App\Models\Table;
use App\Services\Booking\AvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CafeController extends Controller
{
    public function __construct(
        private readonly AvailabilityService $availabilityService,
    ) {}

    public function publicList(Request $request): AnonymousResourceCollection
    {
        $query = Cafe::whereIn('approval_status', ['approved', 'active'])
            ->with(['photos', 'tables']);

        if ($request->filled('query')) {
            $q = $request->string('query');
            $query->where(function ($qry) use ($q): void {
                $qry->where('name', 'LIKE', "%{$q}%")
                    ->orWhere('city', 'LIKE', "%{$q}%")
                    ->orWhere('address', 'LIKE', "%{$q}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->string('category'));
        }

        $perPage = $request->integer('per_page', 6);
        $cafes = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return CafeResource::collection($cafes);
    }

    /**
     * Booking wizard page with cafe tables + menus passed as props.
     */
    public function bookPage(Request $request, Cafe $cafe): Response
    {
        if (! $cafe->isActive()) {
            abort(404);
        }

        $cafe->load(['tables.bookingRule', 'menuItems']);

        $tables = $cafe->tables
            ->filter(fn (Table $t) => $t->bookingRule !== null)
            ->values()
            ->map(fn (Table $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'capacity' => $t->capacity,
                'location' => $t->table_type ?? 'Meja Utama',
                'price' => $t->bookingRule->rule_type === 'fixed'
                    ? (float) $t->bookingRule->price
                    : (float) $t->bookingRule->base_price_per_hour * (($t->bookingRule->min_duration_minutes ?? 120) / 60),
                'ruleId' => $t->bookingRule->id,
                'duration' => $t->bookingRule->rule_type === 'fixed'
                    ? (int) ($t->bookingRule->duration_minutes ?? 120)
                    : (int) ($t->bookingRule->min_duration_minutes ?? 120),
            ]);

        $menus = $cafe->menuItems->map(fn (MenuItem $m) => [
            'id' => $m->id,
            'name' => $m->name,
            'category' => $m->category ?? 'Menu',
            'price' => (int) $m->price,
            'image' => $m->photo ? asset('storage/'.$m->photo) : null,
        ]);

        return Inertia::render('cafes/book', [
            'id' => $cafe->id,
            'cafe' => [
                'name' => $cafe->name,
                'address' => $cafe->city ?: $cafe->address,
            ],
            'tables' => $tables,
            'menus' => $menus,
        ]);
    }

    /**
     * Welcome landing page connected to database records.
     */
    public function welcome(Request $request): Response
    {
        $cafesQuery = Cafe::whereIn('approval_status', ['approved', 'active'])
            ->withCount('bookings')
            ->with(['photos', 'tables', 'menuItems'])
            ->take(8)
            ->get();

        $cafes = $cafesQuery->map(function ($c) {
            $minPrice = $c->tables->min('min_spend') ?? 0;
            $primaryPhoto = $c->photos->first()?->photo_path
                ? asset('storage/'.$c->photos->first()->photo_path)
                : 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80';

            return [
                'id' => $c->id,
                'name' => $c->name,
                'location' => $c->address ?: ($c->city ?: '-'),
                'category' => strtolower($c->category ?? 'coffee'),
                'priceStarting' => 'Rp '.number_format((float) $minPrice, 0, ',', '.'),
                'rating' => null,
                'bookingsCount' => $c->bookings_count ?? 0,
                'image' => $primaryPhoto,
                'facilities' => $c->facilities ?? [],
                'badge' => $c->approval_status === 'approved' || $c->approval_status === 'active' ? 'Mitra Terverifikasi' : 'Baru Bergabung',
                'description' => $c->description ?: 'Suasana cafe pilihan dengan fasilitas lengkap dan kenyamanan tempat reservasi meja.',
            ];
        });

        $menuItems = MenuItem::whereHas('cafe', fn ($q) => $q->whereIn('approval_status', ['approved', 'active']))
            ->latest()
            ->take(6)
            ->get()
            ->map(fn ($m) => [
                'name' => $m->name,
                'category' => $m->category ?? 'Menu Spesial',
                'price' => 'Rp '.number_format((float) ($m->price ?? 0), 0, ',', '.'),
                'image' => $m->photo ? asset('storage/'.$m->photo) : 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80',
                'desc' => $m->description ?: 'Hidangan lezat disajikan segar sesuai pesanan Anda.',
            ]);

        $stats = [
            'cafesCount' => Cafe::count(),
            'bookingsCount' => DB::table('bookings')->count(),
            'customersCount' => DB::table('users')->where('role', 'customer')->count(),
        ];

        return Inertia::render('welcome', [
            'cafes' => $cafes,
            'menuItems' => $menuItems,
            'stats' => $stats,
        ]);
    }

    public function index(Request $request): Response
    {
        $query = Cafe::active()->withCount('bookings');

        if ($request->filled('query')) {
            $q = $request->string('query');
            $query->where(function ($qry) use ($q): void {
                $qry->where('name', 'LIKE', "%{$q}%")
                    ->orWhere('city', 'LIKE', "%{$q}%")
                    ->orWhere('address', 'LIKE', "%{$q}%");
            });

            if (Auth::check()) {
                SearchHistory::updateOrCreate(
                    ['customer_id' => Auth::id(), 'query' => $q],
                    ['viewed_at' => now()],
                );
            }
        }

        if ($request->filled('city')) {
            $query->where('city', $request->string('city'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->string('category'));
        }

        if ($request->filled('lat')) {
            $request->validate(['lat' => ['numeric', 'between:-90,90']]);
        }
        if ($request->filled('lng')) {
            $request->validate(['lng' => ['numeric', 'between:-180,180']]);
        }

        $now = now();
        $query->leftJoin('featured_cafes', function ($join) use ($now): void {
            $join->on('cafes.id', '=', 'featured_cafes.cafe_id')
                ->where('featured_cafes.active_from', '<=', $now)
                ->where(function ($q) use ($now): void {
                    $q->where('featured_cafes.active_to', '>=', $now)
                        ->orWhereNull('featured_cafes.active_to');
                });
        });

        if ($request->filled('lat') && $request->filled('lng')) {
            $lat = (float) (string) $request->string('lat');
            $lng = (float) (string) $request->string('lng');
            $radius = (float) (string) $request->string('radius', '25');

            $haversine = '(6371 * acos(cos(radians(?)) * cos(radians(cafes.latitude)) * cos(radians(cafes.longitude) - radians(?)) + sin(radians(?)) * sin(radians(cafes.latitude))))';

            $query->selectRaw("cafes.*, {$haversine} AS distance", [$lat, $lng, $lat])
                ->havingRaw('distance <= ?', [$radius])
                ->orderBy('distance');
        } else {
            $query->select('cafes.*');
        }

        $query->orderByRaw('COALESCE(featured_cafes.display_order, 999999)')
            ->orderBy('cafes.created_at', 'desc');

        $perPage = $request->integer('per_page', 15);
        $cafes = $query->paginate($perPage);

        return Inertia::render('cafes/index', [
            'cafes' => CafeResource::collection($cafes),
            'filters' => $request->only(['query', 'city', 'category']),
        ]);
    }

    public function show(Request $request, Cafe $cafe): JsonResponse|Response
    {
        if ($cafe->approval_status !== 'active' && $cafe->approval_status !== 'approved') {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'error' => ['code' => 'NOT_FOUND', 'message' => 'Cafe tidak ditemukan'],
                ], 404);
            }
            abort(404);
        }

        $cafe->load(['photos', 'tables' => fn ($q) => $q->active(), 'menuItems']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'data' => new CafeResource($cafe),
            ]);
        }

        return Inertia::render('cafes/detail', [
            'cafe' => array_merge(
                (new CafeResource($cafe))->resolve(),
                [
                    'photos' => $cafe->photos->map(fn ($p) => asset('storage/'.$p->photo_path)),
                    'menu_items' => $cafe->menuItems,
                    'tables' => $cafe->tables->map(fn ($t) => [
                        'id' => $t->id,
                        'name' => $t->name,
                        'table_type' => $t->table_type ?? 'regular',
                        'capacity' => $t->capacity,
                        'min_spend' => (float) ($t->min_spend ?? 0),
                        'photo' => $t->photo ? asset('storage/'.$t->photo) : null,
                    ]),
                ]
            ),
        ]);
    }

    public function availability(Request $request, Cafe $cafe): JsonResponse
    {
        $request->validate([
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'guests' => ['sometimes', 'integer', 'min:1'],
        ]);

        $date = $request->string('date')->toString();
        $blackoutDates = $cafe->blackout_dates ?? [];

        if (in_array($date, $blackoutDates, true)) {
            return response()->json([
                'success' => true,
                'data' => [
                    'date' => $date,
                    'tables' => [],
                    'message' => 'Cafe tutup pada tanggal ini',
                ],
            ]);
        }

        $tablesQuery = $cafe->tables()->active()->with('bookingRule');

        if ($request->filled('guests')) {
            $tablesQuery->where('capacity', '>=', $request->integer('guests'));
        }

        $tables = $tablesQuery->get();

        $result = $tables->map(fn (Table $table) => [
            'id' => $table->id,
            'name' => $table->name,
            'capacity' => $table->capacity,
            'type' => $table->table_type,
            'available_slots' => $this->availabilityService->getSlots($table->id, $date, $cafe->id, $cafe->operational_hours),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $date,
                'tables' => $result,
            ],
        ]);
    }
}
