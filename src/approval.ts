import type { ApprovalStage, Department, Proposal, ProposalStatus } from './types'

const reviewers: Record<Department, string> = {
  Marketing: 'Camille Foster',
  Operations: 'Jordan Brooks',
  Partnerships: 'Riley Patel',
  Technology: 'Noah Williams',
  Finance: 'Elena Martin',
  'People Operations': 'Sophie Bernard',
  'Ticketing and Sales': 'Marcus Reed',
  'Business Intelligence': 'Priya Shah',
}

const date = (day: number) => `2026-07-${String(day).padStart(2, '0')}`

export function buildApprovalStages(proposal: Pick<Proposal, 'id' | 'primaryDepartment' | 'supportingDepartments' | 'status'>): ApprovalStage[] {
  const offset = Number(proposal.id.replace(/\D/g, '').slice(-1)) || 1
  const completed = ['Approved', 'Pilot'].includes(proposal.status)
  const rejected = proposal.status === 'Rejected'
  const departments = [proposal.primaryDepartment, ...proposal.supportingDepartments]
  const stages: ApprovalStage[] = [
    { id: `${proposal.id}-capture`, stage: 'Proposal intake', department: proposal.primaryDepartment, reviewer: 'Kickoff workflow', enteredAt: date(4 + offset), completedAt: date(4 + offset), elapsedDays: 0, outcome: 'Completed' },
    { id: `${proposal.id}-primary`, stage: 'Primary department validation', department: proposal.primaryDepartment, reviewer: reviewers[proposal.primaryDepartment], enteredAt: date(5 + offset), completedAt: completed || rejected ? date(7 + offset) : undefined, elapsedDays: completed || rejected ? 2 : 3 + offset, outcome: completed ? 'Approved' : rejected ? 'Rejected' : proposal.status === 'Department review' ? 'In progress' : 'Pending' },
  ]
  proposal.supportingDepartments.forEach((department, index) => stages.push({ id: `${proposal.id}-support-${index}`, stage: `${department} dependency review`, department, reviewer: reviewers[department], enteredAt: date(7 + offset + index), completedAt: completed || rejected ? date(9 + offset + index) : undefined, elapsedDays: completed || rejected ? 2 : 1 + index, outcome: completed ? 'Completed' : rejected ? 'Rejected' : 'Pending' }))
  stages.push({ id: `${proposal.id}-decision`, stage: 'Leadership pilot decision', department: departments[0], reviewer: 'Morgan Reed', enteredAt: date(10 + offset), completedAt: completed || rejected ? date(12 + offset) : undefined, elapsedDays: completed || rejected ? 2 : 0, outcome: completed ? 'Approved' : rejected ? 'Rejected' : 'Pending' })
  return stages
}

export function stagesFor(proposal: Proposal): ApprovalStage[] {
  return proposal.approvalStages?.length ? proposal.approvalStages : buildApprovalStages(proposal)
}

export function recordDecision(stages: ApprovalStage[], status: ProposalStatus, reviewer: string): ApprovalStage[] {
  const target = stages.find((stage) => stage.outcome === 'In progress' || stage.outcome === 'Pending')
  if (!target) return stages
  return stages.map((stage) => stage.id === target.id ? { ...stage, reviewer, completedAt: '2026-08-07', elapsedDays: Math.max(stage.elapsedDays, 1), outcome: status === 'Approved' ? 'Approved' : status === 'Rejected' ? 'Rejected' : 'Changes requested' } : stage)
}
