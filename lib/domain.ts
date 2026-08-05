export type Role = 'ADMIN' | 'MIEL' | 'VIEWER'

export type AttributeScore = {
  attributeId: string
  minValue: number
  maxValue: number
  score: number
}

export type ParticipantRating = {
  participantId: string
  name: string
  attributes: Record<string, AttributeScore>
}

export type TeamInput = {
  id: string
  name: string
  memberParticipantIds: string[]
}

export type TeamOdds = {
  teamId: string
  name: string
  score: number
  probability: number
  calculatedOdds: number
  overriddenOdds?: number
  finalOdds: number
}

export type EventForEligibility = {
  format: 'TEAM' | 'INDIVIDUAL'
  teams: Array<{
    id: string
    name: string
    memberParticipantIds: string[]
  }>
}

export type FootballSelectionInput = {
  id: string
  label: string
  finalOdds: number
  eligibilityType:
    | 'ALWAYS_ALLOWED'
    | 'POSITIVE_MIEL_ONLY'
    | 'NOT_WHEN_MIEL_PLAYS'
    | 'ADMIN_ONLY'
  isManipulable?: boolean
}

export type FootballSelectionRelationInput = {
  selectionAId: string
  selectionBId: string
  type: 'INCOMPATIBLE' | 'DEPENDENT'
  reason?: string
}

export type BetBuilderCalculation = {
  rawCombinedOdds: number
  correctionFactor: number
  calculatedOdds: number
  overriddenOdds?: number
  finalOdds: number
  potentialPayout: number
}
