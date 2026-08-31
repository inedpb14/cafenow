import OwnerLayout from '@/components/Owner/OwnerLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Utensils, Plus, Inbox, Edit2, Trash2, X, Save, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, Upload } from 'lucide-react';
import { formatRupiahInt, handleRupiahInput, toRawDigits } from '@/lib/rupiah';

interface MenuItem {
    id: number;
    name: string;
    category: string;
    price: string;
    price_raw?: number;
    is_available: boolean;
    description?: string;
    photo?: string | null;
}

interface OwnerMenusProps {
    menus?: MenuItem[];
    cafe?: { id: number; name: string } | null;
}

interface MenuFormData {
    name: string;
    category: string;
    price: string;
    description: string;
    is_available: boolean;
    photoFile: File | null;
    photoPreview: string | null;
}

const CATEGORIES = ['Makanan', 'Minuman', 'Snack', 'Dessert', 'Paket', 'Lainnya'];

const emptyForm: MenuFormData = { name: '', category: 'Makanan', price: '', description: '', is_available: true, photoFile: null, photoPreview: null };

export default function OwnerMenus(props: OwnerMenusProps) {
    const menusList = props.menus ?? [];
    const { props: pageProps } = usePage() as any;
    const flash = pageProps.flash || {};

    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<MenuItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
    const [form, setForm] = useState<MenuFormData>(emptyForm);
    const [errors, setErrors] = useState<Partial<MenuFormData>>({});
    const [processing, setProcessing] = useState(false);

    const openAdd = () => { setEditTarget(null); setForm(emptyForm); setErrors({}); setShowModal(true); };
    const openEdit = (m: MenuItem) => {
        setEditTarget(m);
        setForm({ name: m.name, category: m.category, price: formatRupiahInt(String(m.price_raw ?? '')), description: m.description || '', is_available: m.is_available, photoFile: null, photoPreview: m.photo || null });
        setErrors({});
        setShowModal(true);
    };
    const closeModal = () => { setShowModal(false); setEditTarget(null); setErrors({}); };

    const handleChange = (field: keyof MenuFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        const newErrors: Partial<MenuFormData> = {};
        if (!form.name.trim()) newErrors.name = 'Nama menu wajib diisi';
        if (!form.price || toRawDigits(form.price) === '0') newErrors.price = 'Harga wajib diisi dan lebih dari 0';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setProcessing(false);
            return;
        }

        const formData = new FormData();
        formData.append('name', form.name);
        formData.append('category', form.category);
        formData.append('price', toRawDigits(form.price));
        formData.append('description', form.description);
        formData.append('is_available', form.is_available ? '1' : '0');
        if (form.photoFile) {
            formData.append('photo', form.photoFile);
        }

        const opts = {
            forceFormData: true,
            onSuccess: () => { closeModal(); setProcessing(false); },
            onError: (errs: any) => { setErrors(errs); setProcessing(false); },
        };

        if (editTarget) {
            formData.append('_method', 'PUT');
            router.post(`/owner/cafes/menus/${editTarget.id}`, formData, opts);
        } else {
            router.post('/owner/cafes/menus', formData, opts);
        }
    };

    const handleDelete = (menu: MenuItem) => {
        setProcessing(true);
        router.delete(`/owner/cafes/menus/${menu.id}`, {
            onSuccess: () => { setDeleteTarget(null); setProcessing(false); },
            onFinish: () => setProcessing(false),
        });
    };

    const categoryColor: Record<string, string> = {
        Makanan: 'bg-amber-100 text-amber-800 border-amber-200',
        Minuman: 'bg-blue-100 text-blue-800 border-blue-200',
        Snack: 'bg-orange-100 text-orange-800 border-orange-200',
        Dessert: 'bg-pink-100 text-pink-800 border-pink-200',
        Paket: 'bg-purple-100 text-purple-800 border-purple-200',
        Lainnya: 'bg-stone-100 text-stone-700 border-stone-200',
    };

    return (
        <OwnerLayout breadcrumbs={[{ title: 'Profil Cafe', href: '/owner/cafes' }, { title: 'Kelola Menu Dapur' }]}>
            <Head title="Menu Dapur - Owner Portal" />

            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <Utensils className="size-7 text-orange-600" />
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">Kelola Menu Makanan & Minuman</h1>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-500 mt-1">Daftarkan menu makanan dan minuman dapur agar pelanggan dapat melakukan Pre-Order saat booking meja.</p>
                    </div>
                    <Button onClick={openAdd} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-xs flex items-center gap-2">
                        <Plus className="size-4" />
                        <span>Tambah Menu Baru</span>
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

                {/* Menu List */}
                <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                    {menusList.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3 text-stone-400">
                            <Inbox className="size-14 stroke-1 text-stone-300" />
                            <p className="text-sm font-semibold text-stone-700">Belum ada menu terdaftar</p>
                            <p className="text-xs text-stone-500">Klik tombol "Tambah Menu Baru" di atas untuk menambahkan menu makanan & minuman dapur Anda.</p>
                            <Button onClick={openAdd} size="sm" className="mt-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2">
                                <Plus className="size-4" />Tambah Menu Pertama
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6">
                            {menusList.map((m) => (
                                <div key={m.id} className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3 flex flex-col justify-between hover:shadow-md hover:border-orange-200 transition-all group">
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            {m.photo && (
                                                <img src={m.photo} alt={m.name} className="h-20 w-20 rounded-lg object-cover border border-stone-200 shrink-0" />
                                            )}
                                            <h4 className="font-bold text-stone-900 text-sm leading-tight">{m.name}</h4>
                                            <span className="text-sm font-bold text-orange-600 shrink-0">{m.price}</span>
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${categoryColor[m.category] || categoryColor['Lainnya']}`}>
                                            {m.category}
                                        </span>
                                        <p className="text-xs text-stone-500 mt-2 leading-relaxed line-clamp-2">{m.description || 'Tidak ada deskripsi'}</p>
                                    </div>
                                    <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${m.is_available ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                                            {m.is_available ? <ToggleRight className="size-3.5" /> : <ToggleLeft className="size-3.5" />}
                                            {m.is_available ? 'Tersedia' : 'Habis'}
                                        </span>
                                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(m)} className="p-1.5 text-stone-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Edit menu">
                                                <Edit2 className="size-3.5" />
                                            </button>
                                            <button onClick={() => setDeleteTarget(m)} className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus menu">
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL: Tambah / Edit Menu */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
                            <h3 className="font-bold text-stone-900 flex items-center gap-2">
                                <Utensils className="size-4 text-orange-500" />
                                {editTarget ? 'Edit Menu' : 'Tambah Menu Baru'}
                            </h3>
                            <button onClick={closeModal} className="text-stone-400 hover:text-stone-700 transition-colors">
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
                            {/* Nama Menu */}
                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1.5">Nama Menu <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={handleChange('name')}
                                    placeholder="contoh: Kopi Susu Gula Aren"
                                    required
                                    className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all ${errors.name ? 'border-rose-400 bg-rose-50' : 'border-stone-200 focus:border-orange-500'}`}
                                />
                                {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
                            </div>

                            {/* Kategori & Harga */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1.5">Kategori <span className="text-rose-500">*</span></label>
                                    <select
                                        value={form.category}
                                        onChange={handleChange('category')}
                                        className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-700 mb-1.5">Harga (Rp) <span className="text-rose-500">*</span></label>
                                    <input
                                    key={editTarget ? `edit-${editTarget.id}` : 'new'}
                                    type="text"
                                    inputMode="numeric"
                                    defaultValue={form.price}
                                    onChange={(e) => handleRupiahInput(e, (formatted) => {
                                        setForm(prev => ({ ...prev, price: formatted }));
                                        if (errors.price) setErrors(prev => ({ ...prev, price: '' }));
                                    })}
                                    placeholder="25000"
                                    className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all ${errors.price ? 'border-rose-400 bg-rose-50' : 'border-stone-200 focus:border-orange-500'}`}
                                />
                                    {errors.price && <p className="mt-1 text-xs text-rose-600">{errors.price}</p>}
                                </div>
                            </div>

                            {/* Deskripsi */}
                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1.5">Deskripsi</label>
                                <textarea
                                    value={form.description}
                                    onChange={handleChange('description')}
                                    placeholder="Deskripsi singkat menu ini..."
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none"
                                />
                            </div>

                            {/* Foto Menu */}
                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1.5">Foto Menu <span className="text-stone-400 font-normal">(Opsional)</span></label>
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
                                    <span className="text-xs text-stone-500">{form.photoPreview ? 'Ganti foto' : 'Pilih foto menu'}</span>
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

                            {/* Ketersediaan */}
                            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                                <div>
                                    <p className="text-xs font-bold text-stone-700">Status Ketersediaan</p>
                                    <p className="text-[10px] text-stone-500">Tampilkan menu ini kepada pelanggan</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, is_available: !prev.is_available }))}
                                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.is_available ? 'bg-emerald-500' : 'bg-stone-300'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.is_available ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-1">
                                <Button type="submit" disabled={processing} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                                    <Save className="size-4" />
                                    {processing ? 'Menyimpan...' : (editTarget ? 'Simpan Perubahan' : 'Tambah Menu')}
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
                                <h3 className="font-bold text-stone-900 text-sm">Hapus Menu</h3>
                                <p className="text-xs text-stone-500">Tindakan ini tidak dapat dibatalkan</p>
                            </div>
                        </div>
                        <p className="text-sm text-stone-700">
                            Apakah Anda yakin ingin menghapus menu <span className="font-bold text-stone-900">"{deleteTarget.name}"</span>?
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
