import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';
import { Utensils, CalendarCheck, MapPin, Sparkles, Quote } from 'lucide-react';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="relative grid min-h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-12 lg:px-0 bg-background text-foreground antialiased selection:bg-primary selection:text-white">
            {/* Left Hero Side - Warm Culinary Showcase */}
            <div className="relative hidden h-full flex-col justify-between overflow-hidden bg-stone-900 p-12 text-white lg:col-span-7 xl:col-span-7 lg:flex">
                {/* Background Food & Coffee Image with Rich Warm Gradients */}
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105 hover:scale-100"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1920&q=85')`,
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-amber-950/75 to-red-950/40 backdrop-blur-[2px]" />
                
                {/* Ambient Warm Glow Effects */}
                <div className="absolute -top-24 -left-24 size-96 rounded-full bg-amber-500/20 blur-3xl" />
                <div className="absolute bottom-10 right-10 size-80 rounded-full bg-red-600/20 blur-3xl" />

                {/* Top Header Logo */}
                <div className="relative z-20 flex items-center justify-between">
                    <Link
                        href={home()}
                        className="flex items-center gap-3 text-xl font-serif font-bold tracking-wide text-amber-100 hover:text-white transition-colors"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-red-600 shadow-lg shadow-amber-900/40 ring-1 ring-white/20">
                            <AppLogoIcon className="size-6 fill-current text-white" />
                        </div>
                        <span className="font-serif tracking-wider">{name || 'Cafe-Now'}</span>
                    </Link>

                    <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-md ring-1 ring-white/20 text-xs font-medium text-amber-200">
                        <Sparkles className="size-3.5 text-amber-400 animate-pulse" />
                        <span>Artisan Cafe & Culinary Hub</span>
                    </div>
                </div>

                {/* Center / Bottom Chef Quote & Feature Showcase */}
                <div className="relative z-20 my-auto max-w-xl space-y-8 py-10">
                    <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-300 backdrop-blur-sm">
                        <Utensils className="size-3.5 text-amber-400" />
                        <span>Pengalaman Kuliner Istimewa</span>
                    </div>

                    <blockquote className="space-y-4">
                        <div className="flex text-amber-400/60">
                            <Quote className="size-10 rotate-180" />
                        </div>
                        <p className="font-serif text-3xl font-normal leading-snug tracking-wide text-amber-50 text-balance">
                            "Menghadirkan kehangatan cita rasa otentik, racikan kopi artisan terbaik, dan tempat nyaman untuk setiap momen berharga Anda."
                        </p>
                        <footer className="flex items-center gap-3 pt-2">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-400 to-red-500 p-0.5 shadow-md">
                                <img 
                                    src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=200&q=80" 
                                    alt="Executive Chef" 
                                    className="h-full w-full rounded-full object-cover"
                                />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-amber-100">Chef Marco Venturi</p>
                                <p className="text-xs text-amber-300/80">Head Culinary Director & Founder</p>
                            </div>
                        </footer>
                    </blockquote>

                    {/* Feature Badges */}
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                        <div className="flex flex-col gap-1 rounded-xl bg-white/5 p-3 backdrop-blur-sm border border-white/10">
                            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                                <Utensils className="size-4" />
                                <span>Menu Preview</span>
                            </div>
                            <span className="text-[11px] text-amber-200/70">Hidangan Segar & Kopi Pilihan</span>
                        </div>
                        <div className="flex flex-col gap-1 rounded-xl bg-white/5 p-3 backdrop-blur-sm border border-white/10">
                            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                                <CalendarCheck className="size-4" />
                                <span>Reservasi Meja</span>
                            </div>
                            <span className="text-[11px] text-amber-200/70">Booking Cepat & Instan</span>
                        </div>
                        <div className="flex flex-col gap-1 rounded-xl bg-white/5 p-3 backdrop-blur-sm border border-white/10">
                            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                                <MapPin className="size-4" />
                                <span>Lokasi Nyaman</span>
                            </div>
                            <span className="text-[11px] text-amber-200/70">Suasana Hangat & Estetik</span>
                        </div>
                    </div>
                </div>

                {/* Footer copyright note */}
                <div className="relative z-20 flex items-center justify-between text-xs text-amber-200/60 border-t border-white/10 pt-4">
                    <p>&copy; {new Date().getFullYear()} {name || 'Cafe-Now'}. Premium Hospitality & Dining Experience.</p>
                    <div className="flex items-center gap-4 text-amber-200/80">
                        <span className="hover:text-amber-200 cursor-pointer transition-colors">Privasi</span>
                        <span>&bull;</span>
                        <span className="hover:text-amber-200 cursor-pointer transition-colors">Layanan</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Auth Form Container */}
            <div className="flex w-full min-h-svh items-center justify-center p-6 sm:p-10 lg:col-span-5 xl:col-span-5 bg-gradient-to-b from-amber-50/50 via-background to-background dark:from-stone-950/40">
                <div className="mx-auto flex w-full flex-col justify-center space-y-7 sm:w-[380px]">
                    {/* Mobile Logo Branding */}
                    <div className="flex flex-col items-center gap-3 lg:hidden text-center">
                        <Link
                            href={home()}
                            className="flex items-center gap-2 font-serif text-2xl font-bold text-primary"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-red-600 shadow-md">
                                <AppLogoIcon className="size-7 fill-current text-white" />
                            </div>
                        </Link>
                        <span className="font-serif text-2xl font-bold text-foreground">{name || 'Cafe-Now'}</span>
                        <p className="text-xs text-muted-foreground">Artisan Cafe & Dining Experience</p>
                    </div>

                    {/* Header Section */}
                    <div className="flex flex-col items-start gap-1.5 text-left sm:items-center sm:text-center">
                        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-sm text-muted-foreground text-balance">
                                {description}
                            </p>
                        )}
                    </div>

                    {/* Form Children */}
                    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xl shadow-amber-950/5 dark:shadow-none backdrop-blur-sm">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

