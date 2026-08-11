import type { AuditEvent, DemoState, Department, FeedbackItem, Proposal, ProposalStatus, User } from './types'
import { canReviewProposal } from './security'

interface WorkflowContext { users?: User[]; fallbackReviewerIds?: string[] }

const assertReviewAccess = (proposal: Proposal, actor: User, context: WorkflowContext = {}) => {
  if (!canReviewProposal(actor, proposal, context.fallbackReviewerIds)) throw new Error('Actor is not authorized to review this proposal.')
}

export const appendAuditEvent = (events: readonly AuditEvent[], event: AuditEvent): AuditEvent[] => {
  if (events.some((item) => item.id === event.id)) return [...events]
  return [...events, structuredClone(event)]
}

export const transitionProposal = (
  proposal: Proposal,
  status: ProposalStatus,
  actor: User,
  reason: string,
  timestamp = '2026-08-11T17:30:00Z',
  context: WorkflowContext = {},
) => {
  assertReviewAccess(proposal, actor, context)
  const updated: Proposal = {
    ...proposal,
    status,
    version: proposal.version + 1,
    updatedAt: timestamp.slice(0, 10),
    nextAction: nextActionFor(status),
  }
  const event: AuditEvent = {
    id: `${proposal.id}-${timestamp}-${status}`,
    proposalId: proposal.id,
    eventType: 'status.changed',
    timestamp,
    actorId: actor.id,
    actorLabel: actor.name,
    priorState: proposal.status,
    newState: status,
    primaryBefore: proposal.primaryDepartment,
    primaryAfter: proposal.primaryDepartment,
    collaboratorsBefore: proposal.supportingDepartments,
    collaboratorsAfter: proposal.supportingDepartments,
    reviewerBefore: proposal.responsibleReviewerId,
    reviewerAfter: proposal.responsibleReviewerId,
    routingConfidence: proposal.routingConfidence,
    ruleVersion: proposal.routingRuleVersion,
    permissionDecision: 'Actor authorized by active demo role and proposal scope.',
    reason,
  }
  return { proposal: updated, event }
}

export const transferProposal = (
  proposal: Proposal,
  primaryDepartment: Department,
  collaborators: Department[],
  reviewerId: string | null,
  actor: User,
  reason: string,
  timestamp = '2026-08-11T17:30:00Z',
  context: WorkflowContext = {},
) => {
  assertReviewAccess(proposal, actor, context)
  if (reviewerId) {
    const reviewer = context.users?.find((user) => user.id === reviewerId)
    if (!reviewer || !reviewer.active || !reviewer.roles.includes('approver') || !reviewer.departmentScopes.includes(primaryDepartment) || !reviewer.sensitivityAccess.includes(proposal.sensitivity ?? 'standard')) {
      throw new Error('Target reviewer is not permission-eligible for the new primary department.')
    }
  }
  const updated: Proposal = {
    ...proposal,
    primaryDepartment,
    supportingDepartments: collaborators.filter((department) => department !== primaryDepartment),
    responsibleReviewerId: reviewerId,
    reviewQueue: reviewerId ? null : 'Human routing review',
    status: reviewerId ? 'Transferred' : 'Human routing review',
    version: proposal.version + 1,
    updatedAt: timestamp.slice(0, 10),
    nextAction: reviewerId ? 'Responsible reviewer acknowledges the transfer.' : 'Authorized fallback reviewer assigns an accountable owner.',
  }
  const event: AuditEvent = {
    id: `${proposal.id}-${timestamp}-transfer`, proposalId: proposal.id, eventType: 'routing.transferred', timestamp,
    actorId: actor.id, actorLabel: actor.name, priorState: proposal.status, newState: updated.status,
    primaryBefore: proposal.primaryDepartment, primaryAfter: primaryDepartment,
    collaboratorsBefore: proposal.supportingDepartments, collaboratorsAfter: updated.supportingDepartments,
    reviewerBefore: proposal.responsibleReviewerId, reviewerAfter: reviewerId,
    routingConfidence: proposal.routingConfidence, ruleVersion: proposal.routingRuleVersion,
    permissionDecision: 'Transfer permitted for active scoped reviewer or administrator.', reason,
  }
  return { proposal: updated, event }
}

export const addFeedback = (
  proposal: Proposal,
  author: User,
  message: string,
  visibleToSubmitter: boolean,
  timestamp = '2026-08-11T17:30:00Z',
  context: WorkflowContext = {},
) => {
  assertReviewAccess(proposal, author, context)
  const feedback: FeedbackItem = { id: `${proposal.id}-feedback-${timestamp}`, authorId: author.id, message, visibleToSubmitter, createdAt: timestamp }
  const updated = { ...proposal, feedback: [...(proposal.feedback ?? []), feedback], updatedAt: timestamp.slice(0, 10) }
  const event: AuditEvent = {
    id: `${feedback.id}-audit`, proposalId: proposal.id, eventType: 'feedback.added', timestamp,
    actorId: author.id, actorLabel: author.name, priorState: proposal.status, newState: proposal.status,
    primaryBefore: proposal.primaryDepartment, primaryAfter: proposal.primaryDepartment,
    collaboratorsBefore: proposal.supportingDepartments, collaboratorsAfter: proposal.supportingDepartments,
    reviewerBefore: proposal.responsibleReviewerId, reviewerAfter: proposal.responsibleReviewerId,
    routingConfidence: proposal.routingConfidence, ruleVersion: proposal.routingRuleVersion,
    permissionDecision: visibleToSubmitter ? 'Visible to submitter and authorized reviewers.' : 'Reviewer-only note; withheld from submitter.', reason: 'Reviewer added feedback.',
  }
  return { proposal: updated, event }
}

export const proposalsNeedingAttention = (proposals: Proposal[], now = '2026-08-11T17:30:00Z') => proposals.filter((proposal) => {
  if (!proposal.responsibleReviewerId && !proposal.reviewQueue && !['Draft', 'Closed', 'Approved', 'Rejected'].includes(proposal.status)) return true
  if (['Under review', 'Assigned', 'Transferred'].includes(proposal.status)) {
    return (Date.parse(now) - Date.parse(proposal.updatedAt)) / 86_400_000 > 7
  }
  return false
})

export const applyProposalUpdate = (state: DemoState, proposal: Proposal, event: AuditEvent): DemoState => ({
  ...state,
  proposals: state.proposals.map((item) => item.id === proposal.id ? proposal : item),
  audit: appendAuditEvent(state.audit, event),
})

const nextActionFor = (status: ProposalStatus) => ({
  Draft: 'Submitter reviews and confirms the proposal.',
  'Pending routing': 'Routing service evaluates evidence and permissions.',
  'Human routing review': 'Authorized fallback reviewer assigns an accountable owner.',
  Assigned: 'Responsible reviewer acknowledges the assignment.',
  'Under review': 'Responsible reviewer evaluates the proposal or requests clarification.',
  'Changes requested': 'Submitter responds to visible feedback and revises the proposal.',
  Transferred: 'New responsible reviewer acknowledges the transfer.',
  Approved: 'Pilot owner validates launch requirements.',
  Rejected: 'Proposal closes with a permission-safe decision reason.',
  Pilot: 'Pilot owner reports measured results.',
  Closed: 'No further action is expected.',
}[status])
