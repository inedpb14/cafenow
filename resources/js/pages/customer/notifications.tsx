import { Head, router } from '@inertiajs/react';
import { Bell, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface NotificationsProps {
    notifications: {
        data: any[];
        links: any[];
        current_page: number;
        last_page: number;
    };
}

export default function CustomerNotifications({ notifications }: NotificationsProps) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        setSelectedIds(prev =>
            prev.size === notifications.data.length
                ? new Set()
                : new Set(notifications.data.map(i => i.id))
        );
    };

    const handleMarkRead = (id: number) => {
        router.post(`/customer/notifications/${id}/read`, {}, { preserveState: true });
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Hapus notifikasi ini?')) {
            router.delete(`/customer/notifications/${id}`, { preserveState: true });
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Hapus ${selectedIds.size} notifikasi?`)) {
            router.delete('/customer/notifications', {
                data: { ids: Array.from(selectedIds) },
                preserveState: true,
            });
            setSelectedIds(new Set());
        }
    };

    const allSelected = notifications.data.length > 0 && selectedIds.size === notifications.data.length;

    return (
        <>
            <Head title="Pusat Notifikasi - CafeNow" />

            <div className="space-y-8 max-w-4xl mx-auto">
                {/* Header Banner */}
                <div className="block-card p-6 sm:p-8 bg-[var(--bg-warm)] border-2 border-[var(--text)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-[var(--primary)] text-white border-2 border-[var(--text)] shadow-[2px_2px_0_var(--text)]">
                            <Bell className="size-6" />
                        </div>
                        <div>
                            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text)]">
                                Pusat Notifikasi Aktivitas
                            </h1>
                            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
                                Informasi pembaruan status reservasi meja, konfirmasi pembayaran, dan penawaran spesial.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Notifications List */}
                {notifications.data.length === 0 ? (
                    <div className="block-card p-12 bg-white border-2 border-[var(--text)] text-center space-y-4">
                        <Bell className="size-12 text-[var(--text-muted)] mx-auto stroke-1" />
                        <h3 className="font-serif text-xl font-bold text-[var(--text)]">Tidak Ada Notifikasi</h3>
                        <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-sm mx-auto">
                            Semua pembaruan aktivitas reservasi dan pesanan Anda akan muncul di sini.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Selection Toolbar */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <label className="flex items-center gap-2.5 text-xs font-bold text-[var(--text)] cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleSelectAll}
                                    className="size-4 accent-[var(--primary)] cursor-pointer"
                                />
                                Pilih Semua
                            </label>

                            {selectedIds.size > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-1.5 text-[11px] font-bold py-2 px-4 border-2 border-rose-500 bg-rose-500 text-white hover:bg-rose-600 transition-all cursor-pointer"
                                >
                                    <Trash2 className="size-3.5" />
                                    Hapus {selectedIds.size} Notifikasi
                                </button>
                            )}
                        </div>

                        {notifications.data.map((item) => {
                            const isUnread = !item.read_at;
                            const isSelected = selectedIds.has(item.id);
                            return (
                                <div
                                    key={item.id}
                                    className={`
                                        block-card p-5 border-2 border-[var(--text)] flex items-start gap-3.5 transition-all
                                        ${isUnread ? 'bg-amber-50 shadow-[4px_4px_0_var(--text)]' : 'bg-white opacity-85'}
                                        ${isSelected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}
                                    `}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelect(item.id)}
                                        className="size-4 accent-[var(--primary)] mt-2 shrink-0 cursor-pointer"
                                    />

                                    <div className="p-2.5 bg-amber-100 border border-[var(--text)] text-[var(--primary)] shrink-0 mt-0.5">
                                        <Bell className="size-5" />
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-sm text-[var(--text)]">{item.subject || 'Pembaruan Reservasi'}</h4>
                                            {isUnread && (
                                                <span className="px-2 py-0.5 bg-[var(--primary)] text-white text-[9px] font-extrabold uppercase border border-[var(--text)]">
                                                    Baru
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.message}</p>
                                        <p className="text-[10px] text-stone-500 font-medium pt-1">
                                            {item.sent_at ? new Date(item.sent_at).toLocaleString('id-ID') : 'Baru saja'}
                                        </p>
                                    </div>

                                    <div className="flex items-start gap-2 shrink-0">
                                        {isUnread && (
                                            <button
                                                onClick={() => handleMarkRead(item.id)}
                                                className="btn-secondary text-[10px] py-1 px-3 cursor-pointer"
                                            >
                                                Tandai Dibaca
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            title="Hapus notifikasi"
                                            className="p-2 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
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