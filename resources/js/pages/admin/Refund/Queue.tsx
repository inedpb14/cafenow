import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/Contexts/ToastContext';
import { api } from '@/lib/http';
import { CheckCircle, XCircle } from 'lucide-react';

interface Refund {
  id: number;
  booking: { id: number; booking_code: string };
  customer: { id: number; name: string };
  refund_amount: number;
  reason: string;
  status: string;
  bank_account: string;
  bank_name: string;
  account_holder: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

interface RefundQueueProps {
  auth: { user: { id: number; name: string; email: string; role: string } };
}

export default function RefundQueue({ auth }: RefundQueueProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/refunds?status=${status}&page=${page}`);
      const data = await response.json();
      setRefunds(data.data || []);
      setTotalPages(data.pagination?.last_page || 1);
    } catch (error) {
      toast.show('error', 'Failed to fetch refunds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [status, page]);

  const handleProcess = async () => {
    if (!selectedRefund) return;

    try {
      const response = await api.post(`/api/admin/refunds/${selectedRefund.id}/process`, { admin_notes: adminNotes });

      if (!response.ok) throw new Error('Failed to process');

      toast.show('success', 'Refund processed successfully');
      setShowProcessModal(false);
      setAdminNotes('');
      fetchRefunds();
    } catch (error) {
      toast.show('error', 'Failed to process refund');
    }
  };

  const handleReject = async () => {
    if (!selectedRefund) return;

    try {
      const response = await api.post(`/api/admin/refunds/${selectedRefund.id}/reject`, { reason: rejectReason });

      if (!response.ok) throw new Error('Failed to reject');

      toast.show('success', 'Refund rejected');
      setShowRejectModal(false);
      setRejectReason('');
      fetchRefunds();
    } catch (error) {
      toast.show('error', 'Failed to reject refund');
    }
  };

  const statusBadgeVariant = (s: string) => {
    switch (s) {
      case 'completed':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'in_progress':
        return 'pending';
      case 'pending':
        return 'pending';
      default:
        return 'default';
    }
  };

  const statuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'Proses' },
    { value: 'completed', label: 'Selesai' },
    { value: 'rejected', label: 'Ditolak' },
  ];

  return (
    <>
      <Head title="Refund Queue" />
      <AdminLayout user={user!}>
        <div className="space-y-8">
          <h1 className="text-3xl font-bold text-[#3c2a1e]">
            Antrean Refund Manual
          </h1>

          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  setStatus(s.value);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  status === s.value
                    ? 'bg-[#b8863b] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {loading ? (
              <Card className="text-center py-8">
                <p className="text-gray-500">Loading...</p>
              </Card>
            ) : refunds.length > 0 ? (
              refunds.map((refund) => (
                <Card
                  key={refund.id}
                  onClick={() => {
                    setSelectedRefund(refund);
                    setShowDetailModal(true);
                  }}
                  className="cursor-pointer hover:border-[#b8863b]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-[#3c2a1e]">
                          {refund.booking.booking_code}
                        </h3>
                        <Badge variant={statusBadgeVariant(refund.status)}>
                          {refund.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Customer</p>
                          <p className="font-medium text-[#3c2a1e]">
                            {refund.customer?.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Jumlah Refund</p>
                          <p className="font-bold text-[#b8863b]">
                            {formatCurrency(refund.refund_amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Bank</p>
                          <p className="font-medium text-[#3c2a1e]">
                            {refund.bank_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Tanggal Request</p>
                          <p className="font-medium text-[#3c2a1e]">
                            {new Date(refund.created_at).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mt-3">
                        <span className="font-medium">Alasan:</span> {refund.reason}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="text-center py-8">
                <p className="text-gray-500">Tidak ada data</p>
              </Card>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
              >
                ← Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="Detail Refund"
          size="lg"
        >
          {selectedRefund && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-[#3c2a1e] mb-3">
                  Informasi Refund
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Kode Booking:</span>{' '}
                    {selectedRefund.booking.booking_code}
                  </p>
                  <p>
                    <span className="font-medium">Customer:</span>{' '}
                    {selectedRefund.customer?.name}
                  </p>
                  <p>
                    <span className="font-medium">Jumlah Refund:</span>{' '}
                    {formatCurrency(selectedRefund.refund_amount)}
                  </p>
                  <p>
                    <span className="font-medium">Alasan:</span>{' '}
                    {selectedRefund.reason}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{' '}
                    <Badge variant={statusBadgeVariant(selectedRefund.status)}>
                      {selectedRefund.status.toUpperCase()}
                    </Badge>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-[#3c2a1e] mb-3">
                  Informasi Bank
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Bank:</span>{' '}
                    {selectedRefund.bank_name}
                  </p>
                  <p>
                    <span className="font-medium">Atas Nama:</span>{' '}
                    {selectedRefund.account_holder}
                  </p>
                  <p>
                    <span className="font-medium">No Rekening:</span>{' '}
                    <code className="bg-gray-100 px-2 py-1 rounded">
                      {selectedRefund.bank_account}
                    </code>
                  </p>
                </div>
              </div>

              {selectedRefund.admin_notes && (
                <div>
                  <h3 className="font-bold text-[#3c2a1e] mb-3">
                    Catatan Admin
                  </h3>
                  <p className="text-sm text-gray-700">
                    {selectedRefund.admin_notes}
                  </p>
                </div>
              )}

              {selectedRefund.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-[#dcd2c0]">
                  <Button
                    onClick={() => setShowProcessModal(true)}
                    variant="primary"
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Proses Refund
                  </Button>
                  <Button
                    onClick={() => setShowRejectModal(true)}
                    variant="danger"
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} />
                    Tolak
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>

        <Modal
          isOpen={showProcessModal}
          onClose={() => setShowProcessModal(false)}
          title="Proses Refund"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan Admin (Opsional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 border border-[#dcd2c0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b8863b]"
                rows={3}
                placeholder="Tambahkan catatan untuk refund ini..."
              />
            </div>
            <div className="flex gap-3 pt-4 border-t border-[#dcd2c0]">
              <Button
                onClick={() => setShowProcessModal(false)}
                variant="secondary"
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={handleProcess}
                variant="primary"
                className="flex-1"
              >
                Proses
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Tolak Refund"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alasan Penolakan
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-[#dcd2c0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b8863b]"
                rows={3}
                placeholder="Jelaskan alasan penolakan..."
              />
            </div>
            <div className="flex gap-3 pt-4 border-t border-[#dcd2c0]">
              <Button
                onClick={() => setShowRejectModal(false)}
                variant="secondary"
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={handleReject}
                variant="danger"
                className="flex-1"
              >
                Tolak
              </Button>
            </div>
          </div>
        </Modal>
      </AdminLayout>
    </>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}
