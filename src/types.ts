export type Role = 'employee' | 'approver' | 'executive' | 'admin'
export type ProposalStatus = 'Draft' | 'Department review' | 'Approved' | 'Rejected' | 'Pilot'
export type Department = 'Marketing' | 'Operations' | 'Partnerships' | 'Technology' | 'Finance' | 'People Operations' | 'Ticketing and Sales' | 'Business Intelligence'

export interface ApprovalStage {
  id: string
  stage: string
  department: Department
  reviewer: string
  enteredAt: string
  completedAt?: string
  elapsedDays: number
  outcome: 'Completed' | 'In progress' | 'Approved' | 'Changes requested' | 'Rejected' | 'Pending'
}

export interface User {
  id: string
  name: string
  email: string
  title: string
  roles: Role[]
  departmentScopes: Department[]
  executiveScopes: Department[]
  active: boolean
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
  primaryDepartment: Department
  supportingDepartments: Department[]
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
  actor: string
  action: string
  target: string
  at: string
}

export interface DemoState {
  users: User[]
  proposals: Proposal[]
  audit: AuditEvent[]
  currentUserId: string
}
