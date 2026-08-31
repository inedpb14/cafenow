import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ToastProvider } from '@/Contexts/ToastContext';
import { initializeTheme } from '@/hooks/use-appearance';
import AdminLayout from '@/components/Admin/AdminLayout';
import OwnerLayout from '@/components/Owner/OwnerLayout';
import AppLayout from '@/layouts/app-layout';
import AppHeaderLayout from '@/layouts/app/app-header-layout';
import AuthLayout from '@/layouts/auth-layout';
import CustomerLayout from '@/layouts/customer-layout';
import PublicLayout from '@/layouts/public-layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name, page) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'): {
                const role = (page.props as any)?.auth?.user?.role;
                if (role === 'owner') return OwnerLayout;
                if (role === 'admin') return AdminLayout;
                return CustomerLayout;
            }
            case name.startsWith('admin/'):
            case name.startsWith('owner/'):
                return null;
            case name.startsWith('customer/'):
                return CustomerLayout;
            case name.startsWith('cafes/'):
                return PublicLayout;
            case name.startsWith('payments/'):
                return null;
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                <ToastProvider>
                    {app}
                    <Toaster />
                </ToastProvider>
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

initializeTheme();
