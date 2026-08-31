import { useState, type ReactNode } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { 
    Coffee, 
    LayoutGrid, 
    Calendar, 
    Utensils, 
    Heart, 
    Bell, 
    Settings, 
    Home, 
    LogOut, 
    Menu as MenuIcon, 
    X,
    ChevronLeft,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';

interface CustomerLayoutProps {
    children: ReactNode;
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
    const { auth } = usePage().props as any;
    const currentPath = usePage().url;
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer
    const [collapsed, setCollapsed] = useState(false); // Desktop collapsible mode

    const navItems = [
        { name: 'Dashboard', href: '/customer/dashboard', icon: LayoutGrid, match: '/customer/dashboard' },
        { name: 'Reservasi Saya', href: '/customer/bookings', icon: Calendar, match: '/customer/bookings' },
        { name: 'Pesanan Dapur', href: '/customer/orders', icon: Utensils, match: '/customer/orders' },
        { name: 'Cafe Favorit', href: '/customer/favorites', icon: Heart, match: '/customer/favorites' },
        { name: 'Notifikasi', href: '/customer/notifications', icon: Bell, match: '/customer/notifications' },
        { name: 'Pengaturan Akun', href: '/settings/profile', icon: Settings, match: '/settings' },
    ];

    const isCurrent = (matchPath: string) => {
        return currentPath.startsWith(matchPath);
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans antialiased flex flex-col md:flex-row">
            
            {/* Mobile Header Topbar */}
            <div className="md:hidden sticky top-0 z-40 bg-[var(--bg-warm)] border-b-2 border-[var(--text)] px-4 py-3 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="flex h-9 w-9 items-center justify-center bg-[var(--primary)] text-white border-2 border-[var(--text)] shadow-[2px_2px_0_var(--text)] group-hover:rotate-6 transition-transform">
                        <Coffee className="size-5" />
                    </div>
                    <span className="font-serif text-xl font-bold">CafeNow</span>
                </Link>
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 border-2 border-[var(--text)] bg-white shadow-[2px_2px_0_var(--text)] active:scale-95 transition-transform cursor-pointer"
                    aria-label="Toggle Navigation Menu"
                >
                    {sidebarOpen ? <X className="size-5" /> : <MenuIcon className="size-5" />}
                </button>
            </div>

            {/* Mobile Sidebar Overlay Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside className={`
                fixed md:sticky top-0 left-0 z-50 h-screen bg-[var(--bg-warm)] border-r-2 border-[var(--text)] flex flex-col justify-between p-4 sm:p-6 transition-all duration-300 ease-in-out shrink-0
                ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
                ${collapsed ? 'md:w-20 md:px-3' : 'md:w-64'}
            `}>
                <div className="space-y-8">
                    {/* Brand Logo & Mobile Close */}
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-3 group min-w-0 overflow-hidden">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[var(--primary)] text-white border-2 border-[var(--text)] shadow-[3px_3px_0_var(--text)] group-hover:rotate-12 transition-transform duration-300">
                                <Coffee className="size-6" />
                            </div>
                            {!collapsed && (
                                <div className="transition-opacity duration-200">
                                    <span className="font-serif text-xl font-bold tracking-tight text-[var(--text)] block leading-none">CafeNow</span>
                                    <span className="text-[9px] font-bold tracking-widest text-[var(--primary)] uppercase block mt-1">Customer Portal</span>
                                </div>
                            )}
                        </Link>
                        <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 text-[var(--text)] hover:scale-110 transition-transform">
                            <X className="size-5" />
                        </button>
                    </div>

                    {/* Navigation Items */}
                    <nav className="space-y-2">
                        {navItems.map((item) => {
                            const active = isCurrent(item.match);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    title={collapsed ? item.name : undefined}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                                        group flex items-center gap-3 py-3 text-xs font-bold transition-all duration-200 border-2 border-[var(--text)]
                                        ${collapsed ? 'justify-center px-0' : 'px-4'}
                                        ${active 
                                            ? 'bg-[var(--primary)] text-white shadow-[3px_3px_0_var(--text)] -translate-y-0.5' 
                                            : 'bg-white text-[var(--text)] hover:bg-stone-100 hover:shadow-[3px_3px_0_var(--text)] hover:-translate-y-0.5'
                                        }
                                    `}
                                >
                                    <Icon className="size-4 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                                    {!collapsed && <span className="truncate">{item.name}</span>}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Sidebar Bottom / Profile */}
                <div className="pt-4 border-t-2 border-[var(--text)] space-y-3">
                    <Link
                        href="/"
                        title={collapsed ? "Kembali ke Beranda" : undefined}
                        className={`
                            flex items-center text-xs font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-all duration-200 group
                            ${collapsed ? 'justify-center py-2' : 'justify-between px-3 py-2'}
                        `}
                    >
                        <span className="flex items-center gap-2">
                            <Home className="size-4 group-hover:scale-110 transition-transform" />
                            {!collapsed && <span>Kembali ke Beranda</span>}
                        </span>
                        {!collapsed && <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />}
                    </Link>

                    <div className={`
                        p-2.5 bg-white border-2 border-[var(--text)] shadow-[2px_2px_0_var(--text)] flex items-center transition-all duration-200
                        ${collapsed ? 'justify-center' : 'justify-between'}
                    `}>
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-amber-200 border border-[var(--text)] flex items-center justify-center font-bold text-xs shrink-0 hover:rotate-12 transition-transform">
                                {auth?.user?.name ? auth.user.name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            {!collapsed && (
                                <div className="truncate text-xs">
                                    <p className="font-bold truncate text-[var(--text)]">{auth?.user?.name || 'Pelanggan'}</p>
                                    <p className="text-[10px] text-[var(--text-muted)] truncate">{auth?.user?.email}</p>
                                </div>
                            )}
                        </div>
                        {!collapsed && (
                            <Link
                                href="/logout"
                                className="p-1 text-red-600 hover:bg-red-50 hover:scale-110 transition-all"
                                title="Keluar"
                            >
                                <LogOut className="size-4" />
                            </Link>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Body */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Desktop Top Header Bar with Sidebar Collapse Toggle */}
                <header className="hidden md:flex h-16 bg-[var(--bg-warm)] border-b-2 border-[var(--text)] px-6 lg:px-8 items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Sidebar Desktop Toggle Button */}
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="p-2 border-2 border-[var(--text)] bg-white shadow-[2px_2px_0_var(--text)] hover:shadow-[3px_3px_0_var(--text)] hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                            title={collapsed ? "Buka Sidebar Navigation" : "Tutup/Kecilkan Sidebar Navigation"}
                        >
                            {collapsed ? <PanelLeftOpen className="size-4 text-[var(--primary)]" /> : <PanelLeftClose className="size-4 text-[var(--text)]" />}
                        </button>

                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
                            <Link href="/customer/dashboard" className="hover:text-[var(--primary)] transition-colors">Portal Pelanggan</Link>
                            <span>/</span>
                            <span className="text-[var(--text)] uppercase tracking-wider">Dashboard</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold">
                        <Link
                            href="/cafes"
                            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                        >
                            <Coffee className="size-3.5" />
                            <span>Pesan Meja Cafe</span>
                        </Link>
                    </div>
                </header>

                {/* Page Content Render with Smooth Fade-in Entry */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {children}
                </main>
            </div>

        </div>
    );
}
