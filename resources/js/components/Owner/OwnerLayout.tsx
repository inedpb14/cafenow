import React, { ReactNode, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { 
    LayoutDashboard, 
    Store, 
    Layers, 
    Utensils, 
    Calendar, 
    ChefHat, 
    // BarChart3, 
    LogOut, 
    Coffee,
    ChevronRight,
    ChevronDown,
    Menu,
    X,
    Bell,
    PanelLeftClose,
    PanelLeftOpen,
    Info,
    Settings
} from 'lucide-react';

interface OwnerLayoutProps {
    children: ReactNode;
    title?: string;
    breadcrumbs?: { title: string; href?: string }[];
}

export default function OwnerLayout({ children, breadcrumbs }: OwnerLayoutProps) {
    const { url, props } = usePage();
    const auth = (props as any).auth || {};
    const user = auth.user || { name: 'Owner Cafe', email: 'owner@cafenow.id' };
    const cafeStatus = (props as any).cafe_status;
    // ponytail: matches backend gate — unlocks when at least one cafe is active/approved
    const cafeLocked = cafeStatus !== 'active' && cafeStatus !== 'approved';

    // State for Collapsible Sidebar & Dropdown
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [cafeSubmenuOpen, setCafeSubmenuOpen] = useState(() => url.startsWith('/owner/cafes'));

    const isCafeSectionActive = url.startsWith('/owner/cafes');

    const navItems = [
        { name: 'Dashboard Utama', href: '/owner/dashboard', icon: LayoutDashboard },
        { name: 'Daftar Booking', href: '/owner/bookings', icon: Calendar },
        { name: 'Order Dapur Live', href: '/owner/orders', icon: ChefHat },
        // { name: 'Analitik Bisnis', href: '/owner/analytics', icon: BarChart3 },
        { name: 'Pengaturan', href: '/settings/profile', icon: Settings },
    ];

    const isActive = (href: string) => {
        if (href === '/owner/dashboard') return url === '/owner/dashboard';
        if (href === '/settings/profile') return url.startsWith('/settings');
        return url.startsWith(href);
    };

    const renderNavLinks = (isMobile = false) => (
        <nav className="p-3 space-y-1.5">
            <div className={`px-3 py-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest ${!sidebarOpen && !isMobile ? 'hidden' : 'block'}`}>
                Operasional Cafe
            </div>

            {/* 1. Dashboard Utama */}
            {!cafeLocked && (
                <Link
                    href="/owner/dashboard"
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        isActive('/owner/dashboard')
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 font-bold'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                    }`}
                    title="Dashboard Utama"
                >
                    <LayoutDashboard className={`size-4 shrink-0 ${isActive('/owner/dashboard') ? 'text-white' : 'text-stone-500'}`} />
                    {(sidebarOpen || isMobile) && <span>Dashboard Utama</span>}
                </Link>
            )}

            {/* 2. Profil & Info Cafe Dropdown Menu */}
            <div>
                <button
                    onClick={() => setCafeSubmenuOpen(!cafeSubmenuOpen)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        isCafeSectionActive && !cafeSubmenuOpen
                            ? 'bg-orange-100 text-orange-800 font-bold border border-orange-200'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                    }`}
                    title="Profil & Info Cafe"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <Store className={`size-4 shrink-0 ${isCafeSectionActive ? 'text-orange-600' : 'text-stone-500'}`} />
                        {(sidebarOpen || isMobile) && <span className="truncate font-semibold">Profil & Info Cafe</span>}
                    </div>
                    {(sidebarOpen || isMobile) && (
                        <ChevronDown className={`size-3.5 text-stone-400 transition-transform duration-200 shrink-0 ${cafeSubmenuOpen ? 'rotate-180' : ''}`} />
                    )}
                </button>

                {/* Submenu Items (Indented & Styled) */}
                {cafeSubmenuOpen && (sidebarOpen || isMobile) && (
                    <div className="ml-4 pl-3 border-l-2 border-orange-200/80 my-1 space-y-1">
                        <Link
                            href="/owner/cafes"
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                url === '/owner/cafes'
                                    ? 'bg-orange-500 text-white shadow-sm font-bold'
                                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                            }`}
                        >
                            <Info className="size-3.5 shrink-0" />
                            <span>Informasi Cafe</span>
                        </Link>
                        {!cafeLocked && (
                            <>
                                <Link
                                    href="/owner/cafes/tables"
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                        url.startsWith('/owner/cafes/tables')
                                            ? 'bg-orange-500 text-white shadow-sm font-bold'
                                            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                                    }`}
                                >
                                    <Layers className="size-3.5 shrink-0" />
                                    <span>Meja & Surge</span>
                                </Link>
                                <Link
                                    href="/owner/cafes/menus"
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                        url.startsWith('/owner/cafes/menus')
                                            ? 'bg-orange-500 text-white shadow-sm font-bold'
                                            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                                    }`}
                                >
                                    <Utensils className="size-3.5 shrink-0" />
                                    <span>Menu Dapur</span>
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* 3. Other Main Nav Items */}
            {!cafeLocked && navItems.slice(1).map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                            active
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 font-bold'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                        }`}
                        title={item.name}
                    >
                        <Icon className={`size-4 shrink-0 ${active ? 'text-white' : 'text-stone-500'}`} />
                        {(sidebarOpen || isMobile) && <span>{item.name}</span>}
                    </Link>
                );
            })}
        </nav>
    );

    return (
        <div className="min-h-screen bg-stone-50 text-stone-900 flex antialiased font-sans">
            
            {/* DESKTOP COLLAPSIBLE SIDEBAR (FIXED TO VIEWPORT HEIGHT 100vh) */}
            <aside 
                className="hidden md:flex sticky top-0 h-screen overflow-hidden bg-white border-r border-stone-200/80 flex-col justify-between shrink-0 transition-all duration-300 shadow-sm z-40"
                style={{ width: sidebarOpen ? '16rem' : '4rem' }}
            >
                <div className="flex flex-col h-full overflow-y-auto">
                    {/* Brand Header */}
                    <div className={`border-b border-stone-200/80 flex items-center shrink-0 ${sidebarOpen ? 'p-5 justify-between' : 'p-3 justify-center'}`}>
                        <Link href="/owner/dashboard" className={`flex items-center overflow-hidden ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20 shrink-0">
                                <Coffee className="size-5" />
                            </div>
                            {sidebarOpen && (
                                <div>
                                    <span className="font-serif text-lg font-bold tracking-tight text-stone-900 block truncate">CafeNow</span>
                                    <span className="text-[10px] font-bold text-orange-600 tracking-wider uppercase block truncate">Owner Portal</span>
                                </div>
                            )}
                        </Link>
                    </div>

                    {/* Nav Links */}
                    <div className="flex-1">{renderNavLinks(false)}</div>
                </div>

                {/* Footer User Profile & Logout */}
                <div className={`border-t border-stone-200/80 space-y-3 shrink-0 ${sidebarOpen ? 'p-4' : 'p-3'}`}>
                    <div className={`flex items-center px-1 py-1 ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
                        <div className="h-9 w-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 font-bold text-xs shrink-0">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'O'}
                        </div>
                        {sidebarOpen && (
                            <div className="overflow-hidden text-ellipsis">
                                <p className="text-xs font-bold text-stone-800 truncate">{user.name}</p>
                                <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
                            </div>
                        )}
                    </div>
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors border border-rose-200 bg-white cursor-pointer"
                        title="Keluar Akun"
                    >
                        <LogOut className="size-3.5 shrink-0" />
                        {sidebarOpen && <span>Keluar Akun</span>}
                    </Link>
                </div>
            </aside>

            {/* MOBILE DRAWER OVERLAY */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
                    <div className="relative flex-1 max-w-xs w-full bg-white h-full flex flex-col justify-between p-4 z-50 shadow-xl overflow-y-auto">
                        <div>
                            <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white">
                                        <Coffee className="size-5" />
                                    </div>
                                    <span className="font-serif text-base font-bold text-stone-900">CafeNow Owner</span>
                                </div>
                                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-stone-500 hover:text-stone-900">
                                    <X className="size-5" />
                                </button>
                            </div>
                            {renderNavLinks(true)}
                        </div>

                        <div className="border-t border-stone-200 pt-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-orange-100 text-orange-600 font-bold text-xs flex items-center justify-center">
                                    {user.name ? user.name.charAt(0).toUpperCase() : 'O'}
                                </div>
                                <div className="truncate">
                                    <p className="text-xs font-bold text-stone-800 truncate">{user.name}</p>
                                    <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
                                </div>
                            </div>
                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 bg-white"
                            >
                                <LogOut className="size-3.5" />
                                <span>Keluar Akun</span>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-stone-50">
                
                {/* Top Header */}
                <header className="h-16 border-b border-stone-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
                    {/* Toggle Button & Breadcrumbs */}
                    <div className="flex items-center gap-3">
                        {/* Desktop Toggle Button */}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="hidden md:flex items-center justify-center h-9 w-9 rounded-xl border border-stone-200 bg-stone-50 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                            title={sidebarOpen ? 'Kecilkan Sidebar' : 'Buka Sidebar'}
                        >
                            {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
                        </button>

                        {/* Mobile Toggle Button */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl border border-stone-200 bg-stone-50 text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                        >
                            <Menu className="size-5" />
                        </button>

                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-stone-500">
                            <Link href="/owner/dashboard" className="hover:text-stone-900 transition-colors font-medium">Owner</Link>
                            {breadcrumbs && breadcrumbs.map((bc, idx) => (
                                <React.Fragment key={idx}>
                                    <ChevronRight className="size-3 text-stone-400" />
                                    {bc.href ? (
                                        <Link href={bc.href} className="hover:text-stone-900 transition-colors font-medium">{bc.title}</Link>
                                    ) : (
                                        <span className="text-orange-600 font-semibold">{bc.title}</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Status Badge & Notifications */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>System Active</span>
                        </span>
                        <div className="flex items-center justify-center h-9 w-9 rounded-xl border border-stone-200 bg-stone-50 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer relative">
                            <Bell className="size-4" />
                            <span className="absolute top-2 right-2 size-2 rounded-full bg-orange-500" />
                        </div>
                    </div>
                </header>

                {/* Main Viewport Content */}
                <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
                    {cafeLocked && (
                        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3.5 flex items-start gap-3">
                            <Info className="size-4.5 shrink-0 mt-0.5 text-amber-600" />
                            <div className="text-xs text-amber-800">
                                <p className="font-bold text-amber-900">Cafe Anda belum disetujui</p>
                                <p className="mt-0.5">Lengkapi profil cafe lalu kirim untuk disetujui admin. Fitur booking, order dapur, dan analitik baru aktif setelah cafe disetujui.</p>
                            </div>
                        </div>
                    )}
                    {children}
                </main>
            </div>

        </div>
    );
}
