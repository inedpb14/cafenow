export interface TableItem {
  id: number;
  name: string;
  type: string;
  capacity: number;
  min_spend: number;
  is_active: boolean;
  photo?: string | null;
}

export interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  image?: string | null;
}

export interface CafeApproval {
  id: number;
  name: string;
  description?: string;
  owner_name: string;
  owner_email: string;
  location: string;
  address?: string;
  city?: string;
  phone?: string;
  status: string;
  created_at: string;
  rejection_reason?: string | null;
  submission_count?: number;
  facilities?: string[];
  operational_hours?: { day: string; open: string; close: string }[];
  primary_photo?: string | null;
  photos?: string[];
  tables?: TableItem[];
  menu_items?: MenuItem[];
}

export const STATUS_FILTERS = [
  { key: '', label: 'Semua' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'rejected', label: 'Ditolak' },
];

export const TABLE_TYPE_LABELS: Record<string, string> = {
  indoor: 'Indoor', outdoor: 'Outdoor', vip: 'VIP', private: 'Private', regular: 'Regular',
};

export function formatPrice(p: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(p);
}

export function statusBadgeClass(s: string): string {
  switch (s) {
    case 'approved':
    case 'active':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    case 'rejected':
      return 'bg-destructive/15 text-destructive border-destructive/30';
    case 'pending':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'suspended':
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}