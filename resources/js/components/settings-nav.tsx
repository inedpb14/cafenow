import { router, usePage } from '@inertiajs/react';

const NAV_ITEMS = [
    { label: 'Profil', href: '/settings/profile' },
    { label: 'Keamanan', href: '/settings/security' },
    { label: 'Tampilan', href: '/settings/appearance' },
];

export default function SettingsNav() {
    const { url } = usePage();

    const current = NAV_ITEMS.find(
        (item) => url === item.href || url.startsWith(item.href + '?')
    )?.href ?? '/settings/profile';

    return (
        <div className="mb-6">
            <select
                value={current}
                onChange={(e) => router.visit(e.target.value)}
                className="w-full sm:w-64 px-3 py-2.5 text-sm font-bold border-2 border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer rounded-none"
            >
                {NAV_ITEMS.map((item) => (
                    <option key={item.href} value={item.href}>
                        {item.label}
                    </option>
                ))}
            </select>
        </div>
    );
}