import { describe, expect, it } from 'vitest'
import { addFeedback, appendAuditEvent, proposalsNeedingAttention, transferProposal, transitionProposal } from './workflow'
import { routingConfig, seedProposals, seedUsers } from './seed'

describe('routing workflow and audit history', () => {
  const reviewer = seedUsers.find((user) => user.id === 'u3')!
  const admin = seedUsers.find((user) => user.id === 'u1')!
  const employee = seedUsers.find((user) => user.id === 'u2')!
  const proposal = seedProposals.find((item) => item.id === 'p2')!

  it('rejects unauthorized review decisions', () => {
    expect(() => transitionProposal(proposal, 'Approved', employee, 'Unauthorized attempt.')).toThrow(/not authorized/)
  })

  it('records status changes without overwriting prior state', () => {
    const result = transitionProposal(proposal, 'Changes requested', reviewer, 'Clarification required.')
    expect(result.proposal.version).toBe(proposal.version + 1)
    expect(result.event.priorState).toBe('Under review')
    expect(result.event.newState).toBe('Changes requested')
    expect(proposal.status).toBe('Under review')
  })

  it('rejects a transfer to an ineligible reviewer', () => {
    expect(() => transferProposal(proposal, 'Finance', [], 'u5', reviewer, 'Wrong scope.', '2026-08-11T17:30:00Z', { users: seedUsers })).toThrow(/not permission-eligible/)
  })

  it('allows an authorized admin to transfer to a valid reviewer', () => {
    const result = transferProposal(proposal, 'Partnerships', ['Marketing'], 'u5', admin, 'Ownership corrected.', '2026-08-11T17:31:00Z', { users: seedUsers, fallbackReviewerIds: routingConfig.fallbackReviewerIds })
    expect(result.proposal.primaryDepartment).toBe('Partnerships')
    expect(result.proposal.responsibleReviewerId).toBe('u5')
    expect(result.event.primaryBefore).toBe('Operations')
    expect(result.event.primaryAfter).toBe('Partnerships')
  })

  it('keeps reviewer-only feedback hidden through an auditable visibility decision', () => {
    const result = addFeedback(proposal, reviewer, 'Internal risk note.', false)
    expect(result.proposal.feedback?.at(-1)?.visibleToSubmitter).toBe(false)
    expect(result.event.permissionDecision).toMatch(/withheld/)
  })

  it('deduplicates retried audit events and preserves the original event', () => {
    const event = transitionProposal(proposal, 'Approved', reviewer, 'Approved.').event
    const once = appendAuditEvent([], event)
    const twice = appendAuditEvent(once, { ...event, reason: 'Retry should not replace the original.' })
    expect(twice).toHaveLength(1)
    expect(twice[0].reason).toBe('Approved.')
  })

  it('detects no-owner and stale nonterminal proposals', () => {
    const noOwner = { ...proposal, id: 'no-owner', responsibleReviewerId: null, reviewQueue: null, status: 'Assigned' as const }
    const stale = { ...proposal, id: 'stale', updatedAt: '2026-07-01' }
    expect(proposalsNeedingAttention([noOwner, stale]).map((item) => item.id)).toEqual(['no-owner', 'stale'])
  })
})
