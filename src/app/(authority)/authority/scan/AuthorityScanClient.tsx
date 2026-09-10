'use client'

import React, { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  Image as ImageIcon,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ScanLine,
  Scale,
  ArrowRight,
  RotateCw,
  FilePlus,
  Link as LinkIcon,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Copy,
  Check,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  ComplianceBadge,
  IdentificationStatusBadge,
  InspectionStatusBadge,
  Badge,
} from '@/components/ui/Badge'
import { formatBytes, formatDateTime } from '@/lib/utils'

interface FilePreview {
  file: File
  preview: string
}

type ProcessingStep = 'idle' | 'uploading' | 'ocr' | 'analyzing' | 'evaluating' | 'complete' | 'error'

interface LinkedInspection {
  id: string
  title: string
  status: string
  officerName: string
  officerId: string
  productId: string | null
  productName: string | null
  createdAt: string
}

interface ActiveInspectionSummary {
  id: string
  title: string
  status: string
  productName: string | null
  updatedAt: string
}

interface AuthorityScanClientProps {
  initialInspection: LinkedInspection | null
  activeInspections: ActiveInspectionSummary[]
  userRole: string
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

export function AuthorityScanClient({
  initialInspection,
  activeInspections,
  userRole,
}: AuthorityScanClientProps) {
  const router = useRouter()
  const [files, setFiles] = useState<FilePreview[]>([])
  const [step, setStep] = useState<ProcessingStep>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [createdScanId, setCreatedScanId] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<any | null>(null)
  const [complianceSummary, setComplianceSummary] = useState<any | null>(null)
  const [selectedImage, setSelectedImage] = useState<any | null>(null)
  const [showRawOcr, setShowRawOcr] = useState(false)
  const [copiedOcr, setCopiedOcr] = useState(false)

  // Attach to existing inspection modal state (for standalone scan)
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>('')
  const [attaching, setAttaching] = useState(false)
  const [attachError, setAttachError] = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles = accepted.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setFiles((prev) => [...prev, ...newFiles])
    setErrorMessage('')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxFiles: 10,
    maxSize: 20 * 1024 * 1024, // 20MB
    disabled: step !== 'idle' && step !== 'error',
    onDropRejected: (rejected) => {
      const msg = rejected[0]?.errors[0]?.message ?? 'File rejected'
      setErrorMessage(msg)
    },
  })

  function removeFile(index: number) {
    if (step !== 'idle' && step !== 'error') return
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function processAuthorityScan(scanId: string) {
    setStep('ocr')
    setErrorMessage('')

    try {
      setStep('ocr')
      // Small simulated delay for visual feedback between stages
      await new Promise((r) => setTimeout(r, 400))
      setStep('analyzing')

      const processRes = await fetch(`/api/v1/authority/scans/${scanId}/process`, {
        method: 'POST',
      })

      const processData = await processRes.json()
      if (!processRes.ok) {
        throw new Error(processData.error ?? 'Failed to process commodity scan')
      }

      setStep('evaluating')
      await new Promise((r) => setTimeout(r, 300))

      const scanObj = processData.data?.scan
      setScanResult(scanObj)
      setComplianceSummary(processData.data?.compliance)
      if (scanObj?.images?.length > 0) {
        setSelectedImage(scanObj.images[0])
      }
      setStep('complete')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error processing commodity scan'
      setErrorMessage(msg)
      setStep('error')
    }
  }

  async function handleUploadAndScan() {
    if (files.length === 0) return
    setStep('uploading')
    setErrorMessage('')

    try {
      const formData = new FormData()
      files.forEach((f) => formData.append('images', f.file))
      if (initialInspection?.id) {
        formData.append('inspectionId', initialInspection.id)
      }

      const uploadRes = await fetch('/api/v1/authority/scans', {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) {
        throw new Error(uploadData.error ?? 'Commodity image upload failed')
      }

      const scanId = uploadData.data?.scanId
      if (!scanId) {
        throw new Error('Scan identifier not returned from server')
      }

      setCreatedScanId(scanId)
      await processAuthorityScan(scanId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setErrorMessage(msg)
      setStep('error')
    }
  }

  async function handleAttachToInspection() {
    if (!selectedInspectionId || !createdScanId) return
    setAttaching(true)
    setAttachError(null)

    try {
      const res = await fetch(`/api/v1/inspections/${selectedInspectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId: createdScanId,
          productId: scanResult?.productId ?? undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error ?? 'Failed to attach scan to inspection')
      }

      // Automatically run compliance analysis on newly linked inspection
      await fetch(`/api/v1/inspections/${selectedInspectionId}/analyze`, {
        method: 'POST',
      })

      router.push(`/authority/inspections/${selectedInspectionId}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to attach scan to inspection'
      setAttachError(msg)
    } finally {
      setAttaching(false)
    }
  }

  function handleCopyOcr() {
    if (!scanResult?.rawOcrText) return
    navigator.clipboard.writeText(scanResult.rawOcrText)
    setCopiedOcr(true)
    setTimeout(() => setCopiedOcr(false), 2000)
  }

  const productName =
    scanResult?.identifiedProductName || scanResult?.product?.name || 'Packaged Commodity'
  const brandName = scanResult?.identifiedBrand || scanResult?.product?.brand || '—'
  const confidencePercent = scanResult?.identificationConfidence
    ? Math.round(scanResult.identificationConfidence * 100)
    : null

  return (
    <div>
      <PageHeader
        title="Authority Product Scanner"
        description="On-site commodity photography, Legal Metrology declaration extraction, and deterministic statutory rule evaluation."
        breadcrumbs={[
          { label: 'Authority', href: '/authority/dashboard' },
          ...(initialInspection
            ? [{ label: `Inspection #${initialInspection.id.slice(-8).toUpperCase()}`, href: `/authority/inspections/${initialInspection.id}` }]
            : []),
          { label: 'Product Scanner' },
        ]}
        actions={
          initialInspection && (
            <Link
              href={`/authority/inspections/${initialInspection.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                textDecoration: 'none',
              }}
            >
              <Briefcase size={14} /> Return to Inspection File
            </Link>
          )
        }
      />

      {/* Target Active Inspection Context Banner */}
      {initialInspection && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--brand-950)',
            border: '1px solid var(--brand-700)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Briefcase size={18} style={{ color: 'var(--brand-400)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-300)', fontWeight: 'var(--font-medium)' }}>
                Target Statutory Inspection Linked
              </div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'white' }}>
                {initialInspection.title}{' '}
                <span style={{ fontSize: 'var(--text-xs)', opacity: 0.8 }}>
                  (#{initialInspection.id.slice(-8).toUpperCase()})
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <InspectionStatusBadge status={initialInspection.status as any} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Assigned: {initialInspection.officerName}
            </span>
          </div>
        </div>
      )}

      {/* Progress Screen / Stepper */}
      {(step === 'uploading' || step === 'ocr' || step === 'analyzing' || step === 'evaluating') && (
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', paddingTop: 'var(--space-8)' }}>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-8)',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 'var(--radius-full)',
                background: 'var(--brand-900)',
                border: '2px solid var(--brand-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-6)',
              }}
            >
              <Loader2 size={36} style={{ color: 'var(--brand-400)', animation: 'spin 1s linear infinite' }} />
            </div>

            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
              {step === 'uploading' && 'Transferring Packaging Images…'}
              {step === 'ocr' && 'Extracting Package Typography via OCR…'}
              {step === 'analyzing' && 'Parsing Mandatory Legal Declarations…'}
              {step === 'evaluating' && 'Executing Deterministic Rule Engine…'}
            </h2>

            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
              {step === 'uploading' && 'Securely transferring and storing high-resolution packaging photographs.'}
              {step === 'ocr' && 'Reading verbatim packaging labels, typography, and stamp markings.'}
              {step === 'analyzing' && 'Isolating mandatory declarations (MRP, Net Quantity, Dates, Manufacturer/Packer).'}
              {step === 'evaluating' && 'Executing statutory Legal Metrology rules against physical package evidence.'}
            </p>

            {/* Stepper indicators */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                textAlign: 'left',
                maxWidth: 420,
                margin: '0 auto var(--space-4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {step === 'uploading' ? (
                  <Loader2 size={18} style={{ color: 'var(--brand-400)', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                )}
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: step === 'uploading' ? 'bold' : 'normal' }}>
                  1. Secure High-Resolution Image Storage
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {step === 'uploading' ? (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--text-muted)' }} />
                ) : step === 'ocr' ? (
                  <Loader2 size={18} style={{ color: 'var(--brand-400)', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                )}
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: step === 'ocr' ? 'bold' : 'normal' }}>
                  2. Verbatim OCR Typography Extraction
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {step === 'uploading' || step === 'ocr' ? (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--text-muted)' }} />
                ) : step === 'analyzing' ? (
                  <Loader2 size={18} style={{ color: 'var(--brand-400)', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                )}
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: step === 'analyzing' ? 'bold' : 'normal' }}>
                  3. 14 Mandatory Declarations &amp; Commodity Identification
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {step === 'evaluating' ? (
                  <Loader2 size={18} style={{ color: 'var(--brand-400)', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--text-muted)' }} />
                )}
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: step === 'evaluating' ? 'bold' : 'normal' }}>
                  4. Deterministic Legal Metrology Compliance Engine
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Zone (Visible in idle or error step) */}
      {(step === 'idle' || step === 'error') && (
        <div>
          {/* Statutory Authority Notice */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              padding: 'var(--space-4)',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid var(--brand-700)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--space-6)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
            }}
          >
            <ShieldCheck size={20} style={{ flexShrink: 0, marginTop: 2, color: 'var(--brand-400)' }} />
            <div>
              <strong>Official Legal Metrology Commodity Scanner:</strong> Capture clear photographs of the package
              (Front, Back, Net Weight mark, MRP stamp, Date stamp, Customer Care panel, and Manufacturer details).
              Declarations will be extracted and automatically analyzed against statutory Legal Metrology rules.
            </div>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            style={{
              border: `2px dashed ${isDragActive ? 'var(--border-focus)' : 'var(--border-strong)'}`,
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-10) var(--space-6)',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragActive ? 'rgba(59,130,246,0.06)' : 'var(--bg-elevated)',
              transition: 'all var(--transition-fast)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <input {...getInputProps()} />
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 'var(--radius-xl)',
                background: 'var(--brand-900)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)',
              }}
            >
              <Upload size={26} style={{ color: 'var(--brand-400)' }} />
            </div>
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
              {isDragActive ? 'Drop package photographs here…' : 'Drop commodity photographs or click to browse'}
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
              JPG, PNG, WebP, HEIC · Max 20MB per photo · Up to 10 photos
            </p>
          </div>

          {/* Error notice */}
          {errorMessage && (
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'var(--color-error-bg)',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--space-6)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                color: 'var(--color-error-dark)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Selected File Previews */}
          {files.length > 0 && (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
                  Selected Package Photographs ({files.length})
                </h3>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Total size: {formatBytes(files.reduce((acc, f) => acc + f.file.size, 0))}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-4)' }}>
                {files.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'relative',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-default)',
                      aspectRatio: '1',
                      background: 'var(--bg-elevated)',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.preview}
                      alt={f.file.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(i)
                      }}
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 24,
                        height: 24,
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(15,23,42,0.8)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-label="Remove image"
                    >
                      <X size={12} />
                    </button>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '4px 6px',
                        background: 'rgba(15,23,42,0.8)',
                        fontSize: 10,
                        color: 'var(--text-muted)',
                      }}
                    >
                      {formatBytes(f.file.size)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Trigger Buttons */}
          {files.length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <Button
                variant="primary"
                size="lg"
                onClick={handleUploadAndScan}
                id="authority-upload-scan-btn"
              >
                <ScanLine size={18} />
                Scan &amp; Evaluate Declarations ({files.length} Photo{files.length !== 1 ? 's' : ''})
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  files.forEach((f) => URL.revokeObjectURL(f.preview))
                  setFiles([])
                }}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Completed Results View */}
      {step === 'complete' && scanResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Top Post-Scan Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
              padding: 'var(--space-4)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <CheckCircle2 size={22} style={{ color: 'var(--color-success)' }} />
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                  Extraction &amp; Statutory Analysis Complete
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Scan Session ID: {scanResult.id} · {scanResult.extractedDeclarations?.length || 0} declarations identified
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {initialInspection ? (
                <Link
                  href={`/authority/inspections/${initialInspection.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <Button variant="primary" id="return-inspection-btn">
                    <Briefcase size={16} /> Proceed to Inspection Dossier
                  </Button>
                </Link>
              ) : (
                <>
                  <Link
                    href={`/authority/inspections/new?scanId=${scanResult.id}&title=${encodeURIComponent('Inspection of ' + productName)}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Button variant="primary" id="create-inspection-from-scan-btn">
                      <FilePlus size={16} /> Create Formal Inspection File
                    </Button>
                  </Link>

                  {activeInspections.length > 0 && (
                    <Button
                      variant="secondary"
                      onClick={() => setShowAttachModal(true)}
                      id="attach-inspection-btn"
                    >
                      <LinkIcon size={16} /> Attach to Active Inspection
                    </Button>
                  )}
                </>
              )}

              <Button
                variant="ghost"
                onClick={() => {
                  setFiles([])
                  setStep('idle')
                  setScanResult(null)
                  setComplianceSummary(null)
                }}
              >
                <RotateCw size={14} /> Scan Another Product
              </Button>
            </div>
          </div>

          {/* Commodity Identity & Overview */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 'var(--space-6)',
            }}
          >
            <Card>
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={18} style={{ color: 'var(--brand-400)' }} />
                  Commodity &amp; Packaging Identity
                </CardTitle>
                <IdentificationStatusBadge status={scanResult.identificationStatus || 'PENDING'} />
              </CardHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Identified Commodity Name</div>
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
                      {scanResult.identifiedCategory || 'Packaged Commodity'}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Declared Manufacturer / Packer</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {scanResult.identifiedManufacturer || 'Not explicitly stated'}
                  </div>
                </div>

                {confidencePercent !== null && (
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-muted)' }}>AI Identification Quality</span>
                      <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--brand-400)' }}>
                        {confidencePercent}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
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
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 4 }}>
                      *Reflects OCR/AI extraction quality, NOT statutory legal compliance.
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Statutory Compliance Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Scale size={18} style={{ color: 'var(--color-warning)' }} />
                  Deterministic Rule Engine Summary
                </CardTitle>
                <Badge variant={complianceSummary?.failedCount > 0 ? 'error' : 'success'}>
                  {complianceSummary?.failedCount > 0 ? 'Non-Compliance Detected' : 'Compliant / Advisory'}
                </Badge>
              </CardHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)', textAlign: 'center' }}>
                  <div style={{ padding: '8px 4px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Rules</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold' }}>
                      {complianceSummary?.totalRulesEvaluated ?? 0}
                    </div>
                  </div>
                  <div style={{ padding: '8px 4px', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)' }}>Passed</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-success)' }}>
                      {complianceSummary?.passedCount ?? 0}
                    </div>
                  </div>
                  <div style={{ padding: '8px 4px', background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>Warnings</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-warning)' }}>
                      {complianceSummary?.warningCount ?? 0}
                    </div>
                  </div>
                  <div style={{ padding: '8px 4px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>Failures</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--color-error)' }}>
                      {complianceSummary?.failedCount ?? 0}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                    background: 'var(--bg-base)',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <strong>Statutory Safeguard:</strong> Compliance is determined exclusively by the deterministic
                  rule engine. Status <code>WARNING</code> is advisory and <em>never</em> produces formal violation records.
                  Status <code>FAIL</code> creates formal statutory violations.
                </div>
              </div>
            </Card>
          </div>

          {/* Attached Package Images Gallery */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ImageIcon size={18} style={{ color: 'var(--brand-400)' }} />
                Packaging Photographs ({scanResult.images?.length || 0})
              </CardTitle>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Select an image to inspect per-side OCR extraction
              </span>
            </CardHeader>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              {scanResult.images?.map((img: any, idx: number) => {
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
                  {selectedImage.ocrText || '(No OCR text extracted for this packaging side)'}
                </pre>
              </div>
            )}
          </Card>

          {/* Extracted Mandatory Declarations Table */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} style={{ color: 'var(--brand-400)' }} />
                Extracted Mandatory Declarations ({scanResult.extractedDeclarations?.length || 0})
              </CardTitle>
              <Badge variant="info">Phase 2 AI Extraction</Badge>
            </CardHeader>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-semibold)' }}>
                      Mandatory Statutory Field
                    </th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-semibold)' }}>
                      Extracted Value
                    </th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-semibold)' }}>
                      Packaging Snippet / Quote
                    </th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-semibold)', textAlign: 'center' }}>
                      Extraction Quality
                    </th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-semibold)', textAlign: 'right' }}>
                      Detection Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scanResult.extractedDeclarations?.map((d: any) => {
                    const conf = d.confidence ? Math.round(d.confidence * 100) : null
                    const label = FIELD_LABELS[d.fieldName] || d.fieldName
                    return (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
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
                              Not detected on packaging
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
                                fontWeight: 'bold',
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
          </Card>

          {/* Deterministic Rule Engine Detailed Matrix */}
          {complianceSummary?.results?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Scale size={18} style={{ color: 'var(--brand-400)' }} />
                  Legal Metrology Statutory Evaluation Matrix ({complianceSummary.results.length} Rules)
                </CardTitle>
                <Badge variant="muted">Deterministic Compliance Engine</Badge>
              </CardHeader>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: '0 var(--space-4) var(--space-4) var(--space-4)' }}>
                {complianceSummary.results.map((r: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 'var(--text-xs)', color: 'var(--brand-300)' }}>
                          {r.ruleNumber}
                        </span>
                        <span style={{ fontSize: 'var(--text-xs)', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 4, color: 'var(--text-muted)' }}>
                          v{r.versionNumber ?? 1}
                        </span>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                          {r.title}
                        </span>
                      </div>
                      <ComplianceBadge status={r.status} />
                    </div>

                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {r.summary}
                    </div>

                    {r.remediationGuidance && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                        Guidance: {r.remediationGuidance}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Complete Raw OCR Transcription Accordion */}
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
                    {copiedOcr ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                    {copiedOcr ? 'Copied!' : 'Copy OCR Text'}
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
                    maxHeight: 320,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {scanResult.rawOcrText || '(No raw OCR text available)'}
                </pre>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal: Attach Scan to Active Inspection */}
      {showAttachModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: 520,
              width: '100%',
              padding: 'var(--space-6)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <LinkIcon size={18} style={{ color: 'var(--brand-400)' }} /> Attach Scan to Inspection
              </h3>
              <button
                onClick={() => setShowAttachModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Select an ongoing inspection file to attach this packaging scan. All packaging photographs, OCR extractions,
              and compliance checks will become formal evidence in that inspection.
            </p>

            {attachError && (
              <div
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--color-error-bg)',
                  border: '1px solid var(--color-error)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-error-dark)',
                  fontSize: 'var(--text-xs)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                {attachError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: 260, overflowY: 'auto', marginBottom: 'var(--space-4)' }}>
              {activeInspections.map((ins) => {
                const isSelected = selectedInspectionId === ins.id
                return (
                  <div
                    key={ins.id}
                    onClick={() => setSelectedInspectionId(ins.id)}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--brand-500)' : '1px solid var(--border-default)',
                      background: isSelected ? 'rgba(59,130,246,0.08)' : 'var(--bg-elevated)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                        {ins.title}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                        Ref: #{ins.id.slice(-8).toUpperCase()} · Product: {ins.productName || 'Unlinked'}
                      </div>
                    </div>
                    <InspectionStatusBadge status={ins.status as any} />
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button variant="ghost" onClick={() => setShowAttachModal(false)} disabled={attaching}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAttachToInspection}
                disabled={!selectedInspectionId || attaching}
                loading={attaching}
              >
                Attach &amp; Open Inspection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
