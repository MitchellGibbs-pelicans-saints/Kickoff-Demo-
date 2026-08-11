import type { Department, FeedbackItem, Proposal, Sensitivity, User } from './types'

export const isRoleActive = (user: User, role: User['roles'][number]) => user.active && user.roles.includes(role)
export const canManageRoles = (user: User) => isRoleActive(user, 'admin')
export const canOpenExecutive = (user: User) => isRoleActive(user, 'executive') || isRoleActive(user, 'admin')

const routedDepartments = (proposal: Proposal) => [proposal.primaryDepartment, ...proposal.supportingDepartments].filter((department): department is Department => Boolean(department))
const sensitivityAllowed = (user: User, sensitivity: Sensitivity = 'standard') => user.sensitivityAccess.includes(sensitivity)

export const executiveProposals = (user: User, proposals: Proposal[]) => {
  if (!user.active || !sensitivityAllowed(user, 'standard')) return []
  if (isRoleActive(user, 'admin')) return proposals.filter((proposal) => ['Approved', 'Pilot', 'Closed'].includes(proposal.status) && sensitivityAllowed(user, proposal.sensitivity))
  if (!isRoleActive(user, 'executive')) return []
  return proposals.filter((proposal) => ['Approved', 'Pilot', 'Closed'].includes(proposal.status) && sensitivityAllowed(user, proposal.sensitivity) && routedDepartments(proposal).some((department) => user.executiveScopes.includes(department)))
}

export const approvalProposals = (user: User, proposals: Proposal[], fallbackReviewerIds: string[] = []) => {
  const reviewStatuses = ['Assigned', 'Under review', 'Changes requested', 'Transferred', 'Human routing review']
  if (isRoleActive(user, 'admin')) return proposals.filter((proposal) => reviewStatuses.includes(proposal.status) && sensitivityAllowed(user, proposal.sensitivity))
  if (!isRoleActive(user, 'approver')) return []
  return proposals.filter((proposal) => {
    if (!reviewStatuses.includes(proposal.status) || !sensitivityAllowed(user, proposal.sensitivity)) return false
    if (proposal.status === 'Human routing review') return fallbackReviewerIds.includes(user.id)
    return proposal.responsibleReviewerId === user.id || routedDepartments(proposal).some((department) => user.departmentScopes.includes(department))
  })
}

export const canReviewProposal = (user: User, proposal: Proposal, fallbackReviewerIds: string[] = []) => user.active && sensitivityAllowed(user, proposal.sensitivity) && (
  isRoleActive(user, 'admin') ||
  (proposal.status === 'Human routing review'
    ? fallbackReviewerIds.includes(user.id)
    : isRoleActive(user, 'approver') && (proposal.responsibleReviewerId === user.id || routedDepartments(proposal).some((department) => user.departmentScopes.includes(department))))
)

export const canViewProposal = (user: User, proposal: Proposal, fallbackReviewerIds: string[] = []) => user.active && (
  proposal.submitterId === user.id ||
  (sensitivityAllowed(user, proposal.sensitivity) && (
    canReviewProposal(user, proposal, fallbackReviewerIds) ||
    (isRoleActive(user, 'executive') && ['Approved', 'Pilot', 'Closed'].includes(proposal.status) && routedDepartments(proposal).some((department) => user.executiveScopes.includes(department)))
  ))
)

export const visibleFeedback = (user: User, proposal: Proposal, fallbackReviewerIds: string[] = []): FeedbackItem[] => {
  if (!canViewProposal(user, proposal, fallbackReviewerIds)) return []
  if (proposal.submitterId === user.id && !isRoleActive(user, 'admin')) return (proposal.feedback ?? []).filter((item) => item.visibleToSubmitter)
  return proposal.feedback ?? []
}

export const hasDepartmentScope = (user: User, department: Department) =>
  isRoleActive(user, 'admin') || (isRoleActive(user, 'approver') && user.departmentScopes.includes(department))
