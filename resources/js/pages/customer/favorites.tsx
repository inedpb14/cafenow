import { Head, Link, router } from '@inertiajs/react';
import { Heart, MapPin, Star, Coffee, ChevronRight, Trash2 } from 'lucide-react';

interface FavoritesProps {
    favorites: any[];
}

export default function CustomerFavorites({ favorites = [] }: FavoritesProps) {
    const formatPrice = (price: number) => {
        return 'Rp ' + (price || 0).toLocaleString('id-ID');
    };

    const handleToggleFavorite = (cafeId: number) => {
        router.post(`/customer/favorites/${cafeId}/toggle`, {}, { preserveState: true });
    };

    return (
        <>
            <Head title="Cafe Favorit Saya - CafeNow" />

            <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
                {/* Header Banner */}
                <div className="block-card p-6 sm:p-8 bg-[var(--bg-warm)] border-2 border-[var(--text)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-[6px_6px_0_var(--text)] transition-all">
                    <div>
                        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text)]">
                            Koleksi Cafe Favorit Saya
                        </h1>
                        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                            Akses cepat ke tempat nongkrong dan work/study favorit Anda di Bandar Lampung.
                        </p>
                    </div>
                    <Link href="/cafes" className="btn-primary text-xs py-2.5 px-5 shrink-0 hover:scale-105 active:scale-95 transition-transform">
                        + Cari Cafe Lainnya
                    </Link>
                </div>

                {/* Favorites Cards Grid with Dynamic Hover & Scale Micro-Animations */}
                {favorites.length === 0 ? (
                    <div className="block-card p-12 bg-white border-2 border-[var(--text)] text-center space-y-4">
                        <Heart className="size-12 text-[var(--text-muted)] mx-auto stroke-1 animate-pulse text-red-400" />
                        <h3 className="font-serif text-xl font-bold text-[var(--text)]">Belum Ada Cafe Favorit</h3>
                        <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-sm mx-auto">
                            Tandai cafe kesukaan Anda dengan mengeklik ikon hati agar tersimpan di daftar ini.
                        </p>
                        <Link href="/cafes" className="btn-primary text-xs py-2.5 px-6 inline-block mt-2 hover:scale-105 active:scale-95 transition-transform">
                            Jelajahi Katalog Cafe
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favorites.map((fav) => {
                            const cafe = fav.cafe;
                            if (!cafe) return null;
                            return (
                                <div key={fav.id} className="block-card bg-white p-5 border-2 border-[var(--text)] flex flex-col justify-between space-y-4 group hover:-translate-y-1.5 hover:shadow-[6px_6px_0_var(--text)] transition-all duration-300">
                                    <div className="space-y-3">
                                        <div className="relative aspect-4/3 overflow-hidden border-2 border-[var(--text)]">
                                            <img
                                                src={cafe.primary_photo || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80'}
                                                alt={cafe.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <button
                                                onClick={() => handleToggleFavorite(cafe.id)}
                                                className="absolute top-3 right-3 p-2 bg-white text-red-600 border-2 border-[var(--text)] shadow-[2px_2px_0_var(--text)] cursor-pointer hover:bg-red-50 hover:scale-110 active:scale-90 transition-all"
                                                title="Hapus dari favorit"
                                            >
                                                <Heart className="size-4 fill-red-600" />
                                            </button>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">{cafe.category || '-'}</span>
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
                                                <span className="truncate">{cafe.address || cafe.city || '-'}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t-2 border-[var(--border)] flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Mulai</span>
                                            <span className="font-extrabold text-[var(--primary)] text-sm">{formatPrice(cafe.price_starting)}</span>
                                        </div>
                                        <Link
                                            href={`/cafes/${cafe.id}`}
                                            className="btn-primary text-xs py-2 px-4 flex items-center gap-1 group-hover:translate-x-0.5 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                        >
                                            <span>Pesan Meja</span>
                                            <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>
        </>
    );
}
