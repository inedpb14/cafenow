import { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { 
    Calendar, 
    Clock, 
    MapPin, 
    Utensils, 
    CheckCircle2, 
    XCircle, 
    ArrowLeft, 
    ShieldCheck, 
    AlertTriangle,
    CreditCard,
    Trash2,
    X
} from 'lucide-react';

interface BookingDetailProps {
    booking: any;
}

export default function CustomerBookingDetail({ booking }: BookingDetailProps) {
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [paying, setPaying] = useState(false);
    const { post, processing } = useForm({
        reason: 'Dibatalkan oleh pelanggan',
    });
    const { props: pageProps } = usePage();
    const flash = (pageProps as any).flash || {};

    const canDelete = inArray(booking.status, ['cancelled', 'completed']);

    const formatPrice = (price: number) => {
        return 'Rp ' + (price || 0).toLocaleString('id-ID');
    };

    const isPaid = booking.payment_status === 'paid';

    const [showPaymentPopup, setShowPaymentPopup] = useState(!!flash.success && isPaid);

    const handleCancelSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/customer/bookings/${booking.id}/cancel`, {
            onSuccess: () => setShowCancelModal(false),
        });
    };

    const handleDelete = () => {
        setDeleting(true);
        router.delete(`/customer/bookings/${booking.id}`, {
            onSuccess: () => setShowDeleteModal(false),
            onFinish: () => setDeleting(false),
        });
    };

    const handleResumePayment = () => {
        setPaying(true);
        router.post(`/payments/resume/${booking.id}`, {}, {
            onFinish: () => setPaying(false),
        });
    };

    return (
        <>
            <Head title={`Detail Reservasi #${booking.booking_reference || booking.id}`} />

            <div className="space-y-8 max-w-4xl mx-auto">
                {/* Back Button & Header */}
                <div className="flex items-center justify-between">
                    <Link href="/customer/bookings" className="btn-secondary text-xs py-2 px-4 flex items-center gap-2">
                        <ArrowLeft className="size-4" />
                        <span>Kembali ke Daftar Reservasi</span>
                    </Link>

                    <span className={`px-3 py-1 text-xs font-bold border-2 border-[var(--text)] uppercase ${
                        booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-900' :
                        booking.status === 'pending' ? 'bg-amber-100 text-amber-900' :
                        booking.status === 'completed' ? 'bg-blue-100 text-blue-900' :
                        'bg-red-100 text-red-900'
                    }`}>
                        Status: {booking.status}
                    </span>
                </div>

                {/* Cafe Hero Information Card */}
                <div className="block-card p-6 sm:p-8 bg-white border-2 border-[var(--text)] space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-[var(--text)] pb-6">
                        <div>
                            <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider block mb-1">Tiket Reservasi Digital</span>
                            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[var(--text)]">
                                {booking.cafe?.name || 'Cafe'}
                            </h1>
                            <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1">
                                <MapPin className="size-3.5 text-[var(--primary)] shrink-0" />
                                <span>{booking.cafe?.address || '-'}</span>
                            </p>
                        </div>

                        <div className="p-3 bg-[var(--bg-warm)] border-2 border-[var(--text)] text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Kode Referensi</span>
                            <span className="font-serif text-lg font-extrabold text-[var(--primary)]">#{booking.booking_reference || booking.id}</span>
                        </div>
                    </div>

                    {/* Booking Attributes Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                        <div className="p-4 bg-[var(--bg-warm)] border-2 border-[var(--text)] space-y-1">
                            <span className="text-[var(--text-muted)] text-[10px] uppercase block">Tanggal & Waktu</span>
                            <p className="text-[var(--text)] text-sm">{booking.booking_date} ({booking.start_time || '-'} WIB)</p>
                        </div>
                        <div className="p-4 bg-[var(--bg-warm)] border-2 border-[var(--text)] space-y-1">
                            <span className="text-[var(--text-muted)] text-[10px] uppercase block">Meja & Tamu</span>
                            <p className="text-[var(--text)] text-sm">{booking.table?.name || '-'} • {booking.guest_count || 0} Tamu</p>
                        </div>
                        <div className="p-4 bg-[var(--bg-warm)] border-2 border-[var(--text)] space-y-1">
                            <span className="text-[var(--text-muted)] text-[10px] uppercase block">Status Pembayaran</span>
                            <p className={`text-sm uppercase font-bold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {isPaid ? 'Lunas' : 'Belum Dibayar'}
                            </p>
                        </div>
                    </div>

                    {/* Pre-Order Items List if Any */}
                    {booking.menu_orders && booking.menu_orders.length > 0 && (
                        <div className="space-y-3 pt-4 border-t-2 border-[var(--border)]">
                            <h3 className="font-serif text-base font-bold text-[var(--text)] flex items-center gap-2">
                                <Utensils className="size-4 text-[var(--primary)]" />
                                <span>Rincian Pre-Order Dapur</span>
                            </h3>
                            <div className="space-y-2">
                                {booking.menu_orders.map((order: any) => (
                                    <div key={order.id} className="p-4 bg-stone-50 border border-[var(--text)] text-xs space-y-2">
                                        <div className="flex justify-between items-center border-b border-stone-300 pb-2">
                                            <p className="font-bold">Pesanan #{order.order_reference || order.id}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">Status Dapur: {order.status}</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            {(order.items || []).map((item: any) => (
                                                <div key={item.id} className="flex justify-between gap-2">
                                                    <span>
                                                        {item.quantity}x {item.menuItem?.name || item.item_name || 'Sajian'}
                                                    </span>
                                                    <span className="font-bold shrink-0">{formatPrice(item.subtotal || item.unit_price)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between pt-1 border-t border-stone-300 font-extrabold text-[var(--primary)]">
                                            <span>Subtotal Pesanan</span>
                                            <span>{formatPrice(order.total_price)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Payment Summary Box */}
                    <div className="p-4 bg-amber-50 border-2 border-[var(--text)] space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Sewa Meja Cafe:</span>
                            <span className="font-bold">{formatPrice(booking.table_price)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Pre-Order Dapur:</span>
                            <span className="font-bold">{formatPrice(booking.menu_subtotal)}</span>
                        </div>
                        <div className="pt-2 border-t border-amber-200 flex justify-between text-sm font-extrabold text-[var(--primary)]">
                            <span>Total Pembayaran:</span>
                            <span>{formatPrice(booking.total_price)}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t-2 border-[var(--text)] flex flex-wrap justify-end gap-3">
                        {!isPaid && inArray(booking.status, ['pending', 'confirmed']) && (
                            <button
                                onClick={handleResumePayment}
                                disabled={paying}
                                className="btn-primary text-xs py-2.5 px-5 bg-amber-500 border-amber-700 text-white cursor-pointer"
                            >
                                <CreditCard className="size-3.5 inline mr-1" />
                                {paying ? 'Menyiapkan...' : 'Lanjutkan Pembayaran'}
                            </button>
                        )}
                        {inArray(booking.status, ['pending', 'confirmed']) && (
                            <button
                                onClick={() => setShowCancelModal(true)}
                                className="btn-secondary text-xs py-2.5 px-5 text-red-600 border-red-600 hover:bg-red-600 hover:text-white cursor-pointer"
                            >
                                Batalkan Reservasi Ini
                            </button>
                        )}
                        <button
                            onClick={() => canDelete && setShowDeleteModal(true)}
                            disabled={!canDelete}
                            title={canDelete ? 'Hapus riwayat reservasi ini' : 'Hapus hanya tersedia untuk reservasi berstatus Dibatalkan atau Selesai'}
                            className={`btn-secondary text-xs py-2.5 px-5 cursor-pointer ${canDelete ? 'text-red-600 border-red-600 hover:bg-red-600 hover:text-white' : 'text-stone-400 border-stone-300 cursor-not-allowed opacity-60'}`}
                        >
                            <Trash2 className="size-3.5 inline mr-1" />
                            Hapus Riwayat
                        </button>
                    </div>
                </div>

                {/* Payment Success Popup */}
                {showPaymentPopup && (
                    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="block-card p-6 sm:p-8 bg-white border-2 border-[var(--text)] max-w-md w-full space-y-5 text-center shadow-[6px_6px_0_rgba(0,0,0,0.3)]">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentPopup(false)}
                                    className="absolute -top-2 -right-2 size-8 bg-[var(--bg-warm)] border-2 border-[var(--text)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
                                    aria-label="Tutup notifikasi"
                                >
                                    <X className="size-4" />
                                </button>
                                <div className="size-16 mx-auto bg-emerald-100 border-2 border-emerald-600 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="size-9 text-emerald-600" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <h3 className="font-serif text-2xl font-extrabold text-[var(--text)]">
                                    Pembayaran Berhasil!
                                </h3>
                                <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed font-medium">
                                    Pembayaran {formatPrice(booking.total_price)} telah diterima.
                                    Reservasi #{booking.booking_reference || booking.id} resmi dikunci — meja dan pesanan
                                    dapur Anda akan disiapkan.
                                </p>
                            </div>

                            <div className="p-3 bg-emerald-50 border-2 border-emerald-600 text-emerald-900 text-xs font-bold uppercase tracking-wider">
                                Status: Lunas • Terkonfirmasi
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowPaymentPopup(false)}
                                className="w-full btn-primary text-xs py-3 font-bold tracking-wider uppercase cursor-pointer"
                            >
                                Lihat Tiket Reservasi
                            </button>
                        </div>
                    </div>
                )}

                {/* Cancel Modal */}
                {showCancelModal && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="block-card p-6 bg-white border-2 border-[var(--text)] max-w-md w-full space-y-4">
                            <div className="flex items-center gap-2 text-red-600 font-bold">
                                <AlertTriangle className="size-5" />
                                <h3 className="font-serif text-lg font-bold">Konfirmasi Pembatalan</h3>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                Apakah Anda yakin ingin membatalkan reservasi ini? Pembatalan yang dilakukan kurang dari 1 jam sebelum sesi kunjungan dapat dikenakan biaya administrasi.
                            </p>
                            <form onSubmit={handleCancelSubmit} className="space-y-4">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full btn-primary text-xs py-3 bg-red-600 border-red-900 text-white cursor-pointer"
                                >
                                    Ya, Batalkan Reservasi
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCancelModal(false)}
                                    className="w-full btn-secondary text-xs py-2 cursor-pointer"
                                >
                                    Batal (Kembali)
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="block-card p-6 bg-white border-2 border-[var(--text)] max-w-md w-full space-y-4">
                            <div className="flex items-center gap-2 text-red-600 font-bold">
                                <Trash2 className="size-5" />
                                <h3 className="font-serif text-lg font-bold">Hapus Riwayat Reservasi</h3>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                Riwayat reservasi <span className="font-bold text-[var(--text)]">#{booking.booking_reference || booking.id}</span> beserta
                                seluruh data pesanan dapur terkait akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
                            </p>
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 btn-primary text-xs py-3 bg-red-600 border-red-900 text-white cursor-pointer"
                                >
                                    {deleting ? 'Menghapus...' : 'Ya, Hapus Riwayat'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 btn-secondary text-xs py-3 cursor-pointer"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}

function inArray(needle: any, haystack: any[]) {
    return haystack.indexOf(needle) !== -1;
}
