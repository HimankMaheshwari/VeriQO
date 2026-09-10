'use client'

import { useSession } from 'next-auth/react'
import type { Role } from '@/types/auth'

export function useCurrentUser() {
  const { data: session, status } = useSession()

  return {
    user: session?.user ?? null,
    role: (session?.user?.role as Role) ?? null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  }
}
