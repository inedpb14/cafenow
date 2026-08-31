import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Input from '@/components/Input';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/Contexts/ToastContext';

interface AuditLog {
  id: number;
  admin: { id: number; name: string };
  action: string;
  entity_type: string;
  entity_id: number;
  before_value: unknown;
  after_value: unknown;
  ip_address: string;
  created_at: string;
}

interface AdminOption {
  id: number;
  name: string;
}

interface AuditLogsProps {
  auth: { user: { id: number; name: string; email: string; role: string } };
}

export default function AuditLogs({ auth }: AuditLogsProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAdmin, setFilterAdmin] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const actions = [
    'approve_cafe',
    'reject_cafe',
    'suspend_cafe',
    'approve_refund',
    'reject_refund',
    'suspend_user',
    'update_commission',
  ];

  const entities = ['cafe', 'booking', 'refund', 'user', 'commission'];

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        admin_id: filterAdmin || '',
        action: filterAction || '',
        entity_type: filterEntity || '',
        date_from: dateFrom || '',
        date_to: dateTo || '',
        sort_by: sortKey,
        sort_order: sortDirection,
        page: page.toString(),
        per_page: '100',
      });

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await response.json();
      setLogs(data.data || []);
      setTotalPages(data.pagination?.last_page || 1);
    } catch (error) {
      toast.show('error', 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admin/users?role=admin&per_page=1000');
      const data = await response.json();
      setAdmins(data.data || []);
    } catch (error) {
      toast.show('error', 'Failed to fetch admins');
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [
    filterAdmin,
    filterAction,
    filterEntity,
    dateFrom,
    dateTo,
    sortKey,
    sortDirection,
    page,
  ]);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
    setPage(1);
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('approve')) return 'success';
    if (action.includes('reject')) return 'danger';
    if (action.includes('suspend')) return 'danger';
    return 'info';
  };

  const columns = [
    {
      key: 'created_at' as const,
      label: 'Waktu',
      sortable: true,
      render: (date: string) =>
        new Date(date).toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    {
      key: 'admin' as const,
      label: 'Admin',
      sortable: false,
      render: (admin: any) => admin?.name || '-',
    },
    {
      key: 'action' as const,
      label: 'Aksi',
      sortable: true,
      render: (action: string) => (
        <Badge variant={getActionBadgeVariant(action)}>
          {action.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'entity_type' as const,
      label: 'Entity',
      sortable: true,
      render: (entity: string) =>
        entity.charAt(0).toUpperCase() + entity.slice(1),
    },
    {
      key: 'entity_id' as const,
      label: 'Entity ID',
      sortable: false,
    },
  ];

  return (
    <>
      <Head title="Audit Logs" />
      <AdminLayout user={user!}>
        <div className="space-y-8">
          <h1 className="text-3xl font-bold text-[#3c2a1e]">
            Log Aktivitas Admin
          </h1>

          <Card>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin
                  </label>
                  <select
                    value={filterAdmin}
                    onChange={(e) => {
                      setFilterAdmin(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-4 py-2.5 border border-[#dcd2c0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b8863b]"
                  >
                    <option value="">Semua Admin</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aksi
                  </label>
                  <select
                    value={filterAction}
                    onChange={(e) => {
                      setFilterAction(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-4 py-2.5 border border-[#dcd2c0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b8863b]"
                  >
                    <option value="">Semua Aksi</option>
                    {actions.map((action) => (
                      <option key={action} value={action}>
                        {action.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entity
                  </label>
                  <select
                    value={filterEntity}
                    onChange={(e) => {
                      setFilterEntity(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-4 py-2.5 border border-[#dcd2c0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b8863b]"
                  >
                    <option value="">Semua Entity</option>
                    {entities.map((entity) => (
                      <option key={entity} value={entity}>
                        {entity.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      setFilterAdmin('');
                      setFilterAction('');
                      setFilterEntity('');
                      setDateFrom('');
                      setDateTo('');
                      setPage(1);
                    }}
                    variant="secondary"
                    className="w-full"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Dari Tanggal"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
                <Input
                  label="Sampai Tanggal"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </Card>

          <DataTable
            columns={columns}
            data={logs}
            loading={loading}
            onSort={handleSort}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onRowClick={(log) => {
              setSelectedLog(log);
              setShowDetailModal(true);
            }}
          />

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
          title="Detail Log"
          size="lg"
        >
          {selectedLog && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-[#3c2a1e] mb-3">Informasi</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Waktu:</span>{' '}
                    {new Date(selectedLog.created_at).toLocaleString('id-ID')}
                  </p>
                  <p>
                    <span className="font-medium">Admin:</span>{' '}
                    {selectedLog.admin?.name}
                  </p>
                  <p>
                    <span className="font-medium">IP Address:</span>{' '}
                    <code className="bg-gray-100 px-2 py-1 rounded">
                      {selectedLog.ip_address}
                    </code>
                  </p>
                  <p>
                    <span className="font-medium">Aksi:</span>{' '}
                    <Badge
                      variant={getActionBadgeVariant(selectedLog.action)}
                    >
                      {selectedLog.action.toUpperCase()}
                    </Badge>
                  </p>
                  <p>
                    <span className="font-medium">Entity:</span>{' '}
                    {selectedLog.entity_type.toUpperCase()} (ID:{' '}
                    {selectedLog.entity_id})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-bold text-[#3c2a1e] mb-2">Sebelum</h3>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40">
                    {selectedLog.before_value
                      ? JSON.stringify(selectedLog.before_value, null, 2)
                      : 'N/A'}
                  </pre>
                </div>
                <div>
                  <h3 className="font-bold text-[#3c2a1e] mb-2">Sesudah</h3>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40">
                    {selectedLog.after_value
                      ? JSON.stringify(selectedLog.after_value, null, 2)
                      : 'N/A'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </AdminLayout>
    </>
  );
}
