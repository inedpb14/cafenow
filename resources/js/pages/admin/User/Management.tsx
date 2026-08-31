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
import { api } from '@/lib/http';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  is_suspended: boolean;
  created_at: string;
}

interface UserManagementProps {
  auth: { user: { id: number; name: string; email: string; role: string } };
}

export default function UserManagement({ auth }: UserManagementProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        keyword,
        role: filterRole !== 'all' ? filterRole : '',
        status: filterStatus !== 'all' ? filterStatus : '',
        sort_by: sortKey,
        sort_order: sortDirection,
        page: page.toString(),
        per_page: '50',
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      setUsers(data.data || []);
      setTotalPages(data.pagination?.last_page || 1);
    } catch (error) {
      toast.show('error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [keyword, filterRole, filterStatus, sortKey, sortDirection, page]);

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
    setPage(1);
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;

    try {
      const response = await api.post(`/api/admin/users/${selectedUser.id}/suspend`, { reason: suspendReason });

      if (!response.ok) throw new Error('Failed to suspend');

      toast.show('success', 'User suspended successfully');
      setShowSuspendModal(false);
      setSuspendReason('');
      fetchUsers();
    } catch (error) {
      toast.show('error', 'Failed to suspend user');
    }
  };

  const handleUnsuspend = async (userId: number) => {
    try {
      const response = await api.post(`/api/admin/users/${userId}/unsuspend`);

      if (!response.ok) throw new Error('Failed to unsuspend');

      toast.show('success', 'User unsuspended successfully');
      fetchUsers();
    } catch (error) {
      toast.show('error', 'Failed to unsuspend user');
    }
  };

  const columns = [
    {
      key: 'name' as const,
      label: 'Nama',
      sortable: true,
    },
    {
      key: 'email' as const,
      label: 'Email',
      sortable: true,
    },
    {
      key: 'phone' as const,
      label: 'Telepon',
      sortable: false,
    },
    {
      key: 'role' as const,
      label: 'Role',
      sortable: true,
      render: (role: string) => {
        const color =
          role === 'admin'
            ? 'bg-purple-100 text-purple-800'
            : role === 'owner'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-green-100 text-green-800';
        return (
          <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>
            {role.toUpperCase()}
          </span>
        );
      },
    },
    {
      key: 'is_suspended' as const,
      label: 'Status',
      sortable: false,
      render: (suspended: boolean) => (
        <Badge variant={suspended ? 'danger' : 'success'}>
          {suspended ? 'SUSPENDED' : 'ACTIVE'}
        </Badge>
      ),
    },
    {
      key: 'created_at' as const,
      label: 'Terdaftar',
      sortable: true,
      render: (date: string) => new Date(date).toLocaleDateString('id-ID'),
    },
  ];

  return (
    <>
      <Head title="User Management" />
      <AdminLayout user={user!}>
        <div className="space-y-8">
          <h1 className="text-3xl font-bold text-[#3c2a1e]">
            Manajemen Pengguna
          </h1>

          <Card>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="Cari User"
                  placeholder="Nama, email, atau telepon..."
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setPage(1);
                  }}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={filterRole}
                    onChange={(e) => {
                      setFilterRole(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-4 py-2.5 border border-[#dcd2c0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b8863b]"
                  >
                    <option value="all">Semua Role</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-4 py-2.5 border border-[#dcd2c0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b8863b]"
                  >
                    <option value="all">Semua Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      setKeyword('');
                      setFilterRole('all');
                      setFilterStatus('all');
                      setPage(1);
                    }}
                    variant="secondary"
                    className="w-full"
                  >
                    Reset Filter
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            onSort={handleSort}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onRowClick={(u) => {
              setSelectedUser(u);
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
          title="Detail Pengguna"
          size="lg"
        >
          {selectedUser && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-[#3c2a1e] mb-3">
                  Informasi Pengguna
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Nama:</span> {selectedUser.name}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{' '}
                    {selectedUser.email}
                  </p>
                  <p>
                    <span className="font-medium">Telepon:</span>{' '}
                    {selectedUser.phone || '-'}
                  </p>
                  <p>
                    <span className="font-medium">Role:</span>{' '}
                    <span className="capitalize">{selectedUser.role}</span>
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{' '}
                    <Badge
                      variant={
                        selectedUser.is_suspended ? 'danger' : 'success'
                      }
                    >
                      {selectedUser.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
                    </Badge>
                  </p>
                  <p>
                    <span className="font-medium">Terdaftar:</span>{' '}
                    {new Date(selectedUser.created_at).toLocaleDateString(
                      'id-ID'
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-[#dcd2c0] flex gap-3">
                {selectedUser.is_suspended ? (
                  <Button
                    onClick={() => handleUnsuspend(selectedUser.id)}
                    variant="primary"
                    className="flex-1"
                  >
                    Buka Suspend
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowSuspendModal(true)}
                    variant="danger"
                    className="flex-1"
                  >
                    Suspend
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={showSuspendModal}
          onClose={() => setShowSuspendModal(false)}
          title="Suspend Pengguna"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alasan Suspend
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full px-3 py-2 border border-[#dcd2c0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b8863b]"
                rows={3}
                placeholder="Jelaskan alasan suspend..."
              />
            </div>
            <div className="flex gap-3 pt-4 border-t border-[#dcd2c0]">
              <Button
                onClick={() => setShowSuspendModal(false)}
                variant="secondary"
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={handleSuspend}
                variant="danger"
                className="flex-1"
              >
                Suspend
              </Button>
            </div>
          </div>
        </Modal>
      </AdminLayout>
    </>
  );
}
