import { describe, expect, it } from 'vitest'
import { assertCompatibleSelections, calculateBetBuilderOdds, settleBetBuilder } from '@/lib/football'

describe('voetbal betbuilder', () => {
  it('berekent raw odds, correctiefactor en payout', () => {
    const result = calculateBetBuilderOdds(
      [
        { id: 'a', label: 'A', finalOdds: 2, eligibilityType: 'ALWAYS_ALLOWED' },
        { id: 'b', label: 'B', finalOdds: 3, eligibilityType: 'ALWAYS_ALLOWED' },
      ],
      50,
      { correctionFactor: 0.9 },
    )

    expect(result.rawCombinedOdds).toBe(6)
    expect(result.calculatedOdds).toBe(5.4)
    expect(result.potentialPayout).toBe(270)
  })

  it('laat adminoverride finalOdds bepalen', () => {
    const result = calculateBetBuilderOdds(
      [
        { id: 'a', label: 'A', finalOdds: 2, eligibilityType: 'ALWAYS_ALLOWED' },
        { id: 'b', label: 'B', finalOdds: 3, eligibilityType: 'ALWAYS_ALLOWED' },
      ],
      50,
      { overriddenOdds: 4.5 },
    )

    expect(result.finalOdds).toBe(4.5)
  })

  it('weigert incompatibele combinaties', () => {
    expect(() =>
      assertCompatibleSelections(['a', 'b'], [
        { selectionAId: 'a', selectionBId: 'b', type: 'INCOMPATIBLE', reason: 'Tegenstrijdig' },
      ]),
    ).toThrow('Tegenstrijdig')
  })

  it('settlet verloren, void en volledig gewonnen builders correct', () => {
    expect(settleBetBuilder(50, [{ odds: 2, resultStatus: 'LOST' }]).status).toBe('LOST')
    expect(
      settleBetBuilder(50, [
        { odds: 2, resultStatus: 'WON' },
        { odds: 3, resultStatus: 'VOID' },
      ]),
    ).toEqual({ status: 'PARTIALLY_VOID', effectiveOdds: 2, payout: 100 })
    expect(settleBetBuilder(50, [{ odds: 2, resultStatus: 'VOID' }])).toEqual({
      status: 'REFUNDED',
      effectiveOdds: 1,
      payout: 50,
    })
  })
})
