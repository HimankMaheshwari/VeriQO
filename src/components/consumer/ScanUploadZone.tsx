'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatBytes } from '@/lib/utils'

interface FilePreview {
  file: File
  preview: string
}

interface ScanUploadZoneProps {
  onUploadSuccess?: (scanId: string) => void
}

export function ScanUploadZone({ onUploadSuccess }: ScanUploadZoneProps) {
  const [files, setFiles] = useState<FilePreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles = accepted.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setFiles((prev) => [...prev, ...newFiles])
    setUploadError('')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxFiles: 10,
    maxSize: 20 * 1024 * 1024,
    onDropRejected: (rejected) => {
      const msg = rejected[0]?.errors[0]?.message ?? 'File rejected'
      setUploadError(msg)
    },
  })

  function removeFile(index: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit() {
    if (files.length === 0) return
    setUploading(true)
    setUploadError('')
    try {
      const formData = new FormData()
      files.forEach((f) => formData.append('images', f.file))
      const res = await fetch('/api/v1/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const d = await res.json()
        setUploadError(d.error ?? 'Upload failed')
        return
      }
      const data = await res.json()
      files.forEach((f) => URL.revokeObjectURL(f.preview))
      setFiles([])
      if (onUploadSuccess && data.data?.scanId) {
        onUploadSuccess(data.data.scanId)
      }
    } catch {
      setUploadError('Network error during upload. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
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

      {uploadError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-error-bg)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-error-dark)',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          {uploadError}
        </div>
      )}

      {files.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-3)' }}>
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
                <img src={f.preview} alt={f.file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(i)
                  }}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 22,
                    height: 22,
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(15,23,42,0.8)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={12} />
                </button>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '2px 4px',
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
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="primary" onClick={handleSubmit} loading={uploading}>
              Upload {files.length} Image{files.length !== 1 ? 's' : ''}
            </Button>
            <Button variant="ghost" onClick={() => setFiles([])}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
