'use client'

import React, { useState } from 'react'
import type { Role } from '@/types/auth'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'

interface PortalShellProps {
  role: Role
  userName: string
  userEmail: string
  children: React.ReactNode
}

export function PortalShell({
  role,
  userName,
  userEmail,
  children,
}: PortalShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="portal-layout">
      {/* Mobile Backdrop Overlay */}
      <div
        className={`sidebar-overlay ${isMobileOpen ? 'open' : ''}`}
        onClick={() => setIsMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar (Desktop fixed / Mobile drawer) */}
      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <main className="portal-main">
        <Navbar
          role={role}
          userName={userName}
          onMobileMenuToggle={() => setIsMobileOpen((prev) => !prev)}
          isMobileMenuOpen={isMobileOpen}
        />
        {children}
      </main>
    </div>
  )
}
