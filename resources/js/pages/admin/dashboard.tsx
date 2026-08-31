import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/Contexts/ToastContext';
import {
  Store,
  TrendingUp,
  Calendar,
  Clock,
  Users,
  ShoppingBag,
  Activity as ActivityIcon,
  ArrowUpRight,
  CheckSquare,
  RotateCcw,
  Coins,
  ClipboardList,
  RefreshCw
} from 'lucide-react';

interface DashboardProps {
  auth: { user: { id: number; name: string; email: string; role: string } };
  metrics: {
    totalCafes: number;
    revenueToday: number;
    activeBookings: number;
    pendingApprovals: number;
    newCustomers: number;
    newOrders: number;
  };
}

interface Activity {
  id: number;
  type: string;
  message: string;
  time: string;
}

export default function Dashboard({ metrics }: DashboardProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard/recent-activity');
      if (!res.ok) throw new Error('Gagal memuat aktivitas');
      const data = await res.json();
      setActivities(data.data || []);
    } catch {
      toast.show('error', 'Gagal memuat aktivitas terbaru');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return (
    <>
      <Head title="Dashboard Admin - CafeNow" />
      <AdminLayout user={user!}>
        <div className="space-y-8 max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Dashboard Admin</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Pantau performa platform, reservasi meja, dan pendaftaran cafe mitra di CafeNow.
              </p>
            </div>

            <button
              onClick={fetchActivities}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang Data</span>
            </button>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction
              href="/admin/cafe-approvals"
              icon={CheckSquare}
              title="Persetujuan Cafe"
              subtitle={`${metrics.pendingApprovals} perlu ditinjau`}
            />

            <QuickAction
              href="/admin/refunds"
              icon={RotateCcw}
              title="Antrean Refund"
              subtitle="Proses manual VA"
            />

            <QuickAction
              href="/admin/commissions"
              icon={Coins}
              title="Atur Komisi"
              subtitle="Aturan komisi"
            />

            <QuickAction
              href="/admin/audit-logs"
              icon={ClipboardList}
              title="Audit Logs"
              subtitle="Riwayat aksi admin"
            />
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Cafe Aktif"
              value={metrics.totalCafes}
              icon={Store}
              subtext="Terverifikasi & Aktif"
            />
            <MetricCard
              title="Pendapatan Hari Ini"
              value={formatCurrency(metrics.revenueToday)}
              icon={TrendingUp}
              subtext="Komisi Platform Hari Ini"
            />
            <MetricCard
              title="Booking Aktif / Pending"
              value={metrics.activeBookings}
              icon={Calendar}
              subtext="Reservasi Terjadwal"
            />
            <MetricCard
              title="Menunggu Persetujuan"
              value={metrics.pendingApprovals}
              icon={Clock}
              subtext="Registrasi Cafe Baru"
              highlight={metrics.pendingApprovals > 0}
            />
            <MetricCard
              title="Pelanggan Baru"
              value={metrics.newCustomers}
              icon={Users}
              subtext="Pendaftaran Pengguna"
            />
            <MetricCard
              title="Pesanan Menu Hari Ini"
              value={metrics.newOrders}
              icon={ShoppingBag}
              subtext="Pre-Order & Additional"
            />
          </div>

          {/* Recent Activity Feed Card */}
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <ActivityIcon className="size-5 text-primary" />
                <h2 className="font-serif text-lg font-bold text-foreground">Aktivitas Terbaru</h2>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Log Terbaru</span>
            </div>

            {loading ? (
              <div className="space-y-3 py-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-accent/60 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="divide-y divide-border/60">
                {activities.map((a) => (
                  <div key={a.id} className="py-3.5 flex items-center justify-between gap-4 group hover:bg-accent/40 px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <ArrowUpRight className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{a.message}</p>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">{a.type}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium shrink-0">{a.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Belum ada aktivitas tercatat hari ini.
              </div>
            )}
          </div>

        </div>
      </AdminLayout>
    </>
  );
}

function QuickAction({ href, icon: Icon, title, subtitle }: {
  href: string;
  icon: any;
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href} className="group rounded-xl border border-border/80 bg-card p-4 hover:border-primary/50 transition-all shadow-sm hover:shadow-md flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-foreground truncate">{title}</p>
        <span className="text-[10px] text-muted-foreground font-medium block truncate">{subtitle}</span>
      </div>
    </Link>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  subtext,
  highlight = false
}: {
  title: string;
  value: string | number;
  icon: any;
  subtext: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border ${highlight ? 'border-destructive/50 bg-destructive/5' : 'border-border/80 bg-card'} p-5 shadow-sm transition-shadow hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{title}</span>
        <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="size-4.5" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{subtext}</p>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}