import type {
  CaseStatus,
  CasePriority,
  Role,
  RegulatoryCase,
  Inspection,
  Complaint,
  ProductScan,
  User,
} from '@prisma/client'

export type { CaseStatus, CasePriority }

export interface CreateCaseInput {
  title: string
  description?: string | null
  priority?: CasePriority
  complaintId?: string | null
  productScanId?: string | null
  assignedOfficerId?: string | null
}

export interface UpdateCaseInput {
  title?: string
  description?: string | null
  priority?: CasePriority
}

export interface AssignOfficerInput {
  officerId: string
  reason?: string | null
}

export interface RejectCaseInput {
  reason: string
}

export interface ResolveCaseInput {
  resolutionNotes: string
}

export interface CloseCaseInput {
  remarks?: string | null
}

export interface CreateInspectionFromCaseInput {
  title?: string | null
  notes?: string | null
}

export interface CaseFilters {
  status?: CaseStatus
  priority?: CasePriority
  assignedOfficerId?: string
  search?: string
  hasInspection?: boolean
  hasViolations?: boolean
  unassigned?: boolean
}

export interface CaseTimelineItem {
  id: string
  timestamp: Date
  action: string
  actorName: string
  actorRole?: string
  title: string
  description?: string | null
  badgeText?: string
  badgeVariant?: 'success' | 'error' | 'warning' | 'info' | 'neutral'
  metadata?: Record<string, any>
  linkHref?: string
}

export const PERMISSIBLE_CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['ASSIGNED', 'REJECTED'],
  ASSIGNED: ['INVESTIGATION', 'UNDER_REVIEW'],
  INVESTIGATION: ['DECISION_PENDING', 'ASSIGNED'],
  DECISION_PENDING: ['RESOLVED', 'INVESTIGATION'],
  RESOLVED: ['CLOSED', 'INVESTIGATION'],
  CLOSED: ['INVESTIGATION', 'UNDER_REVIEW'],
  REJECTED: ['UNDER_REVIEW'],
}

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ASSIGNED: 'Assigned',
  INVESTIGATION: 'Under Investigation',
  DECISION_PENDING: 'Decision Pending',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
}

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

export function canUserAccessCase(
  userRole: Role,
  userId: string,
  assignedOfficerId: string | null | undefined
): boolean {
  if (userRole === 'SENIOR_AUTHORITY' || userRole === 'ADMIN') {
    return true
  }
  if (userRole === 'AUTHORITY_OFFICER') {
    return !assignedOfficerId || assignedOfficerId === userId
  }
  return false
}

export function canUserAssignCase(userRole: Role): boolean {
  return userRole === 'SENIOR_AUTHORITY' || userRole === 'ADMIN'
}

export function canUserRejectCase(
  userRole: Role,
  userId: string,
  assignedOfficerId: string | null | undefined
): boolean {
  if (userRole === 'SENIOR_AUTHORITY' || userRole === 'ADMIN') {
    return true
  }
  if (userRole === 'AUTHORITY_OFFICER') {
    return !assignedOfficerId || assignedOfficerId === userId
  }
  return false
}

export function canUserResolveCase(
  userRole: Role,
  userId: string,
  assignedOfficerId: string | null | undefined
): boolean {
  if (userRole === 'SENIOR_AUTHORITY' || userRole === 'ADMIN') {
    return true
  }
  return userRole === 'AUTHORITY_OFFICER' && assignedOfficerId === userId
}

export function canUserCloseCase(userRole: Role): boolean {
  return userRole === 'SENIOR_AUTHORITY' || userRole === 'ADMIN'
}

export function canUserReopenCase(userRole: Role): boolean {
  return userRole === 'SENIOR_AUTHORITY' || userRole === 'ADMIN'
}

export class CaseAccessError extends Error {
  constructor(message: string = 'Access denied to regulatory case') {
    super(message)
    this.name = 'CaseAccessError'
  }
}

export class CaseStateTransitionError extends Error {
  constructor(from: CaseStatus, to: CaseStatus) {
    super(`Invalid regulatory case state transition from ${from} to ${to}`)
    this.name = 'CaseStateTransitionError'
  }
}

export class CasePrerequisiteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CasePrerequisiteError'
  }
}
