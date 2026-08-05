import { describe, expect, it } from 'vitest'
import {
  assertEventSelectionAllowed,
  assertFootballSelectionAllowed,
  getEligibleSelectionsForMiel,
} from '@/lib/eligibility'

const teamEvent = {
  format: 'TEAM' as const,
  teams: [
    { id: 'team-a', name: 'Team A', memberParticipantIds: ['miel'] },
    { id: 'team-b', name: 'Team B', memberParticipantIds: ['bert'] },
  ],
}

describe('Miel eligibility', () => {
  it('laat Miel alleen op zijn eigen team inzetten', () => {
    expect(getEligibleSelectionsForMiel(teamEvent, 'miel')).toEqual(['team-a'])
  })

  it('weigert server-side een inzet tegen Miels eigen team', () => {
    expect(() => assertEventSelectionAllowed(teamEvent, 'team-b', 'miel')).toThrow(
      'Miel mag niet inzetten op een uitkomst waarbij hij zelf verliest',
    )
  })

  it('laat Miel vrij kiezen wanneer hij niet deelneemt', () => {
    expect(getEligibleSelectionsForMiel(teamEvent, 'josy')).toEqual(['team-a', 'team-b'])
  })

  it('blokkeert negatieve voetbalmarkten wanneer Miel speelt', () => {
    const selections = [
      { id: 'win', label: 'Miels ploeg wint', finalOdds: 2, eligibilityType: 'POSITIVE_MIEL_ONLY' as const },
      { id: 'kaart', label: 'Miel krijgt een kaart', finalOdds: 4, eligibilityType: 'ADMIN_ONLY' as const, isManipulable: true },
    ]

    expect(() => assertFootballSelectionAllowed(selections, 'kaart', true)).toThrow(
      'Deze voetbalselectie is niet toegestaan voor Miel',
    )
  })
})
