export type Role = 'employee' | 'approver' | 'executive' | 'admin'
export type ProposalStatus = 'Draft' | 'Pending routing' | 'Human routing review' | 'Assigned' | 'Under review' | 'Changes requested' | 'Transferred' | 'Approved' | 'Rejected' | 'Pilot' | 'Closed'
export type Department = 'Marketing' | 'Operations' | 'Partnerships' | 'Technology' | 'Finance' | 'People Operations' | 'Ticketing and Sales' | 'Business Intelligence'
export type Sensitivity = 'standard' | 'restricted' | 'executive'

export interface ApprovalStage {
  id: string
  stage: string
  department: Department | 'Human routing review'
  reviewer: string
  enteredAt: string
  completedAt?: string
  elapsedDays: number
  outcome: 'Completed' | 'In progress' | 'Approved' | 'Changes requested' | 'Rejected' | 'Pending'
}

export interface EvidenceItem {
  id: string
  kind: 'remit' | 'responsibility' | 'skill' | 'subject' | 'dependency' | 'permission' | 'rule'
  label: string
  source: string
  verifiedAt: string
  stale?: boolean
  weight: number
}

export interface DepartmentConfig {
  department: Department
  remit: string
  subjects: string[]
  dependencySubjects: string[]
  active: boolean
}

export interface RoutingWeights {
  remit: number
  responsibility: number
  skill: number
  subject: number
  dependency: number
}

export interface RoutingConfig {
  version: string
  confidenceThreshold: number
  ambiguityMargin: number
  collaboratorThreshold: number
  staleAfterDays: number
  humanReviewQueue: string
  fallbackReviewerIds: string[]
  weights: RoutingWeights
  departments: DepartmentConfig[]
}

export interface User {
  id: string
  name: string
  email: string
  title: string
  roles: Role[]
  departmentScopes: Department[]
  executiveScopes: Department[]
  responsibilities: string[]
  skills: string[]
  evidenceVerifiedAt: string
  sensitivityAccess: Sensitivity[]
  active: boolean
}

export interface RoutingDecision {
  suggestedPrimaryDepartment: Department | null
  primaryDepartment: Department | null
  collaboratingDepartments: Department[]
  responsibleReviewerId: string | null
  reviewQueue: string | null
  confidence: number
  evidence: EvidenceItem[]
  uncertainty: string[]
  ruleVersion: string
  decidedAt: string
}

export interface FeedbackItem {
  id: string
  authorId: string
  message: string
  visibleToSubmitter: boolean
  createdAt: string
  resolvedAt?: string
}

export interface Proposal {
  id: string
  title: string
  summary: string
  submitterId: string
  submitterDepartment: Department
  problem: string
  solution: string
  audience: string
  primaryDepartment: Department | null
  supportingDepartments: Department[]
  responsibleReviewerId?: string | null
  reviewQueue?: string | null
  routingConfidence?: number
  routingEvidence?: EvidenceItem[]
  routingUncertainty?: string[]
  routingRuleVersion?: string
  sensitivity?: Sensitivity
  feedback?: FeedbackItem[]
  nextAction?: string
  values: string[]
  businessValue: string[]
  score: number
  scoreRationale: string
  feasibility: 'High' | 'Moderate' | 'Low' | 'Requires further investigation'
  feasibilityRationale: string
  status: ProposalStatus
  risk: string
  pilot: string
  measures: string[]
  version: number
  updatedAt: string
  approvalStages?: ApprovalStage[]
}

export interface AuditEvent {
  id: string
  proposalId?: string
  eventType: string
  timestamp: string
  actorId: string
  actorLabel: string
  priorState?: string
  newState?: string
  primaryBefore?: Department | null
  primaryAfter?: Department | null
  collaboratorsBefore?: Department[]
  collaboratorsAfter?: Department[]
  reviewerBefore?: string | null
  reviewerAfter?: string | null
  routingConfidence?: number
  evidenceSummary?: string
  ruleVersion?: string
  permissionDecision?: string
  reason: string
}

export interface DemoState {
  users: User[]
  proposals: Proposal[]
  audit: AuditEvent[]
  routingConfig: RoutingConfig
  currentUserId: string
}
