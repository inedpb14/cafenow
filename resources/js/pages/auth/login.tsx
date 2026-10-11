import { Form, Head } from '@inertiajs/react';
import { Mail, Lock, LogIn } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Masuk Akun - Cafe-Now" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5">
                            {/* Email Address */}
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                    <Mail className="size-3.5 text-primary" />
                                    <span>Alamat Email</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="nama@email.com"
                                        className="h-11 rounded-xl bg-background/50 border-input focus-visible:ring-primary focus-visible:border-primary px-3.5 transition-all shadow-sm"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            {/* Password */}
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                        <Lock className="size-3.5 text-primary" />
                                        <span>Kata Sandi</span>
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-medium"
                                            tabIndex={5}
                                        >
                                            Lupa kata sandi?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="h-11 rounded-xl bg-background/50 border-input focus-visible:ring-primary focus-visible:border-primary transition-all shadow-sm"
                                />
                                <InputError message={errors.password} />
                            </div>

                            {/* Remember me */}
                            <div className="flex items-center space-x-2.5 pt-1">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded-md"
                                />
                                <Label htmlFor="remember" className="text-xs text-muted-foreground font-normal cursor-pointer select-none">
                                    Ingat saya di perangkat ini
                                </Label>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="mt-2 w-full h-11 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 bg-[length:200%_auto] hover:bg-right text-white font-semibold tracking-wide shadow-md shadow-red-950/20 active:scale-[0.99] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing ? (
                                    <Spinner />
                                ) : (
                                    <>
                                        <LogIn className="size-4" />
                                        <span>Masuk ke Akun</span>
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="pt-2 space-y-2 text-center text-xs text-muted-foreground">
                            <div>
                                Belum memiliki akun?{' '}
                                <TextLink
                                    href={register()}
                                    tabIndex={5}
                                    className="font-semibold text-primary hover:underline"
                                >
                                    Daftar Sekarang
                                </TextLink>
                            </div>
                            <div className="flex items-center gap-2 text-stone-300">
                                <span className="flex-1 border-t border-stone-200" />
                                <span className="text-[10px] uppercase tracking-wider">atau</span>
                                <span className="flex-1 border-t border-stone-200" />
                            </div>
                            <div>
                                Ingin daftarkan cafe?{' '}
                                <a
                                    href="/owner/register"
                                    tabIndex={6}
                                    className="font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                                >
                                    Daftar sebagai Owner
                                </a>
                            </div>
                        </div>
                    </>
                )}
            </Form>

            {status && (
                <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Selamat Datang Kembali',
    description: 'Masukkan email dan kata sandi Anda untuk mengakses layanan Cafe-Now',
};

