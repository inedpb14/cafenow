import { useEffect } from 'react';
import { Head, usePage, router } from '@inertiajs/react';

export default function Dashboard() {
    const { props } = usePage();
    const auth = (props as any).auth || {};
    const user = auth.user || {};
    const roles = user.roles || [];

    useEffect(() => {
        if (roles.includes('admin') || user.role === 'admin') {
            router.replace('/admin/dashboard');
        } else if (roles.includes('owner') || user.role === 'owner') {
            router.replace('/owner/dashboard');
        } else {
            router.replace('/');
        }
    }, [user]);

    return (
        <>
            <Head title="Mengarahkan ke Dashboard..." />
            <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col items-center justify-center p-6">
                <div className="flex items-center gap-3">
                    <div className="size-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                    <span className="text-sm font-semibold text-stone-300">Mengarahkan ke Dashboard Anda...</span>
                </div>
            </div>
        </>
    );
}
