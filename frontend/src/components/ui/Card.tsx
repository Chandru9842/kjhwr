import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  noPadding = false,
  ...props 
}) => {
  return (
    <div 
      className={`bg-white border border-[#E2E8F0] rounded-xl shadow-card transition-shadow duration-200 ${noPadding ? '' : 'p-5'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`flex items-start justify-between pb-4 mb-4 border-b border-[#F1F5F9] ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-navy-900 tracking-tight flex items-center gap-2">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-navy-500 mt-0.5 font-normal">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
};
