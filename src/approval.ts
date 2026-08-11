import type { ApprovalStage, Department, Proposal, ProposalStatus, User } from './types'

const date = (day: number) => `2026-07-${String(day).padStart(2, '0')}`

const reviewerFor = (proposal: Proposal, department: Department | null, users: User[]) => {
  if (proposal.responsibleReviewerId) return users.find((user) => user.id === proposal.responsibleReviewerId)?.name ?? 'Requires verification'
  if (proposal.reviewQueue) return proposal.reviewQueue
  if (!department) return 'Awaiting human routing review'
  return users.find((user) => user.active && user.roles.includes('approver') && user.departmentScopes.includes(department))?.name ?? 'Requires verification'
}

export function buildApprovalStages(
  proposal: Pick<Proposal, 'id' | 'primaryDepartment' | 'supportingDepartments' | 'status' | 'responsibleReviewerId' | 'reviewQueue'>,
  users: User[] = [],
): ApprovalStage[] {
  const offset = Number(proposal.id.replace(/\D/g, '').slice(-1)) || 1
  const completed = ['Approved', 'Pilot', 'Closed'].includes(proposal.status)
  const rejected = proposal.status === 'Rejected'
  const department = proposal.primaryDepartment ?? 'Human routing review'
  const reviewer = reviewerFor(proposal as Proposal, proposal.primaryDepartment, users)
  const stages: ApprovalStage[] = [
    { id: `${proposal.id}-capture`, stage: 'Proposal intake', department, reviewer: 'Kickoff workflow', enteredAt: date(4 + offset), completedAt: date(4 + offset), elapsedDays: 0, outcome: 'Completed' },
    { id: `${proposal.id}-routing`, stage: proposal.reviewQueue ? 'Human routing review' : 'Evidence and permission routing', department, reviewer, enteredAt: date(5 + offset), completedAt: proposal.reviewQueue ? undefined : date(6 + offset), elapsedDays: proposal.reviewQueue ? 3 + offset : 1, outcome: proposal.reviewQueue ? 'In progress' : 'Completed' },
    { id: `${proposal.id}-primary`, stage: 'Primary department validation', department, reviewer, enteredAt: date(6 + offset), completedAt: completed || rejected ? date(8 + offset) : undefined, elapsedDays: completed || rejected ? 2 : 3 + offset, outcome: completed ? 'Approved' : rejected ? 'Rejected' : proposal.status === 'Under review' ? 'In progress' : 'Pending' },
  ]
  proposal.supportingDepartments.forEach((supportingDepartment, index) => stages.push({ id: `${proposal.id}-support-${index}`, stage: `${supportingDepartment} dependency review`, department: supportingDepartment, reviewer: reviewerFor(proposal as Proposal, supportingDepartment, users), enteredAt: date(8 + offset + index), completedAt: completed || rejected ? date(10 + offset + index) : undefined, elapsedDays: completed || rejected ? 2 : 1 + index, outcome: completed ? 'Completed' : rejected ? 'Rejected' : 'Pending' }))
  stages.push({ id: `${proposal.id}-decision`, stage: 'Leadership pilot decision', department, reviewer: 'Requires verification', enteredAt: date(11 + offset), completedAt: completed || rejected ? date(13 + offset) : undefined, elapsedDays: completed || rejected ? 2 : 0, outcome: completed ? 'Approved' : rejected ? 'Rejected' : 'Pending' })
  return stages
}

export function stagesFor(proposal: Proposal): ApprovalStage[] {
  return proposal.approvalStages?.length ? proposal.approvalStages : buildApprovalStages(proposal)
}

export function recordDecision(stages: ApprovalStage[], status: ProposalStatus, reviewer: string): ApprovalStage[] {
  const target = stages.find((stage) => stage.outcome === 'In progress' || stage.outcome === 'Pending')
  if (!target) return stages
  return stages.map((stage) => stage.id === target.id ? { ...stage, reviewer, completedAt: '2026-08-11', elapsedDays: Math.max(stage.elapsedDays, 1), outcome: status === 'Approved' ? 'Approved' : status === 'Rejected' ? 'Rejected' : 'Changes requested' } : stage)
}
