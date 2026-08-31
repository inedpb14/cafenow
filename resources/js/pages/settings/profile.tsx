import { Form, Head, Link, usePage } from '@inertiajs/react';
import { User as UserIcon, Camera } from 'lucide-react';
import { useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import SettingsNav from '@/components/settings-nav';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const avatarSrc = avatarPreview ?? auth.user.avatar ?? null;

    return (
        <>
            <Head title="Pengaturan Profil" />

            <h1 className="sr-only">Pengaturan Profil</h1>

            <div className="space-y-8">
                <SettingsNav />
                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="bg-card text-card-foreground border-2 border-border p-6 sm:p-8 space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div>
                                <h2 className="font-serif text-xl font-bold text-foreground">
                                    Profil
                                </h2>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                    Perbarui nama, email, nomor telepon, dan foto profil Anda.
                                </p>
                            </div>

                            {/* Avatar */}
                            <div className="flex items-center gap-5">
                                <div className="relative shrink-0">
                                    <div className="size-20 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                                        {avatarSrc ? (
                                            <img
                                                src={avatarSrc}
                                                alt="Foto profil"
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <UserIcon className="size-8 text-muted-foreground" />
                                        )}
                                    </div>
                                    <label
                                        htmlFor="avatar"
                                        title="Unggah foto profil"
                                        className="absolute -bottom-1 -right-1 p-2 bg-primary text-primary-foreground border-2 border-border cursor-pointer hover:opacity-90 transition-opacity"
                                    >
                                        <Camera className="size-3.5" />
                                    </label>
                                </div>

                                <div className="text-xs text-muted-foreground">
                                    <p className="font-bold text-foreground">Foto Profil</p>
                                    <p>PNG, JPG, atau WEBP, maksimal 2 MB.</p>
                                </div>

                                <input
                                    id="avatar"
                                    type="file"
                                    name="avatar"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        setAvatarPreview(file ? URL.createObjectURL(file) : null);
                                    }}
                                />
                            </div>

                            {errors.avatar && (
                                <InputError message={errors.avatar} />
                            )}

                            {/* Name */}
                            <div className="grid gap-2">
                                <label htmlFor="name" className="text-xs font-bold text-foreground uppercase tracking-wide">
                                    Nama Lengkap
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    defaultValue={auth.user.name}
                                    required
                                    autoComplete="name"
                                    placeholder="Nama lengkap"
                                    className="w-full px-3.5 py-2.5 text-sm border-2 border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                />
                                <InputError message={errors.name} />
                            </div>

                            {/* Email */}
                            <div className="grid gap-2">
                                <label htmlFor="email" className="text-xs font-bold text-foreground uppercase tracking-wide">
                                    Alamat Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    defaultValue={auth.user.email}
                                    required
                                    autoComplete="username"
                                    placeholder="Alamat email"
                                    className="w-full px-3.5 py-2.5 text-sm border-2 border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                />
                                <InputError message={errors.email} />
                            </div>

                            {/* Phone */}
                            <div className="grid gap-2">
                                <label htmlFor="phone" className="text-xs font-bold text-foreground uppercase tracking-wide">
                                    Nomor Telepon
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    name="phone"
                                    defaultValue={auth.user.phone ?? ''}
                                    autoComplete="tel"
                                    placeholder="08xxxxxxxxxx"
                                    className="w-full px-3.5 py-2.5 text-sm border-2 border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                />
                                <InputError message={errors.phone} />
                            </div>

                            {mustVerifyEmail && auth.user.email_verified_at === null && (
                                <div>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        Alamat email Anda belum diverifikasi.{' '}
                                        <Link
                                            href={send()}
                                            as="button"
                                            className="font-bold text-primary underline underline-offset-4 hover:opacity-80"
                                        >
                                            Klik di sini untuk mengirim ulang email verifikasi.
                                        </Link>
                                    </p>

                                    {status === 'verification-link-sent' && (
                                        <div className="mt-2 text-xs font-bold text-emerald-600">
                                            Tautan verifikasi baru telah dikirim ke email Anda.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-4 pt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    data-test="update-profile-button"
                                    className="bg-primary text-primary-foreground font-bold text-sm px-6 py-2.5 border-2 border-border hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-opacity"
                                >
                                    Simpan
                                </button>
                            </div>
                        </>
                    )}
                </Form>

                <DeleteUser />
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Pengaturan Profil',
            href: ProfileController.edit.url(),
        },
    ],
};