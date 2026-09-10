import Link from 'next/link'
import { ShieldOff } from 'lucide-react'

export const metadata = { title: 'Access Denied' }

export default function UnauthorizedPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: 'var(--space-8)' }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-xl)', background: 'var(--color-error-bg)', border: '1px solid var(--color-error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
          <ShieldOff size={32} style={{ color: 'var(--color-error)' }} />
        </div>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-8)' }}>
          You do not have permission to access this resource.
          Please sign in with an account that has the required role.
        </p>
        <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 24px', background: 'var(--brand-600)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', textDecoration: 'none' }}>
          Return to Sign In
        </Link>
      </div>
    </div>
  )
}
