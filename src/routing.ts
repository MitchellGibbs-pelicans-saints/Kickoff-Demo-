import type { Department, EvidenceItem, RoutingConfig, RoutingDecision, Sensitivity, User } from './types'

const words = (value: string) => value.toLowerCase().match(/[a-z0-9]+/g) ?? []
const normalized = (value: string) => ` ${words(value).join(' ')} `
const matches = (text: string, phrase: string) => normalized(text).includes(` ${words(phrase).join(' ')} `)

const reviewerCanSee = (user: User, department: Department, sensitivity: Sensitivity) =>
  user.active && user.roles.includes('approver') && user.departmentScopes.includes(department) && user.sensitivityAccess.includes(sensitivity)

const isFresh = (verifiedAt: string, now: string, staleAfterDays: number) => {
  const age = (Date.parse(now) - Date.parse(verifiedAt)) / 86_400_000
  return Number.isFinite(age) && age <= staleAfterDays
}

export function routeIdea(
  text: string,
  config: RoutingConfig,
  users: User[],
  sensitivity: Sensitivity = 'standard',
  now = '2026-08-11T17:30:00Z',
): RoutingDecision {
  const scored = config.departments.filter((item) => item.active).map((department) => {
    const subjectSignals = department.subjects.filter((term) => matches(text, term))
    const dependencySignals = department.dependencySubjects.filter((term) => matches(text, term))
    const remitSignals = words(department.remit).filter((term) => term.length > 5 && matches(text, term))
    const permitted = users.filter((user) => reviewerCanSee(user, department.department, sensitivity))
    const fresh = permitted.filter((user) => isFresh(user.evidenceVerifiedAt, now, config.staleAfterDays))
    const reviewerScores = fresh.map((user) => {
      const responsibilities = user.responsibilities.filter((term) => matches(text, term))
      const skills = user.skills.filter((term) => matches(text, term))
      return { user, responsibilities, skills, score: responsibilities.length * config.weights.responsibility + skills.length * config.weights.skill }
    }).sort((a, b) => b.score - a.score || a.user.name.localeCompare(b.user.name))
    const reviewer = reviewerScores.find((candidate) => candidate.score > 0)
    const score = Math.min(100,
      subjectSignals.length * config.weights.subject +
      Math.min(remitSignals.length, 1) * config.weights.remit +
      dependencySignals.length * config.weights.dependency +
      (reviewer?.score ?? 0),
    )
    return { department, permitted, fresh, reviewer, subjectSignals, dependencySignals, remitSignals, score }
  }).sort((a, b) => b.score - a.score || a.department.department.localeCompare(b.department.department))

  const best = scored[0]
  const runnerUp = scored[1]
  const hasDepartmentEvidence = Boolean(best && best.score > 0)
  const ambiguous = Boolean(best && runnerUp && runnerUp.score > 0 && best.score - runnerUp.score < config.ambiguityMargin)
  const confident = Boolean(best && best.score >= config.confidenceThreshold && best.reviewer && !ambiguous)
  const suggestedPrimaryDepartment = hasDepartmentEvidence ? best.department.department : null
  const primaryDepartment = confident ? best.department.department : null
  const collaboratingDepartments = scored
    .filter((candidate) => candidate !== best && candidate.score >= config.collaboratorThreshold && (candidate.subjectSignals.length > 0 || candidate.dependencySignals.length > 0))
    .slice(0, 3)
    .map((candidate) => candidate.department.department)
  const evidence: EvidenceItem[] = []

  if (best) {
    best.subjectSignals.forEach((label, index) => evidence.push({ id: `subject-${index}`, kind: 'subject', label, source: `${best.department.department} subject catalog`, verifiedAt: now, weight: config.weights.subject }))
    if (best.remitSignals.length) evidence.push({ id: 'remit-0', kind: 'remit', label: best.department.remit, source: 'Administrator-maintained department remit', verifiedAt: now, weight: config.weights.remit })
    best.reviewer?.responsibilities.forEach((label, index) => evidence.push({ id: `responsibility-${index}`, kind: 'responsibility', label, source: `${best.reviewer.user.name} responsibility evidence`, verifiedAt: best.reviewer.user.evidenceVerifiedAt, weight: config.weights.responsibility }))
    best.reviewer?.skills.forEach((label, index) => evidence.push({ id: `skill-${index}`, kind: 'skill', label, source: `${best.reviewer.user.name} skill evidence`, verifiedAt: best.reviewer.user.evidenceVerifiedAt, weight: config.weights.skill }))
    if (best.reviewer) evidence.push({ id: 'permission-0', kind: 'permission', label: `${best.reviewer.user.name} passed active-role, department-scope and sensitivity checks`, source: 'Server-verified authorization context (simulated)', verifiedAt: now, weight: 0 })
    collaboratingDepartments.forEach((label, index) => evidence.push({ id: `dependency-${index}`, kind: 'dependency', label, source: 'Cross-department dependency score', verifiedAt: now, weight: config.weights.dependency }))
    evidence.push({ id: 'rule-0', kind: 'rule', label: config.version, source: 'Administrator-published routing configuration', verifiedAt: now, weight: 0 })
  }

  const uncertainty: string[] = []
  if (!hasDepartmentEvidence) uncertainty.push('No department remit or proposal-subject evidence met the minimum signal level.')
  if (best && !best.permitted.length) uncertainty.push(`No active reviewer is permission-eligible for ${sensitivity} ${best.department.department} proposals.`)
  if (best && best.permitted.length && !best.fresh.length) uncertainty.push('Available reviewer evidence is stale and requires administrator validation.')
  if (best && best.fresh.length && !best.reviewer) uncertainty.push('No permission-eligible reviewer has matching responsibility or skill evidence.')
  if (best && best.score < config.confidenceThreshold) uncertainty.push(`Confidence ${best.score} is below the configured threshold of ${config.confidenceThreshold}.`)
  if (ambiguous && runnerUp) uncertainty.push(`${best?.department.department} and ${runnerUp.department.department} are within the configured ${config.ambiguityMargin}-point ambiguity margin.`)

  return {
    suggestedPrimaryDepartment,
    primaryDepartment,
    collaboratingDepartments,
    responsibleReviewerId: confident ? best?.reviewer?.user.id ?? null : null,
    reviewQueue: confident ? null : config.humanReviewQueue,
    confidence: best?.score ?? 0,
    evidence,
    uncertainty,
    ruleVersion: config.version,
    decidedAt: now,
  }
}
