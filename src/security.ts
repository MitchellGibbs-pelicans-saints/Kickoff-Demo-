import type { Department, Proposal, User } from './types'

export const isRoleActive = (user: User, role: User['roles'][number]) => user.active && user.roles.includes(role)

export const canManageRoles = (user: User) => isRoleActive(user, 'admin')

export const canOpenExecutive = (user: User) => isRoleActive(user, 'executive') || isRoleActive(user, 'admin')

export const executiveProposals = (user: User, proposals: Proposal[]) => {
  if (isRoleActive(user, 'admin')) return proposals.filter((proposal) => ['Approved', 'Pilot'].includes(proposal.status))
  if (!isRoleActive(user, 'executive')) return []
  return proposals.filter((proposal) => ['Approved', 'Pilot'].includes(proposal.status) && [proposal.primaryDepartment, ...proposal.supportingDepartments].some((department) => user.executiveScopes.includes(department)))
}

export const approvalProposals = (user: User, proposals: Proposal[]) => {
  if (isRoleActive(user, 'admin')) return proposals.filter((proposal) => proposal.status === 'Department review')
  if (!isRoleActive(user, 'approver')) return []
  return proposals.filter((proposal) => proposal.status === 'Department review' && [proposal.primaryDepartment, ...proposal.supportingDepartments].some((department) => user.departmentScopes.includes(department)))
}

export const canViewProposal = (user: User, proposal: Proposal) =>
  user.active && (
    proposal.submitterId === user.id ||
    isRoleActive(user, 'admin') ||
    (isRoleActive(user, 'approver') && [proposal.primaryDepartment, ...proposal.supportingDepartments].some((department) => user.departmentScopes.includes(department))) ||
    (isRoleActive(user, 'executive') && ['Approved', 'Pilot'].includes(proposal.status) && [proposal.primaryDepartment, ...proposal.supportingDepartments].some((department) => user.executiveScopes.includes(department)))
  )

export const hasDepartmentScope = (user: User, department: Department) =>
  isRoleActive(user, 'admin') || (isRoleActive(user, 'approver') && user.departmentScopes.includes(department))
