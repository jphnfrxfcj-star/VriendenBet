import type { ParticipantRating, TeamInput, TeamOdds } from './domain'

export type OddsOptions = {
  margin?: number
  sensitivity?: number
  minOdd?: number
  maxOdd?: number
}

const defaultOptions = {
  margin: 0.1,
  sensitivity: 1.2,
  minOdd: 1.1,
  maxOdd: 15,
}

export function normalizeScore(score: number, minValue: number, maxValue: number) {
  if (maxValue <= minValue) {
    throw new Error('maxValue moet groter zijn dan minValue')
  }

  return Math.min(1, Math.max(0, (score - minValue) / (maxValue - minValue)))
}

export function validateWeights(weights: Record<string, number>) {
  const sum = Object.values(weights).reduce((total, weight) => total + weight, 0)
  if (Object.keys(weights).length === 0) {
    throw new Error('Minstens een eigenschap is vereist')
  }

  if (Math.abs(sum - 1) > 0.0001) {
    throw new Error('De som van de gewichten moet 1,00 zijn')
  }
}

export function calculateParticipantGameScore(
  participant: ParticipantRating,
  weights: Record<string, number>,
) {
  validateWeights(weights)

  return Object.entries(weights).reduce((total, [attributeId, weight]) => {
    const attribute = participant.attributes[attributeId]
    if (!attribute) {
      return total
    }

    return total + normalizeScore(attribute.score, attribute.minValue, attribute.maxValue) * weight
  }, 0)
}

export function calculateTeamScore(
  team: TeamInput,
  participants: ParticipantRating[],
  weights: Record<string, number>,
) {
  if (team.memberParticipantIds.length === 0) {
    throw new Error(`Team ${team.name} heeft geen geldige leden`)
  }

  const scores = team.memberParticipantIds.map((participantId) => {
    const participant = participants.find((item) => item.participantId === participantId)
    if (!participant) {
      throw new Error(`Onbekende deelnemer in team ${team.name}`)
    }

    return calculateParticipantGameScore(participant, weights)
  })

  return scores.reduce((total, score) => total + score, 0) / scores.length
}

export function assertValidTeamComposition(teams: TeamInput[], exactTeamSize?: number) {
  const seen = new Set<string>()

  for (const team of teams) {
    if (exactTeamSize && team.memberParticipantIds.length !== exactTeamSize) {
      throw new Error(`Team ${team.name} moet exact ${exactTeamSize} spelers bevatten`)
    }

    for (const participantId of team.memberParticipantIds) {
      if (seen.has(participantId)) {
        throw new Error('Een deelnemer mag maar in een team zitten')
      }

      seen.add(participantId)
    }
  }
}

export function calculateTeamOdds(
  teams: TeamInput[],
  participants: ParticipantRating[],
  weights: Record<string, number>,
  overrides: Record<string, number | undefined> = {},
  options: OddsOptions = {},
): TeamOdds[] {
  const resolved = { ...defaultOptions, ...options }
  assertValidTeamComposition(teams)

  const scores = teams.map((team) => ({
    team,
    score: calculateTeamScore(team, participants, weights),
  }))

  const adjusted = scores.map((item) => ({
    ...item,
    adjustedStrength: Math.max(0.0001, item.score ** resolved.sensitivity),
  }))
  const totalAdjusted = adjusted.reduce((total, item) => total + item.adjustedStrength, 0)

  return adjusted.map((item) => {
    const probability = item.adjustedStrength / totalAdjusted
    const oddsWithMargin = 1 / (probability * (1 + resolved.margin))
    const calculatedOdds = roundOdd(clamp(oddsWithMargin, resolved.minOdd, resolved.maxOdd))
    const overriddenOdds = overrides[item.team.id]

    return {
      teamId: item.team.id,
      name: item.team.name,
      score: round(item.score, 4),
      probability: round(probability, 6),
      calculatedOdds,
      overriddenOdds,
      finalOdds: overriddenOdds ?? calculatedOdds,
    }
  })
}

export function roundOdd(value: number) {
  return round(value, 2)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
