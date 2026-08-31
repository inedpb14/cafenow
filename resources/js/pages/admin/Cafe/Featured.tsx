import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar as CalendarIcon,
  MapPin,
  Pencil,
  Plus,
  Star,
  Store,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/Contexts/ToastContext';
import { api } from '@/lib/http';

interface FeaturedCafe {
  id: number;
  cafe_id: number;
  cafe: { id: number; name: string; location: string } | null;
  display_order: number;
  active_from: string;
  active_to: string | null;
  created_by: number;
}

interface CafeOption {
  id: number;
  name: string;
  location: string;
}

interface FeaturedForm {
  cafe_id: string;
  display_order: string;
  active_from: string;
  active_to: string;
}

function toDateInput(v: string | null): string {
  return v ? v.slice(0, 10) : '';
}

function initForm(): FeaturedForm {
  const from = new Date();
  const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return {
    cafe_id: '',
    display_order: '1',
    active_from: from.toISOString().split('T')[0],
    active_to: to.toISOString().split('T')[0],
  };
}

function formatDate(v: string | null): string {
  return v
    ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Selamanya';
}

export default function FeaturedCafes() {
  const { user } = useAuth();
  const toast = useToast();

  const [featured, setFeatured] = useState<FeaturedCafe[]>([]);
  const [options, setOptions] = useState<CafeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<number | null>(null);
  const [editing, setEditing] = useState<FeaturedCafe | null>(null);
  const [form, setForm] = useState<FeaturedForm>(initForm());
  const [formError, setFormError] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchFeatured = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/featured-cafes');
      const data = await response.json();
      setFeatured(data.data || []);
    } catch {
      toast.show('error', 'Gagal memuat cafe unggulan');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const response = await fetch('/api/admin/featured-cafes/options');
      const data = await response.json();
      setOptions(data.data || []);
    } catch {
      toast.show('error', 'Gagal memuat daftar cafe');
    }
  };

  useEffect(() => {
    fetchFeatured();
    fetchOptions();
  }, []);

  const validateForm = (): boolean => {
    if (!form.cafe_id && !editing) {
      setFormError('Pilih cafe terlebih dahulu');
      return false;
    }
    if (form.active_to && form.active_from && form.active_to < form.active_from) {
      setFormError('Tanggal "Sampai" harus setelah tanggal "Dari"');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setProcessing(true);
    try {
      const payload = {
        display_order: parseInt(form.display_order) || 0,
        active_from: form.active_from,
        active_to: form.active_to || null,
      };

      const response = editing
        ? await api.put(`/api/admin/featured-cafes/${editing.id}`, payload)
        : await api.post('/api/admin/featured-cafes', { cafe_id: parseInt(form.cafe_id), ...payload });

      if (!response.ok) throw new Error();

      toast.show('success', editing ? 'Cafe unggulan diperbarui' : 'Cafe berhasil ditambahkan');
      setShowAddModal(false);
      setShowEditModal(false);
      setEditing(null);
      setForm(initForm());
      fetchFeatured();
      fetchOptions();
    } catch {
      toast.show('error', editing ? 'Gagal memperbarui cafe unggulan' : 'Gagal menambahkan cafe');
    } finally {
      setProcessing(false);
    }
  };

  const openEdit = (item: FeaturedCafe) => {
    setEditing(item);
    setForm({
      cafe_id: String(item.cafe_id),
      display_order: String(item.display_order),
      active_from: toDateInput(item.active_from),
      active_to: toDateInput(item.active_to),
    });
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!selectedForDelete) return;
    setProcessing(true);
    try {
      const response = await api.delete(`/api/admin/featured-cafes/${selectedForDelete}`);
      if (!response.ok) throw new Error();
      toast.show('success', 'Cafe dihapus dari daftar unggulan');
      setShowDeleteModal(false);
      setSelectedForDelete(null);
      fetchFeatured();
      fetchOptions();
    } catch {
      toast.show('error', 'Gagal menghapus cafe unggulan');
    } finally {
      setProcessing(false);
    }
  };

  const isExpired = (item: FeaturedCafe): boolean =>
    !!item.active_to && new Date(item.active_to) < new Date();

  return (
    <>
      <Head title="Featured Cafes - CafeNow" />
      <AdminLayout user={user!}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
              Manajemen Cafe Unggulan
            </h1>
            <Button onClick={() => { setEditing(null); setForm(initForm()); setShowAddModal(true); }}>
              <Plus className="size-4" />
              Tambah Cafe
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner className="size-6 text-primary" />
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-card p-5 relative">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Store className="size-4 text-primary shrink-0" />
                      {item.cafe?.name || 'Cafe dihapus'}
                    </h3>
                    <Badge className="bg-primary/15 text-primary border-primary/30 shrink-0">
                      #{item.display_order}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {item.cafe?.location || '-'}
                  </p>

                  <div className="pt-3 border-t border-border space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <CalendarIcon className="size-3.5" />
                      <span className="font-medium text-foreground">Dari:</span> {formatDate(item.active_from)}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <CalendarIcon className="size-3.5" />
                      <span className="font-medium text-foreground">Hingga:</span> {formatDate(item.active_to)}
                    </p>
                  </div>

                  {isExpired(item) && (
                    <p className="mt-3 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-2.5 py-1">
                      Periode telah berakhir
                    </p>
                  )}

                  <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(item)}>
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => { setSelectedForDelete(item.id); setShowDeleteModal(true); }}
                    >
                      <Trash2 className="size-3.5" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
              <Star className="size-8 mx-auto mb-2 text-muted-foreground/50" />
              Belum ada cafe unggulan
            </div>
          )}
        </div>

        {/* ── MODAL TAMBAH ─────────────────────────── */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="size-4 text-primary" />
                Tambah Cafe Unggulan
              </DialogTitle>
            </DialogHeader>
            <FeaturedFormFields
              form={form}
              setForm={setForm}
              formError={formError}
              options={options}
            />
            <DialogFooter className="gap-2 sm:gap-3">
              <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={processing}>Batal</Button>
              <Button onClick={handleSubmit} disabled={processing}>
                <Plus className="size-4" />
                Tambah
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── MODAL EDIT ───────────────────────────── */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="size-4 text-primary" />
                Edit Cafe Unggulan
              </DialogTitle>
            </DialogHeader>
            {editing && (
              <p className="text-sm text-muted-foreground -mt-2 flex items-center gap-1.5">
                <Store className="size-3.5" /> {editing.cafe?.name}
              </p>
            )}
            <FeaturedFormFields
              form={form}
              setForm={setForm}
              formError={formError}
              hideCafeSelect
            />
            <DialogFooter className="gap-2 sm:gap-3">
              <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={processing}>Batal</Button>
              <Button onClick={handleSubmit} disabled={processing}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── MODAL HAPUS ──────────────────────────── */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="size-4 text-destructive" />
                Hapus Cafe Unggulan
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus cafe ini dari daftar unggulan?
            </p>
            <DialogFooter className="gap-2 sm:gap-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={processing}>Batal</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={processing}>
                <Trash2 className="size-4" />
                Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </>
  );
}

function FeaturedFormFields({
  form,
  setForm,
  formError,
  options,
  hideCafeSelect = false,
}: {
  form: FeaturedForm;
  setForm: (f: FeaturedForm) => void;
  formError: string;
  options?: CafeOption[];
  hideCafeSelect?: boolean;
}) {
  return (
    <div className="space-y-4">
      {!hideCafeSelect && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Pilih Cafe</label>
          <select
            value={form.cafe_id}
            onChange={(e) => setForm({ ...form, cafe_id: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
          >
            <option value="">-- Pilih Cafe --</option>
            {options?.map((cafe) => (
              <option key={cafe.id} value={cafe.id}>
                {cafe.name} ({cafe.location})
              </option>
            ))}
          </select>
          {options?.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">Tidak ada cafe aktif yang tersedia.</p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Prioritas (Urutan)</label>
        <Input
          type="number"
          min="0"
          value={form.display_order}
          onChange={(e) => setForm({ ...form, display_order: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Dari Tanggal</label>
          <Input
            type="date"
            value={form.active_from}
            onChange={(e) => setForm({ ...form, active_from: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Sampai Tanggal</label>
          <Input
            type="date"
            value={form.active_to}
            onChange={(e) => setForm({ ...form, active_to: e.target.value })}
          />
        </div>
      </div>

      {formError && (
        <p className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
          {formError}
        </p>
      )}
    </div>
  );
}