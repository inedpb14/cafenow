import { useState } from 'react';
import OwnerLayout from '@/components/Owner/OwnerLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ChefHat, Inbox, Printer, X } from 'lucide-react';

interface OrderItem {
    id: string;
    raw_id: number;
    bookingRef: string;
    customerName: string;
    tableName?: string;
    orderType: 'pre_order' | 'additional';
    itemsSummary: string;
    amount: string;
    status: 'scheduled' | 'preparing' | 'ready' | 'completed';
    paymentStatus: string;
    bookingStatus: string;
}

interface OwnerOrdersProps {
    orders?: OrderItem[];
}

export default function OwnerOrders(props: OwnerOrdersProps) {
    const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
    const [printOrder, setPrintOrder] = useState<OrderItem | null>(null);

    const ordersList = props.orders ?? [];

    const handleStatusChange = (rawId: number, nextStatus: 'preparing' | 'ready' | 'completed') => {
        router.patch(`/owner/orders/${rawId}/status`, { status: nextStatus }, { preserveScroll: true });
    };

    const handlePrint = () => {
        window.print();
    };

    const handlePrintClick = (order: OrderItem) => {
        setPrintOrder(order);
    };

    const canPrint = (order: OrderItem) =>
        order.paymentStatus === 'paid' && order.bookingStatus !== 'pending';

    const filteredOrders = ordersList.filter(o => {
        if (orderTypeFilter === 'all') return true;
        return o.orderType === orderTypeFilter;
    });

    return (
        <OwnerLayout breadcrumbs={[{ title: 'Order Dapur Live' }]}>
            <Head title="Monitor Dapur - Owner Portal" />

            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <ChefHat className="size-7 text-orange-600" />
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">Monitor Dapur & Pesanan Live</h1>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-500 mt-1">Pantau pesanan makanan/minuman (Pre-Order & Additional) secara real-time untuk koki dan barista.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <select 
                            value={orderTypeFilter}
                            onChange={(e) => setOrderTypeFilter(e.target.value)}
                            className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-orange-500 shadow-xs"
                        >
                            <option value="all">Semua Tipe Order</option>
                            <option value="pre_order">Pre-Order Saja</option>
                            <option value="additional">Additional Order Saja</option>
                        </select>
                    </div>
                </div>

                {/* Orders Grid / Empty State */}
                {filteredOrders.length === 0 ? (
                    <div className="py-16 bg-white rounded-2xl border border-stone-200 shadow-sm text-center flex flex-col items-center justify-center space-y-2 text-stone-400">
                        <Inbox className="size-12 stroke-1 text-stone-300" />
                        <p className="text-sm font-semibold text-stone-700">Belum ada pesanan menu dapur</p>
                        <p className="text-xs text-stone-500">Antrean pesanan makanan & minuman dari pelanggan akan tampil di layar monitor ini.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredOrders.map((order) => (
                            <div key={order.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-orange-300 transition-colors">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs font-bold text-orange-600">{order.id}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                            order.orderType === 'pre_order' 
                                                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                                        }`}>
                                            {order.orderType === 'pre_order' ? 'Pre-Order' : 'Additional Order'}
                                        </span>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-stone-900">{order.customerName}</h4>
                                        <p className="text-xs text-stone-500">Booking: <strong className="text-stone-700">{order.bookingRef}</strong></p>
                                    </div>

                                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Rincian Menu</span>
                                        <p className="text-xs font-semibold text-stone-800 leading-relaxed">{order.itemsSummary}</p>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] text-stone-400 block">Total Pembayaran</span>
                                        <span className="text-xs font-bold text-stone-900">{order.amount}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {order.status === 'scheduled' && (
                                            <Button size="sm" onClick={() => handleStatusChange(order.raw_id, 'preparing')} className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg">
                                                Mulai Masak
                                            </Button>
                                        )}
                                        {order.status === 'preparing' && (
                                            <Button size="sm" onClick={() => handleStatusChange(order.raw_id, 'ready')} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                                                Siap di Kasir
                                            </Button>
                                        )}
                                        {order.status === 'ready' && (
                                            <Button size="sm" onClick={() => handleStatusChange(order.raw_id, 'completed')} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                                                Selesai Diserahkan
                                            </Button>
                                        )}
                                        {order.status === 'completed' && (
                                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">Selesai</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => canPrint(order) && handlePrintClick(order)}
                                        disabled={!canPrint(order)}
                                        title={canPrint(order) ? 'Cetak struk pesanan' : 'Struk hanya bisa dicetak setelah pembayaran lunas dan booking tidak berstatus pending'}
                                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                                            canPrint(order)
                                                ? 'text-stone-500 hover:text-orange-600 hover:bg-orange-50 cursor-pointer'
                                                : 'text-stone-300 cursor-not-allowed'
                                        }`}
                                    >
                                        <Printer className="size-3.5" /> Cetak Struk
                                    </button>
                                    <span className="text-[10px] font-semibold text-stone-400">{order.tableName ? `Meja: ${order.tableName}` : ''}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL: Cetak Struk */}
            {printOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:static print:p-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <style>{`@media print { body * { visibility: hidden; } .print-receipt, .print-receipt * { visibility: visible; } .print-receipt { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; } }`}</style>
                    <div className="print-receipt bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50 print:hidden">
                            <h3 className="font-bold text-stone-900 text-sm">Cetak Struk Pesanan</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrint} className="text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                                    Cetak
                                </button>
                                <button onClick={() => setPrintOrder(null)} className="text-stone-400 hover:text-stone-700 transition-colors cursor-pointer">
                                    <X className="size-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 font-mono text-[12px] text-stone-900">
                            <div className="text-center border-b border-dashed border-stone-300 pb-4 mb-4">
                                <p className="font-bold text-base tracking-widest">CAFENOW</p>
                                <p className="text-stone-500 text-[10px] mt-0.5">Struk Pesanan Dapur</p>
                            </div>

                            <div className="space-y-1 text-[11px] mb-4">
                                <p className="flex justify-between"><span className="text-stone-500">No. Order</span><span className="font-bold">{printOrder.id}</span></p>
                                <p className="flex justify-between"><span className="text-stone-500">Booking</span><span className="font-bold">{printOrder.bookingRef}</span></p>
                                {printOrder.tableName && (
                                    <p className="flex justify-between"><span className="text-stone-500">Meja</span><span className="font-bold">{printOrder.tableName}</span></p>
                                )}
                                <p className="flex justify-between"><span className="text-stone-500">Pelanggan</span><span className="font-bold">{printOrder.customerName}</span></p>
                                <p className="flex justify-between"><span className="text-stone-500">Tipe</span><span className="font-bold">{printOrder.orderType === 'pre_order' ? 'Pre-Order' : 'Additional'}</span></p>
                            </div>

                            <div className="border-t border-dashed border-stone-300 pt-3">
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Rincian Menu</p>
                                <p className="leading-relaxed whitespace-pre-line">{printOrder.itemsSummary}</p>
                            </div>

                            <div className="border-t border-dashed border-stone-300 mt-4 pt-3 flex justify-between">
                                <span className="font-bold">Total</span>
                                <span className="font-bold">{printOrder.amount}</span>
                            </div>

                            <p className="text-center text-stone-500 text-[10px] mt-6">Terima kasih</p>
                        </div>
                    </div>
                </div>
            )}
        </OwnerLayout>
    );
}
