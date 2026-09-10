'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  ScanStatusBadge,
  IdentificationStatusBadge,
  ComplianceBadge,
  Badge,
} from '@/components/ui/Badge'
import { formatDateTime, formatBytes } from '@/lib/utils'
import {
  Info,
  Package,
  FileText,
  AlertTriangle,
  CheckCircle,
  Copy,
  RotateCw,
  ScanLine,
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Globe,
} from 'lucide-react'

export interface SerializedScanImage {
  id: string
  storageKey: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  ocrText: string | null
  uploadedAt: string | Date
}

export interface SerializedDeclaration {
  id: string
  fieldName: string
  rawValue: string | null
  normalizedValue: string | null
  confidence: number | null
  detectionStatus: string
  sourceText: string | null
}

export interface SerializedScan {
  id: string
  status: string
  notes: string | null
  rawOcrText: string | null
  ocrStatus: string | null
  ocrError: string | null
  identificationStatus: string | null
  identifiedProductName: string | null
  identifiedBrand: string | null
  identifiedCategory: string | null
  identifiedManufacturer: string | null
  identificationConfidence: number | null
  createdAt: string | Date
  updatedAt: string | Date
  productId: string | null
  images: SerializedScanImage[]
  extractedDeclarations: SerializedDeclaration[]
  product: {
    id: string
    name: string
    brand: string | null
    category: string | null
  } | null
}

const FIELD_LABELS: Record<string, string> = {
  product_name: 'Product / Commodity Name',
  brand: 'Brand Name',
  manufacturer: 'Manufacturer Name',
  packer: 'Packer Name',
  importer: 'Importer Name',
  address: 'Physical Address',
  net_quantity: 'Net Quantity / Weight / Volume',
  mrp: 'Maximum Retail Price (MRP)',
  unit_sale_price: 'Unit Sale Price (USP)',
  date_of_manufacture: 'Date of Manufacture',
  date_of_packing: 'Date of Packing',
  best_before: 'Best Before / Expiry Date',
  customer_care: 'Customer Care Details',
  country_of_origin: 'Country of Origin',
  batch_number: 'Batch / Lot Number',
}

export default function ScanDetailClient({ initialScan }: { initialScan: SerializedScan }) {
  const router = useRouter()
  const [scan, setScan] = useState<SerializedScan>(initialScan)
  const [reprocessing, setReprocessing] = useState(false)
  const [reprocessError, setReprocessError] = useState<string | null>(null)
  const [showRawOcr, setShowRawOcr] = useState(false)
  const [selectedImage, setSelectedImage] = useState<SerializedScanImage | null>(
    initialScan.images[0] ?? null
  )
  const [copied, setCopied] = useState(false)

  const productName =
    scan.identifiedProductName || scan.product?.name || 'Unidentified Commodity'
  const brandName = scan.identifiedBrand || scan.product?.brand || 'Unknown Brand'
  const confidencePercent = scan.identificationConfidence
    ? Math.round(scan.identificationConfidence * 100)
    : null

  async function handleReprocess() {
    setReprocessing(true)
    setReprocessError(null)
    try {
      const res = await fetch(`/api/v1/scans/${scan.id}/process`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) {
        setReprocessError(json.error || 'Failed to re-process scan')
        return
      }
      if (json.data?.scan) {
        setScan(json.data.scan)
      } else {
        router.refresh()
      }
    } catch {
      setReprocessError('Network error while processing scan. Please try again.')
    } finally {
      setReprocessing(false)
    }
  }

  // Online E-Commerce Price Audit state
  const [onlineUrl, setOnlineUrl] = useState('')
  const [auditingPrice, setAuditingPrice] = useState(false)
  const [onlineAuditResult, setOnlineAuditResult] = useState<any | null>(null)
  const [onlineAuditError, setOnlineAuditError] = useState<string | null>(null)

  async function handleAuditPrice(e: React.FormEvent) {
    e.preventDefault()
    if (!onlineUrl.trim()) return
    setAuditingPrice(true)
    setOnlineAuditError(null)
    try {
      const res = await fetch('/api/v1/online-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId: scan.id,
          url: onlineUrl.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setOnlineAuditError(json.error || 'Failed to cross-verify online listing')
        return
      }
      setOnlineAuditResult(json.data)
    } catch {
      setOnlineAuditError('Network error while verifying online listing')
    } finally {
      setAuditingPrice(false)
    }
  }

  function handleCopyOcr() {
    if (!scan.rawOcrText) return
    navigator.clipboard.writeText(scan.rawOcrText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <PageHeader
        title={productName}
        description={`Scan session ID: ${scan.id} · Recorded on ${formatDateTime(scan.createdAt)}`}
        breadcrumbs={[
          { label: 'Scans', href: '/consumer/history' },
          { label: productName },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <Link
              href={`/consumer/complaints/new?scanId=${scan.id}&title=${encodeURIComponent('Complaint regarding packaging of ' + productName)}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                background: 'var(--brand-600)',
                color: 'white',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                textDecoration: 'none',
              }}
              id="file-complaint-btn"
            >
              <FileText size={14} />
              File Complaint
            </Link>
            <ScanStatusBadge status={scan.status} />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReprocess}
              loading={reprocessing}
              id="reprocess-scan-btn"
            >
              <RotateCw size={14} />
              Re-analyze
            </Button>
          </div>
        }
      />

      {/* Legal Metrology Verification Status Banner */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-6)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-primary)',
          lineHeight: 1.5,
        }}
      >
        <CheckCircle size={20} style={{ flexShrink: 0, marginTop: 2, color: 'var(--brand-400)' }} />
        <div>
          <strong>Legal Metrology Declarations:</strong> Packaging extractions and ground-truth values
          identified from your package images are displayed below. You can also perform an informational online price
          cross-check to verify e-commerce prices against the physical package Maximum Retail Price (MRP).
        </div>
      </div>

      {scan.ocrError && (
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            padding: 'var(--space-4)',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-6)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-error-dark)',
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-error)' }} />
          <div>
            <div style={{ fontWeight: 'var(--font-bold)', marginBottom: 4 }}>
              OCR &amp; Vision Processing Notice
            </div>
            <div>{scan.ocrError}</div>
            {scan.ocrError.includes('GEMINI_API_KEY') && (
              <div
                style={{
                  marginTop: 'var(--space-2)',
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg-elevated)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                👉 Action required: Add <strong>GEMINI_API_KEY=&quot;AIzaSy...&quot;</strong> to <strong>.env.local</strong>, then click the <strong>&quot;Re-analyze&quot;</strong> button above.
              </div>
            )}
          </div>
        </div>
      )}

      {reprocessError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-error-bg)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-6)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-error-dark)',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          {reprocessError}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* Product Identification Card */}
        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={18} style={{ color: 'var(--brand-400)' }} />
              Product Identification
            </CardTitle>
            <IdentificationStatusBadge status={scan.identificationStatus || 'PENDING'} />
          </CardHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Identified Commodity Name
              </div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginTop: 2 }}>
                {productName}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Brand</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginTop: 2 }}>
                  {brandName}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Category</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginTop: 2 }}>
                  {scan.identifiedCategory || 'Packaged Commodity'}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Likely Manufacturer / Packer
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>
                {scan.identifiedManufacturer || 'Not explicitly determined from label'}
              </div>
            </div>

            {confidencePercent !== null && (
              <div style={{ marginTop: 'var(--space-2)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'var(--text-xs)',
                    marginBottom: 4,
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Identification Confidence</span>
                  <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--brand-400)' }}>
                    {confidencePercent}%
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 6,
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(confidencePercent, 100)}%`,
                      height: '100%',
                      background:
                        confidencePercent >= 70
                          ? 'var(--color-success)'
                          : confidencePercent >= 40
                          ? 'var(--color-warning)'
                          : 'var(--color-error)',
                      borderRadius: 'var(--radius-full)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Quick Actions & Compliance Status */}
        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} style={{ color: 'var(--color-warning)' }} />
              Consumer Actions
            </CardTitle>
          </CardHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
              Notice a missing declaration, deceptive packaging, or price discrepancy on this product?
              You can file a formal complaint with the Legal Metrology authority.
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Link
                href={`/consumer/complaints/new?scanId=${scan.id}&title=${encodeURIComponent(
                  'Packaging issue with ' + productName
                )}`}
                style={{ textDecoration: 'none' }}
              >
                <Button variant="primary" id="file-complaint-scan-btn">
                  <FileText size={16} />
                  File Complaint
                </Button>
              </Link>
              <Link href="/consumer/scan" style={{ textDecoration: 'none' }}>
                <Button variant="secondary">
                  <ScanLine size={16} />
                  Scan Another Product
                </Button>
              </Link>
            </div>

            <div
              style={{
                marginTop: 'var(--space-2)',
                padding: 'var(--space-3)',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
              }}
            >
              Images Uploaded: <strong>{scan.images.length}</strong> · Total Declarations Extracted:{' '}
              <strong>{scan.extractedDeclarations.length}</strong>
            </div>
          </div>
        </Card>
      </div>

      {/* Package Images Gallery & Side-by-Side OCR */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ImageIcon size={18} style={{ color: 'var(--brand-400)' }} />
            Package Images ({scan.images.length})
          </CardTitle>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Select an image to view OCR text from that side
          </span>
        </CardHeader>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          {scan.images.map((img, idx) => {
            const isSelected = selectedImage?.id === img.id
            const fileUrl = `/api/v1/files/${img.storageKey.replace(/\\/g, '/')}`
            return (
              <div
                key={img.id}
                onClick={() => setSelectedImage(img)}
                style={{
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  border: isSelected ? '2px solid var(--brand-500)' : '1px solid var(--border-default)',
                  background: 'var(--bg-elevated)',
                  position: 'relative',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ aspectRatio: '1', width: '100%', position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrl}
                    alt={img.originalFilename}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div
                  style={{
                    padding: '6px 8px',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-surface)',
                  }}
                >
                  <span className="truncate" style={{ maxWidth: 90 }}>
                    #{idx + 1} {img.originalFilename}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {formatBytes(img.sizeBytes)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected Image Detail & Per-image OCR */}
        {selectedImage && (
          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                OCR Output for: {selectedImage.originalFilename}
              </div>
              <a
                href={`/api/v1/files/${selectedImage.storageKey.replace(/\\/g, '/')}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-link)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  textDecoration: 'none',
                }}
              >
                Open Full Image <ExternalLink size={12} />
              </a>
            </div>
            <pre
              style={{
                margin: 0,
                padding: 'var(--space-3)',
                background: 'var(--neutral-900)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                lineHeight: 1.5,
                maxHeight: 180,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {selectedImage.ocrText || '(No OCR text extracted for this image)'}
            </pre>
          </div>
        )}
      </Card>

      {/* Extracted Package Declarations Table */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} style={{ color: 'var(--brand-400)' }} />
            Extracted Package Declarations ({scan.extractedDeclarations.length})
          </CardTitle>
          <Badge variant="info">Phase 2 AI Extraction</Badge>
        </CardHeader>

        {scan.extractedDeclarations.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-8)',
              color: 'var(--text-muted)',
              fontSize: 'var(--text-sm)',
            }}
          >
            No declarations extracted yet.{' '}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReprocess}
              loading={reprocessing}
              style={{ marginLeft: 8 }}
            >
              Run Analysis
            </Button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: 'var(--text-sm)',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-default)',
                    background: 'var(--bg-elevated)',
                  }}
                >
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-semibold)' }}>
                    Mandatory Declaration
                  </th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-semibold)' }}>
                    Extracted Value
                  </th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-semibold)' }}>
                    Packaging Quote / Source
                  </th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-semibold)', textAlign: 'center' }}>
                    Confidence
                  </th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-semibold)', textAlign: 'right' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {scan.extractedDeclarations.map((d) => {
                  const conf = d.confidence ? Math.round(d.confidence * 100) : null
                  const label = FIELD_LABELS[d.fieldName] || d.fieldName
                  return (
                    <tr
                      key={d.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <div style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {d.fieldName}
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        {d.normalizedValue || d.rawValue ? (
                          <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--brand-300)' }}>
                            {d.normalizedValue || d.rawValue}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Not detected
                          </span>
                        )}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', maxWidth: 280 }}>
                        {d.sourceText ? (
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 'var(--text-xs)',
                              background: 'var(--bg-elevated)',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-secondary)',
                              display: 'inline-block',
                            }}
                          >
                            &quot;{d.sourceText}&quot;
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                        {conf !== null ? (
                          <span
                            style={{
                              fontSize: 'var(--text-xs)',
                              fontWeight: 'var(--font-bold)',
                              color:
                                conf >= 80
                                  ? 'var(--color-success)'
                                  : conf >= 50
                                  ? 'var(--color-warning)'
                                  : 'var(--color-error)',
                            }}
                          >
                            {conf}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                        <ComplianceBadge status={d.detectionStatus} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Informational Online Price & E-Commerce Cross-Check */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={18} style={{ color: 'var(--brand-400)' }} />
            Informational Online Price &amp; E-Commerce Cross-Check
          </CardTitle>
          <Badge variant="default">Informational Comparison</Badge>
        </CardHeader>

        <div style={{ padding: '0 var(--space-4) var(--space-4) var(--space-4)' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
            Enter an e-commerce listing URL (e.g. Amazon, Blinkit, Flipkart, Zepto) for this product to check if the online seller charges more than the physical package Maximum Retail Price (MRP).
          </p>

          <form onSubmit={handleAuditPrice} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <input
              type="url"
              required
              placeholder="https://www.amazon.in/dp/... or https://blinkit.com/prn/..."
              value={onlineUrl}
              onChange={(e) => setOnlineUrl(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
              }}
              id="consumer-online-url-input"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={auditingPrice}
              id="consumer-audit-price-btn"
            >
              Cross-Check Price
            </Button>
          </form>

          {onlineAuditError && (
            <div
              style={{
                padding: 'var(--space-3)',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-error)',
                fontSize: 'var(--text-xs)',
                marginBottom: 'var(--space-3)',
              }}
            >
              {onlineAuditError}
            </div>
          )}

          {onlineAuditResult && (
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                  {onlineAuditResult.domain || 'E-Commerce Platform'}
                </span>
                <Badge variant={onlineAuditResult.overallMatchStatus === 'MATCH' ? 'success' : 'warning'}>
                  {onlineAuditResult.overallMatchStatus}
                </Badge>
              </div>

              {/* Online Discrepancies */}
              {onlineAuditResult.discrepancies?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {onlineAuditResult.discrepancies.map((d: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 10px',
                        background: d.discrepancyType === 'PRICE_MISMATCH' ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-elevated)',
                        border: d.discrepancyType === 'PRICE_MISMATCH' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-subtle)',
                        borderRadius: 4,
                        fontSize: 'var(--text-xs)',
                      }}
                    >
                      <div style={{ fontWeight: 'bold', color: d.discrepancyType === 'PRICE_MISMATCH' ? 'var(--color-error)' : 'var(--text-primary)' }}>
                        {d.discrepancyType}: {d.fieldName}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{d.message}</div>
                    </div>
                  ))}

                  {onlineAuditResult.discrepancies.some((d: any) => d.discrepancyType === 'PRICE_MISMATCH') && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>
                        Online seller appears to charge more than package MRP.
                      </span>
                      <Link
                        href={`/consumer/complaints/new?scanId=${scan.id}&title=${encodeURIComponent('Online seller overcharging above MRP for ' + productName)}`}
                        style={{
                          fontSize: 'var(--text-xs)',
                          padding: '4px 10px',
                          background: 'var(--color-error)',
                          color: 'white',
                          borderRadius: 4,
                          textDecoration: 'none',
                          fontWeight: 'bold',
                        }}
                      >
                        File Overcharging Complaint ↗
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', marginTop: 4 }}>
                  ✓ Online listing declarations and pricing are consistent with physical packaging.
                </div>
              )}

              {/* Informational Safeguard Disclaimer */}
              <div
                style={{
                  marginTop: 'var(--space-3)',
                  paddingTop: 'var(--space-2)',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.4,
                }}
              >
                <em>Informational Notice:</em> This cross-check provides consumer-advisory comparison based on public listing information.
                Online discrepancies indicate an evidentiary difference and do not constitute an official Legal Metrology violation unless formally investigated by an Authority Officer.
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Raw Verbatim OCR Drawer Accordion */}
      <Card>
        <div
          onClick={() => setShowRawOcr(!showRawOcr)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            padding: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ScanLine size={18} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-base)' }}>
              Complete Verbatim Raw OCR Transcription
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {showRawOcr ? 'Hide full OCR' : 'Show full OCR'}
            </span>
            {showRawOcr ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>

        {showRawOcr && (
          <div style={{ padding: '0 var(--space-4) var(--space-4) var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-2)' }}>
              <Button variant="ghost" size="sm" onClick={handleCopyOcr}>
                {copied ? <CheckCircle size={14} color="var(--color-success)" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy OCR Text'}
              </Button>
            </div>
            <pre
              style={{
                margin: 0,
                padding: 'var(--space-4)',
                background: 'var(--neutral-900)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                lineHeight: 1.6,
                maxHeight: 350,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {scan.rawOcrText || '(No raw OCR text available)'}
            </pre>
          </div>
        )}
      </Card>
    </div>
  )
}
