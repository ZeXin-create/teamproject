import { ReactNode } from 'react'
import { AuthProvider } from '../context/AuthContext'

interface ServerAuthProviderProps {
  children: ReactNode
}

export default function ServerAuthProvider({ children }: ServerAuthProviderProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}
