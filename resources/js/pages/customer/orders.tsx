import { Head, Link, router } from '@inertiajs/react';
import { Utensils, Clock, CheckCircle2, Coffee, ChevronRight } from 'lucide-react';

interface OrdersProps {
    orders: {
        data: any[];
        links: any[];
        current_page: number;
        last_page: number;
    };
    filters: {
        status: string;
    };
}

export default function CustomerOrders({ orders, filters }: OrdersProps) {
    const formatPrice = (price: number) => {
        return 'Rp ' + (price || 0).toLocaleString('id-ID');
    };

    const handleFilterChange = (status: string) => {
        router.get('/customer/orders', { status }, { preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="Pesanan Dapur - CafeNow" />

            <div className="space-y-8 max-w-7xl mx-auto">
                {/* Header Banner */}
                <div className="block-card p-6 sm:p-8 bg-[var(--bg-warm)] border-2 border-[var(--text)]">
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text)]">
                        Riwayat Pesanan Dapur & Pre-Order
                    </h1>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                        Daftar makanan dan minuman yang Anda pesan untuk disajikan langsung saat tiba di cafe.
                    </p>
                </div>

                {/* Filter Tabs Bar */}
                <div className="flex flex-wrap gap-2 border-b-2 border-[var(--text)] pb-4">
                    {[
                        { id: 'all', label: 'Semua Pesanan' },
                        { id: 'pending', label: 'Pending Dapur' },
                        { id: 'completed', label: 'Disajikan / Selesai' },
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

                {/* Orders Grid */}
                {orders.data.length === 0 ? (
                    <div className="block-card p-12 bg-white border-2 border-[var(--text)] text-center space-y-4">
                        <Utensils className="size-12 text-[var(--text-muted)] mx-auto" />
                        <h3 className="font-serif text-xl font-bold text-[var(--text)]">Belum Ada Pesanan Dapur</h3>
                        <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-sm mx-auto">
                            Anda belum pernah melakukan pre-order makanan atau minuman di cafe mitra kami.
                        </p>
                        <Link href="/cafes" className="btn-primary text-xs py-2.5 px-6 inline-block mt-2">
                            Pesan Cafe & Dapur Sekarang
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {orders.data.map((order) => (
                            <div key={order.id} className="block-card bg-white p-5 border-2 border-[var(--text)] flex flex-col justify-between space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b-2 border-[var(--border)] pb-2">
                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Order #{order.id}</span>
                                        <span className={`px-2.5 py-0.5 text-[10px] font-bold border border-[var(--text)] uppercase ${
                                            order.status === 'completed' || order.status === 'served' ? 'bg-emerald-100 text-emerald-900' :
                                            order.status === 'cancelled' ? 'bg-red-100 text-red-900' :
                                            'bg-amber-100 text-amber-900'
                                        }`}>
                                            {order.status || '-'}
                                        </span>
                                    </div>

                                    <h3 className="font-serif text-lg font-bold text-[var(--text)] leading-snug">
                                        {order.cafe?.name || 'Cafe'}
                                    </h3>

                                    {/* Items List */}
                                    <div className="space-y-2 pt-2 border-t border-stone-200">
                                        {order.items && order.items.length > 0 ? (
                                            order.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center text-xs">
                                                    <span className="font-semibold text-[var(--text)]">{item.menuItem?.name || item.item_name || 'Sajian'} x{item.quantity || 0}</span>
                                                    <span className="text-[var(--text-muted)]">{formatPrice(item.unit_price)}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-[var(--text-muted)]">Rincian sajian kuliner dapur.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-3 border-t-2 border-[var(--border)] flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Total Pesanan</span>
                                        <span className="font-extrabold text-[var(--primary)] text-sm">{formatPrice(order.total_price)}</span>
                                    </div>
                                    <Link
                                        href={`/customer/orders/${order.id}`}
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
