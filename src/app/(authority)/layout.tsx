import React from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PortalShell } from '@/components/layout/PortalShell'

export default async function AuthorityLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const allowedRoles = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN']
  if (!allowedRoles.includes(session.user.role)) redirect('/unauthorized')

  return (
    <PortalShell
      role={session.user.role}
      userName={session.user.name ?? 'Officer'}
      userEmail={session.user.email ?? ''}
    >
      <div className="portal-content animate-fade-in">{children}</div>
    </PortalShell>
  )
}
