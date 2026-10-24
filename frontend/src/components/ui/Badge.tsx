import React from 'react';

export type BadgeVariant = 'actual' | 'forecast' | 'neutral' | 'warning' | 'info' | 'outline' | 'amber';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    actual: 'bg-[#E8F7F2] text-[#0A7B5E] border-[#A3E3D1]',
    forecast: 'bg-[#EAF4FD] text-[#1C7BC8] border-[#B3DCFA]',
    neutral: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
    warning: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]',
    amber: 'bg-[#FEF7EC] text-[#B54708] border-[#FEDF89]',
    info: 'bg-[#F0F9FF] text-[#026AA2] border-[#B9E6FE]',
    outline: 'bg-white text-[#475569] border-[#CBD5E1]',
  };

  const dotColors: Record<BadgeVariant, string> = {
    actual: 'bg-[#0D9B76]',
    forecast: 'bg-[#3196E8]',
    neutral: 'bg-[#94A3B8]',
    warning: 'bg-[#D92D20]',
    amber: 'bg-[#F79009]',
    info: 'bg-[#0BA5EC]',
    outline: 'bg-[#64748B]',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium leading-4',
    md: 'text-xs px-2.5 py-1 font-medium leading-4',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};
