import { describe, expect, it } from 'vitest'
import { approvalProposals, canManageRoles, canOpenExecutive, executiveProposals } from './security'
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
    expect(result.every((proposal) => executive.executiveScopes.includes(proposal.primaryDepartment))).toBe(true)
    expect(result.map((proposal) => proposal.id)).toEqual(['p1'])
  })

  it('shows approvers only their assigned department queue', () => {
    const approver = seedUsers.find((user) => user.id === 'u3')!
    expect(approvalProposals(approver, seedProposals).map((proposal) => proposal.id)).toEqual(['p2'])
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
