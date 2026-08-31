import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/Contexts/ToastContext';

interface BookingRow {
  id: number;
  booking_reference: string;
  cafe: { id: number; name: string } | null;
  customer: { id: number; name: string } | null;
  table: { id: number; name: string } | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  guest_count: number;
  total_price: string;
  status: string;
  payment_status: string;
  created_at: string;
}

interface CafeOption {
  id: number;
  name: string;
}

const STATUS_OPTIONS = [
  { key: '', label: 'Semua Status' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'no_show', label: 'No Show' },
];

const SORTABLE_COLUMNS: { key: string; label: string }[] = [
  { key: 'booking_reference', label: 'Kode Booking' },
  { key: 'cafe_name', label: 'Cafe' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'booking_date', label: 'Tanggal' },
  { key: 'status', label: 'Status' },
];

function statusBadgeClass(s: string): string {
  switch (s) {
    case 'completed':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    case 'cancelled':
      return 'bg-destructive/15 text-destructive border-destructive/30';
    case 'confirmed':
      return 'bg-primary/15 text-primary border-primary/30';
    case 'pending':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'no_show':
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function formatCurrency(value: number | string): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : '-';
}

export default function BookingOversight() {
  const { user } = useAuth();
  const toast = useToast();

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCafe, setFilterCafe] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cafes, setCafes] = useState<CafeOption[]>([]);
  const [sortKey, setSortKey] = useState('booking_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        keyword,
        status: filterStatus,
        cafe_id: filterCafe,
        date_from: dateFrom,
        date_to: dateTo,
        sort_by: sortKey,
        sort_order: sortDirection,
        page: page.toString(),
        per_page: '10',
      });
      const response = await fetch(`/api/admin/bookings?${params}`);
      const data = await response.json();
      setBookings(data.data || []);
      setTotalPages(data.pagination?.last_page || 1);
    } catch {
      toast.show('error', 'Gagal memuat data booking');
    } finally {
      setLoading(false);
    }
  };

  const fetchCafes = async () => {
    try {
      const response = await fetch('/api/admin/cafes/options');
      const data = await response.json();
      setCafes(data.data || []);
    } catch {
      toast.show('error', 'Gagal memuat daftar cafe');
    }
  };

  useEffect(() => { fetchBookings(); }, [keyword, filterStatus, filterCafe, dateFrom, dateTo, sortKey, sortDirection, page]);
  useEffect(() => { fetchCafes(); }, []);

  const handleSort = (key: string) => {
    setSortKey(key);
    setSortDirection((prev) => (sortKey === key && prev === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  };

  const resetFilters = () => {
    setKeyword('');
    setFilterStatus('');
    setFilterCafe('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <>
      <Head title="Booking & Orders - CafeNow" />
      <AdminLayout user={user!}>
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
              Booking & Pre-Order
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Seluruh reservasi di platform beserta rincian pesanan dapur. Klik baris untuk melihat detail.
            </p>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Kode booking atau nama customer..."
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <select
              value={filterCafe}
              onChange={(e) => { setFilterCafe(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
            >
              <option value="">Semua Cafe</option>
              {cafes.map((cafe) => (
                <option key={cafe.id} value={cafe.id}>{cafe.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <Button variant="outline" onClick={resetFilters}>Reset Filter</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Dari Tanggal</label>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Sampai Tanggal</label>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner className="size-6 text-primary" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16 text-sm text-muted-foreground">
                Tidak ada data booking
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {SORTABLE_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider cursor-pointer hover:bg-accent/50 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            {col.label}
                            {sortKey === col.key &&
                              (sortDirection === 'asc' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />)}
                          </span>
                        </th>
                      ))}
                      <th className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Waktu</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        onClick={() => router.visit(`/admin/bookings/${booking.id}`)}
                        className="border-b border-border last:border-b-0 hover:bg-accent/40 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-2">
                          {booking.booking_reference}
                          <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{booking.cafe?.name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{booking.customer?.name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(booking.booking_date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={statusBadgeClass(booking.status)}>{booking.status.toUpperCase()}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {formatTime(booking.start_time)} WIB
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">
                          {formatCurrency(booking.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                Sebelumnya
              </Button>
              <span className="text-sm text-muted-foreground">Halaman {page} dari {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
                Berikutnya
              </Button>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}