import { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { 
    Search, 
    MapPin, 
    Calendar, 
    Coffee, 
    Clock, 
    Sparkles, 
    CheckCircle2, 
    ArrowRight, 
    Utensils, 
    ShieldCheck, 
    Store, 
    TrendingUp, 
    ChevronRight,
    Users,
    Star,
    Menu as MenuIcon,
    X,
    Layers,
    Award
} from 'lucide-react';

interface CafeItem {
    id: number;
    name: string;
    location: string;
    category: string;
    priceStarting: string;
    rating: string;
    bookingsCount: number;
    image: string;
    facilities: string[];
    badge: string;
    description: string;
}

interface MenuItem {
    name: string;
    category: string;
    price: string;
    image: string;
    desc: string;
}

interface WelcomeProps {
    cafes?: CafeItem[];
    menuItems?: MenuItem[];
    stats?: { cafesCount: number; bookingsCount: number; customersCount: number };
}

export default function Welcome({ cafes: dbCafes, menuItems: dbMenuItems, stats: dbStats }: WelcomeProps) {
    const { auth } = usePage().props as any;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Partnership Form State
    const [partnerForm, setPartnerForm] = useState({ cafe_name: '', owner_name: '', phone: '', area: '' });
    const [submittedPartner, setSubmittedPartner] = useState(false);

    // Cafes & Menu data strictly from DB props
    const cafesList: CafeItem[] = dbCafes ?? [];
    const menuItemsList: MenuItem[] = dbMenuItems ?? [];
    const statsData = dbStats ?? { cafesCount: 0, bookingsCount: 0, customersCount: 0 };

    // Dynamic Filtered Cafes
    const filteredCafes = cafesList.filter(cafe => {
        const matchesSearch = cafe.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              cafe.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              cafe.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || cafe.category.toLowerCase() === selectedCategory.toLowerCase();
        return matchesSearch && matchesCategory;
    });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const element = document.getElementById('cafes');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handlePartnerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        window.location.href = '/owner/register';
    };

    return (
        <div className="min-h-screen bg-[var(--bg-warm)] text-[var(--text)] font-sans antialiased selection:bg-[var(--primary)] selection:text-white">
            <Head title="CafeNow - Reservasi Meja & Pre-Order Cafe Real-Time di Bandar Lampung" />

            {/* HEADER NAVIGATION NAVBAR */}
            <header className="sticky top-0 z-50 bg-[var(--bg-warm)] border-b-2 border-[var(--text)] backdrop-blur-md bg-opacity-95">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    
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
                        <a href="cafes" className="hover:text-[var(--primary)] transition-colors">Daftar Cafe</a>
                        <a href="#menu" className="hover:text-[var(--primary)] transition-colors">Pre-Order Menu</a>
                        <a href="#about" className="hover:text-[var(--primary)] transition-colors">Cara Kerja</a>
                        <a href="#reservation" className="hover:text-[var(--primary)] transition-colors">Mitra Owner</a>
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
                        className="md:hidden p-2 text-[var(--text)] border-2 border-[var(--text)] bg-white shadow-[2px_2px_0_var(--text)]"
                    >
                        {mobileMenuOpen ? <X className="size-6" /> : <MenuIcon className="size-6" />}
                    </button>
                </div>

                {/* Mobile Navigation Drawer */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t-2 border-[var(--text)] bg-[var(--bg-warm)] p-6 space-y-4 font-bold text-xs uppercase tracking-wider">
                        <a href="cafes" onClick={() => setMobileMenuOpen(false)} className="block py-2">Daftar Cafe</a>
                        <a href="#menu" onClick={() => setMobileMenuOpen(false)} className="block py-2">Pre-Order Menu</a>
                        <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block py-2">Cara Kerja</a>
                        <a href="#reservation" onClick={() => setMobileMenuOpen(false)} className="block py-2">Mitra Owner</a>
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

            {/* HERO SECTION */}
            <section className="relative py-16 sm:py-24 px-6 border-b-2 border-[var(--text)] bg-gradient-to-b from-[var(--bg-warm)] to-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-12 gap-12 items-center">
                        
                        {/* Hero Left Copywriting */}
                        <div className="lg:col-span-7 space-y-8">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-100 border-2 border-[var(--text)] shadow-[2px_2px_0_var(--text)] text-xs font-bold uppercase tracking-wider">
                                <Sparkles className="size-4 text-[var(--primary)]" />
                                <span>Platform Reservasi Cafe #1 Bandar Lampung</span>
                            </div>

                            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-[var(--text)]">
                                Pesan Meja & Pre-Order Menu Cafe <span className="text-[var(--primary)] underline decoration-[var(--primary)] decoration-wavy">Tanpa Antre</span>
                            </h1>

                            <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed max-w-2xl font-medium">
                                Nikmati kemudahan reservasi meja favorit secara real-time, pilih slot jam kunjungan, dan pre-order sajian kopi serta makanan dapur terbaik sebelum Anda tiba di lokasi.
                            </p>

                            {/* Search Form Card */}
                            <form onSubmit={handleSearchSubmit} className="block-card p-4 sm:p-5 bg-white border-2 border-[var(--text)] space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    
                                    {/* Search Query Input */}
                                    <div className="sm:col-span-7 relative">
                                        <Search className="size-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        <input 
                                            type="text" 
                                            placeholder="Cari nama cafe / lokasi (misal: Pahoman, Way Halim)..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-stone-50 border-2 border-[var(--text)] text-xs font-semibold focus:outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>

                                    {/* Category Select */}
                                    <div className="sm:col-span-5">
                                        <select 
                                            value={selectedCategory}
                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                            className="w-full px-3.5 py-3 bg-stone-50 border-2 border-[var(--text)] text-xs font-semibold focus:outline-none focus:border-[var(--primary)] cursor-pointer"
                                        >
                                            <option value="all">Semua Suasana Cafe</option>
                                            <option value="coffee">Coffee Shop & Artisan</option>
                                            <option value="outdoor">Outdoor & Garden</option>
                                            <option value="coworking">Work & Study Corner</option>
                                            <option value="dining">Resto & Dining</option>
                                        </select>
                                    </div>

                                </div>

                                <button type="submit" className="w-full btn-primary py-3 text-xs flex items-center justify-center gap-2 cursor-pointer">
                                    <Search className="size-4" />
                                    <span>Cari Meja Tersedia Sekarang</span>
                                </button>
                            </form>

                            {/* Quick Badges */}
                            <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-[var(--text)] pt-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-4 text-emerald-600" />
                                    <span>Konfirmasi Instan 100%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="size-4 text-orange-600" />
                                    <span>Jaminan Garansi Meja</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="size-4 text-amber-600" />
                                    <span>Pre-Order Dapur Siap Saat Datang</span>
                                </div>
                            </div>
                        </div>

                        {/* Hero Right Visual Card */}
                        <div className="lg:col-span-5">
                            <div className="block-card p-4 sm:p-6 bg-white border-2 border-[var(--text)] relative">
                                <div className="relative aspect-4/3 overflow-hidden border-2 border-[var(--text)] mb-5">
                                    <img 
                                        src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80" 
                                        alt="CafeNow Feature Hero" 
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-3 left-3 bg-[var(--primary)] text-white text-[10px] font-extrabold px-3 py-1 uppercase border border-[var(--text)] shadow-[2px_2px_0_var(--text)]">
                                        Rekomendasi Utama
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider">Kopi Pahoman Artisan</span>
                                        <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                                            <Star className="size-4 fill-amber-500" />
                                            <span>4.9 (340 Reservasi)</span>
                                        </div>
                                    </div>

                                    <h3 className="font-serif text-xl font-bold text-[var(--text)]">Reservasi Meja VIP & Pre-Order Menu</h3>
                                    <p className="text-xs text-[var(--text-muted)]">Jl. Pahoman No. 42, Bandar Lampung</p>

                                    <div className="pt-3 border-t-2 border-[var(--border)] flex items-center justify-between">
                                        <span className="text-xs font-bold">Mulai Rp 35.000 / Tamu</span>
                                        <a href="cafes" className="btn-primary text-xs py-2 px-4 flex items-center gap-1">
                                            <span>Pesan Tempat</span>
                                            <ChevronRight className="size-3.5" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* REAL DATABASE STATS COUNTER BAR */}
            <section className="py-10 bg-[var(--bg-dark)] text-white border-b-2 border-[var(--text)]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center divide-y sm:divide-y-0 sm:divide-x divide-stone-800">
                        
                        <div className="p-4 space-y-1">
                            <span className="font-serif text-3xl sm:text-4xl font-extrabold text-amber-400">{statsData.cafesCount}+</span>
                            <p className="text-xs uppercase tracking-wider text-stone-300 font-bold">Mitra Cafe Terdaftar</p>
                        </div>

                        <div className="p-4 space-y-1">
                            <span className="font-serif text-3xl sm:text-4xl font-extrabold text-orange-400">{statsData.bookingsCount.toLocaleString('id-ID')}+</span>
                            <p className="text-xs uppercase tracking-wider text-stone-300 font-bold">Reservasi Meja Sukses</p>
                        </div>

                        <div className="p-4 space-y-1">
                            <span className="font-serif text-3xl sm:text-4xl font-extrabold text-emerald-400">{statsData.customersCount.toLocaleString('id-ID')}+</span>
                            <p className="text-xs uppercase tracking-wider text-stone-300 font-bold">Pengunjung Cafe Aktif</p>
                        </div>

                    </div>
                </div>
            </section>

            {/* FEATURED CAFES SECTION (`#cafes`) */}
            <section id="cafes" className="py-16 sm:py-24 px-6 border-b-2 border-[var(--text)]">
                <div className="max-w-7xl mx-auto space-y-12">
                    
                    <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b-2 border-[var(--text)] pb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-[2px] bg-[var(--primary)]"></div>
                                <span className="text-xs text-[var(--primary)] uppercase tracking-wider font-bold">Katalog Resmi Cafe</span>
                            </div>
                            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text)]">Pilihan Cafe & Resto Terfavorit</h2>
                            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">Jelajahi cafe terbaik dengan garansi ketersediaan meja real-time di Bandar Lampung.</p>
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'all', label: 'Semua' },
                                { id: 'coffee', label: 'Coffee Shop' },
                                { id: 'outdoor', label: 'Outdoor' },
                                { id: 'coworking', label: 'Work/Study' },
                                { id: 'dining', label: 'Dining' },
                            ].map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3.5 py-1.5 text-xs font-bold border-2 border-[var(--text)] transition-all cursor-pointer ${
                                        selectedCategory === cat.id
                                            ? 'bg-[var(--primary)] text-white shadow-[2px_2px_0_var(--text)]'
                                            : 'bg-white text-[var(--text)] hover:bg-stone-100'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cafes Cards Grid */}
                    {filteredCafes.length === 0 ? (
                        <div className="py-16 text-center bg-white border-2 border-[var(--text)] p-8">
                            <Coffee className="size-12 mx-auto text-stone-400 mb-2 stroke-1" />
                            <h4 className="text-base font-bold">Tidak ada cafe yang sesuai pencarian</h4>
                            <p className="text-xs text-[var(--text-muted)] mt-1">Coba sesuaikan kata kunci pencarian atau pilih kategori lain.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                            {filteredCafes.map((cafe) => (
                                <div key={cafe.id} className="block-card bg-white p-5 flex flex-col justify-between space-y-4 group">
                                    <div>
                                        {/* Image Box */}
                                        <div className="relative aspect-4/3 overflow-hidden border-2 border-[var(--text)] mb-4">
                                            <img 
                                                src={cafe.image} 
                                                alt={cafe.name} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <span className="absolute top-2 left-2 bg-[var(--primary)] text-white text-[10px] font-bold px-2 py-0.5 uppercase border border-[var(--text)] shadow-[2px_2px_0_var(--text)]">
                                                {cafe.badge}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">{cafe.category}</span>
                                                    {cafe.rating && (
                                                        <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                                                            <Star className="size-3.5 fill-amber-500" />
                                                            <span>{cafe.rating}</span>
                                                        </div>
                                                    )}
                                                </div>

                                            <h3 className="font-serif text-lg font-bold text-[var(--text)] leading-snug group-hover:text-[var(--primary)] transition-colors">
                                                {cafe.name}
                                            </h3>

                                            <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                                <MapPin className="size-3.5 text-stone-400 shrink-0" />
                                                <span className="truncate">{cafe.location}</span>
                                            </p>

                                            <p className="text-xs text-stone-600 line-clamp-2 mt-2 leading-relaxed">
                                                {cafe.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Footer Info & Action */}
                                    <div className="pt-3 border-t-2 border-[var(--border)] space-y-3">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-[var(--text-muted)] text-[10px] font-medium">Mulai Min. Spend</span>
                                            <span className="font-extrabold text-[var(--primary)]">{cafe.priceStarting}</span>
                                        </div>

                                        <Link 
                                            href={`/cafes/${cafe.id}`}
                                            className="w-full btn-primary text-xs py-2.5 text-center block cursor-pointer"
                                        >
                                            Pesan Meja Sekarang
                                        </Link>
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </section>

            {/* PRE-ORDER MENU HIGHLIGHTS SECTION (`#menu`) */}
            <section id="menu" className="py-16 sm:py-24 px-6 border-b-2 border-[var(--text)] bg-white">
                <div className="max-w-7xl mx-auto space-y-12">
                    
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border border-[var(--text)] text-xs font-bold uppercase tracking-wider">
                            <Utensils className="size-4 text-[var(--primary)]" />
                            <span>Fitur Pre-Order Dapur Live</span>
                        </div>
                        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text)]">Sajian Menu Khas Siap Disajikan</h2>
                        <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                            Pesan makanan & minuman favorit Anda sekaligus saat melakukan booking meja. Makanan langsung dimasak sesuai jadwal kedatangan Anda.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {menuItemsList.length === 0 ? (
                            <div className="col-span-full py-12 text-center bg-white border-2 border-[var(--text)] p-8">
                                <Utensils className="size-12 mx-auto text-stone-400 mb-2 stroke-1" />
                                <h4 className="text-base font-bold">Belum ada menu ditambahkan</h4>
                                <p className="text-xs text-[var(--text-muted)] mt-1">Menu pre-order akan muncul di sini setelah cafe mitra mendaftarkannya.</p>
                            </div>
                        ) : menuItemsList.map((item, idx) => (
                            <div key={idx} className="block-card p-4 bg-[var(--bg-warm)] flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="relative aspect-square overflow-hidden border-2 border-[var(--text)] mb-3">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 border border-[var(--text)]">
                                            {item.category}
                                        </span>
                                    </div>
                                    <h4 className="font-serif text-base font-bold text-[var(--text)]">{item.name}</h4>
                                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">{item.desc}</p>
                                </div>
                                <div className="pt-2 border-t-2 border-[var(--border)] flex items-center justify-between">
                                    <span className="font-extrabold text-sm text-[var(--primary)]">{item.price}</span>
                                    <span className="text-[10px] font-bold text-stone-500 uppercase">Pre-Order Ready</span>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </section>

            {/* HOW IT WORKS SECTION (`#about`) */}
            <section id="about" className="py-16 sm:py-24 px-6 border-b-2 border-[var(--text)]">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border border-[var(--text)] text-xs font-bold uppercase tracking-wider">
                            <Award className="size-4 text-[var(--primary)]" />
                            <span>Kemudahan 3 Langkah Mudah</span>
                        </div>
                        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text)]">Cara Kerja Reservasi di CafeNow</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="block-card p-6 bg-white space-y-3 text-center flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white font-bold text-xl flex items-center justify-center border-2 border-[var(--text)] shadow-[3px_3px_0_var(--text)] mb-2">
                                1
                            </div>
                            <h3 className="font-bold text-base">Pilih Cafe & Meja Favorit</h3>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                Cari cafe berdasarkan area, suasana, atau fasilitas. Pilih denah meja indoor, outdoor, atau VIP sesuai kapasitas tamu.
                            </p>
                        </div>

                        <div className="block-card p-6 bg-white space-y-3 text-center flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white font-bold text-xl flex items-center justify-center border-2 border-[var(--text)] shadow-[3px_3px_0_var(--text)] mb-2">
                                2
                            </div>
                            <h3 className="font-bold text-base">Atur Slot Jam & Pre-Order Menu</h3>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                Tentukan tanggal dan slot jam kedatangan Anda. Opsional tambahkan pre-order makanan & minuman agar langsung dimasak koki.
                            </p>
                        </div>

                        <div className="block-card p-6 bg-white space-y-3 text-center flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white font-bold text-xl flex items-center justify-center border-2 border-[var(--text)] shadow-[3px_3px_0_var(--text)] mb-2">
                                3
                            </div>
                            <h3 className="font-bold text-base">Check-In Instan & Santai</h3>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                Datang tepat waktu ke lokasi cafe, tunjukkan tiket booking digital di hp Anda, dan nikmati meja tanpa perlu mengantre.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* OWNER PARTNERSHIP SECTION (`#reservation`) */}
            <section id="reservation" className="py-16 sm:py-24 px-6 bg-[var(--bg-dark)] text-white border-b-2 border-[var(--text)]">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-10 sm:gap-14 items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-12 h-[2px] bg-[var(--primary)]"></div>
                                <span className="text-xs text-[var(--primary)] uppercase tracking-wider font-bold">Portal Pemilik Cafe</span>
                            </div>

                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-stone-100">
                                Tingkatkan Revenue Cafe Anda dengan Sistem Smart Reservation
                            </h2>

                            <p className="text-stone-300 text-sm mb-8 leading-relaxed">
                                Bergabunglah sebagai mitra CafeNow. Kelola reservasi meja, atur surge pricing jam sibuk, terima pesanan pre-order dapur, dan pantau laporan bisnis harian secara real-time.
                            </p>

                            <div className="space-y-4 text-xs text-stone-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-[var(--primary)] flex items-center justify-center shrink-0 border border-white/20">
                                        <Layers className="w-4 h-4 text-white" />
                                    </div>
                                    <span>Manajemen Meja & Dynamic Pricing Jam Sibuk</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-[var(--primary)] flex items-center justify-center shrink-0 border border-white/20">
                                        <Utensils className="w-4 h-4 text-white" />
                                    </div>
                                    <span>Monitoring Live Kitchen Order Screen</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-[var(--primary)] flex items-center justify-center shrink-0 border border-white/20">
                                        <TrendingUp className="w-4 h-4 text-white" />
                                    </div>
                                    <span>Laporan Pendapatan Bersih (Net Revenue Automated 85%)</span>
                                </div>
                            </div>
                        </div>

                        {/* Partnership Registration Form Card */}
                        <div className="bg-white text-[var(--text)] p-6 sm:p-8 border-2 border-[var(--text)] shadow-[6px_6px_0_var(--text)]">
                            <h3 className="text-xl font-bold mb-2">Daftarkan Cafe Anda Sekarang</h3>
                            <p className="text-xs text-[var(--text-muted)] mb-6">
                                Isi formulir singkat ini dan tim operasional CafeNow akan segera menghubungi Anda untuk verifikasi lokasi.
                            </p>

                            {submittedPartner ? (
                                <div className="p-6 bg-emerald-50 border-2 border-emerald-600 text-emerald-900 space-y-3 text-center">
                                    <CheckCircle2 className="size-10 text-emerald-600 mx-auto" />
                                    <h4 className="font-bold text-sm">Pengajuan Kemitraan Berhasil Dikirim!</h4>
                                    <p className="text-xs text-emerald-800">
                                        Terima kasih <strong>{partnerForm.owner_name || 'Pemilik Cafe'}</strong>. Tim kemitraan CafeNow akan menghubungi nomor WhatsApp Anda dalam kurun 1x24 jam.
                                    </p>
                                    <Link href="/register" className="btn-primary text-xs py-2 px-4 inline-block mt-2">
                                        Daftar Akun Owner
                                    </Link>
                                </div>
                            ) : (
                                <form onSubmit={handlePartnerSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5">Nama Cafe / Usaha</label>
                                        <input 
                                            type="text" 
                                            required 
                                            value={partnerForm.cafe_name}
                                            onChange={(e) => setPartnerForm({ ...partnerForm, cafe_name: e.target.value })}
                                            placeholder="Contoh: Kopi Pahoman Artisan" 
                                            className="w-full px-3.5 py-2.5 text-xs border-2 border-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold mb-1.5">Nama Pemilik / Manager</label>
                                            <input 
                                                type="text" 
                                                required 
                                                value={partnerForm.owner_name}
                                                onChange={(e) => setPartnerForm({ ...partnerForm, owner_name: e.target.value })}
                                                placeholder="Nama Anda" 
                                                className="w-full px-3.5 py-2.5 text-xs border-2 border-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold mb-1.5">No. WhatsApp</label>
                                            <input 
                                                type="tel" 
                                                required 
                                                value={partnerForm.phone}
                                                onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                                                placeholder="0812XXXXXXXX" 
                                                className="w-full px-3.5 py-2.5 text-xs border-2 border-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1.5">Kecamatan / Area Cafe</label>
                                        <input 
                                            type="text" 
                                            required 
                                            value={partnerForm.area}
                                            onChange={(e) => setPartnerForm({ ...partnerForm, area: e.target.value })}
                                            placeholder="Contoh: Pahoman, Bandar Lampung" 
                                            className="w-full px-3.5 py-2.5 text-xs border-2 border-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>
                                    <button type="submit" className="w-full btn-primary text-xs py-3 cursor-pointer">
                                        Kirim Pengajuan Kemitraan
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* TESTIMONIALS SECTION */}
            <section className="py-16 sm:py-24 px-6 border-b-2 border-[var(--text)] bg-white">
                <div className="max-w-6xl mx-auto space-y-12">
                    <div className="text-center max-w-md mx-auto space-y-2">
                        <div className="flex justify-center text-amber-500 mb-1">
                            <Star className="size-6 fill-amber-500" />
                        </div>
                        <h2 className="font-serif text-3xl font-bold text-[var(--text)]">Pengalaman Pelanggan Kami</h2>
                        <p className="text-xs text-[var(--text-muted)]">Apa kata para pengunjung cafe di Bandar Lampung tentang layanan CafeNow.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="block-card p-6 bg-[var(--bg-warm)] flex flex-col justify-between">
                            <div>
                                <div className="flex gap-1 text-amber-500 mb-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="size-4 fill-amber-500" />
                                    ))}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">
                                    "Sangat membantu saat mau nugas akhir pekan. Saya sudah pesan tempat di Kedaton Coffee dari rumah, pas sampai meja sudah ready dengan stop kontak aktif!"
                                </p>
                            </div>
                            <div className="border-t-2 border-[var(--border)] pt-3">
                                <p className="font-bold text-xs">Rizky Ramadhan</p>
                                <p className="text-[10px] text-[var(--text-muted)]">Mahasiswa Universitas Lampung</p>
                            </div>
                        </div>

                        <div className="block-card p-6 bg-[var(--bg-warm)] flex flex-col justify-between">
                            <div>
                                <div className="flex gap-1 text-amber-500 mb-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="size-4 fill-amber-500" />
                                    ))}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">
                                    "Biasa kalau malam minggu cari cafe outdoor selalu kehabisan meja. Pakai CafeNow tinggal pilih jam, bayar dp, beres tanpa drama nunggu jam-jaman."
                                </p>
                            </div>
                            <div className="border-t-2 border-[var(--border)] pt-3">
                                <p className="font-bold text-xs">Clarissa Amalia</p>
                                <p className="text-[10px] text-[var(--text-muted)]">Content Creator Bandar Lampung</p>
                            </div>
                        </div>

                        <div className="block-card p-6 bg-[var(--bg-warm)] flex flex-col justify-between">
                            <div>
                                <div className="flex gap-1 text-amber-500 mb-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="size-4 fill-amber-500" />
                                    ))}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">
                                    "Fitur pre-order makanannya top banget! Jadi pas kita kumpul rapat kantor di cafe, steak dan minumannya langsung keluar begitu semua datang."
                                </p>
                            </div>
                            <div className="border-t-2 border-[var(--border)] pt-3">
                                <p className="font-bold text-xs">Ahmad Subagyo</p>
                                <p className="text-[10px] text-[var(--text-muted)]">Professional Executive</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-12 sm:py-16 px-6 bg-[var(--bg-dark)] text-white border-t-2 border-[var(--text)]">
                <div className="max-w-6xl mx-auto">
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
                                <li><a href="cafes" className="hover:text-[var(--primary)] transition-colors">Cafe Terbaru</a></li>
                                <li><a href="cafes" className="hover:text-[var(--primary)] transition-colors">Area Pahoman</a></li>
                                <li><a href="cafes" className="hover:text-[var(--primary)] transition-colors">Area Way Halim</a></li>
                                <li><a href="cafes" className="hover:text-[var(--primary)] transition-colors">Area Kedaton</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider mb-4 text-amber-400">Fitur</h4>
                            <ul className="space-y-2 text-xs text-stone-300">
                                <li><a href="#about" className="hover:text-[var(--primary)] transition-colors">Reservasi Meja</a></li>
                                <li><a href="#menu" className="hover:text-[var(--primary)] transition-colors">Pre-Order Dapur</a></li>
                                <li><a href="#reservation" className="hover:text-[var(--primary)] transition-colors">Portal Owner</a></li>
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
