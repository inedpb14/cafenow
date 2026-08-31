import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ArrowLeft,
    Calendar as CalendarIcon,
    Check,
    Mail,
    MapPin,
    Phone,
    Utensils,
    User as UserIcon,
    X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/Contexts/ToastContext';
import { api } from '@/lib/http';
import {
    TABLE_TYPE_LABELS,
    formatPrice,
    statusBadgeClass,
    type CafeApproval,
} from '@/lib/cafe-approval';

// ─── Config ────────────────────────────────────────────────────────────────────

const MAX_NOTES = 1000;

type DetailTab = 'info' | 'tables' | 'menu' | 'hours';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ApprovalDetail({ cafe }: { cafe: CafeApproval }) {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<DetailTab>('info');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    if (notes.trim().length > MAX_NOTES) {
      setNotesError(`Catatan maksimal ${MAX_NOTES} karakter`);
      return;
    }
    setProcessing(true);
    try {
      const response = await api.post(`/api/admin/cafe-approvals/${cafe.id}/approve`, { notes: notes.trim() });
      if (!response.ok) throw new Error();
      toast.show('success', 'Cafe berhasil disetujui');
      setShowApproveDialog(false);
      router.reload({ only: ['cafe'] });
    } catch {
      toast.show('error', 'Gagal menyetujui cafe');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      const response = await api.post(`/api/admin/cafe-approvals/${cafe.id}/reject`, { reason: rejectionReason });
      if (!response.ok) throw new Error();
      toast.show('success', 'Cafe ditolak');
      setShowRejectDialog(false);
      router.reload({ only: ['cafe'] });
    } catch {
      toast.show('error', 'Gagal menolak cafe');
    } finally {
      setProcessing(false);
    }
  };

  const tabLabels: Record<DetailTab, string> = {
    info: 'Info Cafe',
    tables: `Meja (${cafe.tables?.length ?? 0})`,
    menu: `Menu (${cafe.menu_items?.length ?? 0})`,
    hours: 'Jam Operasional',
  };

  return (
    <>
      <Head title={`${cafe.name} - Persetujuan Cafe`} />
      <AdminLayout user={user!}>
        <div className="space-y-6">
          {/* Back Link */}
          <Link
            href="/admin/cafe-approvals"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Kembali ke Antrean Persetujuan
          </Link>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">{cafe.name}</h1>
                <Badge className={statusBadgeClass(cafe.status)}>{cafe.status.toUpperCase()}</Badge>
                {cafe.submission_count && cafe.submission_count > 1 && (
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5">
                    Pengajuan ke-{cafe.submission_count}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><UserIcon className="size-3.5" /> {cafe.owner_name}</span>
                <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {cafe.location}</span>
                {cafe.phone && <span className="flex items-center gap-1.5"><Phone className="size-3.5" /> {cafe.phone}</span>}
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="size-3.5" />
                  Terdaftar {new Date(cafe.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            {cafe.status === 'pending' && (
              <div className="flex gap-3">
                <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
                  <X className="size-4" />
                  Tolak
                </Button>
                <Button onClick={() => setShowApproveDialog(true)}>
                  <Check className="size-4" />
                  Setujui
                </Button>
              </div>
            )}
          </div>

          {/* Rejection History */}
          {((cafe.submission_count && cafe.submission_count > 1) || cafe.rejection_reason) && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-1.5">
              <p className="text-sm font-bold text-destructive">Riwayat Penolakan</p>
              {cafe.submission_count && cafe.submission_count > 1 && (
                <p className="text-xs text-muted-foreground">
                  Ini adalah pengajuan ke-<strong className="text-foreground">{cafe.submission_count}</strong> — cafe pernah ditolak sebelumnya.
                </p>
              )}
              {cafe.rejection_reason && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Alasan penolakan terakhir:</span> {cafe.rejection_reason}
                </p>
              )}
            </div>
          )}

          {/* Hero Photo */}
          {cafe.primary_photo && (
            <div className="relative h-56 rounded-xl overflow-hidden border border-border bg-muted">
              <img src={cafe.primary_photo} alt={cafe.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-border gap-1">
            {(['info', 'tables', 'menu', 'hours'] as DetailTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          {/* Tab: Info Cafe */}
          {activeTab === 'info' && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoCell label="Nama Cafe" value={cafe.name} />
                <InfoCell label="Lokasi" value={cafe.city || cafe.address || '-'} icon={MapPin} />
                <InfoCell label="Telepon" value={cafe.phone || '-'} icon={Phone} />
                <InfoCell
                  label="Tanggal Daftar"
                  value={new Date(cafe.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  icon={CalendarIcon}
                />
                <InfoCell label="Pemilik" value={cafe.owner_name} icon={UserIcon} />
                <InfoCell label="Email Pemilik" value={cafe.owner_email || '-'} icon={Mail} className="break-all" />
              </div>
              {cafe.description && (
                <div className="bg-muted/60 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Deskripsi</p>
                  <p className="text-foreground leading-relaxed">{cafe.description}</p>
                </div>
              )}
              {cafe.facilities && cafe.facilities.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Fasilitas</p>
                  <div className="flex flex-wrap gap-2">
                    {cafe.facilities.map((f, i) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1 font-medium">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {cafe.photos && cafe.photos.length > 1 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Foto Cafe</p>
                  <div className="grid grid-cols-3 gap-2">
                    {cafe.photos.slice(0, 6).map((p, i) => (
                      <img key={i} src={p} alt={`Foto ${i + 1}`} className="rounded-lg h-24 w-full object-cover border border-border" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Meja */}
          {activeTab === 'tables' && (
            <div className="space-y-3">
              {!cafe.tables || cafe.tables.length === 0 ? (
                <EmptyTab text="Belum ada meja yang didaftarkan" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cafe.tables.map((t) => (
                    <div key={t.id} className="rounded-xl border border-border overflow-hidden bg-muted/40">
                      {t.photo && <img src={t.photo} alt={t.name} className="w-full h-28 object-cover" />}
                      <div className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-foreground">{t.name}</p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${!t.is_active ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'}`}>
                            {t.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{TABLE_TYPE_LABELS[t.type] || t.type} · {t.capacity} orang</p>
                        {t.min_spend > 0 && <p className="text-xs font-semibold text-primary">Min. {formatPrice(t.min_spend)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Menu */}
          {activeTab === 'menu' && (
            <div className="space-y-3">
              {!cafe.menu_items || cafe.menu_items.length === 0 ? (
                <EmptyTab text="Belum ada menu yang didaftarkan" />
              ) : (
                <div className="divide-y divide-border">
                  {cafe.menu_items.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 py-2.5">
                      {m.image
                        ? <img src={m.image} alt={m.name} className="size-10 rounded-lg object-cover border border-border shrink-0" />
                        : <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"><Utensils className="size-4" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.category}</p>
                      </div>
                      <p className="text-sm font-bold text-foreground shrink-0">{formatPrice(Number(m.price))}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Jam Operasional */}
          {activeTab === 'hours' && (
            <div className="space-y-2 max-w-xl">
              {!cafe.operational_hours || cafe.operational_hours.length === 0 ? (
                <EmptyTab text="Belum ada jam operasional yang diatur" />
              ) : (
                cafe.operational_hours.map((h, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-border text-sm">
                    <span className="font-medium text-foreground">{h.day}</span>
                    <span className="text-muted-foreground">{h.open} – {h.close} WIB</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── DIALOG APPROVE ─────────────────────────────── */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Konfirmasi Persetujuan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Catatan Admin (Opsional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setNotesError(''); }}
                  className={`w-full px-3 py-2 text-sm border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                    notesError ? 'border-destructive' : 'border-border'
                  }`}
                  rows={3}
                  placeholder="Catatan tambahan untuk owner..."
                />
                <div className="flex justify-between mt-1 text-xs">
                  <span className={`${notesError ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {notesError || `Maksimal ${MAX_NOTES} karakter`}
                  </span>
                  <span className="text-muted-foreground">{notes.length}/{MAX_NOTES}</span>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-3">
                <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={processing}>Batal</Button>
                <Button onClick={handleApprove} disabled={processing}>
                  <Check className="size-4" />
                  Setujui
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── DIALOG REJECT ─────────────────────────────── */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tolak Pengajuan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Alasan Penolakan <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive/30 focus:border-destructive transition-all"
                  rows={3}
                  placeholder="Jelaskan alasan penolakan secara detail..."
                />
                <p className="text-xs text-muted-foreground mt-1">Wajib diisi — alasan ini akan dikirim ke pemilik cafe.</p>
              </div>
              <DialogFooter className="gap-2 sm:gap-3">
                <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={processing}>Batal</Button>
                <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim() || processing}>
                  <X className="size-4" />
                  Tolak
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InfoCell({ label, value, icon: Icon, className = '' }: {
  label: string;
  value: string;
  icon?: any;
  className?: string;
}) {
  return (
    <div className="bg-muted/60 rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`font-semibold text-foreground flex items-center gap-1.5 ${className}`}>
        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
        {value}
      </p>
    </div>
  );
}

function EmptyTab({ text }: { text: string }) {
  return <p className="text-sm text-center text-muted-foreground py-6">{text}</p>;
}