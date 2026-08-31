import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Building2,
  Calendar as CalendarIcon,
  MapPin,
  Table2,
  Utensils,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/Contexts/ToastContext';
import { STATUS_FILTERS, statusBadgeClass, type CafeApproval } from '@/lib/cafe-approval';

interface CafeApprovalsProps {
  auth: { user: { id: number; name: string; email: string; role: string } };
}

export default function CafeApprovals({ auth }: CafeApprovalsProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [cafes, setCafes] = useState<CafeApproval[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCafes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set('status', status);
      const response = await fetch(`/api/admin/cafe-approvals?${params}`);
      const data = await response.json();
      setCafes(data.data || []);
      setTotalPages(data.pagination?.last_page || 1);
    } catch {
      toast.show('error', 'Gagal memuat data cafe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCafes(); }, [status, page]);

  return (
    <>
      <Head title="Persetujuan Cafe - CafeNow" />
      <AdminLayout user={user!}>
        <div className="space-y-6">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            Antrean Persetujuan Cafe
          </h1>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => { setStatus(f.key); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  status === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Cafe List */}
          <div className="grid gap-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner className="size-6 text-primary" />
              </div>
            ) : cafes.length > 0 ? (
              cafes.map((cafe) => (
                <Link
                  key={cafe.id}
                  href={`/admin/cafe-approvals/${cafe.id}`}
                  className="rounded-xl border border-border bg-card p-5 cursor-pointer hover:border-primary/50 transition-colors block"
                >
                  <div className="flex items-start gap-4">
                    {cafe.primary_photo ? (
                      <img src={cafe.primary_photo} alt={cafe.name} className="size-16 rounded-lg object-cover shrink-0 border border-border" />
                    ) : (
                      <div className="size-16 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        <Building2 className="size-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-foreground">{cafe.name}</h3>
                          {cafe.submission_count && cafe.submission_count > 1 && (
                            <span className="inline-block mt-1 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5">
                              Pengajuan ke-{cafe.submission_count}
                            </span>
                          )}
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                            <UserIcon className="size-3.5" />
                            Pemilik: {cafe.owner_name}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <MapPin className="size-3.5" />
                            {cafe.location}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            {cafe.tables && (
                              <span className="flex items-center gap-1"><Table2 className="size-3.5" /> {cafe.tables.length} meja</span>
                            )}
                            {cafe.menu_items && (
                              <span className="flex items-center gap-1"><Utensils className="size-3.5" /> {cafe.menu_items.length} menu</span>
                            )}
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="size-3.5" />
                              {new Date(cafe.created_at).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                        </div>
                        <Badge className={statusBadgeClass(cafe.status)}>{cafe.status.toUpperCase()}</Badge>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                Tidak ada data
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-muted-foreground">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Berikutnya
              </Button>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}