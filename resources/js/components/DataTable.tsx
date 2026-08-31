import { ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  loading?: boolean;
}

export default function DataTable<T extends { id: number | string }>({
  columns,
  data,
  onSort,
  onRowClick,
  sortKey,
  sortDirection = 'asc',
  loading,
}: DataTableProps<T>) {
  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable || !onSort) return;

    const newDirection =
      sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(key, newDirection);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-[#dcd2c0] p-8 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#dcd2c0] p-8 text-center">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-[#dcd2c0]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#dcd2c0] bg-[#dcd2c0]/30">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                onClick={() =>
                  handleSort(String(col.key), col.sortable)
                }
                className={`px-6 py-3 text-left text-xs font-bold text-[#3c2a1e] uppercase tracking-wider ${
                  col.sortable ? 'cursor-pointer hover:bg-[#dcd2c0]/50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {col.label}
                  {col.sortable && sortKey === String(col.key) && (
                    <div>
                      {sortDirection === 'asc' ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-[#dcd2c0] hover:bg-[#f7f1e6] transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              } ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className="px-6 py-4 text-sm text-gray-700"
                >
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
