import OwnerLayout from '@/components/Owner/OwnerLayout';
import { Head } from '@inertiajs/react';
import { BarChart3, TrendingUp, Users, Calendar } from 'lucide-react';

interface OwnerAnalyticsProps {
    totalRevenue?: string;
    completedBookings?: number;
    totalCustomers?: number;
    weeklyData?: { day: string; date: string; revenue: number; formatted: string }[];
}

export default function OwnerAnalytics(props: OwnerAnalyticsProps) {
    const totalRevenue = props.totalRevenue ?? 'Rp 0';
    const completedBookings = props.completedBookings ?? 0;
    const totalCustomers = props.totalCustomers ?? 0;
    const weeklyData = props.weeklyData ?? [];

    const maxRevenue = Math.max(...weeklyData.map(w => w.revenue), 100000);

    return (
        <OwnerLayout breadcrumbs={[{ title: 'Analitik & Laporan Bisnis' }]}>
            <Head title="Analytics Cafe - Owner Portal" />

            <div className="space-y-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <BarChart3 className="size-7 text-orange-600" />
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">Analitik Bisnis & Insight Cafe</h1>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-500 mt-1">Laporan performa pendapatan, total booking selesai, dan tren mingguan berbasis data transaksi.</p>
                    </div>
                </div>

                {/* Key Metric Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-2 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-stone-500 font-semibold">Total Pendapatan Bersih (Net)</span>
                            <TrendingUp className="size-5 text-orange-600" />
                        </div>
                        <p className="text-2xl font-bold text-stone-900">{totalRevenue}</p>
                        <span className="text-[10px] text-stone-400 block">Dihitung otomatis (gross minus 15% platform)</span>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-2 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-stone-500 font-semibold">Reservasi Meja Selesai</span>
                            <Calendar className="size-5 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-bold text-stone-900">{completedBookings} Booking</p>
                        <span className="text-[10px] text-stone-400 block">Status completed dari pelanggan</span>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-2 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-stone-500 font-semibold">Total Pelanggan Unik</span>
                            <Users className="size-5 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-stone-900">{totalCustomers} Orang</p>
                        <span className="text-[10px] text-stone-400 block">Pelanggan terverifikasi yang memesan</span>
                    </div>
                </div>

                {/* Dynamic Chart */}
                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                        <BarChart3 className="size-5 text-orange-600" />
                        Grafik Performa Pendapatan 7 Hari Terakhir
                    </h3>

                    <div className="h-56 flex items-end justify-between gap-3 pt-8 px-4">
                        {weeklyData.map((bar, idx) => {
                            const barHeight = maxRevenue > 0 ? (bar.revenue / maxRevenue) * 140 + 8 : 8;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                    <span className="text-[10px] text-stone-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">{bar.formatted}</span>
                                    <div 
                                        className="w-full max-w-[44px] rounded-t-lg bg-gradient-to-t from-orange-600 to-amber-500 transition-all duration-300 group-hover:brightness-110"
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
