import { Head, Link, router } from '@inertiajs/react';
import { Calendar, MapPin, Clock, ChevronRight, Filter, Coffee, AlertCircle } from 'lucide-react';

interface BookingsProps {
    bookings: {
        data: any[];
        links: any[];
        current_page: number;
        last_page: number;
    };
    filters: {
        status: string;
    };
}

export default function CustomerBookings({ bookings, filters }: BookingsProps) {
    const formatPrice = (price: number) => {
        return 'Rp ' + (price || 0).toLocaleString('id-ID');
    };

    const handleFilterChange = (status: string) => {
        router.get('/customer/bookings', { status }, { preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="Reservasi Saya - CafeNow" />

            <div className="space-y-8 max-w-7xl mx-auto">
                {/* Header Banner */}
                <div className="block-card p-6 sm:p-8 bg-[var(--bg-warm)] border-2 border-[var(--text)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text)]">
                            Riwayat & Status Reservasi Meja
                        </h1>
                        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                            Pantau reservasi mendatang, riwayat check-in, dan detail tiket booking digital Anda.
                        </p>
                    </div>
                    <Link href="/cafes" className="btn-primary text-xs py-2.5 px-5 shrink-0">
                        + Tambah Reservasi Baru
                    </Link>
                </div>

                {/* Filter Tabs Bar */}
                <div className="flex flex-wrap gap-2 border-b-2 border-[var(--text)] pb-4">
                    {[
                        { id: 'all', label: 'Semua Reservasi' },
                        { id: 'upcoming', label: 'Mendatang / Aktif' },
                        { id: 'completed', label: 'Selesai' },
                        { id: 'cancelled', label: 'Dibatalkan' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleFilterChange(tab.id)}
                            className={`px-4 py-2 text-xs font-bold border-2 border-[var(--text)] transition-all cursor-pointer ${
                                filters.status === tab.id
                                    ? 'bg-[var(--primary)] text-white shadow-[2px_2px_0_var(--text)]'
                                    : 'bg-white text-[var(--text)] hover:bg-stone-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Bookings List Cards Grid */}
                {bookings.data.length === 0 ? (
                    <div className="block-card p-12 bg-white border-2 border-[var(--text)] text-center space-y-4">
                        <Coffee className="size-12 text-[var(--text-muted)] mx-auto" />
                        <h3 className="font-serif text-xl font-bold text-[var(--text)]">Belum Ada Reservasi</h3>
                        <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-sm mx-auto">
                            {filters.status === 'all' 
                                ? 'Anda belum memiliki riwayat reservasi meja di cafe mana pun.' 
                                : `Tidak ada reservasi dengan status "${filters.status}".`}
                        </p>
                        <Link href="/cafes" className="btn-primary text-xs py-2.5 px-6 inline-block mt-2">
                            Cari Meja Cafe Sekarang
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bookings.data.map((booking) => (
                            <div key={booking.id} className="block-card bg-white p-5 border-2 border-[var(--text)] flex flex-col justify-between space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b-2 border-[var(--border)] pb-2">
                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Ref: #{booking.booking_reference || booking.id}</span>
                                        <span className={`px-2.5 py-0.5 text-[10px] font-bold border border-[var(--text)] uppercase ${
                                            booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-900' :
                                            booking.status === 'pending' ? 'bg-amber-100 text-amber-900' :
                                            booking.status === 'completed' ? 'bg-blue-100 text-blue-900' :
                                            'bg-stone-100 text-stone-700'
                                        }`}>
                                            {booking.status}
                                        </span>
                                    </div>

                                    <h3 className="font-serif text-lg font-bold text-[var(--text)] leading-snug">
                                        {booking.cafe?.name || 'Cafe'}
                                    </h3>

                                    <div className="space-y-1.5 text-xs text-[var(--text-muted)]">
                                        <p className="flex items-center gap-1.5 font-medium">
                                            <MapPin className="size-3.5 text-[var(--primary)] shrink-0" />
                                            <span className="truncate">{booking.cafe?.address || '-'}</span>
                                        </p>
                                        <p className="flex items-center gap-1.5 font-medium">
                                            <Calendar className="size-3.5 text-[var(--primary)] shrink-0" />
                                            <span>{booking.booking_date} ({booking.start_time || '-'} WIB)</span>
                                        </p>
                                        <p className="flex items-center gap-1.5 font-medium">
                                            <Clock className="size-3.5 text-[var(--primary)] shrink-0" />
                                            <span>Meja: {booking.table?.name || '-'} • {booking.guest_count || 0} Tamu</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-3 border-t-2 border-[var(--border)] flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Total Biaya</span>
                                        <span className="font-extrabold text-[var(--primary)] text-sm">{formatPrice(booking.total_price)}</span>
                                    </div>
                                    <Link 
                                        href={`/customer/bookings/${booking.id}`} 
                                        className="btn-primary text-xs py-2 px-4 flex items-center gap-1 cursor-pointer"
                                    >
                                        <span>Detail</span>
                                        <ChevronRight className="size-3.5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </>
    );
}
