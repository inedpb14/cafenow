import { Head, router, usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useState } from 'react';
import { Store, User, Mail, Phone, Lock, UserPlus } from 'lucide-react';

interface OwnerRegisterForm {
    full_name: string;
    email: string;
    phone: string;
    password: string;
    password_confirmation: string;
}

interface FormErrors {
    full_name?: string;
    email?: string;
    phone?: string;
    password?: string;
    password_confirmation?: string;
}

export default function OwnerRegister() {
    const { errors: pageErrors } = usePage().props as { errors: FormErrors };

    const [form, setForm] = useState<OwnerRegisterForm>({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
    });
    const [processing, setProcessing] = useState(false);

    const handleChange = (field: keyof OwnerRegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        router.post('/owner/register', form, {
            onFinish: () => setProcessing(false),
        });
    };

    const errors = pageErrors || {};

    return (
        <>
            <Head title="Daftar Sebagai Owner - CafeNow" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Full Name */}
                <div className="grid gap-2">
                    <Label htmlFor="full_name" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <User className="size-3.5 text-primary" />
                        <span>Nama Lengkap</span>
                    </Label>
                    <Input
                        id="full_name"
                        type="text"
                        name="full_name"
                        value={form.full_name}
                        onChange={handleChange('full_name')}
                        required
                        autoFocus
                        tabIndex={1}
                        autoComplete="name"
                        placeholder="Nama lengkap Anda"
                        className="h-11 rounded-xl bg-background/50 border-input focus-visible:ring-primary focus-visible:border-primary px-3.5 transition-all shadow-sm"
                    />
                    <InputError message={errors.full_name} />
                </div>

                {/* Email */}
                <div className="grid gap-2">
                    <Label htmlFor="email" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Mail className="size-3.5 text-primary" />
                        <span>Alamat Email</span>
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange('email')}
                        required
                        tabIndex={2}
                        autoComplete="email"
                        placeholder="nama@email.com"
                        className="h-11 rounded-xl bg-background/50 border-input focus-visible:ring-primary focus-visible:border-primary px-3.5 transition-all shadow-sm"
                    />
                    <InputError message={errors.email} />
                </div>

                {/* Phone */}
                <div className="grid gap-2">
                    <Label htmlFor="phone" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Phone className="size-3.5 text-primary" />
                        <span>No. Telepon / WhatsApp</span>
                    </Label>
                    <Input
                        id="phone"
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange('phone')}
                        required
                        tabIndex={3}
                        autoComplete="tel"
                        placeholder="08xxxxxxxxxx"
                        className="h-11 rounded-xl bg-background/50 border-input focus-visible:ring-primary focus-visible:border-primary px-3.5 transition-all shadow-sm"
                    />
                    <InputError message={errors.phone} />
                </div>

                {/* Password */}
                <div className="grid gap-2">
                    <Label htmlFor="password" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Lock className="size-3.5 text-primary" />
                        <span>Kata Sandi</span>
                    </Label>
                    <PasswordInput
                        id="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange('password')}
                        required
                        tabIndex={4}
                        autoComplete="new-password"
                        placeholder="Min. 8 karakter"
                        className="h-11 rounded-xl bg-background/50 border-input focus-visible:ring-primary focus-visible:border-primary transition-all shadow-sm"
                    />
                    <InputError message={errors.password} />
                </div>

                {/* Confirm Password */}
                <div className="grid gap-2">
                    <Label htmlFor="password_confirmation" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Lock className="size-3.5 text-primary" />
                        <span>Konfirmasi Kata Sandi</span>
                    </Label>
                    <PasswordInput
                        id="password_confirmation"
                        name="password_confirmation"
                        value={form.password_confirmation}
                        onChange={handleChange('password_confirmation')}
                        required
                        tabIndex={5}
                        autoComplete="new-password"
                        placeholder="Ulangi kata sandi"
                        className="h-11 rounded-xl bg-background/50 border-input focus-visible:ring-primary focus-visible:border-primary transition-all shadow-sm"
                    />
                    <InputError message={errors.password_confirmation} />
                </div>

                {/* Info */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                    <Store className="size-4 mt-0.5 shrink-0 text-amber-600" />
                    <span>
                        Setelah mendaftar, Anda dapat mendaftarkan cafe dan mengelola meja, menu, serta reservasi pelanggan melalui dashboard owner.
                    </span>
                </div>

                {/* Submit */}
                <Button
                    type="submit"
                    className="mt-2 w-full h-11 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 bg-[length:200%_auto] hover:bg-right text-white font-semibold tracking-wide shadow-md shadow-orange-950/20 active:scale-[0.99] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                    tabIndex={6}
                    disabled={processing}
                    data-test="owner-register-button"
                >
                    {processing ? (
                        <Spinner />
                    ) : (
                        <>
                            <UserPlus className="size-4" />
                            <span>Daftar Sebagai Owner</span>
                        </>
                    )}
                </Button>

                <div className="pt-2 text-center text-xs text-muted-foreground">
                    Sudah memiliki akun?{' '}
                    <a
                        href="/login"
                        tabIndex={7}
                        className="font-semibold text-primary hover:underline"
                    >
                        Masuk Sekarang
                    </a>
                </div>
            </form>
        </>
    );
}

OwnerRegister.layout = {
    title: 'Daftar Jadi Mitra Owner',
    description: 'Bergabunglah sebagai mitra owner CafeNow dan mulai kelola bisnis cafe Anda secara profesional',
};
