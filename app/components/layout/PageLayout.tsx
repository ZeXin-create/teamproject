import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  paddingTop?: string;
}

export default function PageLayout({ children, title, className = '', paddingTop = 'pt-20 md:pt-24' }: PageLayoutProps) {
  return (
    <div className="min-h-screen">
      <div className={`container mx-auto px-4 ${paddingTop} pb-8 ${className}`}>
        {title && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
