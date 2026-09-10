import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { BookOpen } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Legal Rules' }

export default async function AdminRulesPage() {
  const rules = await prisma.legalRule.findMany({
    orderBy: { ruleNumber: 'asc' },
    include: { _count: { select: { versions: true } } },
  })

  return (
    <div>
      <PageHeader
        title="Legal Rule Engine"
        description="Versioned Legal Metrology rules. Rules are data-driven and never hard-coded."
      />

      {/* Important notice */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--color-warning-dark)' }}>
        <BookOpen size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Phase 3 — Rule Population:</strong> The rule engine schema is ready.
          Actual Legal Metrology rules will be researched, sourced from official documents,
          and added in Phase 3. Do not add placeholder or invented legal rules.
          All rules must reference their source document and effective date.
        </div>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={28} />}
          title="No legal rules configured"
          description="The rule engine schema is ready. Legal Metrology rules will be added in Phase 3 after thorough research of the Legal Metrology Act, 2009 and Packaged Commodities Rules, 2011."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {rules.map((rule) => (
            <div key={rule.id} style={{ padding: 'var(--space-5)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--brand-400)', fontFamily: 'var(--font-mono)', background: 'var(--brand-900)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                      {rule.ruleNumber}
                    </span>
                    <Badge variant={rule.isActive ? 'success' : 'muted'}>{rule.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 4 }}>{rule.title}</h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
                    {rule.sourceDocument} · Effective {formatDate(rule.effectiveDate)} · {rule._count.versions} version(s)
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>
                {rule.requirement}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
