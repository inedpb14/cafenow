import { ReactNode } from 'react';

type BadgeVariant = 'success' | 'pending' | 'danger' | 'info' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-[#5c6e4a] text-white',
  pending: 'bg-[#b8863b] text-white',
  danger: 'bg-[#a6472f] text-white',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-gray-200 text-gray-800',
};

export default function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-block px-3 py-1 rounded-full text-sm font-medium
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
