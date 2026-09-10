import React from 'react'
import { cx } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted'

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)' },
  success: { background: 'var(--color-success-bg)', color: 'var(--color-success-dark)', border: '1px solid var(--color-success)' },
  warning: { background: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)', border: '1px solid var(--color-warning)' },
  error:   { background: 'var(--color-error-bg)',   color: 'var(--color-error-dark)',   border: '1px solid var(--color-error)' },
  info:    { background: 'var(--color-info-bg)',    color: 'var(--color-info-dark)',    border: '1px solid var(--color-info)' },
  muted:   { background: 'var(--neutral-800)',      color: 'var(--text-muted)',         border: '1px solid var(--border-default)' },
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  dot?: boolean
}

const badgeBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '2px 10px',
  borderRadius: 'var(--radius-full)',
  fontSize: 'var(--text-xs)',
  fontWeight: 'var(--font-semibold)',
  letterSpacing: '0.025em',
  whiteSpace: 'nowrap',
}

export function Badge({ children, variant = 'default', className, dot }: BadgeProps) {
  return (
    <span
      className={cx(className)}
      style={{ ...badgeBase, ...variantStyles[variant] }}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'currentColor',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  )
}

// Convenience wrappers for compliance status
export function ComplianceBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    PASS: 'success',
    WARNING: 'warning',
    FAIL: 'error',
    NOT_APPLICABLE: 'muted',
    REQUIRES_REVIEW: 'info',
  }
  const labels: Record<string, string> = {
    PASS: 'Pass',
    WARNING: 'Warning',
    FAIL: 'Fail',
    NOT_APPLICABLE: 'N/A',
    REQUIRES_REVIEW: 'Review',
  }
  return <Badge variant={map[status] ?? 'default'} dot>{labels[status] ?? status}</Badge>
}

export function InspectionStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    DRAFT: 'muted',
    IN_PROGRESS: 'info',
    PENDING_REVIEW: 'warning',
    CLOSED: 'success',
  }
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    IN_PROGRESS: 'In Progress',
    PENDING_REVIEW: 'Pending Review',
    CLOSED: 'Closed',
  }
  return <Badge variant={map[status] ?? 'default'} dot>{labels[status] ?? status}</Badge>
}

export function ComplaintStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    SUBMITTED: 'info',
    UNDER_REVIEW: 'info',
    ASSIGNED: 'warning',
    INVESTIGATING: 'warning',
    RESOLVED: 'success',
    CLOSED: 'muted',
  }
  const labels: Record<string, string> = {
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under Review',
    ASSIGNED: 'Assigned',
    INVESTIGATING: 'Investigating',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
  }
  return <Badge variant={map[status] ?? 'default'} dot>{labels[status] ?? status}</Badge>
}

export function CaseStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    SUBMITTED: 'info',
    UNDER_REVIEW: 'info',
    ASSIGNED: 'warning',
    INVESTIGATION: 'warning',
    DECISION_PENDING: 'warning',
    RESOLVED: 'success',
    CLOSED: 'muted',
    REJECTED: 'error',
  }
  const labels: Record<string, string> = {
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under Review',
    ASSIGNED: 'Assigned',
    INVESTIGATION: 'Under Investigation',
    DECISION_PENDING: 'Decision Pending',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
    REJECTED: 'Rejected',
  }
  return <Badge variant={map[status] ?? 'default'} dot>{labels[status] ?? status}</Badge>
}

export function ConsumerSafeStatusBadge({
  status,
  caseStatus,
  complaintStatus,
}: {
  status?: string
  caseStatus?: string | null
  complaintStatus?: string | null
}) {
  const map: Record<string, BadgeVariant> = {
    SUBMITTED: 'info',
    UNDER_REVIEW: 'info',
    ASSIGNED: 'warning',
    INVESTIGATION: 'warning',
    DECISION_PENDING: 'warning',
    RESOLVED: 'success',
    CLOSED: 'muted',
    REJECTED: 'error',
  }
  const labels: Record<string, string> = {
    SUBMITTED: 'Complaint Submitted',
    UNDER_REVIEW: 'Under Review',
    ASSIGNED: 'Assigned for Investigation',
    INVESTIGATION: 'Investigation in Progress',
    DECISION_PENDING: 'Decision Pending',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
    REJECTED: 'Closed — Not Accepted',
  }

  const key = status || caseStatus || complaintStatus || 'SUBMITTED'
  const normalizedKey = key === 'INVESTIGATING' ? 'INVESTIGATION' : key
  const variant = map[normalizedKey] ?? 'default'
  const label = labels[normalizedKey] ?? normalizedKey

  return <Badge variant={variant} dot>{label}</Badge>
}

export function CasePriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, BadgeVariant> = {
    LOW: 'muted',
    MEDIUM: 'info',
    HIGH: 'warning',
    CRITICAL: 'error',
  }
  const labels: Record<string, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical',
  }
  return <Badge variant={map[priority] ?? 'default'}>{labels[priority] ?? priority}</Badge>
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, BadgeVariant> = {
    CONSUMER: 'default',
    AUTHORITY_OFFICER: 'info',
    SENIOR_AUTHORITY: 'warning',
    ADMIN: 'error',
  }
  const labels: Record<string, string> = {
    CONSUMER: 'Consumer',
    AUTHORITY_OFFICER: 'Officer',
    SENIOR_AUTHORITY: 'Sr. Authority',
    ADMIN: 'Admin',
  }
  return <Badge variant={map[role] ?? 'default'}>{labels[role] ?? role}</Badge>
}

export function ScanStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    PENDING: 'warning',
    PROCESSING: 'info',
    COMPLETED: 'success',
    COMPLETE: 'success',
    FAILED: 'error',
  }
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    COMPLETED: 'Completed',
    COMPLETE: 'Completed',
    FAILED: 'Failed',
  }
  return <Badge variant={map[status] ?? 'default'} dot>{labels[status] ?? status}</Badge>
}

export function IdentificationStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    IDENTIFIED: 'success',
    UNCERTAIN: 'warning',
    FAILED: 'error',
    PENDING: 'muted',
    PROCESSING: 'info',
  }
  const labels: Record<string, string> = {
    IDENTIFIED: 'Identified',
    UNCERTAIN: 'Uncertain',
    FAILED: 'Failed',
    PENDING: 'Pending',
    PROCESSING: 'Analyzing',
  }
  return <Badge variant={map[status] ?? 'default'} dot>{labels[status] ?? status}</Badge>
}

export function AuthorityDecisionBadge({ decision }: { decision: string }) {
  const map: Record<string, BadgeVariant> = {
    COMPLIANT: 'success',
    NON_COMPLIANT: 'error',
    FURTHER_INVESTIGATION: 'warning',
    DISMISSED: 'muted',
  }
  const labels: Record<string, string> = {
    COMPLIANT: 'Compliant',
    NON_COMPLIANT: 'Non-Compliant',
    FURTHER_INVESTIGATION: 'Further Investigation',
    DISMISSED: 'Dismissed',
  }
  return <Badge variant={map[decision] ?? 'default'} dot>{labels[decision] ?? decision}</Badge>
}

export function ViolationSeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, BadgeVariant> = {
    LOW: 'info',
    MEDIUM: 'warning',
    HIGH: 'error',
    CRITICAL: 'error',
  }
  return <Badge variant={map[severity] ?? 'default'}>{severity}</Badge>
}
