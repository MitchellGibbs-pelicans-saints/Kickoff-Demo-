import { describe, expect, it } from 'vitest'
import { approvalProposals, canManageRoles, canOpenExecutive, canViewProposal, executiveProposals, visibleFeedback } from './security'
import { MockClickUpGateway, ProductionClickUpGateway, ProductionEntraAdapter } from './integrations'
import { seedProposals, seedUsers } from './seed'

describe('demo authorization', () => {
  it('keeps an employee and proposer out of the executive dashboard', () => {
    const employee = seedUsers.find((user) => user.id === 'u2')!
    expect(canOpenExecutive(employee)).toBe(false)
    expect(executiveProposals(employee, seedProposals)).toEqual([])
  })

  it('shows executives only approved proposals in assigned scopes', () => {
    const executive = seedUsers.find((user) => user.id === 'u4')!
    const result = executiveProposals(executive, seedProposals)
    expect(result.map((proposal) => proposal.id)).toEqual(['p1', 'p3', 'p6'])
    expect(result.every((proposal) => [proposal.primaryDepartment, ...proposal.supportingDepartments].filter(Boolean).some((department) => executive.executiveScopes.includes(department!)))).toBe(true)
  })

  it('shows approvers only permission-compatible assigned work', () => {
    const approver = seedUsers.find((user) => user.id === 'u3')!
    expect(approvalProposals(approver, seedProposals).map((proposal) => proposal.id)).toEqual(['p2', 'p4'])
    const restrictedWithoutPermission: typeof approver = { ...approver, sensitivityAccess: ['standard'] }
    expect(approvalProposals(restrictedWithoutPermission, seedProposals).map((proposal) => proposal.id)).not.toContain('p2')
  })

  it('limits submitters to visible feedback and their own proposal', () => {
    const employee = seedUsers.find((user) => user.id === 'u2')!
    const own = seedProposals.find((proposal) => proposal.id === 'p2')!
    const other = seedProposals.find((proposal) => proposal.id === 'p3')!
    expect(canViewProposal(employee, own)).toBe(true)
    expect(canViewProposal(employee, other)).toBe(false)
    expect(visibleFeedback(employee, own).map((item) => item.id)).toEqual(['f1'])
  })

  it('revocation removes access immediately and non-admins cannot manage roles', () => {
    const revoked = seedUsers.find((user) => user.id === 'u6')!
    expect(canOpenExecutive(revoked)).toBe(false)
    expect(canManageRoles(seedUsers.find((user) => user.id === 'u3')!)).toBe(false)
  })
})

describe('integration boundaries', () => {
  it('requires a ClickUp destination and explicit confirmation', () => {
    const gateway = new MockClickUpGateway()
    expect(() => gateway.previewTask('Title', 'Body')).toThrow(/destination List/)
    const preview = gateway.previewTask('Title', 'Body', 'Executive Ideas Demo')
    expect(() => gateway.createTask(preview, false)).toThrow(/confirmation/)
  })

  it('production adapters fail closed without configuration', () => {
    expect(() => new ProductionClickUpGateway().previewTask('Title', 'Body')).toThrow(/not configured/)
    expect(() => new ProductionEntraAdapter().authenticate()).toThrow(/not configured/)
  })
})
