<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner;

use App\Enums\CafeApprovalStatus;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Cafe;
use App\Models\CafePhoto;
use App\Models\MenuItem;
use App\Models\MenuOrder;
use App\Models\Payment;
use App\Models\Table;
use App\Services\Cafe\CafeProfileInput;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class OwnerDashboardController extends Controller
{
    /**
     * Display the owner dashboard with real-time database metrics and data.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $cafe = $user->cafe;

        if (! $cafe) {
            return Inertia::render('owner/dashboard', [
                'cafe' => null,
                'metrics' => [
                    'revenueToday' => 'Rp 0',
                    'totalBookings' => 0,
                    'pendingCheckIns' => 0,
                    'totalOrders' => 0,
                ],
                'recentBookings' => [],
                'recentOrders' => [],
                'weeklyTrends' => $this->getEmptyWeeklyTrends(),
            ]);
        }

        $today = Carbon::today();

        // 1. Calculate Revenue Today (Gross payments minus 15% platform commission)
        $grossRevenueToday = Payment::whereHasMorph('payable', [Booking::class], fn ($q) => $q->where('cafe_id', $cafe->id))
            ->whereDate('created_at', $today)
            ->where('status', 'completed')
            ->sum('amount');

        $netRevenueToday = (float) $grossRevenueToday * 0.85;

        // 2. Booking Metrics Today
        $totalBookingsToday = Booking::where('cafe_id', $cafe->id)
            ->whereDate('booking_date', $today)
            ->count();

        $pendingCheckInsToday = Booking::where('cafe_id', $cafe->id)
            ->whereDate('booking_date', $today)
            ->whereIn('status', ['confirmed', 'scheduled'])
            ->whereNull('check_in_time')
            ->count();

        // 3. Menu Orders Today
        $totalOrdersToday = MenuOrder::whereHas('booking', fn ($q) => $q->where('cafe_id', $cafe->id))
            ->whereDate('created_at', $today)
            ->count();

        // 4. Recent Bookings (Latest 10 from Database)
        $recentBookings = Booking::with(['customer:id,name,email,phone', 'table:id,name,table_type,capacity'])
            ->where('cafe_id', $cafe->id)
            ->latest()
            ->take(10)
            ->get()
            ->map(function ($b) {
                return [
                    'id' => $b->booking_reference ?? 'BKG-'.$b->id,
                    'raw_id' => $b->id,
                    'customerName' => $b->customer->name ?? 'Tamu Cafe',
                    'customerPhone' => $b->customer->phone ?? '-',
                    'tableName' => $b->table->name ?? 'Meja Regular',
                    'timeSlot' => Carbon::parse($b->start_time)->format('H:i').' - '.Carbon::parse($b->end_time)->format('H:i').' WIB',
                    'guests' => $b->guest_count ?? 2,
                    'amount' => 'Rp '.number_format((float) ($b->total_price ?? 0), 0, ',', '.'),
                    'status' => $b->status,
                    'check_in_time' => $b->check_in_time,
                ];
            });

        // 5. Recent Menu Orders (Latest 10 from Database)
        $recentOrders = MenuOrder::with(['booking.customer:id,name', 'items.menuItem:id,name'])
            ->whereHas('booking', fn ($q) => $q->where('cafe_id', $cafe->id))
            ->latest()
            ->take(10)
            ->get()
            ->map(function ($o) {
                $itemsText = $o->items->map(fn ($item) => ($item->quantity ?? 1).'x '.($item->menuItem->name ?? 'Item'))->implode(', ');

                return [
                    'id' => $o->order_reference ?? 'ORD-'.$o->id,
                    'raw_id' => $o->id,
                    'bookingRef' => $o->booking->booking_reference ?? 'BKG-'.$o->booking_id,
                    'customerName' => $o->booking->customer->name ?? 'Tamu',
                    'orderType' => $o->order_type ?? 'pre_order',
                    'itemsSummary' => $itemsText ?: 'Item Pesanan',
                    'amount' => 'Rp '.number_format((float) ($o->total_price ?? 0), 0, ',', '.'),
                    'status' => $o->status,
                ];
            });

        // 6. 7-Day Revenue Trend Breakdown from Database
        $weeklyTrends = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $dayGross = Payment::whereHasMorph('payable', [Booking::class], fn ($q) => $q->where('cafe_id', $cafe->id))
                ->whereDate('created_at', $date)
                ->where('status', 'completed')
                ->sum('amount');
            $dayNet = (float) $dayGross * 0.85;

            $weeklyTrends[] = [
                'day' => $date->isoFormat('ddd'),
                'date' => $date->format('d/m'),
                'revenue' => $dayNet,
                'formatted' => 'Rp '.number_format($dayNet / 1000, 0).'K',
            ];
        }

        return Inertia::render('owner/dashboard', [
            'cafe' => [
                'id' => $cafe->id,
                'name' => $cafe->name,
                'address' => $cafe->address,
                'approval_status' => $cafe->approval_status,
            ],
            'metrics' => [
                'revenueToday' => 'Rp '.number_format($netRevenueToday, 0, ',', '.'),
                'totalBookings' => $totalBookingsToday,
                'pendingCheckIns' => $pendingCheckInsToday,
                'totalOrders' => $totalOrdersToday,
            ],
            'recentBookings' => $recentBookings,
            'recentOrders' => $recentOrders,
            'weeklyTrends' => $weeklyTrends,
        ]);
    }

    /**
     * Display Cafe Profile & Info page with DB data.
     */
    public function cafes(Request $request): Response
    {
        $user = $request->user();
        $cafe = $user->cafe;

        return Inertia::render('owner/cafes/index', [
            'cafe' => $cafe ? [
                'id' => $cafe->id,
                'name' => $cafe->name,
                'slug' => $cafe->slug ?? '',
                'address' => $cafe->address ?? '',
                'city' => $cafe->city ?? '',
                'phone' => $cafe->contact_whatsapp ?? '',
                'description' => $cafe->description ?? '',
                'facilities' => $cafe->facilities ?? [],
                'approval_status' => $cafe->approval_status ?? 'pending',
                'rejection_reason' => $cafe->rejection_reason,
                'submission_count' => $cafe->submission_count ?? 1,
                'photos' => $cafe->photos->map(fn ($p) => asset('storage/'.$p->photo_path))->values(),
                'operational_hours' => $cafe->operationalHoursList(),
            ] : null,
        ]);
    }

    /**
     * Display Tables & Surge Pricing page with DB data.
     */
    public function tables(Request $request): Response
    {
        $cafe = $request->user()->cafe;

        $tables = $cafe ? Table::where('cafe_id', $cafe->id)->get()->map(fn ($t) => [
            'id' => $t->id,
            'name' => $t->name,
            'type' => $t->table_type ?? 'regular',
            'capacity' => $t->capacity,
            'min_spend' => 'Rp '.number_format((float) ($t->min_spend ?? 0), 0, ',', '.'),
            'min_spend_raw' => (float) ($t->min_spend ?? 0),
            'is_active' => (bool) $t->is_active,
            'photo' => $t->photo ? asset('storage/'.$t->photo) : null,
        ]) : [];

        return Inertia::render('owner/cafes/tables', [
            'cafe' => $cafe ? ['id' => $cafe->id, 'name' => $cafe->name] : null,
            'tables' => $tables,
        ]);
    }

    /**
     * Display Kitchen Menu page with DB data.
     */
    public function menus(Request $request): Response
    {
        $cafe = $request->user()->cafe;

        $menus = $cafe ? MenuItem::where('cafe_id', $cafe->id)->get()->map(fn ($m) => [
            'id' => $m->id,
            'name' => $m->name,
            'category' => $m->category ?? 'Main',
            'price' => 'Rp '.number_format((float) ($m->price ?? 0), 0, ',', '.'),
            'price_raw' => (float) ($m->price ?? 0),
            'is_available' => $m->availability_status === 'available',
            'description' => $m->description ?? '',
            'photo' => $m->photo ? asset('storage/'.$m->photo) : null,
        ]) : [];

        return Inertia::render('owner/cafes/menus', [
            'cafe' => $cafe ? ['id' => $cafe->id, 'name' => $cafe->name] : null,
            'menus' => $menus,
        ]);
    }

    /**
     * Display Bookings Management page with DB data.
     */
    public function bookings(Request $request): Response
    {
        $cafe = $request->user()->cafe;

        $bookings = $cafe ? Booking::with(['customer:id,name,phone', 'table:id,name'])
            ->where('cafe_id', $cafe->id)
            ->latest()
            ->get()
            ->map(fn ($b) => [
                'id' => $b->booking_reference ?? 'BKG-'.$b->id,
                'raw_id' => $b->id,
                'customerName' => $b->customer->name ?? 'Tamu Cafe',
                'phone' => $b->customer->phone ?? '-',
                'tableName' => $b->table->name ?? 'Meja Regular',
                'date' => Carbon::parse($b->booking_date)->format('d/m/Y'),
                'timeSlot' => Carbon::parse($b->start_time)->format('H:i').' - '.Carbon::parse($b->end_time)->format('H:i').' WIB',
                'guests' => $b->guest_count ?? 2,
                'totalAmount' => 'Rp '.number_format((float) ($b->total_price ?? 0), 0, ',', '.'),
                'status' => $b->status,
                'paymentStatus' => $b->payment_status,
                'notes' => $b->customer_notes,
            ]) : [];

        return Inertia::render('owner/bookings', [
            'cafe' => $cafe ? ['id' => $cafe->id, 'name' => $cafe->name] : null,
            'bookings' => $bookings,
        ]);
    }

    /**
     * Display Kitchen Live Orders page with DB data.
     */
    public function orders(Request $request): Response
    {
        $cafe = $request->user()->cafe;

        $orders = $cafe ? MenuOrder::with(['booking.customer:id,name', 'booking.table:id,name', 'items.menuItem:id,name'])
            ->whereHas('booking', fn ($q) => $q->where('cafe_id', $cafe->id))
            ->latest()
            ->get()
            ->map(function ($o) {
                $itemsText = $o->items->map(fn ($item) => ($item->quantity ?? 1).'x '.($item->menuItem->name ?? 'Item'))->implode(', ');

                return [
                    'id' => $o->order_reference ?? 'ORD-'.$o->id,
                    'raw_id' => $o->id,
                    'bookingRef' => $o->booking->booking_reference ?? 'BKG-'.$o->booking_id,
                    'customerName' => $o->booking->customer->name ?? 'Tamu',
                    'tableName' => $o->booking->table->name ?? null,
                    'orderType' => $o->order_type ?? 'pre_order',
                    'itemsSummary' => $itemsText ?: 'Item Pesanan',
                    'amount' => 'Rp '.number_format((float) ($o->total_price ?? 0), 0, ',', '.'),
                    'status' => $o->status,
                    'paymentStatus' => $o->payment_status ?? 'unpaid',
                    'bookingStatus' => $o->booking->status ?? 'pending',
                ];
            }) : [];

        return Inertia::render('owner/orders', [
            'cafe' => $cafe ? ['id' => $cafe->id, 'name' => $cafe->name] : null,
            'orders' => $orders,
        ]);
    }

    /**
     * Display Business Analytics page with DB data.
     */
    public function analytics(Request $request): Response
    {
        $cafe = $request->user()->cafe;

        if (! $cafe) {
            return Inertia::render('owner/analytics', [
                'cafe' => null,
                'totalRevenue' => 'Rp 0',
                'completedBookings' => 0,
                'totalCustomers' => 0,
                'weeklyData' => [],
            ]);
        }

        $grossRevenue = Payment::whereHasMorph('payable', [Booking::class], fn ($q) => $q->where('cafe_id', $cafe->id))
            ->where('status', 'completed')
            ->sum('amount');

        $netRevenue = (float) $grossRevenue * 0.85;

        $completedBookings = Booking::where('cafe_id', $cafe->id)->where('status', 'completed')->count();
        $totalCustomers = Booking::where('cafe_id', $cafe->id)->distinct('customer_id')->count('customer_id');

        $weeklyData = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $dayGross = Payment::whereHasMorph('payable', [Booking::class], fn ($q) => $q->where('cafe_id', $cafe->id))
                ->whereDate('created_at', $date)
                ->where('status', 'completed')
                ->sum('amount');

            $weeklyData[] = [
                'day' => $date->isoFormat('ddd'),
                'date' => $date->format('d/m'),
                'revenue' => (float) $dayGross * 0.85,
                'formatted' => 'Rp '.number_format(((float) $dayGross * 0.85) / 1000, 0).'K',
            ];
        }

        return Inertia::render('owner/analytics', [
            'cafe' => ['id' => $cafe->id, 'name' => $cafe->name],
            'totalRevenue' => 'Rp '.number_format($netRevenue, 0, ',', '.'),
            'completedBookings' => $completedBookings,
            'totalCustomers' => $totalCustomers,
            'weeklyData' => $weeklyData,
        ]);
    }

    /**
     * Balikkan string terformat ("50.000" / "50000") menjadi angka murni untuk DB.
     */
    private function parseRupiahToInt(string $input): int
    {
        $bersih = preg_replace('/[^0-9.]/', '', $input);
        $angkaFinal = str_replace('.', '', $bersih);

        if (! is_numeric($angkaFinal)) {
            throw new InvalidArgumentException('Format tidak valid.');
        }

        return (int) $angkaFinal;
    }

    /**
     * @return array<int, array{day: string, date: string, revenue: int, formatted: string}>
     */
    private function getEmptyWeeklyTrends(): array
    {
        $weeklyTrends = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $weeklyTrends[] = [
                'day' => $date->isoFormat('ddd'),
                'date' => $date->format('d/m'),
                'revenue' => 0,
                'formatted' => 'Rp 0K',
            ];
        }

        return $weeklyTrends;
    }

    /**
     * Check-in customer at location.
     */
    public function checkIn(Request $request, Booking $booking): RedirectResponse
    {
        $cafe = $request->user()->cafe;

        if (! $cafe || $booking->cafe_id !== $cafe->id) {
            abort(403, 'Akses tidak diizinkan untuk booking ini.');
        }

        $booking->update([
            'status' => 'checked_in',
            'check_in_time' => now(),
        ]);

        MenuOrder::where('booking_id', $booking->id)
            ->where('status', 'scheduled')
            ->update(['status' => 'preparing']);

        return back()->with('success', 'Pelanggan berhasil check-in di lokasi.');
    }

    /**
     * Mark booking as completed.
     */
    public function completeBooking(Request $request, Booking $booking): RedirectResponse
    {
        $cafe = $request->user()->cafe;

        if (! $cafe || $booking->cafe_id !== $cafe->id) {
            abort(403, 'Akses tidak diizinkan untuk booking ini.');
        }

        $booking->update([
            'status' => 'completed',
            'check_out_time' => now(),
        ]);

        return back()->with('success', 'Reservasi meja telah diselesaikan.');
    }

    /**
     * Update status for kitchen menu orders.
     */
    public function updateOrderStatus(Request $request, MenuOrder $order): RedirectResponse
    {
        $cafe = $request->user()->cafe;

        if (! $cafe || $order->booking->cafe_id !== $cafe->id) {
            abort(403, 'Akses tidak diizinkan untuk pesanan ini.');
        }

        $validated = $request->validate([
            'status' => ['required', 'in:preparing,ready,completed,cancelled'],
        ]);

        $order->update([
            'status' => $validated['status'],
        ]);

        return back()->with('success', 'Status pesanan dapur berhasil diperbarui.');
    }

    // =========================================================
    // CAFE CRUD
    // =========================================================

    /**
     * Store a new cafe profile for the owner.
     */
    public function storeCafe(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->cafe) {
            return back()->with('error', 'Anda sudah memiliki profil cafe.');
        }

        $validated = $request->validate(CafeProfileInput::rules());

        Cafe::create([
            'owner_id' => $user->id,
            'name' => $validated['name'],
            'address' => $validated['address'],
            'city' => $validated['city'],
            'contact_whatsapp' => $validated['phone'] ?? null,
            'description' => $validated['description'] ?? null,
            'approval_status' => CafeApprovalStatus::Pending->value,
        ]);

        return redirect()->route('owner.cafes.index')->with('success', 'Profil cafe berhasil didaftarkan! Menunggu persetujuan admin.');
    }

    /**
     * Update existing cafe profile.
     */
    public function updateCafe(Request $request, Cafe $cafe): RedirectResponse
    {
        $user = $request->user();

        if ($cafe->owner_id !== $user->id) {
            abort(403, 'Akses tidak diizinkan.');
        }

        if (! $cafe->isContentEditable()) {
            return back()->with('error', 'Cafe tidak dapat diubah pada status saat ini.');
        }

        $validated = $request->validate(CafeProfileInput::rules());

        $cafe->update([
            'name' => $validated['name'],
            'address' => $validated['address'],
            'city' => $validated['city'],
            'contact_whatsapp' => $validated['phone'] ?? null,
            'description' => $validated['description'] ?? null,
        ]);

        // Auto-reset: jika cafe sebelumnya ditolak, kembalikan ke pending
        if ($cafe->approval_status === 'rejected') {
            $cafe->transitionTo(CafeApprovalStatus::Pending);
            $cafe->update([
                'rejection_reason' => null,
                'submission_count' => ($cafe->submission_count ?? 1) + 1,
            ]);

            return redirect()->route('owner.cafes.index')->with('success', 'Perubahan disimpan! Cafe telah diajukan ulang dan menunggu persetujuan admin.');
        }

        return redirect()->route('owner.cafes.index')->with('success', 'Profil cafe berhasil diperbarui.');
    }

    /**
     * Save cafe operational hours (map format: { mon: [{open, close}] }).
     */
    public function saveHours(Request $request, Cafe $cafe): RedirectResponse
    {
        if ($cafe->owner_id !== $request->user()->id) {
            abort(403, 'Akses tidak diizinkan.');
        }

        if (! $cafe->isContentEditable()) {
            return back()->with('error', 'Cafe tidak dapat diubah pada status saat ini.');
        }

        $request->validate([
            'hours' => ['required', 'array'],
            'hours.*' => ['array'],
            'hours.*.*.open' => ['required', 'date_format:H:i'],
            'hours.*.*.close' => ['required', 'date_format:H:i', 'after:hours.*.*.open'],
        ]);

        $cafe->update(['operational_hours' => $request->input('hours')]);

        return back()->with('success', 'Jam operasional berhasil disimpan.');
    }

    /**
     * Upload cafe profile photos (max 5 MB each, jpg/jpeg/png/webp).
     */
    public function uploadCafePhotos(Request $request, Cafe $cafe): RedirectResponse
    {
        if ($cafe->owner_id !== $request->user()->id) {
            abort(403, 'Akses tidak diizinkan.');
        }

        if (! $cafe->isContentEditable()) {
            return back()->with('error', 'Cafe tidak dapat diubah pada status saat ini.');
        }

        $request->validate([
            'photos' => ['required', 'array'],
            'photos.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        foreach ($request->file('photos') as $photo) {
            $path = $photo->store('cafe-photos', 'public');

            $cafePhoto = CafePhoto::create([
                'cafe_id' => $cafe->id,
                'photo_path' => $path,
                'display_order' => $cafe->photos()->count() + 1,
            ]);

            if ($cafe->photos()->count() === 1) {
                $cafePhoto->update(['display_order' => 0]);
            }
        }

        return back()->with('success', 'Foto cafe berhasil diunggah.');
    }

    // =========================================================
    // TABLE CRUD
    // =========================================================

    /**
     * Store a new table for the cafe.
     */
    public function storeTable(Request $request): RedirectResponse
    {
        $cafe = $request->user()->cafe;

        if (! $cafe) {
            return back()->with('error', 'Lengkapi profil cafe terlebih dahulu.');
        }

        if (! $cafe->isContentEditable()) {
            return back()->with('error', 'Cafe belum aktif. Meja hanya dapat dikelola setelah cafe disetujui.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', 'string', 'max:100'],
            'capacity' => ['required', 'integer', 'min:1', 'max:50'],
            'min_spend' => ['required', 'regex:/^[0-9.]+$/'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $data = [
            'cafe_id' => $cafe->id,
            'name' => $validated['name'],
            'table_type' => $validated['type'],
            'capacity' => (int) $validated['capacity'],
            'min_spend' => $this->parseRupiahToInt($validated['min_spend']),
            'is_active' => true,
        ];

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('tables', 'public');
            $data['photo'] = $path;
        }

        Table::create($data);

        return redirect()->route('owner.cafes.tables')->with('success', 'Meja baru berhasil ditambahkan.');
    }

    /**
     * Update an existing table.
     */
    public function updateTable(Request $request, Table $table): RedirectResponse
    {
        $cafe = $request->user()->cafe;

        if (! $cafe || $table->cafe_id !== $cafe->id) {
            abort(403, 'Akses tidak diizinkan.');
        }

        if (! $cafe->isContentEditable()) {
            return back()->with('error', 'Cafe belum aktif. Meja hanya dapat dikelola setelah cafe disetujui.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', 'string', 'max:100'],
            'capacity' => ['required', 'integer', 'min:1', 'max:50'],
            'min_spend' => ['required', 'regex:/^[0-9.]+$/'],
            'is_active' => ['nullable'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $data = [
            'name' => $validated['name'],
            'table_type' => $validated['type'],
            'capacity' => (int) $validated['capacity'],
            'min_spend' => $this->parseRupiahToInt($validated['min_spend']),
            'is_active' => isset($validated['is_active']) ? (bool) $validated['is_active'] : $table->is_active,
        ];

        if ($request->hasFile('photo')) {
            // Hapus foto lama jika ada
            if ($table->photo) {
                Storage::disk('public')->delete($table->photo);
            }
            $data['photo'] = $request->file('photo')->store('tables', 'public');
        }

        $table->update($data);

        return redirect()->route('owner.cafes.tables')->with('success', 'Data meja berhasil diperbarui.');
    }

    /**
     * Delete a table.
     */
    public function destroyTable(Request $request, Table $table): RedirectResponse
    {
        $cafe = $request->user()->cafe;

        if (! $cafe || $table->cafe_id !== $cafe->id) {
            abort(403, 'Akses tidak diizinkan.');
        }

        if (! $cafe->isContentEditable()) {
            return back()->with('error', 'Cafe belum aktif. Meja hanya dapat dikelola setelah cafe disetujui.');
        }

        $table->delete();

        return redirect()->route('owner.cafes.tables')->with('success', 'Meja berhasil dihapus.');
    }

    // =========================================================
    // MENU CRUD
    // =========================================================

    /**
     * Store a new menu item.
     */
    public function storeMenu(Request $request): RedirectResponse
    {
        $cafe = $request->user()->cafe;

        if (! $cafe) {
            return back()->with('error', 'Lengkapi profil cafe terlebih dahulu.');
        }

        if (! $cafe->isContentEditable()) {
            return back()->with('error', 'Cafe belum aktif. Menu hanya dapat dikelola setelah cafe disetujui.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'max:50'],
            'price' => ['required', 'regex:/^[0-9.]+$/'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_available' => ['nullable'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $data = [
            'cafe_id' => $cafe->id,
            'name' => $validated['name'],
            'category' => $validated['category'],
            'price' => $this->parseRupiahToInt($validated['price']),
            'description' => $validated['description'] ?? null,
            'availability_status' => (! isset($validated['is_available']) || $validated['is_available']) ? 'available' : 'out_of_stock',
        ];

        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('menu-photos', 'public');
        }

        MenuItem::create($data);

        return redirect()->route('owner.cafes.menus')->with('success', 'Menu baru berhasil ditambahkan.');
    }

    /**
     * Update an existing menu item.
     */
    public function updateMenu(Request $request, MenuItem $menu): RedirectResponse
    {
        $cafe = $request->user()->cafe;

        if (! $cafe || $menu->cafe_id !== $cafe->id) {
            abort(403, 'Akses tidak diizinkan.');
        }

        if (! $cafe->isContentEditable()) {
            return back()->with('error', 'Cafe belum aktif. Menu hanya dapat dikelola setelah cafe disetujui.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'max:50'],
            'price' => ['required', 'regex:/^[0-9.]+$/'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_available' => ['nullable'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $data = [
            'name' => $validated['name'],
            'category' => $validated['category'],
            'price' => $this->parseRupiahToInt($validated['price']),
            'description' => $validated['description'] ?? null,
            'availability_status' => (! isset($validated['is_available']) || $validated['is_available']) ? 'available' : 'out_of_stock',
        ];

        if ($request->hasFile('photo')) {
            if ($menu->photo) {
                Storage::disk('public')->delete($menu->photo);
            }
            $data['photo'] = $request->file('photo')->store('menu-photos', 'public');
        }

        $menu->update($data);

        return redirect()->route('owner.cafes.menus')->with('success', 'Menu berhasil diperbarui.');
    }

    /**
     * Delete a menu item.
     */
    public function destroyMenu(Request $request, MenuItem $menu): RedirectResponse
    {
        $cafe = $request->user()->cafe;

        if (! $cafe || $menu->cafe_id !== $cafe->id) {
            abort(403, 'Akses tidak diizinkan.');
        }

        if (! $cafe->isContentEditable()) {
            return back()->with('error', 'Cafe belum aktif. Menu hanya dapat dikelola setelah cafe disetujui.');
        }

        if ($menu->photo) {
            Storage::disk('public')->delete($menu->photo);
        }

        $menu->delete();

        return redirect()->route('owner.cafes.menus')->with('success', 'Menu berhasil dihapus.');
    }
}
