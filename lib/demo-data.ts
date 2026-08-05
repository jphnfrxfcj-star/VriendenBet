import { calculateBetBuilderOdds } from './football'
import { calculateTeamOdds } from './odds'

export const attributes = [
  'kracht',
  'uithouding',
  'snelheid',
  'behendigheid',
  'IQ',
  'EQ',
  'balgevoel',
  'communicatie',
  'testosteron',
  'fijne motoriek',
  'lenigheid',
  'competitiviteit',
  'alcoholbestendigheid',
  'geluk',
  'mentale weerbaarheid',
  'teamwerk',
]

export const participants = [
  'Bert',
  'Jean',
  'Jan Kestens',
  'Jasper',
  'Josy',
  'Jules',
  'Binnie',
  'Louis',
  'Luca',
  'Dekkers',
  'Bens Jr',
  'Bens Sr',
  'Bols',
  'Peter',
  'Lievens',
  'Rob',
  'WVH',
  'Miel',
].map((name, index) => ({
  id: `p-${index + 1}`,
  name,
  nickname: name === 'Miel' ? 'De huisbookie' : undefined,
  stats: Object.fromEntries(
    attributes.map((attribute, attributeIndex) => [
      attribute,
      4 + ((index * 3 + attributeIndex * 2) % 7),
    ]),
  ) as Record<string, number>,
}))

export const users = [
  { displayName: 'Bert', role: 'ADMIN' as const },
  { displayName: 'Jean', role: 'ADMIN' as const },
  { displayName: 'Miel', role: 'MIEL' as const },
  ...participants
    .filter((participant) => !['Bert', 'Jean', 'Miel'].includes(participant.name))
    .map((participant) => ({ displayName: participant.name, role: 'VIEWER' as const })),
]

const ratings = participants.map((participant) => ({
  participantId: participant.id,
  name: participant.name,
  attributes: Object.fromEntries(
    Object.entries(participant.stats).map(([name, score]) => [
      name,
      {
        attributeId: name,
        minValue: 1,
        maxValue: 10,
        score,
      },
    ]),
  ),
}))

export const tugOfWarTeams = [
  {
    id: 'team-groen',
    name: 'Team Groen',
    memberParticipantIds: ['p-18', 'p-1', 'p-4', 'p-10'],
  },
  {
    id: 'team-geel',
    name: 'Team Geel',
    memberParticipantIds: ['p-2', 'p-8', 'p-13', 'p-16'],
  },
]

export const tugOfWarWeights = {
  kracht: 0.5,
  uithouding: 0.2,
  teamwerk: 0.15,
  behendigheid: 0.15,
}

export const tugOfWarOdds = calculateTeamOdds(tugOfWarTeams, ratings, tugOfWarWeights, {}, {
  margin: 0.1,
  sensitivity: 1.25,
})

export const weekendEvents = [
  {
    id: 'touwtrekken-4v4',
    title: 'Touwtrekken 4 tegen 4',
    status: 'ODDS_READY',
    startsAt: 'Zaterdag 15:00',
    teams: tugOfWarTeams,
    odds: tugOfWarOdds,
  },
  {
    id: 'penaltycompetitie',
    title: 'Penaltycompetitie',
    status: 'OPEN_FOR_SELECTION',
    startsAt: 'Zaterdag 17:30',
    teams: [],
    odds: [],
  },
  {
    id: 'quiz',
    title: 'Nachtquiz',
    status: 'DRAFT',
    startsAt: 'Vrijdag 22:00',
    teams: [],
    odds: [],
  },
]

export const footballSelections = [
  {
    id: 'miels-ploeg-wint',
    label: 'Miels ploeg wint',
    finalOdds: 2.05,
    eligibilityType: 'POSITIVE_MIEL_ONLY' as const,
  },
  {
    id: 'beide-scoren',
    label: 'Beide teams scoren',
    finalOdds: 1.86,
    eligibilityType: 'ALWAYS_ALLOWED' as const,
  },
  {
    id: 'over-25-goals',
    label: 'Meer dan 2,5 doelpunten',
    finalOdds: 1.74,
    eligibilityType: 'ALWAYS_ALLOWED' as const,
  },
  {
    id: 'miel-scoort',
    label: 'Miel scoort',
    finalOdds: 3.2,
    eligibilityType: 'POSITIVE_MIEL_ONLY' as const,
  },
  {
    id: 'miel-assist',
    label: 'Miel geeft een assist',
    finalOdds: 2.9,
    eligibilityType: 'POSITIVE_MIEL_ONLY' as const,
  },
  {
    id: 'miel-kaart',
    label: 'Miel krijgt een kaart',
    finalOdds: 4.5,
    eligibilityType: 'ADMIN_ONLY' as const,
    isManipulable: true,
  },
]

export const sampleBetBuilder = calculateBetBuilderOdds(footballSelections.slice(0, 3), 50)

export const footballMatch = {
  title: 'Miels laatste match',
  homeTeam: 'Miels ploeg',
  awayTeam: 'De tegenstanders',
  venue: 'Zaterdagveld',
  status: 'OPEN',
  startsAt: 'Zaterdag 20:00',
  selections: footballSelections,
  betBuilder: sampleBetBuilder,
}

export const wallet = {
  balance: 1000,
  openStake: 50,
  potentialPayout: sampleBetBuilder.potentialPayout,
}
