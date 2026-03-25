import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export default function Card({ children, className = '', ...props }: CardProps) {
  const baseClasses = 'glass-card p-6 rounded-xl'
  const finalClasses = `${baseClasses} ${className}`
  
  return (
    <div className={finalClasses} {...props}>
      {children}
    </div>
  )
}
