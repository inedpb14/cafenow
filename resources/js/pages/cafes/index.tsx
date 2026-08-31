import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Star, Search, Wifi, Wind, Car, Utensils, Music, Trees, Lamp, Building, Coffee } from 'lucide-react';

const CATEGORIES = [
  { value: '', label: 'Semua Suasana Cafe' },
  { value: 'coffee', label: 'Coffee Shop & Artisan' },
  { value: 'outdoor', label: 'Outdoor & Garden' },
  { value: 'coworking', label: 'Work & Study Corner' },
  { value: 'dining', label: 'Resto & Dining' },
];

const facilityIcons: Record<string, React.ReactNode> = {
  'High-Speed WiFi': <Wifi className="h-3.5 w-3.5" />,
  'WiFi': <Wifi className="h-3.5 w-3.5" />,
  'AC Room': <Wind className="h-3.5 w-3.5" />,
  'Parkir Luas': <Car className="h-3.5 w-3.5" />,
  'Valet Parking': <Car className="h-3.5 w-3.5" />,
  'Live Music': <Music className="h-3.5 w-3.5" />,
  'Outdoor Garden': <Trees className="h-3.5 w-3.5" />,
  'Gourmet Chef': <Utensils className="h-3.5 w-3.5" />,
  'VIP Lounge': <Lamp className="h-3.5 w-3.5" />,
  'Private Room': <Building className="h-3.5 w-3.5" />,
};

interface Cafe {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  address: string;
  city: string;
  facilities: string[];
  rating: string;
  price_starting: number;
  badge: string;
  primary_photo: string;
  created_at: string;
}

interface PaginatedResponse {
  data: Cafe[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

function formatPrice(price: number): string {
  return 'Rp ' + price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function SkeletonCard() {
  return (
    <div className="block-card rounded-none overflow-hidden">
      <Skeleton className="h-44 sm:h-48 lg:h-52 w-full rounded-none bg-[var(--border)]" />
      <div className="p-3 sm:p-4 space-y-3 bg-[var(--bg-warm)]">
        <Skeleton className="h-5 w-3/4 bg-[var(--border)]" />
        <Skeleton className="h-4 w-1/2 bg-[var(--border)]" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-16 bg-[var(--border)]" />
          <Skeleton className="h-5 w-20 bg-[var(--border)]" />
        </div>
        <Skeleton className="h-4 w-full bg-[var(--border)]" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-4 w-24 bg-[var(--border)]" />
          <Skeleton className="h-4 w-12 bg-[var(--border)]" />
        </div>
      </div>
    </div>
  );
}

const categoryLabels: Record<string, string> = {
  coffee: 'Coffee',
  outdoor: 'Outdoor',
  coworking: 'Work/Study',
  dining: 'Dining',
};

export default function BrowseCafes() {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const observerRef = useRef<HTMLDivElement>(null);

  const fetchCafes = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(pageNum), per_page: '6' });
      if (searchQuery) params.set('query', searchQuery);
      if (categoryFilter) params.set('category', categoryFilter);

      const res = await fetch(`/api/cafes?${params}`);
      if (!res.ok) throw new Error('Gagal memuat data');
      const json: PaginatedResponse = await res.json();

      setCafes(prev => append ? [...prev, ...json.data] : json.data);
      setHasMore(json.meta.current_page < json.meta.last_page);
    } catch {
      setError('Gagal memuat data. Periksa koneksi Anda.');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    setPage(1);
    setCafes([]);
    setHasMore(true);
    setInitialLoading(true);
    fetchCafes(1, false);
  }, [fetchCafes]);

  useEffect(() => {
    if (page > 1) fetchCafes(page, true);
  }, [page]);

  useEffect(() => {
    const el = observerRef.current;
    if (!el || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loading) setPage(p => p + 1); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
  };

  return (
    <>
      <Head title="Daftar Cafe" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Header Hero Banner */}
        <div className="border-b-2 border-[var(--text)] pb-6 sm:pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border-2 border-[var(--text)] shadow-[2px_2px_0_var(--text)] text-xs font-bold uppercase tracking-wider mb-4">
            <Coffee className="size-4 text-[var(--primary)]" />
            <span>Katalog Resmi Cafe & Resto</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text)] mb-3 leading-tight">
            Eksplorasi Cafe & <span className="text-[var(--primary)] underline decoration-[var(--primary)] decoration-wavy">Pesan Meja</span>
          </h1>
          <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-2xl font-medium">
            Temukan spot nongkrong, work & study, outdoor garden, hingga resto favorit di Bandar Lampung dengan garansi meja real-time.
          </p>
        </div>

        {/* Search & Filter Section */}
        <div className="block-card p-4 sm:p-5 bg-white border-2 border-[var(--text)] space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Cari nama cafe, area lokasi (misal: Pahoman, Way Halim)..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 h-11 border-2 border-[var(--text)] bg-stone-50 focus-visible:ring-[var(--primary)] focus-visible:ring-2 focus-visible:border-transparent text-xs font-semibold"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="btn-primary h-11 text-xs sm:w-auto w-full px-6 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Search className="h-4 w-4" />
                <span>Cari Meja</span>
              </button>
            </div>
            <Select value={categoryFilter} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full md:w-64 h-11 border-2 border-[var(--text)] bg-stone-50 text-xs font-semibold">
                <SelectValue placeholder="Semua Suasana Cafe" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {initialLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="text-center py-12 sm:py-16">
            <Coffee className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-[var(--text-muted)] mb-4" />
            <p className="text-base sm:text-lg text-[var(--primary)] mb-4">{error}</p>
            <button
              onClick={() => { setInitialLoading(true); fetchCafes(1, false); }}
              className="btn-secondary text-sm"
            >
              Coba Lagi
            </button>
          </div>
        ) : cafes.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <Search className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-[var(--text-muted)] mb-4" />
            <h3 className="font-serif text-lg sm:text-xl mb-2 text-[var(--text)]">Cafe tidak ditemukan</h3>
            <p className="text-[var(--text-muted)] text-sm sm:text-base">Coba ubah kata kunci atau filter pencarian Anda</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {cafes.map(cafe => (
                <Link key={cafe.id} href={`/cafes/${cafe.id}`} className="group block">
                  <div className="block-card rounded-none overflow-hidden h-full flex flex-col">
                    <div
                      className="h-44 sm:h-48 lg:h-52 bg-cover bg-center relative shrink-0"
                      style={{ backgroundImage: `url(${cafe.primary_photo})` }}
                    >
                      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-wrap gap-1.5 sm:gap-2">
                        <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 bg-[var(--bg-warm)] text-[var(--text)] border-2 border-[var(--text)]">
                          {categoryLabels[cafe.category] || cafe.category}
                        </span>
                        {cafe.badge && (
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 border-2 border-[var(--text)] ${
                            cafe.badge === 'Mitra Terverifikasi'
                              ? 'bg-[var(--primary)] text-white'
                              : 'bg-[var(--bg-warm)] text-[var(--text)]'
                          }`}>
                            {cafe.badge}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 flex flex-col flex-1 bg-[var(--bg-warm)]">
                      <h3 className="font-serif text-base sm:text-lg text-[var(--text)] mb-1 group-hover:text-[var(--primary)] transition-colors leading-tight">
                        {cafe.name}
                      </h3>
                      <div className="flex items-center text-[var(--text-muted)] text-xs sm:text-sm mb-2 flex-wrap gap-x-1">
                        <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-[var(--text)]" />
                        <span className="truncate max-w-[140px] sm:max-w-[180px]">{cafe.city || cafe.address}</span>
                        <span className="mx-1 text-[var(--border)]">•</span>
                        <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-[var(--primary)]" />
                        <span className="font-medium text-[var(--primary)]">{cafe.rating}</span>
                      </div>
                      {cafe.facilities && cafe.facilities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {cafe.facilities.slice(0, 3).map((facility, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] sm:text-xs bg-white text-[var(--text-muted)] px-2 py-0.5 border border-[var(--border)]">
                              {facilityIcons[facility] || null}
                              {facility}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs sm:text-sm text-[var(--text-muted)] line-clamp-2 mb-3 flex-1">
                        {cafe.description}
                      </p>
                      <p className="font-bold text-[var(--primary)] text-sm sm:text-base mt-auto">
                        Mulai {formatPrice(cafe.price_starting)}
                        <span className="font-normal text-[var(--text-muted)] text-xs sm:text-sm"> / orang</span>
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4 sm:mt-6">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={`skel-${i}`} />)}
              </div>
            )}

            <div ref={observerRef} className="h-4" />

            {!hasMore && cafes.length > 0 && (
              <div className="divider my-6 sm:my-8">
                <span className="text-xs sm:text-sm text-[var(--text-muted)] shrink-0">
                  Sudah menampilkan semua cafe ({cafes.length})
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
