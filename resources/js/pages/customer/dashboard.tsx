import { Head, Link } from '@inertiajs/react';
import { 
    Calendar, 
    Clock, 
    MapPin, 
    Utensils, 
    Heart, 
    Bell, 
    ChevronRight, 
    Coffee, 
    AlertCircle,
    PlusCircle
} from 'lucide-react';

interface DashboardProps {
    upcoming_booking?: any;
    recent_bookings: any[];
    recent_orders: any[];
    stats: {
        total_bookings: number;
        total_orders: number;
        total_favorites: number;
        unread_notifications: number;
    };
}

export default function CustomerDashboard({
    upcoming_booking,
    recent_bookings = [],
    recent_orders = [],
    stats
}: DashboardProps) {

    const formatPrice = (price: number) => {
        return 'Rp ' + (price || 0).toLocaleString('id-ID');
    };

    return (
        <>
            <Head title="Dashboard Pelanggan - CafeNow" />

            <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
                {/* Header Welcome Banner */}
                <div className="block-card p-6 sm:p-8 bg-[var(--bg-warm)] border-2 border-[var(--text)] hover:shadow-[8px_8px_0_var(--text)] transition-all duration-300">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border border-[var(--text)] text-xs font-bold uppercase tracking-wider mb-2 animate-bounce">
                                <Coffee className="size-3.5 text-[var(--primary)]" />
                                <span>Portal Pelanggan CafeNow</span>
                            </div>
                            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text)]">
                                Selamat Datang Kembali!
                            </h1>
                            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                                Kelola reservasi meja cafe, pantau pesanan pre-order dapur, dan lihat cafe favorit Anda.
                            </p>
                        </div>
                        <Link 
                            href="/cafes" 
                            className="btn-primary text-xs py-3 px-5 flex items-center gap-2 shrink-0 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                        >
                            <PlusCircle className="size-4" />
                            <span>Cari & Pesan Meja Cafe</span>
                        </Link>
                    </div>
                </div>

                {/* Stats Cards Row with Interactive Micro-Animations */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="block-card p-5 bg-white border-2 border-[var(--text)] space-y-1 hover:-translate-y-1.5 hover:shadow-[6px_6px_0_var(--text)] transition-all duration-200 group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Reservasi</span>
                            <div className="p-2 bg-amber-100 border border-[var(--text)] text-[var(--primary)] group-hover:scale-110 group-hover:rotate-6 transition-transform">
                                <Calendar className="size-4" />
                            </div>
                        </div>
                        <p className="font-serif text-2xl sm:text-3xl font-extrabold text-[var(--text)]">
                            {stats?.total_bookings || 0}
                        </p>
                    </div>

                    <div className="block-card p-5 bg-white border-2 border-[var(--text)] space-y-1 hover:-translate-y-1.5 hover:shadow-[6px_6px_0_var(--text)] transition-all duration-200 group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Pesanan Dapur</span>
                            <div className="p-2 bg-amber-100 border border-[var(--text)] text-[var(--primary)] group-hover:scale-110 group-hover:rotate-6 transition-transform">
                                <Utensils className="size-4" />
                            </div>
                        </div>
                        <p className="font-serif text-2xl sm:text-3xl font-extrabold text-[var(--text)]">
                            {stats?.total_orders || 0}
                        </p>
                    </div>

                    <div className="block-card p-5 bg-white border-2 border-[var(--text)] space-y-1 hover:-translate-y-1.5 hover:shadow-[6px_6px_0_var(--text)] transition-all duration-200 group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Cafe Favorit</span>
                            <div className="p-2 bg-amber-100 border border-[var(--text)] text-[var(--primary)] group-hover:scale-110 group-hover:rotate-6 transition-transform">
                                <Heart className="size-4" />
                            </div>
                        </div>
                        <p className="font-serif text-2xl sm:text-3xl font-extrabold text-[var(--text)]">
                            {stats?.total_favorites || 0}
                        </p>
                    </div>

                    <div className="block-card p-5 bg-white border-2 border-[var(--text)] space-y-1 hover:-translate-y-1.5 hover:shadow-[6px_6px_0_var(--text)] transition-all duration-200 group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Notifikasi Baru</span>
                            <div className="p-2 bg-amber-100 border border-[var(--text)] text-[var(--primary)] group-hover:scale-110 group-hover:rotate-6 transition-transform">
                                <Bell className="size-4" />
                            </div>
                        </div>
                        <p className="font-serif text-2xl sm:text-3xl font-extrabold text-[var(--text)]">
                            {stats?.unread_notifications || 0}
                        </p>
                    </div>
                </div>

                {/* Upcoming Booking Banner */}
                {upcoming_booking ? (
                    <div className="block-card p-6 bg-amber-50 border-2 border-[var(--primary)] space-y-4 hover:shadow-[6px_6px_0_var(--primary)] transition-all duration-300">
                        <div className="flex items-center justify-between border-b-2 border-amber-200 pb-3">
                            <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider flex items-center gap-2">
                                <AlertCircle className="size-4 animate-pulse" />
                                <span>Reservasi Mendatang Terdekat</span>
                            </span>
                            <span className="px-3 py-1 bg-[var(--primary)] text-white text-[10px] font-bold border border-[var(--text)] uppercase animate-pulse">
                                {upcoming_booking.status}
                            </span>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 items-center">
                            <div className="space-y-1">
                                <h3 className="font-serif text-xl font-bold text-[var(--text)]">
                                    {upcoming_booking.cafe?.name || 'Cafe'}
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                    <MapPin className="size-3.5 text-[var(--primary)] shrink-0" />
                                    <span>{upcoming_booking.cafe?.address || '-'}</span>
                                </p>
                            </div>

                            <div className="space-y-1 text-xs">
                                <p className="flex items-center gap-2 font-bold text-[var(--text)]">
                                    <Calendar className="size-4 text-[var(--primary)]" />
                                    <span>{upcoming_booking.booking_date} ({upcoming_booking.start_time || '-'} WIB)</span>
                                </p>
                                <p className="text-[var(--text-muted)]">
                                    Meja: {upcoming_booking.table?.name || '-'} • {upcoming_booking.guest_count || 0} Tamu
                                </p>
                            </div>

                            <div className="md:text-right">
                                <Link 
                                    href={`/customer/bookings/${upcoming_booking.id}`} 
                                    className="btn-primary text-xs py-2.5 px-5 inline-flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                                >
                                    <span>Lihat Detail Booking</span>
                                    <ChevronRight className="size-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="block-card p-6 bg-white border-2 border-[var(--text)] text-center space-y-3 hover:shadow-[4px_4px_0_var(--text)] transition-all">
                        <Coffee className="size-10 text-[var(--text-muted)] mx-auto" />
                        <h3 className="font-serif text-lg font-bold text-[var(--text)]">Tidak Ada Reservasi Mendatang</h3>
                        <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                            Anda belum memiliki reservasi meja aktif. Temukan cafe impian Anda dan pesan tempat sekarang!
                        </p>
                        <Link href="/cafes" className="btn-primary text-xs py-2 px-4 inline-block mt-2 hover:scale-105 active:scale-95 transition-transform">
                            Eksplorasi Cafe Sekarang
                        </Link>
                    </div>
                )}

                {/* Recent Bookings & Orders Grid */}
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Recent Bookings List */}
                    <div className="block-card p-6 bg-white border-2 border-[var(--text)] space-y-4">
                        <div className="flex items-center justify-between border-b-2 border-[var(--text)] pb-3">
                            <h3 className="font-serif text-lg font-bold text-[var(--text)]">Riwayat Reservasi Terakhir</h3>
                            <Link href="/customer/bookings" className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1 group">
                                <span>Lihat Semua</span>
                                <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        {recent_bookings.length === 0 ? (
                            <p className="text-xs text-[var(--text-muted)] py-4 text-center">Belum ada riwayat reservasi.</p>
                        ) : (
                            <div className="space-y-3">
                                {recent_bookings.map((booking: any) => (
                                    <div key={booking.id} className="p-3 bg-[var(--bg-warm)] border-2 border-[var(--text)] flex items-center justify-between text-xs hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--text)] transition-all">
                                        <div className="space-y-1">
                                            <p className="font-serif font-bold text-[var(--text)]">{booking.cafe?.name || 'Cafe'}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">{booking.booking_date} • {booking.guest_count} Tamu</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <span className="inline-block px-2 py-0.5 bg-amber-100 text-[var(--text)] border border-[var(--text)] font-bold text-[10px] uppercase">
                                                {booking.status}
                                            </span>
                                            <p className="font-extrabold text-[var(--primary)] text-xs">{formatPrice(booking.total_price)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Orders List */}
                    <div className="block-card p-6 bg-white border-2 border-[var(--text)] space-y-4">
                        <div className="flex items-center justify-between border-b-2 border-[var(--text)] pb-3">
                            <h3 className="font-serif text-lg font-bold text-[var(--text)]">Pesanan Dapur Terakhir</h3>
                            <Link href="/customer/orders" className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1 group">
                                <span>Lihat Semua</span>
                                <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        {recent_orders.length === 0 ? (
                            <p className="text-xs text-[var(--text-muted)] py-4 text-center">Belum ada pesanan dapur.</p>
                        ) : (
                            <div className="space-y-3">
                                {recent_orders.map((order: any) => (
                                    <div key={order.id} className="p-3 bg-[var(--bg-warm)] border-2 border-[var(--text)] flex items-center justify-between text-xs hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--text)] transition-all">
                                        <div className="space-y-1">
                                            <p className="font-serif font-bold text-[var(--text)]">{order.cafe?.name || 'Cafe'}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">{order.items?.length || 0} Item Pesanan</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-600 font-bold text-[10px] uppercase">
                                                {order.status || '-'}
                                            </span>
                                            <p className="font-extrabold text-[var(--primary)] text-xs">{formatPrice(order.total_price)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </>
    );
}
