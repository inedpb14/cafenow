import { Head, Link } from '@inertiajs/react';
import { Utensils, MapPin, ArrowLeft } from 'lucide-react';

interface OrderDetailProps {
    order: any;
}

export default function CustomerOrderDetail({ order }: OrderDetailProps) {
    const formatPrice = (price: number) => {
        return 'Rp ' + (price || 0).toLocaleString('id-ID');
    };

    const statusColor = (status: string) => {
        if (status === 'completed' || status === 'served') return 'bg-emerald-100 text-emerald-900';
        if (status === 'cancelled') return 'bg-red-100 text-red-900';
        return 'bg-amber-100 text-amber-900';
    };

    return (
        <>
            <Head title={`Detail Pesanan #${order.order_reference || order.id}`} />

            <div className="space-y-8 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <Link href="/customer/orders" className="btn-secondary text-xs py-2 px-4 flex items-center gap-2">
                        <ArrowLeft className="size-4" />
                        <span>Kembali ke Daftar Pesanan</span>
                    </Link>
                    <span className={`px-3 py-1 text-xs font-bold border-2 border-[var(--text)] uppercase ${statusColor(order.status)}`}>
                        Status: {order.status}
                    </span>
                </div>

                <div className="block-card p-6 sm:p-8 bg-white border-2 border-[var(--text)] space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-[var(--text)] pb-6">
                        <div>
                            <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider block mb-1">Tiket Pesanan Dapur</span>
                            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[var(--text)]">
                                {order.cafe?.name || 'Cafe'}
                            </h1>
                            <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1">
                                <MapPin className="size-3.5 text-[var(--primary)] shrink-0" />
                                <span>{order.cafe?.address || '-'}</span>
                            </p>
                        </div>

                        <div className="p-3 bg-[var(--bg-warm)] border-2 border-[var(--text)] text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Kode Referensi</span>
                            <span className="font-serif text-lg font-extrabold text-[var(--primary)]">#{order.order_reference || order.id}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                        <div className="p-4 bg-[var(--bg-warm)] border-2 border-[var(--text)] space-y-1">
                            <span className="text-[var(--text-muted)] text-[10px] uppercase block">Tanggal Pesanan</span>
                            <p className="text-[var(--text)] text-sm">{order.created_at ? new Date(order.created_at).toLocaleDateString('id-ID') : '-'}</p>
                        </div>
                        <div className="p-4 bg-[var(--bg-warm)] border-2 border-[var(--text)] space-y-1">
                            <span className="text-[var(--text-muted)] text-[10px] uppercase block">Reservasi Terkait</span>
                            <p className="text-[var(--text)] text-sm">
                                {order.booking ? `#${order.booking.booking_reference || order.booking.id} (${order.booking.booking_date || '-'})` : 'Tanpa reservasi'}
                            </p>
                        </div>
                        <div className="p-4 bg-[var(--bg-warm)] border-2 border-[var(--text)] space-y-1">
                            <span className="text-[var(--text-muted)] text-[10px] uppercase block">Status Pembayaran</span>
                            <p className={`text-sm uppercase font-bold ${order.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {order.payment_status === 'paid' ? 'Lunas' : 'Belum Dibayar'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <h3 className="font-serif text-base font-bold text-[var(--text)] flex items-center gap-2">
                            <Utensils className="size-4 text-[var(--primary)]" />
                            <span>Daftar Item Pesanan</span>
                        </h3>
                        <div className="divide-y divide-stone-200 border border-[var(--text)]">
                            {(order.items || []).map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center gap-2 px-4 py-3 text-xs bg-stone-50">
                                    <span className="font-bold text-[var(--text)]">
                                        {item.quantity}x {item.menuItem?.name || item.item_name || 'Sajian'}
                                    </span>
                                    <span className="text-[var(--text-muted)] shrink-0">
                                        {formatPrice(item.unit_price)} = <span className="font-extrabold text-[var(--primary)]">{formatPrice(item.subtotal)}</span>
                                    </span>
                                </div>
                            ))}
                            {(!order.items || order.items.length === 0) && (
                                <p className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">Tidak ada rincian item.</p>
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-amber-50 border-2 border-[var(--text)] space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Status Dapur:</span>
                            <span className="font-bold uppercase">{order.status || '-'}</span>
                        </div>
                        {order.prepare_at && (
                            <div className="flex justify-between">
                                <span className="text-[var(--text-muted)]">Jadwal Siap Saji:</span>
                                <span className="font-bold">{new Date(order.prepare_at).toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        {order.special_notes && (
                            <div className="flex justify-between">
                                <span className="text-[var(--text-muted)]">Catatan Khusus:</span>
                                <span className="font-bold">{order.special_notes}</span>
                            </div>
                        )}
                        <div className="pt-2 border-t border-amber-200 flex justify-between text-sm font-extrabold text-[var(--primary)]">
                            <span>Total Pembayaran:</span>
                            <span>{formatPrice(order.total_price)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
