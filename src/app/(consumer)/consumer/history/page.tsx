import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScanStatusBadge, IdentificationStatusBadge } from '@/components/ui/Badge'
import Link from 'next/link'
import { History, ScanLine, Package, Clock, ArrowRight } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export const metadata = { title: 'Scan History | VeriQO' }

export default async function HistoryPage() {
  const session = await auth()
  const scans = await prisma.productScan.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      product: true,
      images: { take: 1, orderBy: { uploadedAt: 'asc' } },
      extractedDeclarations: { select: { id: true } },
    },
  })

  return (
    <div>
      <PageHeader
        title="Scan History"
        description="All packaged commodity scans and OCR extractions you have submitted."
        actions={
          <Link
            href="/consumer/scan"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: 'var(--brand-600)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              textDecoration: 'none',
            }}
          >
            <ScanLine size={16} /> New Scan
          </Link>
        }
      />

      {scans.length === 0 ? (
        <EmptyState
          icon={<History size={28} />}
          title="No scan history yet"
          description="Your scanned products will appear here. Start by uploading clear images of a packaged commodity."
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
              <ScanLine size={16} /> Scan Product
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {scans.map((scan) => {
            const displayName =
              scan.identifiedProductName ||
              scan.product?.name ||
              'Unidentified Packaged Commodity'
            const brand = scan.identifiedBrand || scan.product?.brand
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
                    width: 54,
                    height: 54,
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
                    <Package size={24} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="truncate"
                    style={{
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-semibold)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {displayName}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 4,
                      flexWrap: 'wrap',
                    }}
                  >
                    {brand && (
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 'var(--font-medium)' }}>
                        Brand: {brand}
                      </span>
                    )}
                    {brand && <span>·</span>}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      {formatDateTime(scan.createdAt)}
                    </span>
                    <span>·</span>
                    <span>{scan.extractedDeclarations.length} declaration(s)</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    flexShrink: 0,
                  }}
                >
                  <IdentificationStatusBadge status={scan.identificationStatus || 'PENDING'} />
                  <ScanStatusBadge status={scan.status} />
                  <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
