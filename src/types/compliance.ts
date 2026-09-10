export type ComplianceStatus =
  | 'PASS'
  | 'WARNING'
  | 'FAIL'
  | 'NOT_APPLICABLE'
  | 'REQUIRES_REVIEW'

export type ViolationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type AuthorityDecision =
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'FURTHER_INVESTIGATION'
  | 'DISMISSED'

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  PASS: 'Pass',
  WARNING: 'Warning',
  FAIL: 'Fail',
  NOT_APPLICABLE: 'Not Applicable',
  REQUIRES_REVIEW: 'Requires Review',
}

export const COMPLIANCE_STATUS_COLORS: Record<ComplianceStatus, string> = {
  PASS: 'var(--color-success)',
  WARNING: 'var(--color-warning)',
  FAIL: 'var(--color-error)',
  NOT_APPLICABLE: 'var(--color-muted)',
  REQUIRES_REVIEW: 'var(--color-info)',
}

export const SEVERITY_LABELS: Record<ViolationSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}
