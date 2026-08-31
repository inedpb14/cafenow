import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/components/Admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  CreditCard,
  MapPin,
  Phone,
  Store,
  User as UserIcon,
  Users,
  Utensils,
  Wallet,
  XCircle,
  CheckCircle2,
  Receipt,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface DetailItem {
  id: number;
  quantity: number;
  unit_price: string;
  subtotal: string;
  menu_item: { id: number; name: string } | null;
}

interface DetailOrder {
  id: number;
  order_reference: string;
  order_type: string;
  status: string;
  payment_status: string;
  total_price: string;
  prepare_at: string | null;
  special_notes: string | null;
  items: DetailItem[];
}

interface DetailBooking {
  id: number;
  booking_reference: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  guest_count: number;
  status: string;
  payment_status: string;
  table_price: string;
  menu_subtotal: string;
  total_price: string;
  commission: string;
  cafe_receives: string;
  check_in_time: string | null;
  check_out_time: string | null;
  extend_count: number;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  customer_notes: string | null;
  cafe: {
    id: number;
    name: string;
    address: string | null;
    city: string | null;
    contact_whatsapp: string | null;
    contact_email: string | null;
  } | null;
  customer: { id: number; name: string; email: string; phone: string | null } | null;
  table: { id: number; name: string; capacity: number } | null;
  payment: {
    id: number;
    status: string;
    payment_method: string | null;
    payment_channel: string | null;
    gateway_reference: string | null;
    paid_at: string | null;
  } | null;
  menu_orders: DetailOrder[];
  created_at: string;
}

const STATUS_OPTIONS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  confirmed: { label: 'Confirmed', cls: 'bg-primary/15 text-primary border-primary/30' },
  checked_in: { label: 'Checked-In', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30' },
  completed: { label: 'Completed', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  cancelled: { label: 'Cancelled', cls: 'bg-destructive/15 text-destructive border-destructive/30' },
  no_show: { label: 'No Show', cls: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' },
};

const ORDER_STATUS_OPTIONS: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: 'Pending Pembayaran', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  scheduled: { label: 'Terjadwal', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30' },
  preparing: { label: 'Diproses', cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  ready: { label: 'Siap', cls: 'bg-primary/15 text-primary border-primary/30' },
  completed: { label: 'Selesai', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  cancelled: { label: 'Dibatalkan', cls: 'bg-destructive/15 text-destructive border-destructive/30' },
};

function statusBadge(status: string, map: Record<string, { label: string; cls: string }>): { label: string; cls: string } {
  return map[status] || { label: status, cls: 'bg-muted text-muted-foreground border-border' };
}

function formatCurrency(value: number | string): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  return `${date.toLocaleDateString('id-ID')} ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : '-';
}

export default function BookingDetail({ booking }: { booking: DetailBooking }) {
  const { user } = useAuth();
  const isPaid = booking.payment_status === 'paid';
  const isCancelled = booking.status === 'cancelled';

  return (
    <>
      <Head title={`Detail Booking #${booking.booking_reference}`} />
      <AdminLayout user={user!}>
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/admin/bookings"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              Kembali ke Daftar Booking
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={statusBadge(booking.status, STATUS_OPTIONS).cls}>
                {statusBadge(booking.status, STATUS_OPTIONS).label.toUpperCase()}
              </Badge>
              <Badge className={isPaid
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'}>
                {isPaid ? 'Lunas' : 'Belum Dibayar'}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
                Detail Booking <span className="text-primary">#{booking.booking_reference}</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Dibuat pada {formatDateTime(booking.created_at)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Pembayaran</p>
              <p className="font-serif text-2xl font-extrabold text-primary">{formatCurrency(booking.total_price)}</p>
            </div>
          </div>

          {/* Cafe & Customer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard icon={Store} title="Informasi Cafe">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-bold text-foreground">{booking.cafe?.name || '-'}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0 text-primary" />
                    {booking.cafe?.address || '-'}
                  </p>
                  {booking.cafe?.city && (
                    <p className="text-sm text-muted-foreground">Kota: {booking.cafe.city}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                  <Phone className="size-3.5 text-primary" />
                  <span>{booking.cafe?.contact_whatsapp || '-'}</span>
                </div>
              </div>
              {booking.cafe?.contact_email && (
                <p className="text-sm text-muted-foreground">Email: {booking.cafe.contact_email}</p>
              )}
            </SectionCard>

            <SectionCard icon={UserIcon} title="Informasi Pelanggan">
              <p className="font-bold text-foreground">{booking.customer?.name || '-'}</p>
              <p className="text-sm text-muted-foreground">{booking.customer?.email || '-'}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Phone className="size-3.5 text-primary" />
                {booking.customer?.phone || '-'}
              </p>
            </SectionCard>
          </div>

          {/* Session info */}
          <SectionCard icon={CalendarIcon} title="Detail Sesi">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
              <InfoItem label="Tanggal" value={new Date(booking.booking_date).toLocaleDateString('id-ID')} />
              <InfoItem label="Jam Kunjungan" value={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)} WIB`} />
              <InfoItem label="Durasi" value={`${booking.duration_minutes} menit`} />
              <InfoItem label="Meja" value={booking.table ? `${booking.table.name} (${booking.table.capacity} kursi)` : '-'} />
              <InfoItem label="Jumlah Tamu" value={`${booking.guest_count} orang`} />
              <InfoItem label="Ekstensi" value={booking.extend_count > 0 ? `${booking.extend_count}x` : 'Tidak ada'} />
            </div>
            {(booking.check_in_time || booking.check_out_time) && (
              <div className="grid grid-cols-2 gap-3 text-sm mt-3 pt-3 border-t border-border">
                <InfoItem label="Check-in" value={formatDateTime(booking.check_in_time)} icon={Clock} />
                <InfoItem label="Check-out" value={formatDateTime(booking.check_out_time)} icon={Clock} />
              </div>
            )}
          </SectionCard>

          {/* Pre-orders */}
          <SectionCard icon={Utensils} title="Rincian Pre-Order Dapur">
            {booking.menu_orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada pesanan dapur untuk booking ini.</p>
            ) : (
              <div className="space-y-4">
                {booking.menu_orders.map((order) => {
                  const os = statusBadge(order.status, ORDER_STATUS_OPTIONS);
                  return (
                    <div key={order.id} className="rounded-lg border border-border overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Receipt className="size-4 text-primary" />
                          <p className="font-bold text-foreground text-sm">Pesanan #{order.order_reference}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={os.cls}>{os.label}</Badge>
                          <Badge className={order.payment_status === 'paid'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'}>
                            {order.payment_status === 'paid' ? 'Pesanan Lunas' : 'Belum Dibayar'}
                          </Badge>
                        </div>
                      </div>

                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                            <th className="px-4 py-2">Menu</th>
                            <th className="px-4 py-2 text-center w-20">Qty</th>
                            <th className="px-4 py-2 text-right w-32">Harga Satuan</th>
                            <th className="px-4 py-2 text-right w-32">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => (
                            <tr key={item.id} className="border-b border-border last:border-b-0">
                              <td className="px-4 py-2.5 font-medium text-foreground">
                                {item.menu_item?.name || 'Sajian'}
                              </td>
                              <td className="px-4 py-2.5 text-center text-muted-foreground">{item.quantity}</td>
                              <td className="px-4 py-2.5 text-right text-muted-foreground">
                                {formatCurrency(item.unit_price)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                                {formatCurrency(item.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/40">
                            <td colSpan={3} className="px-4 py-2.5 text-right font-bold text-foreground">
                              Subtotal Pesanan
                            </td>
                            <td className="px-4 py-2.5 text-right font-extrabold text-primary">
                              {formatCurrency(order.total_price)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>

                      {(order.prepare_at || order.special_notes) && (
                        <div className="px-4 py-3 space-y-1 text-xs text-muted-foreground border-t border-border">
                          {order.prepare_at && (
                            <p className="flex items-center gap-1.5">
                              <Clock className="size-3.5 text-primary" />
                              Waktu siap saji: {formatDateTime(order.prepare_at)}
                            </p>
                          )}
                          {order.special_notes && <p>Catatan khusus: {order.special_notes}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Payment */}
          <SectionCard icon={Wallet} title="Rincian Pembayaran">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sewa Meja Cafe</span>
                  <span className="font-semibold text-foreground">{formatCurrency(booking.table_price)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Pre-Order Dapur</span>
                  <span className="font-semibold text-foreground">{formatCurrency(booking.menu_subtotal)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-extrabold text-foreground">
                  <span>Total Pembayaran</span>
                  <span className="text-primary">{formatCurrency(booking.total_price)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border text-muted-foreground">
                  <span>Komisi Platform</span>
                  <span className="font-semibold text-foreground">{formatCurrency(booking.commission)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Diterima Cafe</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(booking.cafe_receives)}
                  </span>
                </div>
              </div>

              {booking.payment && (
                <div className="rounded-lg bg-muted/50 p-4 space-y-1.5 text-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="size-3.5" />
                    Informasi Pembayaran
                  </p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Metode</span>
                    <span className="font-semibold text-foreground">
                      {booking.payment.payment_method || booking.payment.payment_channel || '-'}
                    </span>
                  </div>
                  {booking.payment.payment_channel && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kanal</span>
                      <span className="font-semibold text-foreground">{booking.payment.payment_channel}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dibayar Pada</span>
                    <span className="font-semibold text-foreground">{formatDateTime(booking.payment.paid_at)}</span>
                  </div>
                  {booking.payment.gateway_reference && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Referensi Gateway</span>
                      <span className="font-semibold text-foreground truncate max-w-[180px]">
                        {booking.payment.gateway_reference}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Notes */}
          {booking.customer_notes && (
            <SectionCard icon={UserIcon} title="Catatan Pelanggan">
              <p className="text-sm text-foreground leading-relaxed">{booking.customer_notes}</p>
            </SectionCard>
          )}

          {/* Cancellation */}
          {isCancelled && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-1.5">
              <p className="text-sm font-bold text-destructive flex items-center gap-2">
                <XCircle className="size-4" />
                Booking Dibatalkan
              </p>
              {booking.cancelled_by && (
                <p className="text-sm text-muted-foreground">
                  Dibuat oleh: <span className="font-semibold text-foreground">{booking.cancelled_by}</span>
                </p>
              )}
              {booking.cancellation_reason && (
                <p className="text-sm text-muted-foreground">
                  Alasan: <span className="text-foreground">{booking.cancellation_reason}</span>
                </p>
              )}
            </div>
          )}

          {!isCancelled && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 border-t border-border pt-3">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              Pembatalan booking ditangani oleh pemilik cafe melalui portal owner.
            </p>
          )}
        </div>
      </AdminLayout>
    </>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <p className="text-sm font-bold text-foreground flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoItem({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 shrink-0 text-primary" />}
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}