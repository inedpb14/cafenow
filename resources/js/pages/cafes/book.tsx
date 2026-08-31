import { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    CalendarIcon,
    Coffee,
    CheckCircle2,
    ChevronRight,
    Plus,
    Minus,
    Check,
    ShieldCheck,
    CreditCard,
    AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface SessionSlot {
    id: string;
    time: string;
    label: string;
    available: boolean;
}

interface CafeTableOption {
    id: number;
    name: string;
    capacity: number;
    location: string;
    price: number;
    ruleId: number;
    duration: number;
}

interface MenuOption {
    id: number;
    name: string;
    category: string;
    price: number;
    image: string;
}

interface CafeInfo {
    name: string;
    address: string;
}

interface BookingWizardProps {
    id: number;
    cafe: CafeInfo;
    tables: CafeTableOption[];
    menus: MenuOption[];
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80';

export default function BookingWizard({ id, cafe, tables, menus }: BookingWizardProps) {
    const [step, setStep] = useState(1);

    // Step 1 State
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [guests, setGuests] = useState(2);

    // Step 2 State
    const [tablesLoaded] = useState(true);
    const [slotsByTable, setSlotsByTable] = useState<Record<number, SessionSlot[]>>({});
    const [selectedSlot, setSelectedSlot] = useState<SessionSlot | null>(null);
    const [selectedTable, setSelectedTable] = useState<CafeTableOption | null>(null);
    const [step2Error, setStep2Error] = useState('');

    // Step 3 State
    const [cart, setCart] = useState<Record<number, number>>({});
    const [notes, setNotes] = useState('');

    // Step 4 State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingReference, setBookingReference] = useState('');
    const [paymentUrl, setPaymentUrl] = useState('');

    useEffect(() => {
        if (step === 2 && date) {
            loadSlots();
        }
    }, [step, date, guests]);

    const loadSlots = async () => {
        setStep2Error('');
        if (!date) return;

        const dateStr = format(date, 'yyyy-MM-dd');
        try {
            const res = await fetch(`/api/cafes/${id}/availability?date=${dateStr}&guests=${guests}`);
            const body = await res.json();

            if (!res.ok) {
                setStep2Error(body.error?.message || 'Gagal memuat ketersediaan meja');
                return;
            }

            const tableSlots: Record<number, SessionSlot[]> = {};
            (body.data?.tables || []).forEach((t: any) => {
                tableSlots[t.id] = (t.available_slots || []).map((s: any) => ({
                    id: s.time,
                    time: s.time,
                    label: s.status === 'available' ? 'Tersedia' : (s.status === 'booked' ? 'Sudah Dibooking' : s.status === 'locked' ? 'Sedang Diproses' : 'Tidak Tersedia'),
                    available: s.status === 'available',
                }));
            });

            setSlotsByTable(tableSlots);

            const nextTable = tables.find((t) => (tableSlots[t.id] || []).some((s) => s.available))
                || null;
            setSelectedTable(nextTable);
            setSelectedSlot(nextTable
                ? (tableSlots[nextTable.id] || []).find((s) => s.available) || null
                : null);
        } catch {
            setStep2Error('Gagal memuat ketersediaan slot.');
        }
    };

    const tablePrice = selectedTable ? selectedTable.price : 0;
    const menuSubtotal = useMemo(() => {
        return Object.entries(cart).reduce((sum, [menuId, qty]) => {
            const item = menus.find(m => m.id === Number(menuId));
            return sum + (item ? item.price * qty : 0);
        }, 0);
    }, [cart, menus]);
    const totalPrice = tablePrice + menuSubtotal;

    const handleQtyChange = (menuId: number, delta: number) => {
        setCart(prev => {
            const current = prev[menuId] || 0;
            const updated = current + delta;
            if (updated <= 0) {
                const { [menuId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [menuId]: updated };
        });
    };

    const handleFinalSubmit = () => {
        if (!date || !selectedTable || !selectedSlot) {
            setSubmitError('Pilih tanggal, meja, dan slot waktu terlebih dahulu.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError('');

        const cartItems = Object.entries(cart).map(([menuId, qty]) => ({
            menu_item_id: Number(menuId),
            quantity: qty,
        }));

        router.post(`/cafes/${id}/book`, {
            table_id: selectedTable.id,
            booking_rule_id: selectedTable.ruleId,
            booking_date: format(date, 'yyyy-MM-dd'),
            start_time: selectedSlot.time,
            duration_minutes: selectedTable.duration,
            guest_count: guests,
            customer_notes: notes || undefined,
            items: cartItems.length > 0 ? cartItems : undefined,
        }, {
            onSuccess: (page: any) => {
                const flash = page.props.flash || {};
                if (flash.booking_success) {
                    setBookingReference(flash.booking_reference);
                    setPaymentUrl(flash.payment_url || '');
                    setBookingSuccess(true);
                } else if (flash.error) {
                    setSubmitError(flash.error);
                }
                setIsSubmitting(false);
            },
            onError: (errs: any) => {
                setSubmitError(Object.values(errs)[0] as string || 'Gagal membuat booking. Silakan coba lagi.');
                setIsSubmitting(false);
            },
        });
    };

    const formatPrice = (amount: number) => {
        return 'Rp ' + (amount || 0).toLocaleString('id-ID');
    };

    const ErrorBox = ({ message }: { message: string }) => (
        message ? (
            <div className="p-3 bg-red-50 border-2 border-red-400 text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium">{message}</p>
            </div>
        ) : null
    );

    return (
        <>
            <Head title="Booking Meja - CafeNow" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
                
                {/* Header Banner */}
                <div className="border-b-2 border-[var(--text)] pb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border-2 border-[var(--text)] shadow-[2px_2px_0_var(--text)] text-xs font-bold uppercase tracking-wider mb-3">
                        <Coffee className="size-4 text-[var(--primary)]" />
                        <span>Interactive Reservation Wizard</span>
                    </div>
                    <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[var(--text)] mb-2">
                        Pesan Meja & Pre-Order Dapur
                    </h1>
                    <p className="text-[var(--text-muted)] text-xs sm:text-sm font-medium">
                        {cafe ? `${cafe.name} • ${cafe.address}` : 'Memuat data cafe...'}
                    </p>
                </div>

                {/* Progress Steps Bar */}
                <div className="grid grid-cols-4 gap-2 sm:gap-4">
                    {[
                        { num: 1, title: '1. Sesi & Tamu' },
                        { num: 2, title: '2. Sesi & Meja' },
                        { num: 3, title: '3. Pre-Order' },
                        { num: 4, title: '4. Konfirmasi' },
                    ].map((s) => (
                        <div
                            key={s.num}
                            className={`
                                p-3 border-2 border-[var(--text)] text-center text-xs font-bold transition-all
                                ${step === s.num
                                    ? 'bg-[var(--primary)] text-white shadow-[3px_3px_0_var(--text)]'
                                    : step > s.num
                                    ? 'bg-amber-100 text-[var(--text)] border-[var(--text)]'
                                    : 'bg-white text-[var(--text-muted)]'
                                }
                            `}
                        >
                            {s.title}
                        </div>
                    ))}
                </div>

                {/* Success View */}
                {bookingSuccess ? (
                    <div className="block-card p-8 bg-emerald-50 border-2 border-emerald-600 text-emerald-950 space-y-6 text-center">
                        <CheckCircle2 className="size-16 text-emerald-600 mx-auto" />
                        <div className="space-y-2">
                            <h2 className="font-serif text-3xl font-extrabold">Reservasi Berhasil Dibuat!</h2>
                            <p className="text-xs sm:text-sm text-emerald-800 max-w-lg mx-auto leading-relaxed font-medium">
                                Terima kasih. Meja dan pesanan dapur Anda telah terdaftar di sistem CafeNow.
                                {paymentUrl ? ' Lanjutkan ke pembayaran untuk mengunci reservasi Anda.' : ' Pembayaran menyusul melalui tiket digital Anda.'}
                            </p>
                        </div>

                        <div className="p-4 bg-white border-2 border-[var(--text)] max-w-md mx-auto text-left space-y-2 text-xs font-bold text-[var(--text)]">
                            <p className="flex justify-between border-b pb-1">
                                <span className="text-[var(--text-muted)] font-normal">Ref Booking:</span>
                                <span>#{bookingReference}</span>
                            </p>
                            <p className="flex justify-between border-b pb-1">
                                <span className="text-[var(--text-muted)] font-normal">Sesi & Tanggal:</span>
                                <span>{date ? format(date, 'PPP') : 'Hari Ini'} ({selectedSlot?.time} WIB)</span>
                            </p>
                            <p className="flex justify-between border-b pb-1">
                                <span className="text-[var(--text-muted)] font-normal">Pilihan Meja:</span>
                                <span>{selectedTable?.name}</span>
                            </p>
                            <p className="flex justify-between border-b pb-1">
                                <span className="text-[var(--text-muted)] font-normal">Jumlah Tamu:</span>
                                <span>{guests} Orang</span>
                            </p>
                            <p className="flex justify-between text-sm text-[var(--primary)] font-extrabold pt-1">
                                <span>Total Pembayaran:</span>
                                <span>{formatPrice(totalPrice)}</span>
                            </p>
                        </div>

                        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                            {paymentUrl && (
                                <a href={paymentUrl} className="btn-primary text-xs py-3 px-6 cursor-pointer inline-flex items-center justify-center gap-2">
                                    <CreditCard className="size-4" />
                                    Bayar Sekarang
                                </a>
                            )}
                            <Link href="/customer/bookings" className="btn-secondary text-xs py-3 px-6 cursor-pointer">
                                Lihat Tiket Digital Saya
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        
                        {/* STEP 1: Pilih Tanggal & Tamu */}
                        {step === 1 && (
                            <div className="block-card p-6 sm:p-8 bg-white border-2 border-[var(--text)] space-y-6">
                                <h3 className="font-serif text-xl font-bold text-[var(--text)] border-b-2 border-[var(--border)] pb-3">
                                    Langkah 1: Tentukan Tanggal & Jumlah Tamu
                                </h3>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text)] mb-2">
                                            Pilih Tanggal Kedatangan
                                        </label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="w-full h-12 px-4 border-2 border-[var(--text)] bg-[var(--bg-warm)] flex items-center justify-start text-xs font-bold text-[var(--text)] cursor-pointer"
                                                >
                                                    <CalendarIcon className="mr-2.5 h-4 w-4 text-[var(--primary)] shrink-0" />
                                                    {date ? format(date, "PPP") : <span>Pilih tanggal...</span>}
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-auto p-0 border-2 border-[var(--text)] bg-white shadow-[4px_4px_0_var(--text)]"
                                                // ponytail: popover forced white — pin light palette so calendar text never clashes in dark mode
                                                style={{
                                                    '--foreground': '#2C1810',
                                                    '--muted-foreground': '#6B5344',
                                                    '--accent': '#FF6B35',
                                                    '--accent-foreground': '#FFFFFF',
                                                    '--primary': '#FF6B35',
                                                    '--primary-foreground': '#FFFFFF',
                                                    '--background': '#FFFFFF',
                                                } as React.CSSProperties}
                                            >
                                                <Calendar mode="single" selected={date} onSelect={setDate} disabled={{ before: new Date() }} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text)] mb-2">
                                            Jumlah Tamu Kunjungan
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setGuests(Math.max(1, guests - 1))}
                                                className="h-12 w-12 bg-white text-[var(--text)] font-bold text-lg border-2 border-[var(--text)] shadow-[2px_2px_0_var(--text)] flex items-center justify-center cursor-pointer"
                                            >
                                                <Minus className="size-4" />
                                            </button>
                                            <div className="flex-1 h-12 bg-[var(--bg-warm)] border-2 border-[var(--text)] flex items-center justify-center font-bold text-base text-[var(--text)]">
                                                {guests} Tamu
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setGuests(Math.min(20, guests + 1))}
                                                className="h-12 w-12 bg-white text-[var(--text)] font-bold text-lg border-2 border-[var(--text)] shadow-[2px_2px_0_var(--text)] flex items-center justify-center cursor-pointer"
                                            >
                                                <Plus className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t-2 border-[var(--border)] flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="btn-primary text-xs py-3 px-6 flex items-center gap-2 cursor-pointer"
                                    >
                                        <span>Lanjut Pilih Sesi & Meja</span>
                                        <ChevronRight className="size-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Pilih Slot Sesi & Meja */}
                        {step === 2 && (
                            <div className="block-card p-6 sm:p-8 bg-white border-2 border-[var(--text)] space-y-6">
                                <h3 className="font-serif text-xl font-bold text-[var(--text)] border-b-2 border-[var(--border)] pb-3">
                                    Langkah 2: Pilih Sesi Jam & Pilihan Meja
                                </h3>

                                <ErrorBox message={step2Error} />

                                {!tablesLoaded && !step2Error && (
                                    <p className="text-xs font-bold text-[var(--text-muted)]">
                                        Memuat daftar meja...
                                    </p>
                                )}

                                {tablesLoaded && tables.length === 0 && !step2Error && (
                                    <div className="p-4 bg-amber-50 border-2 border-amber-400 text-xs text-amber-900 flex items-start gap-2">
                                        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                                        <p className="leading-relaxed font-medium">
                                            Belum ada meja tersedia untuk booking. Hubungi cafe untuk info lebih lanjut.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                                        Denah & Jenis Meja Tersedia
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {tables.map((tbl) => {
                                            const isSelected = selectedTable?.id === tbl.id;
                                            return (
                                                <div
                                                    key={tbl.id}
                                                    onClick={() => {
                                                        setSelectedTable(tbl);
                                                        setSelectedSlot(slotsByTable[tbl.id]?.find((s) => s.available) || null);
                                                    }}
                                                    className={`
                                                        p-4 border-2 border-[var(--text)] transition-all cursor-pointer space-y-2
                                                        ${isSelected ? 'bg-amber-100 border-[var(--primary)] shadow-[4px_4px_0_var(--text)]' : 'bg-white hover:bg-stone-50'}
                                                    `}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-serif font-bold text-sm text-[var(--text)]">{tbl.name}</h4>
                                                        <span className="font-extrabold text-xs text-[var(--primary)]">{formatPrice(tbl.price)}</span>
                                                    </div>
                                                    <p className="text-xs text-[var(--text-muted)]">
                                                        Kapasitas: s.d {tbl.capacity} Tamu • Area: {tbl.location}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {selectedTable && (
                                    <div className="space-y-4 pt-4 border-t-2 border-[var(--border)]">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                                            Slot Sesi Jam Tersedia — {selectedTable.name}
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {(slotsByTable[selectedTable.id] || []).map((slot) => {
                                                const isSelected = selectedSlot?.id === slot.id;
                                                return (
                                                    <button
                                                        key={slot.id}
                                                        type="button"
                                                        disabled={!slot.available}
                                                        onClick={() => setSelectedSlot(slot)}
                                                        className={`
                                                            p-3 text-left border-2 border-[var(--text)] transition-all cursor-pointer flex items-center justify-between
                                                            ${!slot.available ? 'opacity-40 bg-stone-100 cursor-not-allowed' :
                                                              isSelected ? 'bg-[var(--primary)] text-white shadow-[3px_3px_0_var(--text)]' :
                                                              'bg-[var(--bg-warm)] hover:bg-white text-[var(--text)]'
                                                            }
                                                        `}
                                                    >
                                                        <div>
                                                            <p className="font-bold text-xs">{slot.time} WIB</p>
                                                            <p className="text-[10px] opacity-80">{slot.label}</p>
                                                        </div>
                                                        {isSelected && <Check className="size-4 shrink-0" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t-2 border-[var(--border)] flex justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="btn-secondary text-xs py-3 px-6 cursor-pointer"
                                    >
                                        Kembali
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!selectedSlot}
                                        onClick={() => setStep(3)}
                                        className="btn-primary text-xs py-3 px-6 flex items-center gap-2 cursor-pointer disabled:opacity-40"
                                    >
                                        <span>Lanjut Pre-Order Menu</span>
                                        <ChevronRight className="size-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Pre-Order Menu & Catatan */}
                        {step === 3 && (
                            <div className="block-card p-6 sm:p-8 bg-white border-2 border-[var(--text)] space-y-6">
                                <div className="flex justify-between items-center border-b-2 border-[var(--border)] pb-3">
                                    <h3 className="font-serif text-xl font-bold text-[var(--text)]">
                                        Langkah 3: Pre-Order Menu Dapur (Opsional)
                                    </h3>
                                    <span className="text-xs font-bold text-[var(--primary)]">
                                        Subtotal: {formatPrice(menuSubtotal)}
                                    </span>
                                </div>

                                {menus.length === 0 && (
                                    <p className="text-xs font-bold text-[var(--text-muted)]">
                                        Cafe belum memiliki menu. Anda tetap dapat melanjutkan tanpa pre-order.
                                    </p>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {menus.map((item) => {
                                        const qty = cart[item.id] || 0;
                                        return (
                                            <div key={item.id} className="p-3 bg-[var(--bg-warm)] border-2 border-[var(--text)] flex items-center gap-3">
                                                <img src={item.image || FALLBACK_IMAGE} alt={item.name} className="w-16 h-16 object-cover border border-[var(--text)] shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-serif font-bold text-xs text-[var(--text)] truncate">{item.name}</h4>
                                                    <p className="font-extrabold text-xs text-[var(--primary)]">{formatPrice(item.price)}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQtyChange(item.id, -1)}
                                                            className="w-6 h-6 bg-white border border-[var(--text)] font-bold text-xs flex items-center justify-center cursor-pointer"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="text-xs font-bold w-4 text-center">{qty}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQtyChange(item.id, 1)}
                                                            className="w-6 h-6 bg-[var(--primary)] text-white border border-[var(--text)] font-bold text-xs flex items-center justify-center cursor-pointer"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="space-y-2 pt-4 border-t-2 border-[var(--border)]">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                                        Catatan Khusus Pengunjung (Opsional)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Misal: Minta disediakan high-chair untuk balita atau area tidak terlalu berisik..."
                                        className="w-full p-3 border-2 border-[var(--text)] bg-[var(--bg-warm)] text-xs font-medium focus:outline-none focus:border-[var(--primary)] resize-none"
                                    />
                                </div>

                                <div className="pt-4 border-t-2 border-[var(--border)] flex justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="btn-secondary text-xs py-3 px-6 cursor-pointer"
                                    >
                                        Kembali
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStep(4)}
                                        className="btn-primary text-xs py-3 px-6 flex items-center gap-2 cursor-pointer"
                                    >
                                        <span>Lanjut Ringkasan Konfirmasi</span>
                                        <ChevronRight className="size-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: Konfirmasi & Submit */}
                        {step === 4 && (
                            <div className="block-card p-6 sm:p-8 bg-white border-2 border-[var(--text)] space-y-6">
                                <h3 className="font-serif text-xl font-bold text-[var(--text)] border-b-2 border-[var(--border)] pb-3">
                                    Langkah 4: Konfirmasi Ringkasan Reservasi
                                </h3>

                                <div className="p-4 bg-[var(--bg-warm)] border-2 border-[var(--text)] space-y-3 text-xs">
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-[var(--text-muted)] font-bold">Tanggal & Sesi:</span>
                                        <span className="font-bold text-[var(--text)]">{date ? format(date, 'PPP') : 'Hari Ini'} ({selectedSlot?.time} WIB)</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-[var(--text-muted)] font-bold">Pilihan Meja & Lokasi:</span>
                                        <span className="font-bold text-[var(--text)]">{selectedTable?.name} ({selectedTable?.location})</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-[var(--text-muted)] font-bold">Jumlah Tamu:</span>
                                        <span className="font-bold text-[var(--text)]">{guests} Orang</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-[var(--text-muted)] font-bold">Biaya Sewa Meja:</span>
                                        <span className="font-bold text-[var(--text)]">{formatPrice(tablePrice)}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-[var(--text-muted)] font-bold">Pre-Order Dapur:</span>
                                        <span className="font-bold text-[var(--text)]">{formatPrice(menuSubtotal)}</span>
                                    </div>
                                    <div className="pt-2 flex justify-between text-base font-extrabold text-[var(--primary)]">
                                        <span>Total Biaya Reservasi:</span>
                                        <span>{formatPrice(totalPrice)}</span>
                                    </div>
                                </div>

                                <ErrorBox message={submitError} />

                                <div className="p-4 bg-amber-50 border-2 border-amber-400 text-xs text-amber-900 flex items-start gap-3">
                                    <ShieldCheck className="size-5 text-[var(--primary)] shrink-0 mt-0.5" />
                                    <p className="leading-relaxed font-medium">
                                        <strong>Garansi Meja 100%:</strong> Tempat duduk dan sajian pre-order Anda akan langsung disiapkan begitu Anda tiba di lokasi.
                                    </p>
                                </div>

                                <div className="pt-4 border-t-2 border-[var(--border)] flex justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setStep(3)}
                                        className="btn-secondary text-xs py-3 px-6 cursor-pointer"
                                    >
                                        Kembali
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={handleFinalSubmit}
                                        className="btn-primary text-xs py-3.5 px-8 font-bold tracking-wider uppercase cursor-pointer disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Memproses Reservasi...' : 'Konfirmasi & Simpan Booking Meja'}
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                )}

            </div>
        </>
    );
}
