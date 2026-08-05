import type {
  BetBuilderCalculation,
  FootballSelectionInput,
  FootballSelectionRelationInput,
} from './domain'

export type BetBuilderOptions = {
  correctionFactor?: number
  minOdd?: number
  maxOdd?: number
  overriddenOdds?: number
}

export function assertCompatibleSelections(
  selectedIds: string[],
  relations: FootballSelectionRelationInput[],
) {
  const selected = new Set(selectedIds)
  const blocked = relations.find(
    (relation) =>
      relation.type === 'INCOMPATIBLE' &&
      selected.has(relation.selectionAId) &&
      selected.has(relation.selectionBId),
  )

  if (blocked) {
    throw new Error(blocked.reason ?? 'Deze combinatie is niet toegestaan')
  }
}

export function calculateBetBuilderOdds(
  selections: FootballSelectionInput[],
  stake: number,
  options: BetBuilderOptions = {},
): BetBuilderCalculation {
  if (selections.length < 2) {
    throw new Error('Een betbuilder heeft minstens twee selecties nodig')
  }

  if (stake < 10 || stake > 250) {
    throw new Error('Inzet moet tussen 10 en 250 credits liggen')
  }

  const correctionFactor = options.correctionFactor ?? 0.9
  const minOdd = options.minOdd ?? 1.1
  const maxOdd = options.maxOdd ?? 50
  const rawCombinedOdds = roundOdd(selections.reduce((total, selection) => total * selection.finalOdds, 1))
  const calculatedOdds = roundOdd(clamp(rawCombinedOdds * correctionFactor, minOdd, maxOdd))
  const finalOdds = options.overriddenOdds ?? calculatedOdds

  return {
    rawCombinedOdds,
    correctionFactor,
    calculatedOdds,
    overriddenOdds: options.overriddenOdds,
    finalOdds,
    potentialPayout: roundMoney(stake * finalOdds),
  }
}

export function settleBetBuilder(
  stake: number,
  oddsAtPlacement: Array<{ odds: number; resultStatus: 'WON' | 'LOST' | 'VOID' }>,
) {
  if (oddsAtPlacement.some((selection) => selection.resultStatus === 'LOST')) {
    return { status: 'LOST' as const, effectiveOdds: 0, payout: 0 }
  }

  const activeSelections = oddsAtPlacement.filter((selection) => selection.resultStatus !== 'VOID')

  if (activeSelections.length === 0) {
    return { status: 'REFUNDED' as const, effectiveOdds: 1, payout: roundMoney(stake) }
  }

  const effectiveOdds = roundOdd(activeSelections.reduce((total, selection) => total * selection.odds, 1))
  const payout = roundMoney(stake * effectiveOdds)
  const hasVoid = activeSelections.length !== oddsAtPlacement.length

  return {
    status: hasVoid ? ('PARTIALLY_VOID' as const) : ('WON' as const),
    effectiveOdds,
    payout,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function roundOdd(value: number) {
  return Math.round(value * 100) / 100
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}
