import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/Contexts/ToastContext';

interface AnalyticsProps {
  auth: { user: { id: number; name: string; email: string; role: string } };
}

interface RevenueData {
  date: string;
  revenue: number;
}

interface CafeData {
  id: number;
  name: string;
  revenue: number;
  bookings: number;
  rating: number;
}

interface BookingStatusData {
  completed: number;
  pending: number;
  cancelled: number;
}

export default function Analytics({ auth }: AnalyticsProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [topCafes, setTopCafes] = useState<CafeData[]>([]);
  const [bookingStatus, setBookingStatus] = useState<BookingStatusData | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [revRes, cafesRes, statusRes] = await Promise.all([
        fetch(`/api/admin/analytics/revenue?start_date=${startDate}&end_date=${endDate}`),
        fetch(`/api/admin/analytics/cafes?top=10`),
        fetch(`/api/admin/analytics/bookings/status`),
      ]);

      if (!revRes.ok || !cafesRes.ok || !statusRes.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const revData = await revRes.json();
      const cafesData = await cafesRes.json();
      const statusData = await statusRes.json();

      setRevenueData(revData.data || []);
      setTopCafes(cafesData.data || []);
      setBookingStatus(statusData.data || null);
      toast.show('success', 'Analytics updated');
    } catch (error) {
      toast.show('error', 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/admin/analytics/export-csv?start_date=${startDate}&end_date=${endDate}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast.show('success', 'CSV exported successfully');
    } catch (error) {
      toast.show('error', 'Failed to export CSV');
    }
  };

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalCompleted = bookingStatus?.completed || 0;
  const totalPending = bookingStatus?.pending || 0;
  const totalCancelled = bookingStatus?.cancelled || 0;

  return (
    <>
      <Head title="Analytics" />
      <AdminLayout user={user!}>
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#3c2a1e]">
              Analisis Performa Cafe
            </h1>
            <Button onClick={handleExport} variant="primary">
              📥 Export CSV
            </Button>
          </div>

          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border border-[#dcd2c0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b8863b]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border border-[#dcd2c0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b8863b]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <p className="text-gray-600 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold text-[#3c2a1e] mt-2">
                {formatCurrency(totalRevenue)}
              </p>
            </Card>
            <Card>
              <p className="text-gray-600 text-sm">Booking Selesai</p>
              <p className="text-3xl font-bold text-[#5c6e4a] mt-2">
                {totalCompleted}
              </p>
            </Card>
            <Card>
              <p className="text-gray-600 text-sm">Booking Dibatalkan</p>
              <p className="text-3xl font-bold text-[#a6472f] mt-2">
                {totalCancelled}
              </p>
            </Card>
          </div>

          <Card>
            <h2 className="text-xl font-bold text-[#3c2a1e] mb-4">
              Trend Pendapatan
            </h2>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              {revenueData.length > 0 ? (
                <SimpleLineChart data={revenueData} />
              ) : (
                <p className="text-gray-500">Tidak ada data</p>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-bold text-[#3c2a1e] mb-4">
                Cafe Terpopuler
              </h2>
              <div className="space-y-3">
                {topCafes.slice(0, 5).map((cafe) => (
                  <div
                    key={cafe.id}
                    className="flex items-center justify-between pb-3 border-b border-[#dcd2c0] last:border-0"
                  >
                    <div>
                      <p className="font-medium text-[#3c2a1e]">{cafe.name}</p>
                      <p className="text-xs text-gray-600">
                        {cafe.bookings} bookings
                      </p>
                    </div>
                    <p className="font-bold text-[#b8863b]">
                      {formatCurrency(cafe.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-bold text-[#3c2a1e] mb-4">
                Status Booking
              </h2>
              <div className="space-y-4">
                <StatusBar
                  label="Selesai"
                  value={totalCompleted}
                  color="bg-[#5c6e4a]"
                  total={totalCompleted + totalPending + totalCancelled}
                />
                <StatusBar
                  label="Pending"
                  value={totalPending}
                  color="bg-[#b8863b]"
                  total={totalCompleted + totalPending + totalCancelled}
                />
                <StatusBar
                  label="Dibatalkan"
                  value={totalCancelled}
                  color="bg-[#a6472f]"
                  total={totalCompleted + totalPending + totalCancelled}
                />
              </div>
            </Card>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}

interface SimpleLineChartProps {
  data: RevenueData[];
}

function SimpleLineChart({ data }: SimpleLineChartProps) {
  if (data.length === 0) return null;

  const maxRevenue = Math.max(...data.map((d) => d.revenue));
  const height = 200;

  return (
    <div className="w-full flex items-end justify-between px-4 pb-4 gap-1">
      {data.map((item, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center">
          <div
            className="w-full bg-[#b8863b] rounded-t"
            style={{
              height: `${(item.revenue / maxRevenue) * height}px`,
              minHeight: '4px',
            }}
            title={formatCurrency(item.revenue)}
          />
          <p className="text-xs text-gray-600 mt-2">
            {new Date(item.date).toLocaleDateString('id-ID', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      ))}
    </div>
  );
}

interface StatusBarProps {
  label: string;
  value: number;
  color: string;
  total: number;
}

function StatusBar({ label, value, color, total }: StatusBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-[#3c2a1e]">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
