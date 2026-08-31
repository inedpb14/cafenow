import { Link, router, usePage } from '@inertiajs/react';
import {
    LogOut,
    Menu,
    X,
    LayoutDashboard,
    CheckSquare,
    Store,
    Star,
    Calendar,
    RotateCcw,
    BarChart3,
    Coins,
    Users,
    ClipboardList,
    ShieldCheck,
    Settings
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AdminLayoutProps {
  children: ReactNode;
  user?: { id: number; name: string; email: string; role: string; avatar?: string | null };
}

const MENU_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Persetujuan Cafe', href: '/admin/cafe-approvals', icon: CheckSquare },
  { label: 'Manajemen Cafe', href: '/admin/cafes', icon: Store },
  { label: 'Cafe Unggulan', href: '/admin/featured-cafes', icon: Star },
  { label: 'Booking & Pesanan', href: '/admin/bookings', icon: Calendar },
  { label: 'Pengembalian Dana', href: '/admin/refunds', icon: RotateCcw },
  { label: 'Analitik', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Komisi', href: '/admin/commissions', icon: Coins },
  { label: 'Pengguna', href: '/admin/users', icon: Users },
  { label: 'Log Audit', href: '/admin/audit-logs', icon: ClipboardList },
  { label: 'Pengaturan', href: '/settings/profile', icon: Settings },
];

export default function AdminLayout({ children, user: userProp }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('admin-sidebar-open');
    return stored !== null ? stored === '1' : window.innerWidth >= 768;
  });

  useEffect(() => {
    localStorage.setItem('admin-sidebar-open', sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);

  const { url, props } = usePage();
  const user = userProp ?? (props as any)?.auth?.user ?? { name: 'Admin', email: '' };

  const isActive = (href: string) => {
    if (href === '/settings/profile') return url.startsWith('/settings');
    return url === href || url.startsWith(href + '?');
  };

  const handleLogout = () => {
    router.post('/logout');
  };

  return (
    <div className="flex h-dvh bg-background text-foreground antialiased selection:bg-primary selection:text-white overflow-hidden">

      {/* Mobile Drawer Overlay Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static top-0 left-0 z-50 h-dvh w-[280px] bg-sidebar text-sidebar-foreground transition-all duration-300 overflow-hidden flex flex-col border-r border-sidebar-border shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0'}
        `}
      >
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <AppLogoIcon className="size-5 fill-current text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl font-bold tracking-tight text-sidebar-foreground">CafeNow</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="size-3" />
                <span>Super Admin</span>
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 text-sidebar-foreground/70 hover:text-sidebar-foreground cursor-pointer"
            aria-label="Tutup menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <Icon className={`size-4 shrink-0 ${active ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/60 group-hover:text-primary'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-sidebar-accent hover:bg-destructive/20 text-sidebar-foreground/80 hover:text-destructive rounded-xl border border-sidebar-border transition-colors cursor-pointer"
          >
            <LogOut className="size-4 text-destructive" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <header className="bg-card/90 border-b border-border/80 px-6 py-3.5 flex items-center justify-between backdrop-blur-md sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-accent rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Buka atau tutup menu navigasi"
            title={sidebarOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}
          >
            <Menu className="size-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-xs font-bold text-foreground">{user?.name || 'Super Admin'}</span>
              <span className="text-[10px] text-muted-foreground">{user?.email}</span>
            </div>
            <Avatar className="size-9 rounded-xl bg-muted">
              <AvatarImage src={user?.avatar ?? undefined} alt={user?.name ?? 'Admin'} className="rounded-xl" />
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-serif font-bold text-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 sm:p-8 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}