'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '../context/AuthContext'
import AutoRefresh from './AutoRefresh'

interface ClientProvidersProps {
  children: ReactNode
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <AutoRefresh />
      {children}
    </AuthProvider>
  )
}
