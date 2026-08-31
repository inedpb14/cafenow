import { useState, type ReactNode } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Coffee, Store, Menu as MenuIcon, X } from 'lucide-react';

interface PublicLayoutProps {
    children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
    const { auth } = usePage().props as any;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans antialiased selection:bg-[var(--primary)] selection:text-white flex flex-col justify-between">
            {/* HEADER NAVIGATION NAVBAR */}
            <header className="sticky top-0 z-50 bg-[var(--bg-warm)] border-b-2 border-[var(--text)] backdrop-blur-md bg-opacity-95">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    {/* Brand Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="flex h-11 w-11 items-center justify-center bg-[var(--primary)] text-white border-2 border-[var(--text)] shadow-[3px_3px_0_var(--text)] group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-all">
                            <Coffee className="size-6" />
                        </div>
                        <div>
                            <span className="font-serif text-2xl font-bold tracking-tight text-[var(--text)] block leading-none">CafeNow</span>
                            <span className="text-[10px] font-bold tracking-widest text-[var(--primary)] uppercase block mt-1">Smart Reservation</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider">
                        <Link href="/cafes" className="hover:text-[var(--primary)] transition-colors">Daftar Cafe</Link>
                        <a href="/#menu" className="hover:text-[var(--primary)] transition-colors">Pre-Order Menu</a>
                        <a href="/#about" className="hover:text-[var(--primary)] transition-colors">Cara Kerja</a>
                        <a href="/#reservation" className="hover:text-[var(--primary)] transition-colors">Mitra Owner</a>
                    </nav>

                    {/* Auth Action Buttons */}
                    <div className="hidden md:flex items-center gap-4">
                        {auth?.user ? (
                            <Link 
                                href={auth.user.role === 'owner' ? '/owner/dashboard' : auth.user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} 
                                className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2"
                            >
                                <Store className="size-4" />
                                <span>Dashboard Saya</span>
                            </Link>
                        ) : (
                            <>
                                <Link 
                                    href="/login" 
                                    className="btn-secondary text-xs py-2.5 px-5"
                                >
                                    Masuk
                                </Link>
                                <Link 
                                    href="/register" 
                                    className="btn-primary text-xs py-2.5 px-5"
                                >
                                    Daftar Akun
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Hamburger Button */}
                    <button 
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-[var(--text)] border-2 border-[var(--text)] bg-white shadow-[2px_2px_0_var(--text)] cursor-pointer"
                        aria-label="Toggle Navigation Menu"
                    >
                        {mobileMenuOpen ? <X className="size-6" /> : <MenuIcon className="size-6" />}
                    </button>
                </div>

                {/* Mobile Navigation Drawer */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t-2 border-[var(--text)] bg-[var(--bg-warm)] p-6 space-y-4 font-bold text-xs uppercase tracking-wider">
                        <Link href="/cafes" onClick={() => setMobileMenuOpen(false)} className="block py-2">Daftar Cafe</Link>
                        <a href="/#menu" onClick={() => setMobileMenuOpen(false)} className="block py-2">Pre-Order Menu</a>
                        <a href="/#about" onClick={() => setMobileMenuOpen(false)} className="block py-2">Cara Kerja</a>
                        <a href="/#reservation" onClick={() => setMobileMenuOpen(false)} className="block py-2">Mitra Owner</a>
                        <div className="pt-4 border-t-2 border-[var(--border)] flex flex-col gap-3">
                            {auth?.user ? (
                                <Link href="/dashboard" className="btn-primary text-center text-xs py-3">Dashboard Saya</Link>
                            ) : (
                                <>
                                    <Link href="/login" className="btn-secondary text-center text-xs py-3">Masuk</Link>
                                    <Link href="/register" className="btn-primary text-center text-xs py-3">Daftar Akun</Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1">
                {children}
            </main>

            {/* FOOTER */}
            <footer className="py-12 sm:py-16 px-6 bg-[var(--bg-dark)] text-white border-t-2 border-[var(--text)] mt-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center bg-[var(--primary)] text-white border border-white/20">
                                    <Coffee className="size-4" />
                                </div>
                                <span className="font-serif text-xl font-bold">CafeNow</span>
                            </div>
                            <p className="text-stone-400 text-xs max-w-xs leading-relaxed">
                                Solusi pintar reservasi meja & pesan menu cafe real-time terpercaya di Bandar Lampung.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider mb-4 text-amber-400">Jelajah</h4>
                            <ul className="space-y-2 text-xs text-stone-300">
                                <li><Link href="/cafes" className="hover:text-[var(--primary)] transition-colors">Cafe Terbaru</Link></li>
                                <li><Link href="/cafes?query=Pahoman" className="hover:text-[var(--primary)] transition-colors">Area Pahoman</Link></li>
                                <li><Link href="/cafes?query=Way+Halim" className="hover:text-[var(--primary)] transition-colors">Area Way Halim</Link></li>
                                <li><Link href="/cafes?query=Kedaton" className="hover:text-[var(--primary)] transition-colors">Area Kedaton</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider mb-4 text-amber-400">Fitur</h4>
                            <ul className="space-y-2 text-xs text-stone-300">
                                <li><a href="/#about" className="hover:text-[var(--primary)] transition-colors">Reservasi Meja</a></li>
                                <li><a href="/#menu" className="hover:text-[var(--primary)] transition-colors">Pre-Order Dapur</a></li>
                                <li><a href="/#reservation" className="hover:text-[var(--primary)] transition-colors">Portal Owner</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider mb-4 text-amber-400">Bantuan</h4>
                            <ul className="space-y-2 text-xs text-stone-300">
                                <li><a href="#" className="hover:text-[var(--primary)] transition-colors">Syarat & Ketentuan</a></li>
                                <li><a href="#" className="hover:text-[var(--primary)] transition-colors">Kebijakan Privasi</a></li>
                                <li><a href="#" className="hover:text-[var(--primary)] transition-colors">Hubungi Kami</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-stone-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-400">
                        <p>© 2026 CafeNow Indonesia. All rights reserved.</p>
                        <div className="flex items-center gap-6">
                            <span>Bandar Lampung, Indonesia</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
