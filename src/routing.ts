import type { Department } from './types'

type RoutingRule = { department: Department; terms: string[] }

const rules: RoutingRule[] = [
  { department: 'Ticketing and Sales', terms: ['ticket', 'seat', 'admission', 'inventory', 'pricing', 'discount', 'member'] },
  { department: 'Marketing', terms: ['campaign', 'promot', 'awareness', 'email', 'social', 'advertis', 'content', 'guest guide'] },
  { department: 'Partnerships', terms: ['sponsor', 'partner', 'brand', 'vendor', 'university', 'outside organization', 'artist'] },
  { department: 'People Operations', terms: ['employee', 'staff morale', 'recognition', 'retention', 'workplace', 'shift feedback'] },
  { department: 'Operations', terms: ['game day', 'game-day', 'venue', 'security', 'staffing', 'entry', 'gate', 'logistics', 'concourse', 'credential'] },
  { department: 'Technology', terms: ['website', 'app', 'system', 'automation', 'mobile', 'digital', 'integration', 'identity', 'data'] },
  { department: 'Business Intelligence', terms: ['report', 'dashboard', 'analytics', 'metric', 'forecast', 'measurement', 'digest'] },
  { department: 'Finance', terms: ['revenue', 'cost', 'budget', 'financial', 'savings', 'forecast', 'invoice'] },
]

const stemTerms = new Set(['promot', 'advertis'])
const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const matchesTerm = (text: string, term: string) => {
  const suffix = stemTerms.has(term) ? '\\w*' : ''
  return new RegExp(`(^|\\W)${escapePattern(term)}${suffix}(?=$|\\W)`).test(text)
}

export interface RoutingRecommendation {
  primary: Department
  supporting: Department[]
  confidence: 'High confidence' | 'Moderate confidence' | 'Requires verification'
  signals: string[]
}

export function routeIdea(text: string): RoutingRecommendation {
  const normalized = text.toLowerCase()
  const scored = rules.map((rule, order) => {
    const signals = rule.terms.filter((term) => matchesTerm(normalized, term))
    return { department: rule.department, score: signals.length, signals, order }
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.order - b.order)

  if (!scored.length) return { primary: 'Operations', supporting: ['Technology'], confidence: 'Requires verification', signals: [] }
  const primary = scored[0]
  const supporting = scored.slice(1, 4).map((item) => item.department)
  if (!supporting.length && primary.department !== 'Business Intelligence') supporting.push('Business Intelligence')
  return {
    primary: primary.department,
    supporting,
    confidence: primary.score > 1 ? 'High confidence' : 'Moderate confidence',
    signals: scored.flatMap((item) => item.signals).slice(0, 6),
  }
}
