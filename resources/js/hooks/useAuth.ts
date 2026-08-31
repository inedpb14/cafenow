import { usePage } from '@inertiajs/react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'customer';
}

interface PageProps {
  auth: {
    user: User;
  };
}

export const useAuth = () => {
  const { auth } = usePage<PageProps>().props;

  const isAdmin = auth?.user?.role === 'admin';
  const isOwner = auth?.user?.role === 'owner';
  const isCustomer = auth?.user?.role === 'customer';

  return {
    user: auth?.user,
    isAdmin,
    isOwner,
    isCustomer,
    isAuthenticated: !!auth?.user,
  };
};
