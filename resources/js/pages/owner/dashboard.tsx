import OwnerLayout from '@/components/Owner/OwnerLayout';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { 
    Calendar, 
    Clock, 
    ShoppingBag, 
    TrendingUp, 
    Store, 
    Utensils, 
    Layers, 
    CheckCircle2, 
    UserCheck, 
    Plus, 
    ChefHat,
    BarChart3,
    Edit3,
    AlertCircle,
    Inbox
} from 'lucide-react';

interface BookingItem {
    id: string;
    raw_id?: number | string;
    customerName: string;
    tableName: string;
    timeSlot: string;
    guests: number;
    amount: string;
    status: 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
}

interface OrderItem {
    id: string;
    raw_id?: number | string;
    bookingRef: string;
    customerName: string;
    orderType: 'pre_order' | 'additional';
    itemsSummary: string;
    amount: string;
    status: 'scheduled' | 'preparing' | 'ready' | 'completed';
}

interface OwnerDashboardProps {
    cafe?: { id: number; name: string; address?: string; approval_status?: string } | null;
    metrics?: {
        revenueToday: string;
        totalBookings: number;
        pendingCheckIns: number;
        totalOrders: number;
    };
    recentBookings?: BookingItem[];
    recentOrders?: OrderItem[];
    weeklyTrends?: { day: string; date: string; revenue: number; formatted: string }[];
}

export default function OwnerDashboard(props: OwnerDashboardProps) {
    usePage().props;

    const cafeInfo = props.cafe;
    
    const dashboardMetrics = props.metrics ?? {
        revenueToday: 'Rp 0',
        totalBookings: 0,
        pendingCheckIns: 0,
        totalOrders: 0,
    };

    const bookingsList: BookingItem[] = props.recentBookings ?? [];
    const ordersList: OrderItem[] = props.recentOrders ?? [];
    const weeklyTrends = props.weeklyTrends ?? [];

    // Calculate max revenue for dynamic chart scaling
    const maxRevenue = Math.max(...weeklyTrends.map(t => t.revenue), 100000);

    const handleCheckIn = (rawId?: number | string) => {
        if (!rawId) return;
        router.post(`/owner/bookings/${rawId}/check-in`, {}, { preserveScroll: true });
    };

    const handleCompleteBooking = (rawId?: number | string) => {
        if (!rawId) return;
        router.post(`/owner/bookings/${rawId}/complete`, {}, { preserveScroll: true });
    };

    const handleOrderStatusChange = (rawId?: number | string, nextStatus?: string) => {
        if (!rawId || !nextStatus) return;
        router.patch(`/owner/orders/${rawId}/status`, { status: nextStatus }, { preserveScroll: true });
    };

    return (
        <OwnerLayout breadcrumbs={[{ title: 'Dashboard Owner' }]}>
            <Head title="Dashboard Cafe Owner - CafeNow" />

            <div className="space-y-8 max-w-7xl mx-auto">
                
                {/* 1. HEADER BANNER */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">Dashboard Cafe Owner</h1>
                            {cafeInfo ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-semibold text-emerald-700">
                                    <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                                    <span>Cafe Active & Accepting Bookings</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-xs font-semibold text-amber-700">
                                    <AlertCircle className="size-3 text-amber-600" />
                                    <span>Belum Mendaftarkan Cafe</span>
                                </span>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-stone-500 mt-1">
                            Kelola operasional <strong className="text-stone-800">{cafeInfo?.name ?? 'Cafe Anda'}</strong>, inventaris meja, pesanan dapur, dan analitik harian.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/owner/cafes">
                            <Button variant="outline" size="sm" className="h-9 rounded-xl border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1.5">
                                <Edit3 className="size-3.5 text-orange-600" />
                                <span>Info Cafe</span>
                            </Button>
                        </Link>
                        <Link href="/owner/cafes/menus">
                            <Button size="sm" className="h-9 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5">
                                <Plus className="size-3.5" />
                                <span>Kelola Menu</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* NO CAFE WARNING CARD */}
                {!cafeInfo && (
                    <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                                <Store className="size-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-900">Profil Cafe Belum Lengkap</h4>
                                <p className="text-xs text-amber-700 mt-0.5">Silakan tambahkan informasi cafe, denah meja, dan menu dapur untuk mulai menerima pesanan secara real-time.</p>
                            </div>
                        </div>
                        <Link href="/owner/cafes">
                            <Button size="sm" className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shrink-0">
                                Lengkapi Info Cafe
                            </Button>
                        </Link>
                    </div>
                )}

                {/* 2. LIGHT STAT CARDS GRID (DATABASE REAL-TIME DATA) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    {/* Stat 1: Revenue Net */}
                    <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-stone-500">Pendapatan Bersih (Hari Ini)</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                                <TrendingUp className="size-5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-2xl font-bold tracking-tight text-stone-900">{dashboardMetrics.revenueToday}</p>
                            <span className="text-[11px] text-stone-500 font-medium">Real-time sync dari transaksi</span>
                        </div>
                        <span className="text-[10px] text-stone-400 block border-t border-stone-100 pt-2">Setelah pemotongan komisi platform 15%</span>
                    </div>

                    {/* Stat 2: Total Bookings */}
                    <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-stone-500">Total Booking Hari Ini</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                <Calendar className="size-5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-2xl font-bold tracking-tight text-stone-900">{dashboardMetrics.totalBookings} Reservasi</p>
                            <p className="text-[11px] text-stone-500 mt-1">Tercatat di Database</p>
                        </div>
                        <span className="text-[10px] text-stone-400 block border-t border-stone-100 pt-2">Okupansi Meja Hari Ini</span>
                    </div>

                    {/* Stat 3: Pending Check-In */}
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-800">Belum Check-In Hari Ini</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                                <Clock className="size-5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-2xl font-bold tracking-tight text-amber-950">{dashboardMetrics.pendingCheckIns} Pelanggan</p>
                            <p className="text-[11px] text-amber-700 mt-1">Perlu pemantauan di lokasi</p>
                        </div>
                        <span className="text-[10px] text-amber-800/70 block border-t border-amber-200/60 pt-2">Check-in via aplikasi</span>
                    </div>

                    {/* Stat 4: Menu Orders */}
                    <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-stone-500">Total Pesanan Menu</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                                <ShoppingBag className="size-5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-2xl font-bold tracking-tight text-stone-900">{dashboardMetrics.totalOrders} Pesanan</p>
                            <p className="text-[11px] text-stone-500 mt-1">Pre-Order & Additional</p>
                        </div>
                        <span className="text-[10px] text-stone-400 block border-t border-stone-100 pt-2">Dapur aktif memasak</span>
                    </div>

                </div>

                {/* 3. QUICK ACCESS SHORTCUTS GRID */}
                <div className="space-y-3">
                    <h3 className="text-base font-bold text-stone-900">Pintasan Manajemen Cafe</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        
                        <Link href="/owner/cafes" className="group rounded-2xl border border-stone-200/80 bg-white p-4 hover:border-orange-400 hover:shadow-md transition-all flex flex-col items-center text-center space-y-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                <Store className="size-5" />
                            </div>
                            <span className="text-xs font-bold text-stone-800">Info Cafe</span>
                        </Link>

                        <Link href="/owner/cafes/tables" className="group rounded-2xl border border-stone-200/80 bg-white p-4 hover:border-orange-400 hover:shadow-md transition-all flex flex-col items-center text-center space-y-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                <Layers className="size-5" />
                            </div>
                            <span className="text-xs font-bold text-stone-800">Meja & Surge</span>
                        </Link>

                        <Link href="/owner/cafes/menus" className="group rounded-2xl border border-stone-200/80 bg-white p-4 hover:border-orange-400 hover:shadow-md transition-all flex flex-col items-center text-center space-y-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                <Utensils className="size-5" />
                            </div>
                            <span className="text-xs font-bold text-stone-800">Kelola Menu</span>
                        </Link>

                        <Link href="/owner/bookings" className="group rounded-2xl border border-stone-200/80 bg-white p-4 hover:border-orange-400 hover:shadow-md transition-all flex flex-col items-center text-center space-y-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                <Calendar className="size-5" />
                            </div>
                            <span className="text-xs font-bold text-stone-800">Booking Masuk</span>
                        </Link>

                        <Link href="/owner/orders" className="group rounded-2xl border border-stone-200/80 bg-white p-4 hover:border-orange-400 hover:shadow-md transition-all flex flex-col items-center text-center space-y-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                <ChefHat className="size-5" />
                            </div>
                            <span className="text-xs font-bold text-stone-800">Order Dapur</span>
                        </Link>

                        {/* <Link href="/owner/analytics" className="group rounded-2xl border border-stone-200/80 bg-white p-4 hover:border-orange-400 hover:shadow-md transition-all flex flex-col items-center text-center space-y-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                <BarChart3 className="size-5" />
                            </div>
                            <span className="text-xs font-bold text-stone-800">Analytics</span>
                        </Link> */}

                    </div>
                </div>

                {/* 4. DETAILED LIVE MONITORING (TWO COLUMNS) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Column: Recent Bookings Monitor */}
                    <div className="lg:col-span-7 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="size-5 text-orange-600" />
                                <h3 className="text-base font-bold text-stone-900">Pemantauan Booking Masuk</h3>
                            </div>
                            <Link href="/owner/bookings" className="text-xs text-orange-600 hover:underline font-semibold">
                                Lihat Semua
                            </Link>
                        </div>

                        {bookingsList.length === 0 ? (
                            <div className="py-12 text-center flex flex-col items-center justify-center space-y-2 text-stone-400">
                                <Inbox className="size-10 stroke-1" />
                                <p className="text-xs font-semibold text-stone-600">Belum ada booking masuk hari ini</p>
                                <p className="text-[11px]">Data reservasi dari pelanggan akan langsung muncul di sini secara real-time.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {bookingsList.map((booking) => (
                                    <div key={booking.id} className="rounded-xl border border-stone-200 p-4 space-y-3 hover:border-orange-300 transition-colors bg-stone-50/50">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-orange-600">{booking.id}</span>
                                                    <span className="text-xs text-stone-500 font-medium">• {booking.tableName}</span>
                                                </div>
                                                <h4 className="text-base font-bold text-stone-900 mt-0.5">{booking.customerName}</h4>
                                            </div>
                                            <div>
                                                {booking.status === 'confirmed' && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold">
                                                        Confirmed
                                                    </span>
                                                )}
                                                {booking.status === 'checked_in' && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold animate-pulse">
                                                        Checked-In
                                                    </span>
                                                )}
                                                {booking.status === 'completed' && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
                                                        Selesai
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-stone-500 pt-1">
                                            <div>
                                                <span className="block text-[10px]">Waktu Booking</span>
                                                <span className="font-medium text-stone-800">{booking.timeSlot}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px]">Jumlah Tamu</span>
                                                <span className="font-medium text-stone-800">{booking.guests} Tamu</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px]">Total Bayar</span>
                                                <span className="font-bold text-orange-600">{booking.amount}</span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="pt-2 border-t border-stone-200 flex items-center justify-end gap-2">
                                            {booking.status === 'confirmed' && (
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleCheckIn(booking.raw_id ?? booking.id)}
                                                    className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                                >
                                                    <UserCheck className="size-3.5" />
                                                    <span>Check-In Pelanggan</span>
                                                </Button>
                                            )}
                                            {booking.status === 'checked_in' && (
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleCompleteBooking(booking.raw_id ?? booking.id)}
                                                    className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                                >
                                                    <CheckCircle2 className="size-3.5" />
                                                    <span>Tandai Selesai</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Kitchen Live Orders Monitor */}
                    <div className="lg:col-span-5 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                            <div className="flex items-center gap-2">
                                <ChefHat className="size-5 text-orange-600" />
                                <h3 className="text-base font-bold text-stone-900">Monitor Dapur & Pesanan</h3>
                            </div>
                            <Link href="/owner/orders" className="text-xs text-orange-600 hover:underline font-semibold">
                                Live Kitchen
                            </Link>
                        </div>

                        {ordersList.length === 0 ? (
                            <div className="py-12 text-center flex flex-col items-center justify-center space-y-2 text-stone-400">
                                <Inbox className="size-10 stroke-1" />
                                <p className="text-xs font-semibold text-stone-600">Belum ada pesanan menu dapur</p>
                                <p className="text-[11px]">Pesanan makanan & minuman dari pelanggan akan langsung muncul di sini.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {ordersList.map((order) => (
                                    <div key={order.id} className="rounded-xl border border-stone-200 p-4 space-y-3 bg-stone-50/50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-stone-900">{order.id}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                    order.orderType === 'pre_order' 
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                                                }`}>
                                                    {order.orderType === 'pre_order' ? 'Pre-Order' : 'Additional Order'}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-orange-600">{order.amount}</span>
                                        </div>

                                        <div>
                                            <p className="text-xs text-stone-500 font-medium">Pelanggan: <strong className="text-stone-800">{order.customerName}</strong> ({order.bookingRef})</p>
                                            <p className="text-xs font-semibold text-stone-800 mt-1 bg-white p-2.5 rounded-lg border border-stone-200 leading-relaxed">
                                                {order.itemsSummary}
                                            </p>
                                        </div>

                                        {/* Kitchen Workflow Buttons */}
                                        <div className="flex items-center justify-between pt-1 border-t border-stone-200">
                                            <span className="text-[11px] text-stone-500">
                                                Status: <strong className="capitalize text-orange-600">{order.status}</strong>
                                            </span>

                                            <div className="flex items-center gap-1.5">
                                                {order.status === 'scheduled' && (
                                                    <Button size="sm" onClick={() => handleOrderStatusChange(order.raw_id ?? order.id, 'preparing')} className="h-7 rounded-lg text-[11px] bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">
                                                        Mulai Masak
                                                    </Button>
                                                )}
                                                {order.status === 'preparing' && (
                                                    <Button size="sm" onClick={() => handleOrderStatusChange(order.raw_id ?? order.id, 'ready')} className="h-7 rounded-lg text-[11px] bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
                                                        Siap Disajikan
                                                    </Button>
                                                )}
                                                {order.status === 'ready' && (
                                                    <Button size="sm" onClick={() => handleOrderStatusChange(order.raw_id ?? order.id, 'completed')} className="h-7 rounded-lg text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                                                        Selesai
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>


                {/* 5. DYNAMIC ANALYTICS CHART SECTION FROM DB */}
                <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="size-5 text-orange-600" />
                            <h3 className="text-base font-bold text-stone-900">Grafik Ringkasan Pendapatan 7 Hari Terakhir</h3>
                        </div>
                        {/* <Link href="/owner/analytics" className="text-xs text-orange-600 hover:underline font-semibold">
                            Laporan Lengkap
                        </Link> */}
                    </div>

                    <div className="h-48 flex items-end justify-between gap-3 pt-6 px-4">
                        {weeklyTrends.map((bar, idx) => {
                            const barHeight = maxRevenue > 0 ? (bar.revenue / maxRevenue) * 120 + 8 : 8;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                    <span className="text-[10px] text-stone-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">{bar.formatted}</span>
                                    <div 
                                        className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-orange-600 to-amber-500 transition-all duration-300 group-hover:brightness-110"
                                        style={{ height: `${barHeight}px` }}
                                    />
                                    <span className="text-xs font-bold text-stone-700">{bar.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </OwnerLayout>
    );
}
