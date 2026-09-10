import React from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PortalShell } from '@/components/layout/PortalShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/unauthorized')

  return (
    <PortalShell
      role={session.user.role}
      userName={session.user.name ?? 'Admin'}
      userEmail={session.user.email ?? ''}
    >
      <div className="portal-content animate-fade-in">{children}</div>
    </PortalShell>
  )
}
