import { Head, Link } from '@inertiajs/react';
import { Clock, MapPin, Star, Utensils, Wifi, ShieldCheck, ChevronRight, Wind, Car, Music, Trees, Lamp, Building, Layers, Users, Tag } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: string;
  description: string;
  image?: string;
}

interface TableInfo {
  id: number;
  name: string;
  table_type: string;
  capacity: number;
  min_spend: number;
  photo?: string | null;
}

interface CafeDetail {
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
  photos: string[];
  menu_items: MenuItem[];
  operational_hours: Record<string, string>[] | null;
  tables?: TableInfo[];
}

function formatPrice(price: number): string {
  return 'Rp ' + price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const categoryLabels: Record<string, string> = {
  coffee: 'Coffee Shop & Artisan',
  outdoor: 'Outdoor & Garden',
  coworking: 'Work & Study Corner',
  dining: 'Resto & Dining',
};

const facilityIcons: Record<string, React.ReactNode> = {
  'High-Speed WiFi': <Wifi className="size-4 text-[var(--primary)]" />,
  'WiFi': <Wifi className="size-4 text-[var(--primary)]" />,
  'AC Room': <Wind className="size-4 text-[var(--primary)]" />,
  'Parkir Luas': <Car className="size-4 text-[var(--primary)]" />,
  'Valet Parking': <Car className="size-4 text-[var(--primary)]" />,
  'Live Music': <Music className="size-4 text-[var(--primary)]" />,
  'Outdoor Garden': <Trees className="size-4 text-[var(--primary)]" />,
  'Gourmet Chef': <Utensils className="size-4 text-[var(--primary)]" />,
  'VIP Lounge': <Lamp className="size-4 text-[var(--primary)]" />,
  'Private Room': <Building className="size-4 text-[var(--primary)]" />,
};

function formatHours(hours: Record<string, string>[] | null): string {
  if (!hours || hours.length === 0) return '-';
  const today = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()];
  const todayHours = hours.find(h => h.day === today);
  if (todayHours) return `${todayHours.open} - ${todayHours.close} WIB`;
  return `${hours[0].open} - ${hours[0].close} WIB`;
}

const TABLE_TYPE_LABELS: Record<string, string> = {
  indoor:  'Indoor',
  outdoor: 'Outdoor',
  vip:     'VIP',
  regular: 'Regular',
  private: 'Private Room',
};

const TABLE_TYPE_COLORS: Record<string, string> = {
  vip:     'bg-amber-100 text-amber-800 border-amber-200',
  outdoor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  indoor:  'bg-blue-100 text-blue-800 border-blue-200',
  private: 'bg-purple-100 text-purple-800 border-purple-200',
  regular: 'bg-stone-100 text-stone-700 border-stone-200',
};

const TABLE_PLACEHOLDER: Record<string, string> = {
  vip:     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=400&q=80',
  outdoor: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?auto=format&fit=crop&w=400&q=80',
  indoor:  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80',
  private: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80',
  regular: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=400&q=80',
};

export default function CafeDetail({ cafe }: { cafe: CafeDetail }) {
  // Group tables by type
  const tablesByType = (cafe.tables ?? []).reduce<Record<string, TableInfo[]>>((acc, t) => {
    const key = t.table_type || 'regular';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});
  const hasTablesSection = (cafe.tables ?? []).length > 0;

  return (
    <>
      <Head title={`${cafe.name} - CafeNow`} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="block-card p-2 sm:p-4 bg-white border-2 border-[var(--text)]">
          <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden border-2 border-[var(--text)]">
            <img
              src={cafe.photos?.[0] || cafe.primary_photo}
              alt={cafe.name}
              className="w-full h-full object-cover"
            />
            {cafe.badge && (
              <div className="absolute top-4 left-4 bg-[var(--primary)] text-white text-xs font-bold px-3 py-1 uppercase border border-[var(--text)] shadow-[2px_2px_0_var(--text)]">
                {cafe.badge}
              </div>
            )}
          </div>
        </div>

        <div className="block-card p-6 sm:p-8 bg-[var(--bg-warm)] border-2 border-[var(--text)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border-2 border-[var(--text)] text-xs font-bold uppercase tracking-wider">
              <span>{categoryLabels[cafe.category] || cafe.category}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[var(--text)] leading-tight">
              {cafe.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[var(--text-muted)] font-medium">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4 text-[var(--primary)]" />
                {cafe.city || cafe.address}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4 text-[var(--primary)]" />
                {formatHours(cafe.operational_hours)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="size-4 fill-amber-500" />
                {cafe.rating}
              </span>
            </div>
          </div>

          <Link
            href={`/cafes/${cafe.id}/book`}
            className="btn-primary text-xs sm:text-sm py-3 px-6 w-full md:w-auto flex items-center justify-center gap-2"
          >
            <span>Pesan Meja Sekarang</span>
            <ChevronRight className="size-4" />
          </Link>
        </div>

        {/* ====== SECTION: PILIHAN MEJA ====== */}
        {hasTablesSection && (
          <div className="block-card p-6 sm:p-8 bg-white border-2 border-[var(--text)] space-y-6">
            <div className="flex items-center gap-3">
              <Layers className="size-5 text-[var(--primary)]" />
              <h2 className="font-serif text-xl font-bold text-[var(--text)]">Pilihan Meja</h2>
            </div>
            {Object.entries(tablesByType).map(([type, tables]) => (
              <div key={type} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${TABLE_TYPE_COLORS[type] || TABLE_TYPE_COLORS['regular']}`}>
                    {TABLE_TYPE_LABELS[type] || type}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{tables.length} meja tersedia</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {tables.map((t) => (
                    <div key={t.id} className="block-card overflow-hidden border border-[var(--border)] bg-[var(--bg-warm)] hover:shadow-md transition-shadow">
                      <div className="relative h-32 overflow-hidden bg-stone-100">
                        <img
                          src={t.photo || TABLE_PLACEHOLDER[type] || TABLE_PLACEHOLDER['regular']}
                          alt={t.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 space-y-1.5">
                        <p className="font-bold text-sm text-[var(--text)]">{t.name}</p>
                        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <Users className="size-3.5" />
                            {t.capacity} orang
                          </span>
                          {t.min_spend > 0 && (
                            <span className="flex items-center gap-1 font-semibold text-[var(--primary)]">
                              <Tag className="size-3.5" />
                              Min. {formatPrice(t.min_spend)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="block-card p-6 sm:p-8 bg-white border-2 border-[var(--text)]">
          <Tabs defaultValue={cafe.menu_items?.length ? 'menu' : 'info'} className="w-full space-y-6">
            <TabsList className="bg-[var(--bg-warm)] border-2 border-[var(--text)] p-1 h-auto inline-flex gap-1">
              {cafe.menu_items?.length > 0 && (
                <TabsTrigger
                  value="menu"
                  className="px-5 py-2 text-xs font-bold data-[state=active]:bg-[var(--primary)] data-[state=active]:text-white border border-transparent data-[state=active]:border-[var(--text)] transition-all cursor-pointer"
                >
                  Pre-Order Menu
                </TabsTrigger>
              )}
              <TabsTrigger
                value="info"
                className="px-5 py-2 text-xs font-bold data-[state=active]:bg-[var(--primary)] data-[state=active]:text-white border border-transparent data-[state=active]:border-[var(--text)] transition-all cursor-pointer"
              >
                Informasi & Fasilitas
              </TabsTrigger>
            </TabsList>

            {cafe.menu_items?.length > 0 && (
              <TabsContent value="menu" className="space-y-6">
                <h3 className="font-serif text-xl font-bold text-[var(--text)]">Daftar Menu</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {cafe.menu_items.map((item) => (
                    <div key={item.id} className="block-card p-4 bg-[var(--bg-warm)] flex flex-col justify-between space-y-3">
                      <div>
                        <div className="relative aspect-square overflow-hidden border-2 border-[var(--text)] mb-3">
                          <img
                            src={item.image || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80'}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 border border-[var(--text)]">
                            {item.category}
                          </span>
                        </div>
                        <h4 className="font-serif text-base font-bold text-[var(--text)]">{item.name}</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                      </div>
                      <div className="pt-2 border-t-2 border-[var(--border)] flex items-center justify-between">
                        <span className="font-extrabold text-sm text-[var(--primary)]">{item.price}</span>
                        <button className="btn-secondary text-[10px] py-1 px-3">Pre-Order</button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}

            <TabsContent value="info" className="space-y-6">
              <div className="space-y-4 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                <h3 className="font-serif text-xl font-bold text-[var(--text)]">Tentang {cafe.name}</h3>
                <p>{cafe.description}</p>

                <h4 className="font-bold text-sm text-[var(--text)] pt-2">
                  Harga Mulai {formatPrice(cafe.price_starting)} / orang
                </h4>

                {cafe.facilities && cafe.facilities.length > 0 && (
                  <>
                    <h4 className="font-bold text-sm text-[var(--text)] pt-2">Fasilitas:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {cafe.facilities.map((facility, i) => (
                        <div key={i} className="p-3 bg-[var(--bg-warm)] border-2 border-[var(--text)] flex items-center gap-2 font-bold text-xs">
                          {facilityIcons[facility] || <ShieldCheck className="size-4 text-[var(--primary)]" />}
                          <span>{facility}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {cafe.operational_hours && cafe.operational_hours.length > 0 && (
                  <>
                    <h4 className="font-bold text-sm text-[var(--text)] pt-2">Jam Operasional:</h4>
                    <div className="space-y-1">
                      {cafe.operational_hours.map((h, i) => (
                        <div key={i} className="flex justify-between text-xs border-b border-[var(--border)] py-1">
                          <span className="font-medium text-[var(--text)]">{h.day}</span>
                          <span>{h.open} - {h.close} WIB</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
