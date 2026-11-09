import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Clock,
    CreditCard,
    Landmark,
    QrCode,
    ShieldCheck,
    Smartphone,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface SimulatePaymentProps {
    payment: {
        order_id: string;
        amount: number;
        status: string;
        booking_reference: string | null;
        expires_at: string | null;
    };
}

type MethodId = 'qris' | 'va' | 'ewallet';

interface MethodOption {
    id: MethodId;
    label: string;
    desc: string;
    icon: typeof QrCode;
}

interface ChannelOption {
    id: string;
    label: string;
}

const METHODS: MethodOption[] = [
    {
        id: 'qris',
        label: 'QRIS',
        desc: 'Scan & bayar dengan e-wallet / m-banking',
        icon: QrCode,
    },
    {
        id: 'va',
        label: 'Virtual Account',
        desc: 'Transfer bank BCA, BNI, BRI, Mandiri',
        icon: Landmark,
    },
    {
        id: 'ewallet',
        label: 'E-Wallet',
        desc: 'GoPay, OVO, Dana, ShopeePay',
        icon: Smartphone,
    },
];

const VA_BANKS: ChannelOption[] = [
    { id: 'bca', label: 'BCA' },
    { id: 'bni', label: 'BNI' },
    { id: 'bri', label: 'BRI' },
    { id: 'mandiri', label: 'Mandiri' },
];

const EWALLETS: ChannelOption[] = [
    { id: 'gopay', label: 'GoPay' },
    { id: 'ovo', label: 'OVO' },
    { id: 'dana', label: 'Dana' },
    { id: 'shopeepay', label: 'ShopeePay' },
];

const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

const vaNumber = (orderId: string): string => {
    const digits = orderId.replace(/\D/g, '').padEnd(10, '7').slice(0, 10);

    return `8808 ${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
};

export default function SimulatePayment({ payment }: SimulatePaymentProps) {
    const [method, setMethod] = useState<MethodId | null>(null);
    const [channel, setChannel] = useState('');
    const [phone, setPhone] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [remaining, setRemaining] = useState<number | null>(null);

    useEffect(() => {
        if (!payment.expires_at) {
            return;
        }

        const expiresAt = new Date(payment.expires_at).getTime();

        const tick = () => {
            setRemaining(
                Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
            );
        };

        tick();
        const timer = window.setInterval(tick, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, [payment.expires_at]);

    const selectedMethod = METHODS.find((item) => item.id === method) ?? null;
    const expired = remaining !== null && remaining <= 0;

    const chooseMethod = (id: MethodId) => {
        setMethod(id);
        setChannel('');
        setPhone('');
        setError('');
    };

    const changeMethod = () => {
        setMethod(null);
        setChannel('');
        setPhone('');
        setError('');
    };

    const submit = () => {
        if (!method) {
            return;
        }

        if (expired) {
            setError('Waktu pembayaran sudah habis.');

            return;
        }

        if (method !== 'qris' && channel === '') {
            setError(
                method === 'va'
                    ? 'Pilih bank terlebih dahulu.'
                    : 'Pilih e-wallet terlebih dahulu.',
            );

            return;
        }

        if (method === 'ewallet' && phone.trim() === '') {
            setError('Masukkan nomor HP terlebih dahulu.');

            return;
        }

        setProcessing(true);
        setError('');

        router.post(
            `/payments/${payment.order_id}/simulate`,
            {
                method,
                channel: method === 'qris' ? undefined : channel,
            },
            {
                onError: (errs: Record<string, string>) => {
                    setError(
                        Object.values(errs)[0] ?? 'Gagal memproses pembayaran.',
                    );
                },
                onFinish: () => {
                    setProcessing(false);
                },
            },
        );
    };

    const submitLabel = (): string => {
        if (method === 'qris') {
            return 'Saya sudah bayar';
        }

        if (method === 'va') {
            return 'Saya sudah transfer';
        }

        return 'Konfirmasi pembayaran';
    };

    return (
        <>
            <Head title="Simulasi Pembayaran - CafeNow" />

            <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
                <div className="mb-6 border-b-2 border-[var(--text)] pb-6">
                    <div className="mb-3 inline-flex items-center gap-2 border-2 border-[var(--text)] bg-amber-100 px-3 py-1 text-xs font-bold tracking-wider uppercase shadow-[2px_2px_0_var(--text)]">
                        <CreditCard className="size-4 text-[var(--primary)]" />
                        <span>Sandbox Payment Gateway</span>
                    </div>
                    <h1 className="font-serif text-3xl font-extrabold text-[var(--text)] sm:text-4xl">
                        Simulasi Pembayaran
                    </h1>
                    <p className="mt-2 text-xs font-medium text-[var(--text-muted)] sm:text-sm">
                        Mode dummy — belum terhubung ke Midtrans. Pilih metode
                        untuk mengunci reservasi.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="block-card flex items-center justify-between gap-4 border-2 border-[var(--text)] bg-[var(--bg-warm)] p-4">
                        <div>
                            <p className="text-xs font-bold tracking-wider text-[var(--text-muted)] uppercase">
                                Ref Order
                            </p>
                            <p className="font-mono text-sm font-bold text-[var(--text)]">
                                #{payment.order_id}
                            </p>
                            {payment.booking_reference && (
                                <p className="mt-1 text-[10px] font-medium text-[var(--text-muted)]">
                                    Booking {payment.booking_reference}
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold tracking-wider text-[var(--text-muted)] uppercase">
                                Total Tagihan
                            </p>
                            <p className="text-xl font-extrabold text-[var(--primary)]">
                                Rp{' '}
                                {(payment.amount || 0).toLocaleString('id-ID')}
                            </p>
                        </div>
                    </div>

                    {method === null ? (
                        <div className="block-card space-y-4 border-2 border-[var(--text)] bg-white p-6">
                            <label className="block text-xs font-bold tracking-wider text-[var(--text)] uppercase">
                                Pilih Metode Pembayaran
                            </label>

                            <div className="space-y-3">
                                {METHODS.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                chooseMethod(item.id);
                                            }}
                                            className="flex w-full cursor-pointer items-center gap-4 border-2 border-[var(--text)] bg-white p-4 text-left transition-all hover:bg-stone-50"
                                        >
                                            <div className="flex size-11 shrink-0 items-center justify-center border-2 border-[var(--text)] bg-[var(--bg-warm)] text-[var(--primary)]">
                                                <Icon className="size-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-serif text-sm font-bold text-[var(--text)]">
                                                    {item.label}
                                                </p>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="block-card space-y-5 border-2 border-[var(--text)] bg-white p-6">
                            <div className="flex items-start justify-between gap-3 border-b-2 border-[var(--text)] pb-4">
                                <div>
                                    <p className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
                                        Metode dipilih
                                    </p>
                                    <p className="font-serif text-lg font-bold text-[var(--text)]">
                                        {selectedMethod?.label}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={changeMethod}
                                    className="inline-flex cursor-pointer items-center gap-1.5 border-2 border-[var(--text)] bg-white px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase hover:bg-stone-50"
                                >
                                    <ArrowLeft className="size-3.5" />
                                    Ganti metode
                                </button>
                            </div>

                            {method === 'qris' && (
                                <div className="space-y-3 text-center">
                                    {/* shortcut: QR placeholder, ganti dengan aset QR asli saat tersedia */}
                                    <div className="mx-auto flex size-48 items-center justify-center border-2 border-[var(--text)] bg-white">
                                        <div>
                                            <QrCode className="mx-auto size-16 text-[var(--text)]" />
                                            <p className="mt-2 text-[10px] font-extrabold tracking-wider text-[var(--text)] uppercase">
                                                QR Simulasi
                                            </p>
                                            <p className="text-[10px] text-[var(--text-muted)]">
                                                Tidak untuk dipindai
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-medium text-[var(--text-muted)]">
                                        QR pembayaran akan ditampilkan di area
                                        ini.
                                    </p>
                                </div>
                            )}

                            {method === 'va' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold tracking-wider text-[var(--text)] uppercase">
                                            Pilih bank
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                            {VA_BANKS.map((bank) => (
                                                <button
                                                    key={bank.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setChannel(bank.id);
                                                        setError('');
                                                    }}
                                                    className={cn(
                                                        'cursor-pointer border-2 border-[var(--text)] px-3 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors',
                                                        channel === bank.id
                                                            ? 'bg-[var(--primary)] text-white'
                                                            : 'bg-white text-[var(--text)] hover:bg-stone-50',
                                                    )}
                                                >
                                                    {bank.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {channel !== '' && (
                                        <div className="border-2 border-[var(--text)] bg-[var(--bg-warm)] p-4">
                                            <p className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
                                                Nomor Virtual Account{' '}
                                                {channel.toUpperCase()}
                                            </p>
                                            <p className="mt-1 font-mono text-lg font-extrabold tracking-wider text-[var(--text)]">
                                                {vaNumber(payment.order_id)}
                                            </p>
                                            <p className="mt-1 text-[10px] font-medium text-[var(--text-muted)]">
                                                Nomor simulasi — tidak untuk
                                                transfer nyata.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {method === 'ewallet' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold tracking-wider text-[var(--text)] uppercase">
                                            Pilih e-wallet
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                            {EWALLETS.map((wallet) => (
                                                <button
                                                    key={wallet.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setChannel(wallet.id);
                                                        setError('');
                                                    }}
                                                    className={cn(
                                                        'cursor-pointer border-2 border-[var(--text)] px-3 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors',
                                                        channel === wallet.id
                                                            ? 'bg-[var(--primary)] text-white'
                                                            : 'bg-white text-[var(--text)] hover:bg-stone-50',
                                                    )}
                                                >
                                                    {wallet.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label
                                            htmlFor="wallet-phone"
                                            className="block text-xs font-bold tracking-wider text-[var(--text)] uppercase"
                                        >
                                            Nomor HP
                                        </label>
                                        <input
                                            id="wallet-phone"
                                            type="tel"
                                            inputMode="numeric"
                                            value={phone}
                                            onChange={(event) => {
                                                setPhone(event.target.value);
                                                setError('');
                                            }}
                                            placeholder="08xxxxxxxxxx"
                                            className="w-full border-2 border-[var(--text)] bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-[var(--primary)]"
                                        />
                                    </div>
                                </div>
                            )}

                            {remaining !== null && (
                                <div
                                    className={cn(
                                        'flex items-center gap-2 border-2 px-3 py-2 text-xs font-bold',
                                        expired
                                            ? 'border-red-400 bg-red-50 text-red-800'
                                            : 'border-amber-400 bg-amber-50 text-amber-900',
                                    )}
                                >
                                    <Clock className="size-4 shrink-0" />
                                    <span>
                                        {expired
                                            ? 'Waktu pembayaran sudah habis'
                                            : `Selesaikan dalam ${formatCountdown(remaining)}`}
                                    </span>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-start gap-2 border-2 border-red-400 bg-red-50 p-3 text-xs text-red-800">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                    <p className="leading-relaxed font-medium">
                                        {error}
                                    </p>
                                </div>
                            )}

                            <button
                                type="button"
                                disabled={processing || expired}
                                onClick={submit}
                                className="btn-primary w-full cursor-pointer px-8 py-3.5 text-xs font-bold tracking-wider uppercase disabled:opacity-50"
                            >
                                {processing
                                    ? 'Memproses Pembayaran...'
                                    : submitLabel()}
                            </button>
                        </div>
                    )}

                    <div className="flex items-start gap-3 border-2 border-amber-400 bg-amber-50 p-4 text-xs text-amber-900">
                        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--primary)]" />
                        <p className="leading-relaxed font-medium">
                            <strong>Simulasi:</strong> tidak ada uang sungguhan
                            yang dipindahkan. Pembayaran langsung ditandai lunas
                            untuk menguji alur reservasi.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
