import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 focus:ring-pink-500',
    secondary: 'bg-white/50 text-gray-700 hover:bg-white/80 focus:ring-gray-500',
    glass: 'glass-button text-white focus:ring-blue-500',
    danger: 'bg-gradient-to-r from-red-400 to-red-500 text-white hover:from-red-500 hover:to-red-600 focus:ring-red-500'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  }
  
  const roundedClasses = 'rounded-lg'
  
  const finalClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${roundedClasses} ${className}`
  
  return (
    <button
      className={finalClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
          {children}
        </div>
      ) : (
        children
      )}
    </button>
  )
}
