import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
            <span className="text-xs text-muted-foreground">
                Halaman <span className="font-bold text-foreground">{page}</span> dari{' '}
                <span className="font-bold text-foreground">{totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                    <ChevronLeft className="size-3.5 mr-1" />
                    <span>Sebelumnya</span>
                </button>

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                    <span>Selanjutnya</span>
                    <ChevronRight className="size-3.5 ml-1" />
                </button>
            </div>
        </div>
    );
}
