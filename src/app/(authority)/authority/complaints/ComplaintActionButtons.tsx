'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, Loader2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface ComplaintActionButtonsProps {
  complaintId: string
  caseId?: string | null
  caseNumber?: string | null
}

export function ComplaintActionButtons({
  complaintId,
  caseId,
  caseNumber,
}: ComplaintActionButtonsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (caseId) {
    return (
      <Link
        href={`/authority/cases/${caseId}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '6px 12px',
          background: 'var(--brand-600)',
          color: 'white',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-medium)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
        id={`view-case-${complaintId}`}
      >
        <Briefcase size={13} />
        <span>View Case {caseNumber ? `(#${caseNumber})` : ''}</span>
        <ArrowRight size={12} />
      </Link>
    )
  }

  const handleOpenCase = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/complaints/${complaintId}/case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to initiate regulatory case')
      }

      toast.success('Regulatory case opened')
      router.push(`/authority/cases/${data.data.id}`)
    } catch (err: any) {
      toast.error(err.message ?? 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleOpenCase}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 12px',
        background: 'var(--brand-600)',
        color: 'white',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-medium)',
        cursor: loading ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        opacity: loading ? 0.7 : 1,
      }}
      id={`initiate-case-${complaintId}`}
    >
      {loading ? (
        <>
          <Loader2 size={13} className="animate-spin" />
          <span>Opening Case…</span>
        </>
      ) : (
        <>
          <Briefcase size={13} />
          <span>Initiate Regulatory Case</span>
        </>
      )}
    </button>
  )
}
