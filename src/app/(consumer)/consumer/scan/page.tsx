'use client'

import React, { useCallback, useState } from 'react'
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
  Sparkles,
  ArrowRight,
  RotateCw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatBytes } from '@/lib/utils'

interface FilePreview {
  file: File
  preview: string
}

type ProcessingStep = 'idle' | 'uploading' | 'ocr' | 'analyzing' | 'complete' | 'error'

export default function ScanPage() {
  const router = useRouter()
  const [files, setFiles] = useState<FilePreview[]>([])
  const [step, setStep] = useState<ProcessingStep>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [createdScanId, setCreatedScanId] = useState<string | null>(null)
  const [identifiedName, setIdentifiedName] = useState<string | null>(null)

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

  async function processExistingScan(scanId: string) {
    setStep('ocr')
    setErrorMessage('')

    try {
      // Step 2 & 3: Trigger OCR & AI extraction
      setStep('ocr')
      const processRes = await fetch(`/api/v1/scans/${scanId}/process`, {
        method: 'POST',
      })

      const processData = await processRes.json()
      if (!processRes.ok) {
        throw new Error(processData.error ?? 'Failed to process scan')
      }

      const scanResult = processData.data?.scan
      setIdentifiedName(scanResult?.identifiedProductName ?? null)
      setStep('complete')

      // Short delay so user sees completion before navigating
      setTimeout(() => {
        router.push(`/consumer/scans/${scanId}`)
      }, 1200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error processing scan'
      setErrorMessage(msg)
      setStep('error')
    }
  }

  async function handleSubmit() {
    if (files.length === 0) return
    setStep('uploading')
    setErrorMessage('')

    try {
      // 1. Upload files
      const formData = new FormData()
      files.forEach((f) => formData.append('images', f.file))

      const uploadRes = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) {
        throw new Error(uploadData.error ?? 'Upload failed')
      }

      const scanId = uploadData.data?.scanId
      if (!scanId) {
        throw new Error('Scan ID not returned from server')
      }

      setCreatedScanId(scanId)

      // 2. Automatically trigger OCR and AI analysis
      await processExistingScan(scanId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setErrorMessage(msg)
      setStep('error')
    }
  }

  // Live processing modal / screen
  if (step === 'uploading' || step === 'ocr' || step === 'analyzing' || step === 'complete') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', paddingTop: 'var(--space-12)' }}>
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
              background:
                step === 'complete' ? 'rgba(16,185,129,0.1)' : 'var(--brand-900)',
              border: `2px solid ${
                step === 'complete' ? 'var(--color-success)' : 'var(--brand-500)'
              }`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-6)',
              animation: step !== 'complete' ? 'pulse 2s infinite' : 'none',
            }}
          >
            {step === 'complete' ? (
              <CheckCircle2 size={36} style={{ color: 'var(--color-success)' }} />
            ) : (
              <Loader2 size={36} style={{ color: 'var(--brand-400)', animation: 'spin 1s linear infinite' }} />
            )}
          </div>

          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
            {step === 'uploading' && 'Uploading Package Images…'}
            {step === 'ocr' && 'Extracting Package Text via OCR…'}
            {step === 'analyzing' && 'Analyzing Packaging Declarations…'}
            {step === 'complete' && 'Product Analysis Complete!'}
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-8)' }}>
            {step === 'uploading' && 'Securely transferring and storing high-resolution commodity images.'}
            {step === 'ocr' && 'Reading packaging typography, MRP marks, date stamps, and labels.'}
            {step === 'analyzing' && 'Identifying product, brand, manufacturer, net quantity, and mandatory declarations.'}
            {step === 'complete' && (
              <span>
                Identified: <strong>{identifiedName || 'Packaged Commodity'}</strong>. Redirecting to report…
              </span>
            )}
          </p>

          {/* Stepper indicators */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              textAlign: 'left',
              maxWidth: 420,
              margin: '0 auto var(--space-6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                Images Uploaded &amp; Stored
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
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: step === 'ocr' ? 'var(--font-bold)' : 'var(--font-normal)',
                  color: step === 'uploading' ? 'var(--text-muted)' : 'var(--text-primary)',
                }}
              >
                Raw OCR Text Extraction
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {step === 'complete' ? (
                <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
              ) : step === 'ocr' ? (
                <Loader2 size={18} style={{ color: 'var(--brand-400)', animation: 'spin 1s linear infinite' }} />
              ) : (
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--text-muted)' }} />
              )}
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: step === 'ocr' ? 'var(--font-bold)' : 'var(--font-normal)',
                  color: step === 'complete' || step === 'ocr' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                Product Identification &amp; Mandatory Declarations
              </span>
            </div>
          </div>

          {createdScanId && (
            <Button
              variant="primary"
              onClick={() => router.push(`/consumer/scans/${createdScanId}`)}
              style={{ marginTop: 'var(--space-2)' }}
            >
              View Results Now <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
          Scan a Packaged Product
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Upload clear photographs of all sides of the packaged commodity (front, back, nutrition/declaration panel, batch &amp; MRP stamp).
        </p>
      </div>

      {/* AI Extraction Banner */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          background: 'var(--brand-950)',
          border: '1px solid var(--brand-700)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-6)',
          fontSize: 'var(--text-sm)',
          color: 'var(--brand-200)',
        }}
      >
        <Sparkles size={20} style={{ flexShrink: 0, marginTop: 2, color: 'var(--brand-400)' }} />
        <div>
          <strong>AI-Assisted Extraction:</strong> OCR and vision analysis will automatically parse packaging text,
          isolate mandatory declarations (MRP, Net Quantity, Dates, Manufacturer/Packer), and identify the product.
        </div>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? 'var(--border-focus)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-12) var(--space-8)',
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
          {isDragActive ? 'Drop images here…' : 'Drop product images or click to browse'}
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
          JPG, PNG, WebP, HEIC · Max 20MB per image · Up to 10 images
        </p>
      </div>

      {/* Error state & retry */}
      {step === 'error' && errorMessage && (
        <div
          style={{
            padding: 'var(--space-4)',
            background: 'var(--color-error-bg)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-error-dark)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-3)' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>Processing Issue: {errorMessage}</span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {createdScanId && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => processExistingScan(createdScanId)}
              >
                <RotateCw size={14} /> Retry Processing
              </Button>
            )}
            {createdScanId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/consumer/scans/${createdScanId}`)}
              >
                View Scan Details Anyway
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStep('idle'); setErrorMessage('') }}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Previews */}
      {files.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
            Selected Packaging Images ({files.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-4)' }}>
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
                  onClick={() => removeFile(i)}
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

      {/* Scan & Analyze button */}
      {files.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={files.length === 0}
            id="scan-analyze-btn"
          >
            <ScanLine size={18} />
            Scan &amp; Extract Declarations ({files.length} Image{files.length !== 1 ? 's' : ''})
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
  )
}
