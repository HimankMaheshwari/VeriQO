'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Role } from '@/types/auth'
import styles from './Sidebar.module.css'
import {
  LayoutDashboard,
  ScanLine,
  FileText,
  History,
  ClipboardList,
  Search,
  Users,
  BookOpen,
  ActivitySquare,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Briefcase,
  AlertTriangle,
  X,
  Sparkles,
  Award,
  FlaskConical,
  Gem,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const consumerNav: NavItem[] = [
  { label: 'Dashboard', href: '/consumer/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'AI Standards Assistant', href: '/consumer/assistant', icon: <Sparkles size={18} /> },
  { label: 'Indian Standards', href: '/consumer/standards', icon: <BookOpen size={18} /> },
  { label: 'Certification Schemes', href: '/consumer/schemes', icon: <Award size={18} /> },
  { label: 'Testing Labs', href: '/consumer/laboratories', icon: <FlaskConical size={18} /> },
  { label: 'Hallmarking & HUID', href: '/consumer/hallmarking', icon: <Gem size={18} /> },
  { label: 'Scan Product', href: '/consumer/scan', icon: <ScanLine size={18} /> },
  { label: 'Complaints', href: '/consumer/complaints', icon: <FileText size={18} /> },
  { label: 'Scan History', href: '/consumer/history', icon: <History size={18} /> },
]

const authorityNav: NavItem[] = [
  { label: 'Dashboard', href: '/authority/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Standards Copilot', href: '/authority/assistant', icon: <Sparkles size={18} /> },
  { label: 'Indian Standards', href: '/consumer/standards', icon: <BookOpen size={18} /> },
  { label: 'Product Scanner', href: '/authority/scan', icon: <ScanLine size={18} /> },
  { label: 'Cases', href: '/authority/cases', icon: <Briefcase size={18} /> },
  { label: 'Risk Queue', href: '/authority/risk', icon: <AlertTriangle size={18} /> },
  { label: 'Inspections', href: '/authority/inspections', icon: <ClipboardList size={18} /> },
  { label: 'Complaints', href: '/authority/complaints', icon: <FileText size={18} /> },
  { label: 'Search & Investigation', href: '/authority/search', icon: <Search size={18} /> },
]

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'AI Standards Assistant', href: '/consumer/assistant', icon: <Sparkles size={18} /> },
  { label: 'Indian Standards', href: '/consumer/standards', icon: <BookOpen size={18} /> },
  { label: 'Risk Queue', href: '/authority/risk', icon: <AlertTriangle size={18} /> },
  { label: 'Search & Investigation', href: '/authority/search', icon: <Search size={18} /> },
  { label: 'Users', href: '/admin/users', icon: <Users size={18} /> },
  { label: 'Legal Rules', href: '/admin/rules', icon: <BookOpen size={18} /> },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: <ActivitySquare size={18} /> },
]

const navByRole: Record<string, NavItem[]> = {
  CONSUMER: consumerNav,
  AUTHORITY_OFFICER: authorityNav,
  SENIOR_AUTHORITY: authorityNav,
  ADMIN: adminNav,
}

const portalLabel: Record<string, { label: string; color: string }> = {
  CONSUMER: { label: 'Consumer Portal', color: 'var(--brand-400)' },
  AUTHORITY_OFFICER: { label: 'Authority Portal', color: 'var(--color-warning)' },
  SENIOR_AUTHORITY: { label: 'Authority Portal', color: 'var(--color-warning)' },
  ADMIN: { label: 'Admin Portal', color: 'var(--color-error)' },
}

interface SidebarProps {
  role: Role
  userName: string
  userEmail: string
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ role, userName, userEmail, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const navItems = navByRole[role] ?? consumerNav
  const portal = portalLabel[role] ?? portalLabel.CONSUMER

  return (
    <aside className={`portal-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo & Header */}
      <div
        style={{
          padding: 'var(--space-5) var(--space-5)',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--brand-600), var(--brand-800))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} color="white" />
            </div>
            <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              VeriQO
            </span>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-semibold)',
              color: portal.color,
              paddingLeft: 48,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-full)', background: portal.color }} />
            {portal.label}
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close sidebar navigation"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: 'var(--space-3)', overflowY: 'auto' }}>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/consumer/dashboard' && item.href !== '/authority/dashboard' && item.href !== '/admin/dashboard' && pathname.startsWith(item.href + '/'))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => onClose?.()}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={`${styles.navIcon} ${isActive ? styles.navIconActive : ''}`}>
                    {item.icon}
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {isActive && <ChevronRight size={14} style={{ color: 'var(--brand-400)', opacity: 0.8 }} />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User + logout */}
      <div
        style={{
          padding: 'var(--space-4)',
          borderTop: '1px solid var(--border-default)',
          background: 'rgba(15, 23, 42, 0.4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            marginBottom: 'var(--space-2)',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--brand-700), var(--brand-900))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-bold)',
              color: 'var(--brand-300)',
              flexShrink: 0,
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="truncate" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
              {userName}
            </div>
            <div className="truncate" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {userEmail}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={styles.signOutBtn}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
