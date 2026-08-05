import { describe, expect, it } from 'vitest'
import {
  assertValidTeamComposition,
  calculateParticipantGameScore,
  calculateTeamOdds,
  calculateTeamScore,
} from '@/lib/odds'

const participants = [
  {
    participantId: 'miel',
    name: 'Miel',
    attributes: {
      kracht: { attributeId: 'kracht', minValue: 1, maxValue: 10, score: 10 },
      teamwerk: { attributeId: 'teamwerk', minValue: 1, maxValue: 10, score: 8 },
    },
  },
  {
    participantId: 'bert',
    name: 'Bert',
    attributes: {
      kracht: { attributeId: 'kracht', minValue: 1, maxValue: 10, score: 4 },
      teamwerk: { attributeId: 'teamwerk', minValue: 1, maxValue: 10, score: 6 },
    },
  },
  {
    participantId: 'jean',
    name: 'Jean',
    attributes: {
      kracht: { attributeId: 'kracht', minValue: 1, maxValue: 10, score: 7 },
      teamwerk: { attributeId: 'teamwerk', minValue: 1, maxValue: 10, score: 7 },
    },
  },
]

const weights = { kracht: 0.7, teamwerk: 0.3 }

describe('dynamische odds', () => {
  it('berekent een gewogen participantScore', () => {
    expect(calculateParticipantGameScore(participants[0], weights)).toBeCloseTo(0.9333, 4)
  })

  it('gebruikt de gemiddelde teamscore', () => {
    const score = calculateTeamScore(
      { id: 'a', name: 'Team A', memberParticipantIds: ['miel', 'bert'] },
      participants,
      weights,
    )

    expect(score).toBeCloseTo(0.6667, 4)
  })

  it('maakt kansen die samen 100 procent vormen en odds binnen limieten blijven', () => {
    const odds = calculateTeamOdds(
      [
        { id: 'a', name: 'Team A', memberParticipantIds: ['miel', 'bert'] },
        { id: 'b', name: 'Team B', memberParticipantIds: ['jean'] },
      ],
      participants,
      weights,
      {},
      { minOdd: 1.1, maxOdd: 15 },
    )

    expect(odds.reduce((sum, item) => sum + item.probability, 0)).toBeCloseTo(1, 4)
    expect(odds.every((item) => item.calculatedOdds >= 1.1 && item.calculatedOdds <= 15)).toBe(true)
  })

  it('laat een override finalOdds bepalen zonder calculatedOdds te verliezen', () => {
    const odds = calculateTeamOdds(
      [
        { id: 'a', name: 'Team A', memberParticipantIds: ['miel'] },
        { id: 'b', name: 'Team B', memberParticipantIds: ['bert'] },
      ],
      participants,
      weights,
      { a: 4.2 },
    )

    expect(odds[0].finalOdds).toBe(4.2)
    expect(odds[0].calculatedOdds).not.toBe(4.2)
  })

  it('weigert dubbele deelnemers in teams', () => {
    expect(() =>
      assertValidTeamComposition([
        { id: 'a', name: 'Team A', memberParticipantIds: ['miel'] },
        { id: 'b', name: 'Team B', memberParticipantIds: ['miel'] },
      ]),
    ).toThrow('Een deelnemer mag maar in een team zitten')
  })
})
