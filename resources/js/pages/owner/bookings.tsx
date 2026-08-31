import { useState } from 'react';
import OwnerLayout from '@/components/Owner/OwnerLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Search,
    Filter,
    UserCheck,
    CheckCircle2,
    Download,
    Inbox,
    X,
    Clock,
    Users,
    CreditCard
} from 'lucide-react';

interface Booking {
    id: string;
    raw_id: number;
    customerName: string;
    phone: string;
    tableName: string;
    date: string;
    timeSlot: string;
    guests: number;
    totalAmount: string;
    status: string;
    paymentStatus?: string;
    notes?: string | null;
}

interface OwnerBookingsProps {
    bookings?: Booking[];
}

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    checked_in: 'Checked-In',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No-Show',
};

const statusBadge = (status: string) => {
    switch (status) {
        case 'pending':
            return 'bg-amber-100 text-amber-800 border border-amber-200';
        case 'confirmed':
            return 'bg-blue-100 text-blue-800 border border-blue-200';
        case 'checked_in':
            return 'bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse';
        case 'completed':
            return 'bg-stone-100 text-stone-700 border border-stone-200';
        case 'cancelled':
            return 'bg-rose-100 text-rose-800 border border-rose-200';
        case 'no_show':
            return 'bg-red-100 text-red-800 border border-red-200';
        default:
            return 'bg-stone-100 text-stone-600 border border-stone-200';
    }
};

export default function OwnerBookings(props: OwnerBookingsProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

    const bookingsList = props.bookings ?? [];

    const handleCheckIn = (rawId: number) => {
        router.post(`/owner/bookings/${rawId}/check-in`, {}, { preserveScroll: true });
    };

    const handleComplete = (rawId: number) => {
        router.post(`/owner/bookings/${rawId}/complete`, {}, { preserveScroll: true });
    };

    const filteredBookings = bookingsList.filter(b => {
        const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <OwnerLayout breadcrumbs={[{ title: 'Daftar Booking & Check-In' }]}>
            <Head title="Kelola Reservasi - Owner Portal" />

            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">Daftar Reservasi & Check-In</h1>
                        <p className="text-xs sm:text-sm text-stone-500 mt-1">Kelola seluruh booking masuk, konfirmasi check-in pelanggan di tempat, dan pembatalan cafe.</p>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl border-stone-300 bg-white text-stone-700 hover:bg-stone-50 text-xs font-semibold flex items-center gap-2">
                        <Download className="size-4 text-orange-600" />
                        <span>Export CSV</span>
                    </Button>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                    <div className="relative w-full sm:w-80">
                        <Search className="size-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Cari kode booking / nama..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="size-4 text-stone-400" />
                        <span className="text-xs text-stone-500 font-semibold">Filter Status:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-orange-500"
                        >
                            <option value="all">Semua Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="checked_in">Checked-In</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No-Show</option>
                        </select>
                    </div>
                </div>

                {/* Table List / Empty State */}
                <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                    {filteredBookings.length === 0 ? (
                        <div className="py-16 text-center flex flex-col items-center justify-center space-y-2 text-stone-400">
                            <Inbox className="size-12 stroke-1 text-stone-300" />
                            <p className="text-sm font-semibold text-stone-700">Belum ada data reservasi</p>
                            <p className="text-xs text-stone-500">Seluruh pesanan meja dari pelanggan akan muncul di tabel ini.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
                                    <tr>
                                        <th className="px-6 py-4">Kode & Pelanggan</th>
                                        <th className="px-6 py-4">Meja & Tamu</th>
                                        <th className="px-6 py-4">Waktu Reservasi</th>
                                        <th className="px-6 py-4">Total Biaya</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Pembayaran</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 text-stone-700">
                                    {filteredBookings.map((b) => (
                                        <tr
                                            key={b.id}
                                            onClick={() => setDetailBooking(b)}
                                            className="hover:bg-stone-50/80 transition-colors cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <span className="font-mono font-bold text-orange-600 block">{b.id}</span>
                                                <span className="font-bold text-stone-900 block mt-0.5">{b.customerName}</span>
                                                <span className="text-[11px] text-stone-400 block">{b.phone}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-stone-800 block">{b.tableName}</span>
                                                <span className="text-[11px] text-stone-500">{b.guests} Tamu</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="block font-semibold">{b.date}</span>
                                                <span className="text-[11px] text-stone-500">{b.timeSlot}</span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-stone-900">
                                                {b.totalAmount}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${statusBadge(b.status)}`}>
                                                    {STATUS_LABELS[b.status] || b.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${b.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                                    {b.paymentStatus === 'paid' ? 'Lunas' : 'Belum Bayar'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL: Detail Booking */}
            {detailBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
                            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                                <span className="font-mono text-orange-600">{detailBooking.id}</span>
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${statusBadge(detailBooking.status)}`}>
                                    {STATUS_LABELS[detailBooking.status] || detailBooking.status}
                                </span>
                            </h3>
                            <button onClick={() => setDetailBooking(null)} className="text-stone-400 hover:text-stone-700 transition-colors cursor-pointer">
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
                            <div>
                                <p className="text-sm font-bold text-stone-900">{detailBooking.customerName}</p>
                                <p className="text-xs text-stone-500">{detailBooking.phone || 'Tanpa nomor telepon'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-stone-50 rounded-xl border border-stone-200 p-3">
                                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Meja</span>
                                    <span className="font-bold text-stone-800">{detailBooking.tableName}</span>
                                </div>
                                <div className="bg-stone-50 rounded-xl border border-stone-200 p-3">
                                    <span className="text-[10px] text-stone-400 uppercase font-bold block flex items-center gap-1"><Users className="size-3" /> Tamu</span>
                                    <span className="font-bold text-stone-800">{detailBooking.guests} Orang</span>
                                </div>
                                <div className="bg-stone-50 rounded-xl border border-stone-200 p-3">
                                    <span className="text-[10px] text-stone-400 uppercase font-bold block flex items-center gap-1"><Clock className="size-3" /> Tanggal</span>
                                    <span className="font-bold text-stone-800">{detailBooking.date}</span>
                                </div>
                                <div className="bg-stone-50 rounded-xl border border-stone-200 p-3">
                                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Jam</span>
                                    <span className="font-bold text-stone-800">{detailBooking.timeSlot}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                                <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                                    <CreditCard className="size-3.5 text-amber-600" />
                                    Pembayaran
                                </span>
                                <span className={`text-xs font-bold uppercase ${detailBooking.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {detailBooking.paymentStatus === 'paid' ? 'Lunas' : 'Belum Bayar'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                                <span className="text-xs text-stone-500 font-semibold">Total Biaya</span>
                                <span className="text-base font-extrabold text-stone-900">{detailBooking.totalAmount}</span>
                            </div>

                            {detailBooking.notes && (
                                <div className="bg-stone-50 rounded-xl border border-stone-200 p-3 text-xs">
                                    <span className="text-[10px] text-stone-400 uppercase font-bold block mb-1">Catatan Pelanggan</span>
                                    <p className="text-stone-700 leading-relaxed">{detailBooking.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-end gap-2 shrink-0">
                            {detailBooking.status === 'confirmed' && (
                                <Button size="sm" onClick={() => handleCheckIn(detailBooking.raw_id)} className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                                    <UserCheck className="size-3.5 mr-1" />
                                    Check-In
                                </Button>
                            )}
                            {detailBooking.status === 'checked_in' && (
                                <Button size="sm" onClick={() => handleComplete(detailBooking.raw_id)} className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                                    <CheckCircle2 className="size-3.5 mr-1" />
                                    Selesaikan
                                </Button>
                            )}
                            {!inArray(detailBooking.status, ['confirmed', 'checked_in']) && (
                                <span className="text-[11px] text-stone-400 font-semibold">Tidak ada aksi untuk status ini</span>
                            )}
                            <Button variant="outline" size="sm" onClick={() => setDetailBooking(null)} className="h-9 rounded-lg text-xs font-semibold border-stone-300">
                                Tutup
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </OwnerLayout>
    );
}

function inArray(needle: string, haystack: string[]) {
    return haystack.indexOf(needle) !== -1;
}