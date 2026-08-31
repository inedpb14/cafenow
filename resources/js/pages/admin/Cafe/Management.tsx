import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  MapPin,
  Search,
  ShieldOff,
  Store,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/Contexts/ToastContext';
import { api } from '@/lib/http';
import { statusBadgeClass } from '@/lib/cafe-approval';

interface CafeRow {
  id: number;
  name: string;
  owner: { name: string } | null;
  location: string;
  approval_status: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { key: '', label: 'Semua Status' },
  { key: 'active', label: 'Aktif' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Ditolak' },
  { key: 'suspended', label: 'Suspended' },
];

const SORTABLE_COLUMNS: { key: string; label: string }[] = [
  { key: 'name', label: 'Nama Cafe' },
  { key: 'location', label: 'Lokasi' },
  { key: 'status', label: 'Status' },
];

export default function CafeManagement() {
  const { user } = useAuth();
  const toast = useToast();

  const [cafes, setCafes] = useState<CafeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCafe, setSelectedCafe] = useState<CafeRow | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchCafes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        keyword,
        status: filterStatus,
        sort_by: sortKey,
        sort_order: sortDirection,
        page: page.toString(),
        per_page: '25',
      });
      const response = await fetch(`/api/admin/cafes?${params}`);
      const data = await response.json();
      setCafes(data.data || []);
      setTotalPages(data.pagination?.last_page || 1);
    } catch {
      toast.show('error', 'Gagal memuat data cafe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCafes(); }, [keyword, filterStatus, sortKey, sortDirection, page]);

  const handleSort = (key: string) => {
    setSortKey(key);
    setSortDirection((prev) => (sortKey === key && prev === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  };

  const handleSuspend = async () => {
    if (!selectedCafe || !suspendReason.trim()) return;
    setProcessing(true);
    try {
      const response = await api.post(`/api/admin/cafes/${selectedCafe.id}/suspend`, {
        reason: suspendReason.trim(),
      });
      if (!response.ok) throw new Error();
      toast.show('success', 'Cafe berhasil di-suspend');
      setShowSuspendModal(false);
      setSuspendReason('');
      setShowDetailModal(false);
      fetchCafes();
    } catch {
      toast.show('error', 'Gagal suspend cafe');
    } finally {
      setProcessing(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!selectedCafe) return;
    setProcessing(true);
    try {
      const response = await api.post(`/api/admin/cafes/${selectedCafe.id}/unsuspend`);
      if (!response.ok) throw new Error();
      toast.show('success', 'Cafe diaktifkan kembali');
      setShowDetailModal(false);
      fetchCafes();
    } catch {
      toast.show('error', 'Gagal mengaktifkan kembali cafe');
    } finally {
      setProcessing(false);
    }
  };

  const canSuspend = ['active', 'approved'].includes(selectedCafe?.approval_status ?? '');

  return (
    <>
      <Head title="Manajemen Cafe - CafeNow" />
      <AdminLayout user={user!}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
              Manajemen Cafe
            </h1>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama cafe atau pemilik..."
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={() => {
                setKeyword('');
                setFilterStatus('');
                setSortKey('name');
                setSortDirection('asc');
                setPage(1);
              }}
            >
              Reset Filter
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner className="size-6 text-primary" />
              </div>
            ) : cafes.length === 0 ? (
              <div className="text-center py-16 text-sm text-muted-foreground">
                Tidak ada data cafe
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
                      <th className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                        Pemilik
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                        Terdaftar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cafes.map((cafe) => (
                      <tr
                        key={cafe.id}
                        onClick={() => { setSelectedCafe(cafe); setShowDetailModal(true); }}
                        className="border-b border-border last:border-b-0 hover:bg-accent/40 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-2 font-semibold text-foreground">
                            <Store className="size-4 text-primary" />
                            {cafe.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {cafe.location}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={statusBadgeClass(cafe.approval_status)}>
                            {cafe.approval_status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{cafe.owner?.name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(cafe.created_at).toLocaleDateString('id-ID')}
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

        {/* Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                Detail Cafe
              </DialogTitle>
            </DialogHeader>
            {selectedCafe && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/60 p-4 space-y-2 text-sm">
                  <p className="text-lg font-bold text-foreground">{selectedCafe.name}</p>
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <UserIcon className="size-3.5" /> Pemilik: {selectedCafe.owner?.name || '-'}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> {selectedCafe.location}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <CalendarIcon className="size-3.5" /> Terdaftar:{' '}
                    {new Date(selectedCafe.created_at).toLocaleDateString('id-ID')}
                  </p>
                  <div className="pt-1">
                    <Badge className={statusBadgeClass(selectedCafe.approval_status)}>
                      {selectedCafe.approval_status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-3">
                  <Button variant="outline" onClick={() => setShowDetailModal(false)}>Tutup</Button>
                  {canSuspend && (
                    <Button variant="destructive" onClick={() => setShowSuspendModal(true)}>
                      <ShieldOff className="size-4" />
                      Suspend Cafe
                    </Button>
                  )}
                  {selectedCafe.approval_status === 'suspended' && (
                    <Button onClick={handleUnsuspend} disabled={processing}>
                      Aktifkan Kembali
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Suspend Modal */}
        <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldOff className="size-4 text-destructive" />
                Suspend Cafe
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Alasan Suspend <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive/30 focus:border-destructive transition-all"
                  rows={3}
                  placeholder="Jelaskan alasan suspend..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Wajib diisi. Booking belum dibayar akan otomatis dibatalkan.
                </p>
              </div>
              <DialogFooter className="gap-2 sm:gap-3">
                <Button variant="outline" onClick={() => setShowSuspendModal(false)} disabled={processing}>Batal</Button>
                <Button variant="destructive" onClick={handleSuspend} disabled={!suspendReason.trim() || processing}>
                  <ShieldOff className="size-4" />
                  Suspend
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </>
  );
}