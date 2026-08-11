import { describe, expect, it } from 'vitest'
import { routeIdea } from './routing'
import { routingConfig, seedUsers } from './seed'

describe('evidence-based routing', () => {
  it('assigns exactly one primary department and a supported reviewer', () => {
    const decision = routeIdea('Improve venue entry security workflow and event logistics', routingConfig, seedUsers)
    expect(decision.primaryDepartment).toBe('Operations')
    expect(decision.responsibleReviewerId).toBe('u3')
    expect(decision.reviewQueue).toBeNull()
    expect(decision.evidence.some((item) => item.kind === 'responsibility' || item.kind === 'skill')).toBe(true)
    expect(decision.evidence.some((item) => item.kind === 'permission')).toBe(true)
  })

  it('identifies cross-department collaborators from supported proposal signals', () => {
    const decision = routeIdea('Improve venue entry with a mobile system and guest communication campaign', routingConfig, seedUsers)
    expect(decision.suggestedPrimaryDepartment).toBeTruthy()
    expect(decision.collaboratingDepartments.length).toBeGreaterThan(0)
    expect(new Set(decision.collaboratingDepartments).size).toBe(decision.collaboratingDepartments.length)
  })

  it('uses verified responsibility and skill fit instead of title text', () => {
    const users = seedUsers.map((user) => user.id === 'u3' ? { ...user, title: 'Unrelated title', responsibilities: ['venue entry'], skills: ['security workflow'] } : user)
    const decision = routeIdea('Improve venue entry security workflow', routingConfig, users)
    expect(decision.responsibleReviewerId).toBe('u3')
  })

  it('does not assign a reviewer based on department scope alone', () => {
    const users = seedUsers.map((user) => user.id === 'u3' ? { ...user, responsibilities: [], skills: [] } : user)
    const decision = routeIdea('Improve venue entry security and logistics', routingConfig, users)
    expect(decision.responsibleReviewerId).toBeNull()
    expect(decision.primaryDepartment).toBeNull()
    expect(decision.reviewQueue).toBe(routingConfig.humanReviewQueue)
    expect(decision.uncertainty.join(' ')).toMatch(/matching responsibility or skill evidence/)
  })

  it('escalates low-confidence and no-signal ideas without a forced assignment', () => {
    const decision = routeIdea('Create a thoughtful new internal practice', routingConfig, seedUsers)
    expect(decision.primaryDepartment).toBeNull()
    expect(decision.responsibleReviewerId).toBeNull()
    expect(decision.reviewQueue).toBe(routingConfig.humanReviewQueue)
  })

  it('escalates ambiguous top candidates using the configured margin', () => {
    const config = { ...routingConfig, ambiguityMargin: 100, confidenceThreshold: 1 }
    const decision = routeIdea('Launch a mobile sponsor campaign', config, seedUsers)
    expect(decision.suggestedPrimaryDepartment).toBeTruthy()
    expect(decision.primaryDepartment).toBeNull()
    expect(decision.uncertainty.join(' ')).toMatch(/ambiguity margin/)
  })

  it('filters reviewers by sensitivity before ranking', () => {
    const decision = routeIdea('Launch a sponsor campaign and partner offer', routingConfig, seedUsers, 'restricted')
    expect(decision.responsibleReviewerId).toBeNull()
    expect(decision.primaryDepartment).toBeNull()
    expect(decision.reviewQueue).toBe(routingConfig.humanReviewQueue)
  })

  it('escalates stale employee evidence', () => {
    const users = seedUsers.map((user) => user.id === 'u3' ? { ...user, evidenceVerifiedAt: '2024-01-01' } : user)
    const decision = routeIdea('Improve venue entry security workflow and event logistics', routingConfig, users)
    expect(decision.responsibleReviewerId).toBeNull()
    expect(decision.uncertainty.join(' ')).toMatch(/stale/)
  })

  it('honors administrator changes without a code deployment', () => {
    const config = { ...routingConfig, confidenceThreshold: 99 }
    const decision = routeIdea('Improve venue entry security workflow', config, seedUsers)
    expect(decision.primaryDepartment).toBeNull()
    expect(decision.reviewQueue).toBe(config.humanReviewQueue)
  })
})
