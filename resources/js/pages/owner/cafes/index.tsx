import OwnerLayout from '@/components/Owner/OwnerLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CAFE_PROFILE_FIELDS, cleanCafeProfile, validateCafeProfile } from '@/lib/cafe-profile';
import type { CafeProfileForm } from '@/lib/cafe-profile';
import { Store, MapPin, Layers, Utensils, AlertCircle, Edit2, Phone, FileText, CheckCircle2, X, Save, Camera, Clock } from 'lucide-react';

const DAYS = [
    { key: 'mon', label: 'Senin' },
    { key: 'tue', label: 'Selasa' },
    { key: 'wed', label: 'Rabu' },
    { key: 'thu', label: 'Kamis' },
    { key: 'fri', label: 'Jumat' },
    { key: 'sat', label: 'Sabtu' },
    { key: 'sun', label: 'Minggu' },
];

interface OperationalHours {
    day: string;
    open: string;
    close: string;
}

interface DayHours {
    open: string;
    close: string;
    closed: boolean;
}

interface CafeInfo {
    id: number;
    name: string;
    slug?: string;
    address?: string;
    city?: string;
    phone?: string;
    description?: string;
    facilities?: string[];
    approval_status?: string;
    rejection_reason?: string | null;
    submission_count?: number;
    photos?: string[];
    operational_hours?: OperationalHours[];
}

interface OwnerCafesProps {
    cafe?: CafeInfo | null;
}

type CafeFormData = CafeProfileForm;

export default function OwnerCafes(props: OwnerCafesProps) {
    const cafe = props.cafe;
    const { props: pageProps } = usePage() as any;
    const flash = pageProps.flash || {};

    const [showForm, setShowForm] = useState(!cafe);
    const [isEditing, setIsEditing] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Partial<CafeFormData>>({});
    const [formError, setFormError] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState('');
    const [hoursState, setHoursState] = useState<Record<string, DayHours>>(() => {
        const init: Record<string, DayHours> = {};
        for (const d of DAYS) init[d.key] = { open: '08:00', close: '22:00', closed: true };
        for (const h of cafe?.operational_hours ?? []) {
            const key = DAYS.find(d => d.label === h.day)?.key;
            if (key) init[key] = { open: h.open, close: h.close, closed: false };
        }
        return init;
    });
    const [hoursProcessing, setHoursProcessing] = useState(false);
    const [hoursSaved, setHoursSaved] = useState(false);
    const [hoursError, setHoursError] = useState('');

    const [form, setForm] = useState<CafeFormData>({
        name: cafe?.name || '',
        address: cafe?.address || '',
        city: cafe?.city || '',
        phone: cafe?.phone || '',
        description: cafe?.description || '',
    });

    const photoPreview = photoFile
        ? URL.createObjectURL(photoFile)
        : (cafe?.photos?.[0] || null);

    const handleChange = (field: keyof CafeFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        setFormError('');
        setUploadError('');

        const newErrors = validateCafeProfile(form);

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setProcessing(false);
            return;
        }

        const payload = cleanCafeProfile(form);

        const opts = {
            onSuccess: async (page: any) => {                const saved = page.props.cafe as CafeInfo | null;
                if (photoFile && saved?.id) {
                    router.post(`/owner/cafes/${saved.id}/photos`, { photos: [photoFile] }, {
                        onSuccess: () => router.reload(),
                        onError: () => {
                            setUploadError('Profil tersimpan, tapi foto gagal diunggah. Coba lagi.');
                            setProcessing(false);
                        },
                    });
                } else {
                    setProcessing(false);
                }
                setPhotoFile(null);
            },
            onError: (errs: any) => {
                // Petakan tiap error controller ke field-nya; sisanya ke banner atas form.
                const known: (keyof CafeFormData)[] = ['name', 'address', 'city', 'phone', 'description'];
                const fieldErrors: Partial<CafeFormData> = {};
                const rest: string[] = [];

                for (const [key, value] of Object.entries(errs || {})) {
                    const message = Array.isArray(value) ? value.join(' ') : String(value ?? '');

                    if ((known as string[]).includes(key)) {
                        fieldErrors[key as keyof CafeFormData] = message;
                    } else if (message) {
                        rest.push(message);
                    }
                }

                setErrors(fieldErrors);
                setFormError(rest.join(' '));
                setProcessing(false);
            },
        };

        if (cafe) {
            router.put(`/owner/cafes/${cafe.id}`, payload, opts);
        } else {
            router.post('/owner/cafes', payload, opts);
        }
    };

    const startEdit = () => {
        setForm({ name: cafe?.name || '', address: cafe?.address || '', city: cafe?.city || '', phone: cafe?.phone || '', description: cafe?.description || '' });
        setIsEditing(true);
    };

    const saveHours = async () => {
        setHoursProcessing(true);
        setHoursError('');

        for (const d of DAYS) {
            const h = hoursState[d.key];
            if (h.closed) continue;
            if (!h.open || !h.close) {
                setHoursError(`Jam operasional ${d.label} belum lengkap.`);
                setHoursProcessing(false);
                return;
            }
            if (h.open >= h.close) {
                setHoursError(`Jam tutup ${d.label} harus setelah jam buka.`);
                setHoursProcessing(false);
                return;
            }
        }

        const hours: Record<string, { open: string; close: string }[]> = {};
        for (const d of DAYS) {
            const h = hoursState[d.key];
            if (!h.closed) hours[d.key] = [{ open: h.open, close: h.close }];
        }

        router.post(`/owner/cafes/${cafe!.id}/hours`, { hours }, {
            onSuccess: () => {
                setHoursSaved(true);
                setTimeout(() => setHoursSaved(false), 3000);
            },
            onError: (errs: any) => {
                const first = Object.values(errs)[0] as string | undefined;
                setHoursError(first || 'Gagal menyimpan jam operasional. Periksa kembali input Anda.');
            },
        });
        setHoursProcessing(false);
    };

    const statusColor = (status?: string) => {
        if (status === 'active' || status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (status === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200';
        return 'bg-amber-50 text-amber-700 border-amber-200';
    };

    const statusLabel = (status?: string, count?: number) => {
        const suffix = (count && count > 1) ? ` (Pengajuan ke-${count})` : '';
        if (status === 'active' || status === 'approved') return '✓ Disetujui & Aktif';
        if (status === 'rejected') return '✗ Ditolak Admin';
        return `⏳ Menunggu Persetujuan${suffix}`;
    };

    return (
        <OwnerLayout breadcrumbs={[{ title: 'Profil & Informasi Cafe' }]}>
            <Head title="Profil Cafe - Owner Portal" />

            <div className="space-y-6 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <Store className="size-7 text-orange-600" />
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">Profil & Informasi Cafe</h1>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-500 mt-1">Kelola rincian kafe Anda, alamat lokasi, jam operasional, dan status persetujuan platform.</p>
                    </div>
                    {cafe && !isEditing && (
                        <Button onClick={startEdit} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2">
                            <Edit2 className="size-4" />
                            <span>Edit Info Cafe</span>
                        </Button>
                    )}
                </div>

                {/* Flash Messages */}
                {flash.success && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-semibold">
                        <CheckCircle2 className="size-5 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash.error && (
                    <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-semibold">
                        <AlertCircle className="size-5 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* REJECTION ALERT */}
                {cafe && cafe.approval_status === 'rejected' && (
                    <div className="rounded-xl border border-rose-300 bg-rose-50 p-5 space-y-3">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="size-5 text-rose-600 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-rose-800">Cafe Anda Ditolak oleh Admin</p>
                                {cafe.rejection_reason && (
                                    <p className="text-sm text-rose-700">
                                        <span className="font-semibold">Alasan: </span>{cafe.rejection_reason}
                                    </p>
                                )}
                                <p className="text-xs text-rose-600 mt-2">
                                    Silakan perbaiki data cafe Anda lalu klik <strong>"Simpan Perubahan"</strong> untuk mengajukan ulang ke admin.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* FORM: Tambah atau Edit Cafe */}
                {(showForm || isEditing) && (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50/30 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                                <Store className="size-5 text-orange-500" />
                                {cafe ? 'Edit Informasi Cafe' : 'Daftarkan Cafe Anda'}
                            </h2>
                            {isEditing && (
                                <button onClick={() => setIsEditing(false)} className="text-stone-400 hover:text-stone-600 transition-colors">
                                    <X className="size-5" />
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {formError && (
                                <p className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                                    <AlertCircle className="size-4 shrink-0" />{formError}
                                </p>
                            )}
                            {/* Nama Cafe */}
                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1.5">Nama Cafe <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={handleChange('name')}
                                    placeholder="contoh: Kopi Nusantara"
                                    maxLength={CAFE_PROFILE_FIELDS.name.max}
                                    className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all ${errors.name ? 'border-rose-400' : 'border-stone-200 focus:border-orange-500'}`}
                                />
                                {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
                                {!errors.name && <p className="mt-1 text-[11px] text-stone-400">Contoh: {CAFE_PROFILE_FIELDS.name.example}</p>}
                            </div>

                            {/* Alamat */}
                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1.5">Alamat Lengkap <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    value={form.address}
                                    onChange={handleChange('address')}
                                    placeholder="contoh: Jl. Sudirman No. 1, Jakarta Pusat"
                                    maxLength={CAFE_PROFILE_FIELDS.address.max}
                                    className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all ${errors.address ? 'border-rose-400' : 'border-stone-200 focus:border-orange-500'}`}
                                />
                                {errors.address && <p className="mt-1 text-xs text-rose-600">{errors.address}</p>}
                                {!errors.address && <p className="mt-1 text-[11px] text-stone-400">Contoh: {CAFE_PROFILE_FIELDS.address.example}</p>}
                            </div>

                            {/* Kota */}
                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1.5">Kota <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    value={form.city}
                                    onChange={handleChange('city')}
                                    placeholder="contoh: Bandar Lampung"
                                    maxLength={CAFE_PROFILE_FIELDS.city.max}
                                    className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all ${errors.city ? 'border-rose-400' : 'border-stone-200 focus:border-orange-500'}`}
                                />
                                {errors.city && <p className="mt-1 text-xs text-rose-600">{errors.city}</p>}
                                {!errors.city && <p className="mt-1 text-[11px] text-stone-400">Contoh: {CAFE_PROFILE_FIELDS.city.example}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Telepon */}
                                <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1.5">No. Telepon Kontak</label>
                                    <input
                                        type="text"
                                        inputMode="tel"
                                        autoComplete="tel"
                                        value={form.phone}
                                        onChange={handleChange('phone')}
                                        placeholder="08xxxxxxxxxx"
                                        maxLength={CAFE_PROFILE_FIELDS.phone.max}
                                        className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all ${errors.phone ? 'border-rose-400' : 'border-stone-200'}`}
                                    />
                                    {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
                                    {!errors.phone && <p className="mt-1 text-[11px] text-stone-400">Angka, spasi, dan + - ( ). Contoh: {CAFE_PROFILE_FIELDS.phone.example}</p>}
                                </div>

                                {/* Deskripsi */}
                                <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1.5">Deskripsi Singkat</label>
                                    <input
                                        type="text"
                                        value={form.description}
                                        onChange={handleChange('description')}
                                        placeholder="Cafe kopi premium dengan suasana nyaman..."
                                        maxLength={CAFE_PROFILE_FIELDS.description.max}
                                        className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all ${errors.description ? 'border-rose-400' : 'border-stone-200'}`}
                                    />
                                    {errors.description && <p className="mt-1 text-xs text-rose-600">{errors.description}</p>}
                                    {!errors.description && <p className="mt-1 text-[11px] text-stone-400">Contoh: {CAFE_PROFILE_FIELDS.description.example}</p>}
                                </div>
                            </div>

                                {/* Foto Profil Cafe */}
                                <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1.5">Foto Profil Cafe</label>
                                    <div className="flex items-center gap-4">
                                        {photoPreview ? (
                                            <img
                                                src={photoPreview}
                                                alt="Pratinjau foto cafe"
                                                className="h-20 w-20 rounded-2xl object-cover border border-stone-200 shadow-sm"
                                            />
                                        ) : (
                                            <div className="h-20 w-20 rounded-2xl bg-stone-100 border border-dashed border-stone-300 flex items-center justify-center text-stone-400">
                                                <Camera className="size-6" />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <input
                                                id="cafe-photo"
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={(e) => {
                                                    setPhotoFile(e.target.files?.[0] || null);
                                                    setUploadError('');
                                                }}
                                                className="block w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-orange-100 file:text-orange-700 file:text-xs file:font-semibold hover:file:bg-orange-200 cursor-pointer"
                                            />
                                            <p className="text-[11px] text-stone-400">JPG, PNG, atau WebP. Maks 5 MB.</p>
                                            {uploadError && <p className="text-xs text-rose-600">{uploadError}</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                <Button type="submit" disabled={processing} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2">
                                    <Save className="size-4" />
                                    {processing ? 'Menyimpan...' : (cafe ? 'Simpan Perubahan' : 'Daftarkan Cafe')}
                                </Button>
                                {isEditing && (
                                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl text-xs font-semibold border-stone-300 text-stone-600 hover:bg-stone-50">
                                        Batal
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                )}

                {/* Empty State (no cafe, no form) */}
                {!cafe && !showForm && (
                    <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center space-y-4 shadow-sm">
                        <div className="flex justify-center text-amber-500">
                            <AlertCircle className="size-14 stroke-1" />
                        </div>
                        <h3 className="text-base font-bold text-stone-900">Anda Belum Mengisi Profil Cafe</h3>
                        <p className="text-xs text-stone-500 max-w-md mx-auto">
                            Daftarkan rincian cafe Anda agar dapat mulai menerima reservasi meja dan pesanan menu dari pelanggan CafeNow.
                        </p>
                        <Button onClick={() => setShowForm(true)} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold">
                            + Daftarkan Cafe Sekarang
                        </Button>
                    </div>
                )}

                {/* Cafe Info Card (when cafe exists and not editing) */}
                {cafe && !isEditing && (
                    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                        {/* Header Card */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 border-b border-stone-100">
                            <div className="flex items-center gap-4">
                                {cafe.photos?.[0] ? (
                                    <img
                                        src={cafe.photos[0]}
                                        alt={`Foto ${cafe.name}`}
                                        className="h-16 w-16 rounded-2xl object-cover border border-stone-200 shadow-md"
                                    />
                                ) : (
                                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                                        {cafe.name.substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-xl font-bold text-stone-900">{cafe.name}</h2>
                                    <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                                        <MapPin className="size-3.5 text-orange-500" />
                                        <span>{[cafe.address, cafe.city].filter(Boolean).join(', ') || 'Alamat belum diatur'}</span>
                                    </p>
                                </div>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusColor(cafe.approval_status)}`}>
                                {statusLabel(cafe.approval_status, cafe.submission_count)}
                            </span>
                        </div>

                        {/* Detail Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-stone-100">
                            <div className="bg-white p-5 space-y-1">
                                <div className="flex items-center gap-2 text-stone-400 mb-2">
                                    <FileText className="size-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Deskripsi Cafe</span>
                                </div>
                                <p className="text-sm font-medium text-stone-800">{cafe.description || 'Belum ada deskripsi'}</p>
                            </div>
                            <div className="bg-white p-5 space-y-1">
                                <div className="flex items-center gap-2 text-stone-400 mb-2">
                                    <Phone className="size-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">No. Telepon Kontak</span>
                                </div>
                                <p className="text-sm font-bold text-stone-900">{cafe.phone || '-'}</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="p-5 bg-stone-50/50 flex flex-wrap gap-3">
                            <a href="/owner/cafes/tables">
                                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl flex items-center gap-2">
                                    <Layers className="size-4" />
                                    <span>Kelola Meja & Surge</span>
                                </Button>
                            </a>
                            <a href="/owner/cafes/menus">
                                <Button variant="outline" size="sm" className="border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold rounded-xl flex items-center gap-2">
                                    <Utensils className="size-4 text-orange-600" />
                                    <span>Kelola Menu Dapur</span>
                                </Button>
                            </a>
                        </div>
                    </div>
                )}

                {/* Jam Operasional */}
                {cafe && (
                    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 p-5 border-b border-stone-100">
                            <Clock className="size-5 text-orange-500" />
                            <div>
                                <h2 className="text-base font-bold text-stone-900">Jam Operasional</h2>
                                <p className="text-xs text-stone-500 mt-0.5">Booking di luar jam ini otomatis ditolak sistem.</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-2">
                            {DAYS.map(d => {
                                const h = hoursState[d.key];
                                return (
                                    <div key={d.key} className="flex items-center gap-3 py-1.5">
                                        <span className="w-20 text-sm font-semibold text-stone-700">{d.label}</span>
                                        <input
                                            type="time"
                                            value={h.open}
                                            disabled={h.closed}
                                            onChange={(e) => setHoursState(prev => ({ ...prev, [d.key]: { ...prev[d.key], open: e.target.value } }))}
                                            className="px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 disabled:bg-stone-100 disabled:text-stone-400"
                                        />
                                        <span className="text-xs text-stone-400">s/d</span>
                                        <input
                                            type="time"
                                            value={h.close}
                                            disabled={h.closed}
                                            onChange={(e) => setHoursState(prev => ({ ...prev, [d.key]: { ...prev[d.key], close: e.target.value } }))}
                                            className="px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 disabled:bg-stone-100 disabled:text-stone-400"
                                        />
                                        <label className="ml-auto flex items-center gap-2 text-xs font-medium text-stone-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={h.closed}
                                                onChange={(e) => setHoursState(prev => ({ ...prev, [d.key]: { ...prev[d.key], closed: e.target.checked } }))}
                                                className="size-4 accent-orange-500"
                                            />
                                            Tutup
                                        </label>
                                    </div>
                                );
                            })}
                            {hoursError && (
                                <p className="flex items-center gap-1.5 text-xs text-rose-600 pt-1">
                                    <AlertCircle className="size-4" />{hoursError}
                                </p>
                            )}
                            {hoursSaved && (
                                <p className="flex items-center gap-1.5 text-xs text-emerald-600 pt-1">
                                    <CheckCircle2 className="size-4" />Jam operasional berhasil disimpan.
                                </p>
                            )}
                            <div className="pt-2">
                                <Button onClick={saveHours} disabled={hoursProcessing} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold">
                                    <Save className="size-4" />
                                    {hoursProcessing ? 'Menyimpan...' : 'Simpan Jam Operasional'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </OwnerLayout>
    );
}
