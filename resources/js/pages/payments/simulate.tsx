import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { CreditCard, QrCode, Landmark, Smartphone, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimulatePaymentProps {
    payment: {
        order_id: string;
        amount: number;
        status: string;
    };
}

const METHODS = [
    { id: 'qris', label: 'QRIS', desc: 'Scan & bayar dengan e-wallet / m-banking', icon: QrCode },
    { id: 'va', label: 'Virtual Account', desc: 'Transfer bank BCA, BNI, BRI, Mandiri', icon: Landmark },
    { id: 'ewallet', label: 'E-Wallet', desc: 'GoPay, OVO, Dana, ShopeePay', icon: Smartphone },
];

export default function SimulatePayment({ payment }: SimulatePaymentProps) {
    const [method, setMethod] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    const submit = () => {
        if (!method) {
            setError('Pilih salah satu metode pembayaran terlebih dahulu.');
            return;
        }

        setProcessing(true);
        setError('');

        router.post(`/payments/${payment.order_id}/simulate`, { method }, {
            onError: (errs: any) => {
                setError(Object.values(errs)[0] as string || 'Gagal memproses pembayaran.');
                setProcessing(false);
            },
        });
    };

    return (
        <>
            <Head title="Simulasi Pembayaran - CafeNow" />

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div className="border-b-2 border-[var(--text)] pb-6 mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border-2 border-[var(--text)] shadow-[2px_2px_0_var(--text)] text-xs font-bold uppercase tracking-wider mb-3">
                        <CreditCard className="size-4 text-[var(--primary)]" />
                        <span>Sandbox Payment Gateway</span>
                    </div>
                    <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[var(--text)]">
                        Simulasi Pembayaran
                    </h1>
                    <p className="text-[var(--text-muted)] text-xs sm:text-sm font-medium mt-2">
                        Mode dummy — belum terhubung ke Midtrans. Pilih metode untuk mengunci reservasi.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="block-card p-4 bg-[var(--bg-warm)] border-2 border-[var(--text)] flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Ref Order</p>
                            <p className="font-mono text-sm font-bold text-[var(--text)]">#{payment.order_id}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Total Tagihan</p>
                            <p className="text-xl font-extrabold text-[var(--primary)]">
                                Rp {(payment.amount || 0).toLocaleString('id-ID')}
                            </p>
                        </div>
                    </div>

                    <div className="block-card p-6 bg-white border-2 border-[var(--text)] space-y-4">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                            Pilih Metode Pembayaran
                        </label>

                        <div className="space-y-3">
                            {METHODS.map((m) => {
                                const Icon = m.icon;
                                const isSelected = method === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => { setMethod(m.id); setError(''); }}
                                        className={cn(
                                            'w-full p-4 border-2 border-[var(--text)] transition-all cursor-pointer flex items-center gap-4 text-left',
                                            isSelected
                                                ? 'bg-amber-100 border-[var(--primary)] shadow-[4px_4px_0_var(--text)]'
                                                : 'bg-white hover:bg-stone-50'
                                        )}
                                    >
                                        <div className={cn(
                                            'size-11 border-2 border-[var(--text)] flex items-center justify-center shrink-0',
                                            isSelected ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-warm)] text-[var(--primary)]'
                                        )}>
                                            <Icon className="size-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-serif font-bold text-sm text-[var(--text)]">{m.label}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{m.desc}</p>
                                        </div>
                                        {isSelected && (
                                            <span className="text-[10px] font-extrabold uppercase bg-[var(--primary)] text-white px-2 py-1 border border-[var(--text)]">
                                                Dipilih
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border-2 border-red-400 text-xs text-red-800 flex items-start gap-2">
                                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                                <p className="leading-relaxed font-medium">{error}</p>
                            </div>
                        )}

                        <div className="p-4 bg-amber-50 border-2 border-amber-400 text-xs text-amber-900 flex items-start gap-3">
                            <ShieldCheck className="size-5 text-[var(--primary)] shrink-0 mt-0.5" />
                            <p className="leading-relaxed font-medium">
                                <strong>Simulasi:</strong> tidak ada uang sungguhan yang dipindahkan. Pembayaran langsung
                                ditandai lunas untuk menguji alur reservasi.
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={processing}
                            onClick={submit}
                            className="btn-primary text-xs py-3.5 px-8 font-bold tracking-wider uppercase cursor-pointer disabled:opacity-50 w-full"
                        >
                            {processing ? 'Memproses Pembayaran...' : `Bayar Rp ${(payment.amount || 0).toLocaleString('id-ID')} (Simulasi)`}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
