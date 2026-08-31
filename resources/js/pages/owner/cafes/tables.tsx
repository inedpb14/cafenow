import OwnerLayout from '@/components/Owner/OwnerLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Layers, Plus, Inbox, Edit2, Trash2, X, Save, CheckCircle2, AlertCircle, ImageIcon, Upload } from 'lucide-react';
import { formatRupiahInt, handleRupiahInput, toRawDigits } from '@/lib/rupiah';

interface TableItem {
    id: number;
    name: string;
    type: string;
    capacity: number;
    min_spend: string;
    min_spend_raw?: number;
    is_active: boolean;
    photo?: string | null;
}

interface OwnerTablesProps {
    tables?: TableItem[];
    cafe?: { id: number; name: string } | null;
}

interface TableFormData {
    name: string;
    type: string;
    capacity: string;
    min_spend: string;
    is_active: boolean;
    photoFile: File | null;
    photoPreview: string | null;
}

const TABLE_TYPES = [
    { value: 'indoor', label: 'Indoor' },
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'vip', label: 'VIP' },
    { value: 'regular', label: 'Regular' },
    { value: 'private', label: 'Private Room' },
];

const emptyForm: TableFormData = { name: '', type: 'indoor', capacity: '', min_spend: '', is_active: true, photoFile: null, photoPreview: null };

const typeColor: Record<string, string> = {
    vip: 'bg-amber-100 text-amber-800 border-amber-200',
    outdoor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    indoor: 'bg-blue-100 text-blue-800 border-blue-200',
    private: 'bg-purple-100 text-purple-800 border-purple-200',
    regular: 'bg-stone-100 text-stone-700 border-stone-200',
};

export default function OwnerTables(props: OwnerTablesProps) {
    const tablesList = props.tables ?? [];
    const { props: pageProps } = usePage() as any;
    const flash = pageProps.flash || {};

    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<TableItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<TableItem | null>(null);
    const [form, setForm] = useState<TableFormData>(emptyForm);
    const [errors, setErrors] = useState<Partial<TableFormData>>({});
    const [processing, setProcessing] = useState(false);

    const openAdd = () => { setEditTarget(null); setForm(emptyForm); setErrors({}); setShowModal(true); };
    const openEdit = (t: TableItem) => {
        setEditTarget(t);
        setForm({
            name: t.name,
            type: t.type,
            capacity: String(t.capacity),
            min_spend: formatRupiahInt(String(t.min_spend_raw ?? '')),
            is_active: t.is_active,
            photoFile: null,
            photoPreview: t.photo || null,
        });
        setErrors({});
        setShowModal(true);
    };
    const closeModal = () => { setShowModal(false); setEditTarget(null); setErrors({}); };

    const handleChange = (field: keyof TableFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        const newErrors: Partial<TableFormData> = {};
        if (!form.name.trim()) newErrors.name = 'Nama meja wajib diisi';
        if (!form.capacity || Number(form.capacity) < 1) newErrors.capacity = 'Kapasitas wajib diisi, minimal 1 orang';
        if (form.min_spend === '') newErrors.min_spend = 'Minimum spend wajib diisi (isi 0 jika tidak ada)';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setProcessing(false);
            return;
        }

        const formData = new FormData();
        formData.append('name', form.name);
        formData.append('type', form.type);
        formData.append('capacity', form.capacity);
        formData.append('min_spend', toRawDigits(form.min_spend));
        formData.append('is_active', form.is_active ? '1' : '0');
        if (form.photoFile) {
            formData.append('photo', form.photoFile);
        }

        if (editTarget) {
            formData.append('_method', 'PUT');
            router.post(`/owner/cafes/tables/${editTarget.id}`, formData, {
                forceFormData: true,
                onSuccess: () => { closeModal(); setProcessing(false); },
                onError: (errs: any) => { setErrors(errs); setProcessing(false); },
            });
        } else {
            router.post('/owner/cafes/tables', formData, {
                forceFormData: true,
                onSuccess: () => { closeModal(); setProcessing(false); },
                onError: (errs: any) => { setErrors(errs); setProcessing(false); },
            });
        }
    };

    const handleDelete = (table: TableItem) => {
        setProcessing(true);
        router.delete(`/owner/cafes/tables/${table.id}`, {
            onSuccess: () => { setDeleteTarget(null); setProcessing(false); },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <OwnerLayout breadcrumbs={[{ title: 'Profil Cafe', href: '/owner/cafes' }, { title: 'Meja & Surge Pricing' }]}>
            <Head title="Kelola Meja - Owner Portal" />

            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <Layers className="size-7 text-orange-600" />
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">Manajemen Meja & Surge Pricing</h1>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-500 mt-1">Kelola inventaris meja cafe, tipe area (VIP, Outdoor, Indoor), kapasitas tamu, dan min spend.</p>
                    </div>
                    <Button onClick={openAdd} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-xs flex items-center gap-2">
                        <Plus className="size-4" />
                        <span>Tambah Meja Baru</span>
                    </Button>
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

                {/* Tables List */}
                <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                    {tablesList.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3 text-stone-400">
                            <Inbox className="size-14 stroke-1 text-stone-300" />
                            <p className="text-sm font-semibold text-stone-700">Belum ada meja terdaftar</p>
                            <p className="text-xs text-stone-500">Klik tombol "Tambah Meja Baru" di atas untuk menambahkan denah meja cafe Anda.</p>
                            <Button onClick={openAdd} size="sm" className="mt-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2">
                                <Plus className="size-4" />Tambah Meja Pertama
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
                                    <tr>
                                        <th className="px-6 py-4">Nama Meja</th>
                                        <th className="px-6 py-4">Tipe Area</th>
                                        <th className="px-6 py-4">Kapasitas</th>
                                        <th className="px-6 py-4">Min. Spend</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 text-stone-700">
                                    {tablesList.map((t) => (
                                        <tr key={t.id} className="hover:bg-stone-50 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-stone-900">{t.name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${typeColor[t.type] || typeColor['regular']}`}>
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-semibold">{t.capacity} Orang</td>
                                            <td className="px-6 py-4 font-bold text-stone-900">{t.min_spend}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${t.is_active ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-600 border border-stone-200'}`}>
                                                    {t.is_active ? 'Aktif' : 'Non-Aktif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEdit(t)} className="p-1.5 text-stone-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Edit meja">
                                                        <Edit2 className="size-3.5" />
                                                    </button>
                                                    <button onClick={() => setDeleteTarget(t)} className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus meja">
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL: Tambah / Edit Meja */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
                            <h3 className="font-bold text-stone-900 flex items-center gap-2">
                                <Layers className="size-4 text-orange-500" />
                                {editTarget ? 'Edit Data Meja' : 'Tambah Meja Baru'}
                            </h3>
                            <button onClick={closeModal} className="text-stone-400 hover:text-stone-700 transition-colors">
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
                            {/* Nama Meja */}
                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1.5">Nama Meja <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={handleChange('name')}
                                    placeholder="contoh: Meja VIP 1, Outdoor A3"
                                    required
                                    className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all ${errors.name ? 'border-rose-400 bg-rose-50' : 'border-stone-200 focus:border-orange-500'}`}
                                />
                                {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
                            </div>

                            {/* Tipe & Kapasitas */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1.5">Tipe Area <span className="text-rose-500">*</span></label>
                                    <select
                                        value={form.type}
                                        onChange={handleChange('type')}
                                        className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                                    >
                                        {TABLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1.5">Kapasitas (Orang) <span className="text-rose-500">*</span></label>
                                    <input
                                        type="number"
                                        value={form.capacity}
                                        onChange={handleChange('capacity')}
                                        placeholder="4"
                                        min="1"
                                        max="50"
                                        className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all ${errors.capacity ? 'border-rose-400 bg-rose-50' : 'border-stone-200 focus:border-orange-500'}`}
                                    />
                                    {errors.capacity && <p className="mt-1 text-xs text-rose-600">{errors.capacity}</p>}
                                </div>
                            </div>

                            {/* Min Spend */}
                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1.5">Minimum Spend (Rp) <span className="text-rose-500">*</span></label>
                                <input
                                    key={editTarget ? `edit-${editTarget.id}` : 'new'}
                                    type="text"
                                    inputMode="numeric"
                                    defaultValue={form.min_spend}
                                    onChange={(e) => handleRupiahInput(e, (formatted) => {
                                        setForm(prev => ({ ...prev, min_spend: formatted }));
                                        if (errors.min_spend) setErrors(prev => ({ ...prev, min_spend: '' }));
                                    })}
                                    placeholder="50000"
                                    className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all ${errors.min_spend ? 'border-rose-400 bg-rose-50' : 'border-stone-200'}`}
                                />
                                {errors.min_spend && <p className="mt-1 text-xs text-rose-600">{errors.min_spend}</p>}
                                <p className="mt-1 text-[10px] text-stone-400">Minimum pengeluaran pelanggan untuk dapat memesan meja ini. Isi 0 jika tidak ada minimum.</p>
                            </div>

                            {/* Foto Meja */}
                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1.5">Foto Meja <span className="text-stone-400 font-normal">(Opsional)</span></label>
                                {form.photoPreview && (
                                    <div className="relative mb-2 rounded-xl overflow-hidden border border-stone-200 bg-stone-50" style={{ height: 140 }}>
                                        <img src={form.photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, photoFile: null, photoPreview: null }))}
                                            className="absolute top-2 right-2 bg-white/90 hover:bg-white text-stone-600 hover:text-rose-600 rounded-full p-1 shadow transition-colors"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    </div>
                                )}
                                <label className={`flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl py-4 cursor-pointer transition-colors ${form.photoPreview ? 'border-stone-200 hover:border-orange-400' : 'border-stone-300 hover:border-orange-500 bg-stone-50'}`}>
                                    <Upload className="size-5 text-stone-400" />
                                    <span className="text-xs text-stone-500">{form.photoPreview ? 'Ganti foto' : 'Pilih foto meja'}</span>
                                    <span className="text-[10px] text-stone-400">JPG, JPEG, PNG, WEBP — Maks. 2MB</span>
                                    <input
                                        type="file"
                                        accept="image/jpg,image/jpeg,image/png,image/webp"
                                        className="sr-only"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] ?? null;
                                            if (file) {
                                                setForm(prev => ({
                                                    ...prev,
                                                    photoFile: file,
                                                    photoPreview: URL.createObjectURL(file),
                                                }));
                                            }
                                        }}
                                    />
                                </label>
                            </div>

                            {/* Status Aktif */}
                            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                                <div>
                                    <p className="text-xs font-bold text-stone-700">Status Meja</p>
                                    <p className="text-[10px] text-stone-500">Tampilkan meja ini untuk pemesanan</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.is_active ? 'bg-emerald-500' : 'bg-stone-300'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-1">
                                <Button type="submit" disabled={processing} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                                    <Save className="size-4" />
                                    {processing ? 'Menyimpan...' : (editTarget ? 'Simpan Perubahan' : 'Tambah Meja')}
                                </Button>
                                <Button type="button" variant="outline" onClick={closeModal} className="rounded-xl text-xs font-semibold border-stone-300 text-stone-600">
                                    Batal
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Konfirmasi Hapus */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
                                <Trash2 className="size-5 text-rose-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-900 text-sm">Hapus Meja</h3>
                                <p className="text-xs text-stone-500">Tindakan ini tidak dapat dibatalkan</p>
                            </div>
                        </div>
                        <p className="text-sm text-stone-700">
                            Apakah Anda yakin ingin menghapus meja <span className="font-bold text-stone-900">"{deleteTarget.name}"</span>?
                        </p>
                        <div className="flex items-center gap-3">
                            <Button onClick={() => handleDelete(deleteTarget)} disabled={processing} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold">
                                {processing ? 'Menghapus...' : 'Ya, Hapus'}
                            </Button>
                            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl text-xs font-semibold border-stone-300">
                                Batal
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </OwnerLayout>
    );
}
