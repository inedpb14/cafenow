import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/Contexts/ToastContext';
import { api } from '@/lib/http';

interface CommissionRate {
  type: string;
  percentage: number;
  label: string;
}

interface CommissionHistory {
  id: number;
  type: string;
  percentage: number;
  set_by_admin_id: number;
  admin_name: string;
  created_at: string;
  updated_at: string;
}

interface CommissionManagementProps {
  auth: { user: { id: number; name: string; email: string; role: string } };
}

export default function CommissionManagement({
  auth,
}: CommissionManagementProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [history, setHistory] = useState<CommissionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/commissions/rates');
      const data = await response.json();
      setRates(data.data || []);
    } catch (error) {
      toast.show('error', 'Failed to fetch commission rates');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(
        `/api/admin/commissions/history?page=${historyPage}`
      );
      const data = await response.json();
      setHistory(data.data || []);
      setHistoryTotalPages(data.pagination?.last_page || 1);
    } catch (error) {
      toast.show('error', 'Failed to fetch commission history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  useEffect(() => {
    if (showHistoryModal) {
      fetchHistory();
    }
  }, [showHistoryModal, historyPage]);

  const handleUpdateRate = async (type: string) => {
    if (!editingValue || isNaN(parseFloat(editingValue))) {
      toast.show('error', 'Please enter a valid percentage');
      return;
    }

    try {
      const response = await api.patch(`/api/admin/commissions/rates/${type}`, { percentage: parseFloat(editingValue) });

      if (!response.ok) throw new Error('Failed to update');

      toast.show('success', 'Commission rate updated successfully');
      setEditingType(null);
      setEditingValue('');
      fetchRates();
    } catch (error) {
      toast.show('error', 'Failed to update commission rate');
    }
  };

  const columns = [
    {
      key: 'type' as const,
      label: 'Tipe Komisi',
      sortable: true,
      render: (type: string) => {
        const typeMap: { [key: string]: string } = {
          booking: 'Booking',
          menu: 'Menu Order',
        };
        return typeMap[type] || type;
      },
    },
    {
      key: 'percentage' as const,
      label: 'Persentase',
      sortable: true,
      render: (percentage: number) => `${percentage}%`,
    },
    {
      key: 'admin_name' as const,
      label: 'Diatur Oleh',
      sortable: true,
    },
    {
      key: 'created_at' as const,
      label: 'Tanggal',
      sortable: true,
      render: (date: string) => new Date(date).toLocaleDateString('id-ID'),
    },
  ];

  return (
    <>
      <Head title="Commission Management" />
      <AdminLayout user={user!}>
        <div className="space-y-8">
          <h1 className="text-3xl font-bold text-[#3c2a1e]">
            Manajemen Komisi
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              <Card className="text-center py-8">
                <p className="text-gray-500">Loading...</p>
              </Card>
            ) : (
              rates.map((rate) => (
                <Card key={rate.type}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#3c2a1e]">
                        {rate.type === 'booking'
                          ? 'Komisi Booking'
                          : 'Komisi Menu Order'}
                      </h3>
                      <p className="text-4xl font-bold text-[#b8863b]">
                        {rate.percentage}%
                      </p>
                    </div>

                    {editingType === rate.type ? (
                      <div className="space-y-3">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          placeholder="Enter percentage"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setEditingType(null)}
                            variant="secondary"
                            className="flex-1 text-sm"
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={() => handleUpdateRate(rate.type)}
                            variant="primary"
                            className="flex-1 text-sm"
                          >
                            Simpan
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setEditingType(rate.type);
                          setEditingValue(rate.percentage.toString());
                        }}
                        variant="secondary"
                        className="w-full"
                      >
                        ✎ Edit Komisi
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>

          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#3c2a1e]">
                Riwayat Perubahan Komisi
              </h2>
              <Button
                onClick={() => setShowHistoryModal(true)}
                variant="secondary"
              >
                Lihat Semua
              </Button>
            </div>

            {history.slice(0, 5).length > 0 ? (
              <div className="space-y-3">
                {history.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-[#3c2a1e]">
                        {item.type === 'booking'
                          ? 'Komisi Booking'
                          : 'Komisi Menu'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {item.admin_name} •{' '}
                        {new Date(item.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-[#b8863b]">
                      {item.percentage}%
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Tidak ada riwayat
              </p>
            )}
          </Card>
        </div>

        <Modal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          title="Riwayat Komisi"
          size="lg"
        >
          <div className="space-y-4">
            <DataTable
              columns={columns}
              data={history}
              loading={historyLoading}
            />

            {historyTotalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <button
                  onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                  disabled={historyPage === 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
                >
                  ← Previous
                </button>
                <span className="px-4 py-2">
                  Page {historyPage} of {historyTotalPages}
                </span>
                <button
                  onClick={() =>
                    setHistoryPage(Math.min(historyTotalPages, historyPage + 1))
                  }
                  disabled={historyPage === historyTotalPages}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </Modal>
      </AdminLayout>
    </>
  );
}
