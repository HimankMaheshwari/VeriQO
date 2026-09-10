import React from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
}

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div
      style={{
        marginBottom: 'var(--space-8)',
        paddingBottom: 'var(--space-6)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav style={{ marginBottom: 'var(--space-2)' }} aria-label="Breadcrumbs">
          <ol style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', listStyle: 'none' }}>
            {breadcrumbs.map((crumb, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {i > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', opacity: 0.7 }} aria-hidden="true">›</span>}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    style={{ fontSize: 'var(--text-sm)', color: 'var(--text-link)', textDecoration: 'none' }}
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', marginBottom: description ? 'var(--space-1)' : 0, letterSpacing: '-0.01em' }}>
            {title}
          </h1>
          {description && (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
