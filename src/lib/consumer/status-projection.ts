/**
 * VeriQO — Phase 5D: Consumer Status Projection Layer
 *
 * Centralized, deterministic mapping of internal case/complaint lifecycle
 * to a privacy-safe consumer projection.
 *
 * Architectural Invariants:
 * 1. RegulatoryCase is the authoritative lifecycle source:
 *    If linked, consumer status is derived exclusively from RegulatoryCase.status.
 * 2. Neutrality: Outcomes are strictly neutral and grounded in official terminal decisions.
 * 3. Privacy: Zero internal notes, risk scores, or officer identities are exposed.
 */

import type { CaseStatus, ComplaintStatus, AuthorityDecision } from '@prisma/client'

export type ConsumerSafeStatusKey =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'INVESTIGATION'
  | 'DECISION_PENDING'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED'

export interface ConsumerSafeStatus {
  key: ConsumerSafeStatusKey
  label: string
  description: string
  stageIndex: number
  badgeVariant: 'neutral' | 'info' | 'warning' | 'success' | 'muted' | 'error'
  isTerminal: boolean
}

export interface ConsumerTimelineStep {
  key: ConsumerSafeStatusKey
  label: string
  description: string
  status: 'completed' | 'active' | 'pending'
  timestamp: string | null
  hasDocuments?: boolean
  documentCount?: number
}

export interface ConsumerSafeOutcome {
  statusKey: 'RESOLVED' | 'CLOSED' | 'REJECTED'
  title: string
  message: string
  inspectionSummary?: string | null
  concludedAt: string | null
  documentsAvailable?: boolean
}

/**
 * Authoritative mapping from internal CaseStatus to ConsumerSafeStatus.
 */
const CASE_STATUS_PROJECTION: Record<CaseStatus, ConsumerSafeStatus> = {
  SUBMITTED: {
    key: 'SUBMITTED',
    label: 'Complaint Submitted',
    description: 'Your complaint has been received and registered in the system.',
    stageIndex: 0,
    badgeVariant: 'info',
    isTerminal: false,
  },
  UNDER_REVIEW: {
    key: 'UNDER_REVIEW',
    label: 'Under Review',
    description: 'Your complaint is undergoing initial regulatory review.',
    stageIndex: 1,
    badgeVariant: 'info',
    isTerminal: false,
  },
  ASSIGNED: {
    key: 'ASSIGNED',
    label: 'Assigned for Investigation',
    description: 'An authority inspector has been assigned to investigate the matter.',
    stageIndex: 2,
    badgeVariant: 'warning',
    isTerminal: false,
  },
  INVESTIGATION: {
    key: 'INVESTIGATION',
    label: 'Investigation in Progress',
    description: 'An active regulatory inspection and statutory compliance examination is in progress.',
    stageIndex: 3,
    badgeVariant: 'warning',
    isTerminal: false,
  },
  DECISION_PENDING: {
    key: 'DECISION_PENDING',
    label: 'Decision Pending',
    description: 'The inspection findings are being evaluated for a formal determination.',
    stageIndex: 4,
    badgeVariant: 'warning',
    isTerminal: false,
  },
  RESOLVED: {
    key: 'RESOLVED',
    label: 'Resolved',
    description: 'Your complaint has been reviewed and the associated regulatory process has been completed.',
    stageIndex: 5,
    badgeVariant: 'success',
    isTerminal: true,
  },
  CLOSED: {
    key: 'CLOSED',
    label: 'Closed',
    description: 'The regulatory case associated with this complaint has been formally closed.',
    stageIndex: 5,
    badgeVariant: 'muted',
    isTerminal: true,
  },
  REJECTED: {
    key: 'REJECTED',
    label: 'Closed — Not Accepted',
    description: 'Your complaint was not accepted for further regulatory processing.',
    stageIndex: 2, // Rejection branches after review
    badgeVariant: 'error',
    isTerminal: true,
  },
}

/**
 * Fallback mapping for complaints that have not yet been linked to a RegulatoryCase.
 */
const UNLINKED_COMPLAINT_PROJECTION: Record<ComplaintStatus, ConsumerSafeStatus> = {
  SUBMITTED: {
    key: 'SUBMITTED',
    label: 'Complaint Submitted',
    description: 'Your complaint has been received and registered in the system.',
    stageIndex: 0,
    badgeVariant: 'info',
    isTerminal: false,
  },
  UNDER_REVIEW: {
    key: 'UNDER_REVIEW',
    label: 'Under Review',
    description: 'Your complaint is undergoing initial regulatory review.',
    stageIndex: 1,
    badgeVariant: 'info',
    isTerminal: false,
  },
  ASSIGNED: {
    key: 'ASSIGNED',
    label: 'Assigned for Investigation',
    description: 'An authority inspector has been assigned to investigate the matter.',
    stageIndex: 2,
    badgeVariant: 'warning',
    isTerminal: false,
  },
  INVESTIGATING: {
    key: 'INVESTIGATION',
    label: 'Investigation in Progress',
    description: 'An active regulatory inspection is in progress.',
    stageIndex: 3,
    badgeVariant: 'warning',
    isTerminal: false,
  },
  RESOLVED: {
    key: 'RESOLVED',
    label: 'Resolved',
    description: 'The complaint review has been completed.',
    stageIndex: 5,
    badgeVariant: 'success',
    isTerminal: true,
  },
  CLOSED: {
    key: 'CLOSED',
    label: 'Closed',
    description: 'The complaint file has been closed.',
    stageIndex: 5,
    badgeVariant: 'muted',
    isTerminal: true,
  },
}

/**
 * Derives the consumer-safe status projection.
 *
 * If a RegulatoryCase is linked (caseStatus is defined), the status is derived
 * EXCLUSIVELY from the RegulatoryCase (Adjustment #1).
 * Unlinked complaintStatus is only used as a fallback for pre-case complaints.
 */
export function getConsumerSafeStatus(
  caseStatus?: CaseStatus | null,
  complaintStatus?: ComplaintStatus | null
): ConsumerSafeStatus {
  if (caseStatus && CASE_STATUS_PROJECTION[caseStatus]) {
    return CASE_STATUS_PROJECTION[caseStatus]
  }

  if (complaintStatus && UNLINKED_COMPLAINT_PROJECTION[complaintStatus]) {
    return UNLINKED_COMPLAINT_PROJECTION[complaintStatus]
  }

  return CASE_STATUS_PROJECTION.SUBMITTED
}

/**
 * Plain-language, neutral summary of official inspection decisions (Adjustment #2).
 * Strictly non-prejudicial: does not declare complaints "proven valid", nor exposes officer notes.
 */
export function getSafeInspectionDecisionSummary(
  decision?: AuthorityDecision | string | null
): string | null {
  if (!decision) return null

  switch (decision) {
    case 'COMPLIANT':
      return 'The product packaging and declarations were evaluated against applicable Legal Metrology rules and found to be compliant.'
    case 'NON_COMPLIANT':
      return 'Statutory non-compliance was identified during formal inspection, and official regulatory action has been recorded.'
    case 'FURTHER_INVESTIGATION':
      return 'The matter has been referred for extended examination by the regulatory authority.'
    case 'DISMISSED':
      return 'The regulatory inspection was concluded without statutory action following official examination.'
    default:
      return 'An official inspection determination has been recorded by the authority.'
  }
}

/**
 * Compiles a neutral, grounded consumer outcome notice when a case reaches a terminal state.
 */
export function getConsumerSafeOutcome(
  caseStatus?: CaseStatus | null,
  complaintStatus?: ComplaintStatus | null,
  inspectionDecision?: AuthorityDecision | string | null,
  concludedAt?: Date | string | null
): ConsumerSafeOutcome | null {
  const safeStatus = getConsumerSafeStatus(caseStatus, complaintStatus)
  if (!safeStatus.isTerminal) return null

  const isoConcludedAt = concludedAt
    ? typeof concludedAt === 'string'
      ? concludedAt
      : concludedAt.toISOString()
    : null

  const inspectionSummary = getSafeInspectionDecisionSummary(inspectionDecision)

  const hasDocuments =
    (safeStatus.key === 'RESOLVED' || safeStatus.key === 'CLOSED') &&
    Boolean(inspectionDecision)

  if (safeStatus.key === 'REJECTED') {
    return {
      statusKey: 'REJECTED',
      title: 'Complaint Not Accepted',
      message: 'Your complaint was not accepted for further regulatory processing.',
      inspectionSummary: null,
      concludedAt: isoConcludedAt,
      documentsAvailable: false,
    }
  }

  if (safeStatus.key === 'CLOSED') {
    return {
      statusKey: 'CLOSED',
      title: 'Case Concluded',
      message: 'The regulatory case associated with this complaint has been closed.',
      inspectionSummary,
      concludedAt: isoConcludedAt,
      documentsAvailable: hasDocuments,
    }
  }

  // RESOLVED
  return {
    statusKey: 'RESOLVED',
    title: 'Complaint Resolved',
    message: 'Your complaint has been reviewed and the associated regulatory process has been completed.',
    inspectionSummary,
    concludedAt: isoConcludedAt,
    documentsAvailable: hasDocuments,
  }
}

/**
 * Builds the consumer-safe progress timeline with safe timestamps.
 * Standard milestones:
 * 1. Complaint Submitted
 * 2. Under Review
 * 3. Assigned for Investigation
 * 4. Investigation in Progress
 * 5. Decision Pending
 * 6. Resolved / Closed (or Rejected branch)
 */
export function getConsumerTimeline(params: {
  createdAt: Date | string
  caseStatus?: CaseStatus | null
  complaintStatus?: ComplaintStatus | null
  caseCreatedAt?: Date | string | null
  caseUpdatedAt?: Date | string | null
  caseClosedAt?: Date | string | null
  updates?: Array<{ newStatus: string; updatedAt: Date | string }>
  inspectionDecision?: AuthorityDecision | string | null
  hasFinalDocuments?: boolean
}): ConsumerTimelineStep[] {
  const currentSafe = getConsumerSafeStatus(params.caseStatus, params.complaintStatus)
  const submittedDate = typeof params.createdAt === 'string' ? params.createdAt : params.createdAt.toISOString()

  // Timestamp lookup from updates
  const updateMap = new Map<string, string>()
  if (params.updates) {
    for (const u of params.updates) {
      const ts = typeof u.updatedAt === 'string' ? u.updatedAt : u.updatedAt.toISOString()
      updateMap.set(u.newStatus, ts)
    }
  }

  // Special branch: REJECTED
  if (currentSafe.key === 'REJECTED') {
    const rejectedDate =
      (params.caseClosedAt ? (typeof params.caseClosedAt === 'string' ? params.caseClosedAt : params.caseClosedAt.toISOString()) : null) ??
      (params.caseUpdatedAt ? (typeof params.caseUpdatedAt === 'string' ? params.caseUpdatedAt : params.caseUpdatedAt.toISOString()) : null) ??
      updateMap.get('CLOSED') ??
      null

    return [
      {
        key: 'SUBMITTED',
        label: 'Complaint Submitted',
        description: 'Complaint received and registered in the system.',
        status: 'completed',
        timestamp: submittedDate,
      },
      {
        key: 'UNDER_REVIEW',
        label: 'Under Review',
        description: 'Initial regulatory intake and review conducted.',
        status: 'completed',
        timestamp: updateMap.get('UNDER_REVIEW') ?? (params.caseCreatedAt ? (typeof params.caseCreatedAt === 'string' ? params.caseCreatedAt : params.caseCreatedAt.toISOString()) : null),
      },
      {
        key: 'REJECTED',
        label: 'Closed — Not Accepted',
        description: 'Your complaint was not accepted for further regulatory processing.',
        status: 'active',
        timestamp: rejectedDate,
      },
    ]
  }

  // Linear progression definition
  const linearStages: Array<{ key: ConsumerSafeStatusKey; label: string; desc: string }> = [
    { key: 'SUBMITTED', label: 'Complaint Submitted', desc: 'Complaint received and registered in the system.' },
    { key: 'UNDER_REVIEW', label: 'Under Review', desc: 'Initial review of the complaint by regulatory intake.' },
    { key: 'ASSIGNED', label: 'Assigned for Investigation', desc: 'An authority inspector has been assigned.' },
    { key: 'INVESTIGATION', label: 'Investigation in Progress', desc: 'Formal statutory inspection and evidence verification.' },
    { key: 'DECISION_PENDING', label: 'Decision Pending', desc: 'Inspection findings under review for determination.' },
    {
      key: currentSafe.key === 'CLOSED' ? 'CLOSED' : 'RESOLVED',
      label: currentSafe.key === 'CLOSED' ? 'Closed' : 'Resolved',
      desc: currentSafe.key === 'CLOSED'
        ? 'The regulatory case has been closed.'
        : 'The regulatory process has been completed.',
    },
  ]

  const currentStageIndex = currentSafe.stageIndex

  return linearStages.map((stage, idx) => {
    let status: 'completed' | 'active' | 'pending'
    let timestamp: string | null = null

    if (idx < currentStageIndex) {
      status = 'completed'
      if (idx === 0) timestamp = submittedDate
      else if (stage.key === 'UNDER_REVIEW') timestamp = updateMap.get('UNDER_REVIEW') ?? null
      else if (stage.key === 'ASSIGNED') timestamp = updateMap.get('ASSIGNED') ?? null
      else if (stage.key === 'INVESTIGATION') timestamp = updateMap.get('INVESTIGATING') ?? null
      else if (stage.key === 'DECISION_PENDING') timestamp = null
    } else if (idx === currentStageIndex) {
      status = 'active'
      if (idx === 0) {
        timestamp = submittedDate
      } else if (currentSafe.key === 'RESOLVED' || currentSafe.key === 'CLOSED') {
        timestamp =
          (params.caseClosedAt ? (typeof params.caseClosedAt === 'string' ? params.caseClosedAt : params.caseClosedAt.toISOString()) : null) ??
          (params.caseUpdatedAt ? (typeof params.caseUpdatedAt === 'string' ? params.caseUpdatedAt : params.caseUpdatedAt.toISOString()) : null) ??
          updateMap.get('RESOLVED') ??
          updateMap.get('CLOSED') ??
          null
      } else {
        timestamp =
          (params.caseUpdatedAt ? (typeof params.caseUpdatedAt === 'string' ? params.caseUpdatedAt : params.caseUpdatedAt.toISOString()) : null) ??
          updateMap.get(currentSafe.key) ??
          null
      }
    } else {
      status = 'pending'
      timestamp = null
    }

    const isTerminalStage = stage.key === 'RESOLVED' || stage.key === 'CLOSED'
    const docsReady =
      isTerminalStage &&
      (status === 'completed' || status === 'active') &&
      (params.hasFinalDocuments ?? Boolean(params.inspectionDecision))

    return {
      key: stage.key,
      label: stage.label,
      description: stage.desc,
      status,
      timestamp,
      hasDocuments: docsReady,
      documentCount: docsReady ? 2 : undefined,
    }
  })
}
