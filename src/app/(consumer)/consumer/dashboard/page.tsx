import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScanStatusBadge } from '@/components/ui/Badge'
import Link from 'next/link'
import { ScanLine, FileText, History, ArrowRight, Package, Clock } from 'lucide-react'

export const metadata = { title: 'Dashboard' }

export default async function ConsumerDashboard() {
  const session = await auth()
  const userId = session!.user.id

  const [scanCount, complaintCount, recentScans] = await Promise.all([
    prisma.productScan.count({ where: { userId } }),
    prisma.complaint.count({ where: { consumerId: userId } }),
    prisma.productScan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { product: true, images: true },
    }),
  ])

  return (
    <div>
      <PageHeader
        title={`Welcome, ${session!.user.name?.split(' ')[0] ?? 'Consumer'}`}
        description="Scan packaged products and check compliance with Legal Metrology requirements."
      />

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-5)',
          marginBottom: 'var(--space-8)',
        }}
      >
        <StatCard
          label="Total Scans"
          value={scanCount}
          icon={<ScanLine size={22} />}
          accentColor="var(--brand-600)"
          iconBg="var(--brand-900)"
          iconColor="var(--brand-400)"
        />
        <StatCard
          label="Complaints Filed"
          value={complaintCount}
          icon={<FileText size={22} />}
          accentColor="var(--color-warning)"
          iconBg="rgba(245,158,11,0.1)"
          iconColor="var(--color-warning)"
        />
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          {[
            {
              href: '/consumer/scan',
              icon: <ScanLine size={24} />,
              title: 'Scan Product',
              desc: 'Upload product images for compliance check',
              color: 'var(--brand-400)',
              bg: 'var(--brand-900)',
            },
            {
              href: '/consumer/complaints/new',
              icon: <FileText size={24} />,
              title: 'File Complaint',
              desc: 'Report a non-compliant product',
              color: 'var(--color-warning)',
              bg: 'rgba(245,158,11,0.1)',
            },
            {
              href: '/consumer/history',
              icon: <History size={24} />,
              title: 'View History',
              desc: 'See all your past scans',
              color: 'var(--color-success)',
              bg: 'rgba(16,185,129,0.1)',
            },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-4)',
                padding: 'var(--space-5)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                textDecoration: 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: action.bg,
                  color: action.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {action.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 2 }}>
                  {action.title}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {action.desc}
                </div>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent scans */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>Recent Scans</h2>
          <Link href="/consumer/history" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-link)', display: 'flex', alignItems: 'center', gap: 4 }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {recentScans.length === 0 ? (
          <EmptyState
            icon={<Package size={28} />}
            title="No scans yet"
            description="Upload your first product image to begin compliance checking."
            action={
              <Link
                href="/consumer/scan"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  background: 'var(--brand-600)',
                  color: 'white',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  textDecoration: 'none',
                }}
              >
                <ScanLine size={16} /> Scan First Product
              </Link>
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {recentScans.map((scan) => {
              const displayName =
                scan.identifiedProductName ||
                scan.product?.name ||
                'Unidentified Product'
              const firstImage = scan.images[0]
              const imageUrl = firstImage
                ? `/api/v1/files/${firstImage.storageKey.replace(/\\/g, '/')}`
                : null

              return (
                <Link
                  key={scan.id}
                  href={`/consumer/scans/${scan.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    padding: 'var(--space-4)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                    textDecoration: 'none',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-elevated)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={displayName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Package size={20} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Clock size={11} />
                      {new Date(scan.createdAt).toLocaleDateString('en-IN')} · {scan.images.length} image(s)
                    </div>
                  </div>
                  <ScanStatusBadge status={scan.status} />
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
