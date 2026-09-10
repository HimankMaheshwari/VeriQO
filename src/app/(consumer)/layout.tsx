import React from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PortalShell } from '@/components/layout/PortalShell'

export default async function ConsumerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <PortalShell
      role={session.user.role}
      userName={session.user.name ?? 'User'}
      userEmail={session.user.email ?? ''}
    >
      <div className="portal-content animate-fade-in">{children}</div>
    </PortalShell>
  )
}
