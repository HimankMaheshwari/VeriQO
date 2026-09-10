'use client'

import React from 'react'
import { RoleBadge } from '@/components/ui/Badge'
import type { Role } from '@/types/auth'
import { Menu, ShieldCheck } from 'lucide-react'
import styles from './Navbar.module.css'

interface NavbarProps {
  userName?: string
  role?: Role
  onMobileMenuToggle?: () => void
  isMobileMenuOpen?: boolean
}

export function Navbar({
  userName = 'User',
  role = 'CONSUMER',
  onMobileMenuToggle,
  isMobileMenuOpen,
}: NavbarProps) {
  return (
    <header className={styles.navbar}>
      <div className={styles.leftSection}>
        {onMobileMenuToggle && (
          <button
            type="button"
            className={styles.hamburgerBtn}
            onClick={onMobileMenuToggle}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            <Menu size={18} />
          </button>
        )}
        <div className={styles.brandContext}>
          <ShieldCheck size={16} style={{ color: 'var(--brand-400)', flexShrink: 0 }} />
          <span>VeriQO Legal Metrology Platform</span>
        </div>
      </div>

      <div className={styles.rightSection}>
        <RoleBadge role={role} />
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 'var(--text-sm)' }}>{userName}</span>
        </div>
      </div>
    </header>
  )
}
