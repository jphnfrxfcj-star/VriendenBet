import { randomInt } from 'node:crypto'

export type SlotSymbolType = 'REGULAR' | 'HIGH_VALUE' | 'WILD' | 'SCATTER' | 'BONUS'
export type SlotFeatureType =
  | 'MIEL_SMASH_WILD'
  | 'MIEL_NUDGE'
  | 'DOUBLE_SMASH'
  | 'NUMBER_20_MULTIPLIER'
  | 'BANANA_RAIN'
  | 'MIEL_CELEBRATION'
export type SlotBonusWheelSegmentType =
  | 'CREDITS'
  | 'FREE_SPINS'
  | 'MULTIPLIER'
  | 'MINI_JACKPOT'
  | 'MAJOR_JACKPOT'
  | 'MIELPOT'
  | 'MYSTERY_CHALLENGE'

export type SlotSymbolConfig = {
  id?: string
  name: string
  slug: string
  assetUrl: string
  type: SlotSymbolType
  reelWeight: number
  payoutMultiplierTwo?: number | null
  payoutMultiplierThree?: number | null
  isWild: boolean
  isScatter: boolean
  isBonus: boolean
  isActive: boolean
  sortOrder: number
}

export type SlotPaylineConfig = {
  id?: string
  name: string
  positions: SlotPosition[]
  isActive: boolean
  sortOrder: number
}

export type SlotBonusWheelSegmentConfig = {
  id?: string
  label: string
  type: SlotBonusWheelSegmentType
  value: number
  weight: number
  challengeId?: string | null
  isActive: boolean
  sortOrder: number
}

export type SlotEngineConfig = {
  id?: string
  version?: number
  name: string
  availableStakes: number[]
  maxWinMultiplier: number
  gorillaFeatureChance: number
  scatterFeatureChance: number
  bonusFeatureChance: number
  freeSpinRetriggerChance: number
  symbols: SlotSymbolConfig[]
  paylines: SlotPaylineConfig[]
  bonusWheelSegments: SlotBonusWheelSegmentConfig[]
}

export type SlotPosition = {
  row: 0 | 1 | 2
  reel: 0 | 1 | 2
}

export type SlotGrid = [
  [string, string, string],
  [string, string, string],
  [string, string, string],
]

export type EvaluatedPayline = {
  paylineId?: string
  name: string
  positions: SlotPosition[]
  symbolSlug: string
  matchedCount: number
  multiplier: number
  winAmount: number
}

export type SlotBonusResult = {
  label: string
  type: SlotBonusWheelSegmentType
  value: number
  challengeId?: string | null
} | null

export type SlotFeaturePlan = {
  type: SlotFeatureType
  payload: Record<string, unknown>
  multiplier?: number
} | null

type AppliedFeature = {
  grid: SlotGrid
  multiplier: number
  plan: Exclude<SlotFeaturePlan, null>
}

export type SlotSpinEvaluation = {
  initialGrid: SlotGrid
  finalGrid: SlotGrid
  evaluatedPaylines: EvaluatedPayline[]
  baseWin: number
  scatterWin: number
  featureWin: number
  bonusWin: number
  jackpotWin: number
  uncappedWin: number
  finalWin: number
  featureType: SlotFeatureType | null
  featurePayload: Record<string, unknown> | null
  featureMultiplier: number
  bonusResult: SlotBonusResult
  freeSpinsAwarded: number
  capped: boolean
}

export type RandomSource = () => number

export const defaultSlotSymbols: SlotSymbolConfig[] = [
  symbol('Pint', 'pint', 'REGULAR', 28, 2, '/slot/symbols/pint.svg', 1),
  symbol('Voetbal', 'voetbal', 'REGULAR', 24, 3, '/slot/symbols/voetbal.svg', 2),
  symbol('BBQ', 'bbq', 'REGULAR', 20, 4, '/slot/symbols/bbq.svg', 3),
  symbol('Bus', 'bus', 'REGULAR', 18, 5, '/slot/symbols/bus.svg', 4),
  symbol('Premiumfles', 'premiumfles', 'HIGH_VALUE', 14, 8, '/slot/symbols/premiumfles.svg', 5),
  symbol('Truitje 20', 'truitje-20', 'HIGH_VALUE', 12, 6, '/slot/symbols/truitje-20.svg', 6),
  symbol('Banaan', 'banaan', 'REGULAR', 18, 4, '/slot/symbols/banaan.svg', 7),
  symbol('Miel', 'miel', 'HIGH_VALUE', 8, 12, '/slot/symbols/miel.svg', 8),
  symbol('Gouden gorilla', 'gouden-gorilla', 'HIGH_VALUE', 4, 25, '/slot/symbols/gouden-gorilla.svg', 9),
  {
    ...symbol('Wild', 'wild', 'WILD', 5, 15, '/slot/symbols/wild.svg', 10),
    isWild: true,
  },
  {
    ...symbol('Scatter', 'scatter', 'SCATTER', 6, null, '/slot/symbols/scatter.svg', 11),
    isScatter: true,
  },
  {
    ...symbol('Bonus', 'bonus', 'BONUS', 5, null, '/slot/symbols/bonus.svg', 12),
    isBonus: true,
  },
]

export const defaultSlotPaylines: SlotPaylineConfig[] = [
  { name: 'Bovenste rij', positions: line([0, 0], [0, 1], [0, 2]), isActive: true, sortOrder: 1 },
  { name: 'Middelste rij', positions: line([1, 0], [1, 1], [1, 2]), isActive: true, sortOrder: 2 },
  { name: 'Onderste rij', positions: line([2, 0], [2, 1], [2, 2]), isActive: true, sortOrder: 3 },
  { name: 'Diagonaal omlaag', positions: line([0, 0], [1, 1], [2, 2]), isActive: true, sortOrder: 4 },
  { name: 'Diagonaal omhoog', positions: line([2, 0], [1, 1], [0, 2]), isActive: true, sortOrder: 5 },
]

export const defaultBonusWheelSegments: SlotBonusWheelSegmentConfig[] = [
  segment('10 credits', 'CREDITS', 10, 24, 1),
  segment('25 credits', 'CREDITS', 25, 18, 2),
  segment('50 credits', 'CREDITS', 50, 10, 3),
  segment('100 credits', 'CREDITS', 100, 4, 4),
  segment('2 free spins', 'FREE_SPINS', 2, 14, 5),
  segment('5 free spins', 'FREE_SPINS', 5, 8, 6),
  segment('10 free spins', 'FREE_SPINS', 10, 3, 7),
  segment('2x bonus', 'MULTIPLIER', 2, 8, 8),
  segment('Mini Jackpot', 'MINI_JACKPOT', 0, 5, 9),
  segment('Major Jackpot', 'MAJOR_JACKPOT', 0, 2, 10),
  segment('Mystery Challenge', 'MYSTERY_CHALLENGE', 0, 4, 11),
]

export const defaultSlotEngineConfig: SlotEngineConfig = {
  name: 'Miel Smash',
  availableStakes: [5, 10, 25, 50],
  maxWinMultiplier: 50,
  gorillaFeatureChance: 0.12,
  scatterFeatureChance: 0.1,
  bonusFeatureChance: 0.08,
  freeSpinRetriggerChance: 0.06,
  symbols: defaultSlotSymbols,
  paylines: defaultSlotPaylines,
  bonusWheelSegments: defaultBonusWheelSegments,
}

export function cryptoRandom(): RandomSource {
  return () => randomInt(0, 1_000_000) / 1_000_000
}

export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

export function evaluateSlotSpin(config: SlotEngineConfig, stake: number, random: RandomSource): SlotSpinEvaluation {
  assertSlotStakeAllowed(config.availableStakes, stake, Number.POSITIVE_INFINITY)

  const initialGrid = createGrid(config.symbols, random)
  const baseEvaluation = evaluatePaylines(initialGrid, config.symbols, config.paylines, stake)
  const scatterWin = evaluateScatterWin(initialGrid, config.symbols, stake)
  const bonusSymbols = countSymbols(initialGrid, (slotSymbol) => slotSymbol.isBonus, config.symbols)
  const scatterSymbols = countSymbols(initialGrid, (slotSymbol) => slotSymbol.isScatter, config.symbols)
  let bonusResult: SlotBonusResult = null
  let bonusWin = 0
  let freeSpinsAwarded = scatterSymbols >= 3 ? 5 : 0

  if (bonusSymbols >= 3 || random() < config.bonusFeatureChance) {
    bonusResult = pickWeighted(config.bonusWheelSegments.filter((segment) => segment.isActive), random)
    if (bonusResult?.type === 'CREDITS') bonusWin += bonusResult.value
    if (bonusResult?.type === 'FREE_SPINS') freeSpinsAwarded += bonusResult.value
  }

  let finalGrid = cloneGrid(initialGrid)
  let featurePlan: SlotFeaturePlan = null
  let featureMultiplier = 1

  if (random() < config.gorillaFeatureChance || baseEvaluation.totalWin >= stake * 12) {
    const feature = pickFeature(random)
    const applied = applyFeature(feature, finalGrid, config.symbols, random)
    finalGrid = applied.grid
    featurePlan = applied.plan
    featureMultiplier = applied.multiplier
  }

  if (!featurePlan && (baseEvaluation.totalWin + scatterWin + bonusWin) >= stake * 20) {
    featurePlan = {
      type: 'MIEL_CELEBRATION',
      payload: { reason: 'BIG_WIN' },
    }
  }

  const finalEvaluation = evaluatePaylines(finalGrid, config.symbols, config.paylines, stake)
  const lineWinBeforeMultiplier = finalEvaluation.totalWin
  const featureWin = Math.max(0, lineWinBeforeMultiplier - baseEvaluation.totalWin)
  const uncappedWin = roundCredits((lineWinBeforeMultiplier + scatterWin + bonusWin) * featureMultiplier)
  const maxWin = stake * config.maxWinMultiplier
  const finalWin = Math.min(uncappedWin, maxWin)

  return {
    initialGrid,
    finalGrid,
    evaluatedPaylines: finalEvaluation.lines,
    baseWin: baseEvaluation.totalWin,
    scatterWin,
    featureWin,
    bonusWin,
    jackpotWin: 0,
    uncappedWin,
    finalWin,
    featureType: featurePlan?.type ?? null,
    featurePayload: featurePlan?.payload ?? null,
    featureMultiplier,
    bonusResult,
    freeSpinsAwarded,
    capped: finalWin < uncappedWin,
  }
}

export function assertSlotStakeAllowed(availableStakes: number[], stake: number, balance: number) {
  if (!Number.isInteger(stake) || !availableStakes.includes(stake)) {
    throw new Error('Deze inzet is niet toegestaan voor Miel Smash')
  }
  if (stake > balance) {
    throw new Error('Onvoldoende credits')
  }
}

export function evaluatePaylines(
  grid: SlotGrid,
  symbols: SlotSymbolConfig[],
  paylines: SlotPaylineConfig[],
  stake: number,
) {
  const symbolBySlug = new Map(symbols.map((slotSymbol) => [slotSymbol.slug, slotSymbol]))
  const lines: EvaluatedPayline[] = []

  for (const payline of paylines.filter((lineConfig) => lineConfig.isActive)) {
    if (!isValidPayline(payline.positions)) continue

    const slugs = payline.positions.map((position) => grid[position.row][position.reel])
    const targetSlug =
      slugs.find((slug) => {
        const slotSymbol = symbolBySlug.get(slug)
        return slotSymbol && !slotSymbol.isWild && !slotSymbol.isScatter && !slotSymbol.isBonus
      }) ?? slugs[0]
    const target = symbolBySlug.get(targetSlug)
    if (!target || target.isScatter || target.isBonus) continue

    const matched = slugs.every((slug) => {
      const slotSymbol = symbolBySlug.get(slug)
      return slug === targetSlug || Boolean(slotSymbol?.isWild)
    })
    if (!matched) continue

    const multiplier = target.payoutMultiplierThree ?? 0
    if (multiplier <= 0) continue

    lines.push({
      paylineId: payline.id,
      name: payline.name,
      positions: payline.positions,
      symbolSlug: target.slug,
      matchedCount: 3,
      multiplier,
      winAmount: roundCredits(stake * multiplier),
    })
  }

  return {
    lines,
    totalWin: roundCredits(lines.reduce((sum, lineResult) => sum + lineResult.winAmount, 0)),
  }
}

export function isValidPayline(positions: SlotPosition[]) {
  return (
    positions.length === 3 &&
    positions.every((position) => position.row >= 0 && position.row <= 2 && position.reel >= 0 && position.reel <= 2)
  )
}

export function simulateSlot(config: SlotEngineConfig, spins: number, seed = 12345, stake = config.availableStakes[1] ?? 10) {
  const random = seededRandom(seed)
  let totalStake = 0
  let totalWin = 0
  let hits = 0
  let bonuses = 0
  let freeSpins = 0
  let biggestMultiplier = 0
  const distribution: Record<string, number> = {}

  for (let index = 0; index < spins; index += 1) {
    const result = evaluateSlotSpin(config, stake, random)
    totalStake += stake
    totalWin += result.finalWin
    if (result.finalWin > 0) hits += 1
    if (result.bonusResult) bonuses += 1
    if (result.freeSpinsAwarded > 0) freeSpins += 1
    const multiplier = result.finalWin / stake
    biggestMultiplier = Math.max(biggestMultiplier, multiplier)
    const bucket = multiplier === 0 ? '0x' : multiplier < 2 ? '<2x' : multiplier < 5 ? '2-5x' : multiplier < 20 ? '5-20x' : '20x+'
    distribution[bucket] = (distribution[bucket] ?? 0) + 1
  }

  return {
    spins,
    seed,
    stake,
    rtp: totalStake ? totalWin / totalStake : 0,
    hitFrequency: spins ? hits / spins : 0,
    bonusFrequency: spins ? bonuses / spins : 0,
    freeSpinFrequency: spins ? freeSpins / spins : 0,
    averageWin: spins ? totalWin / spins : 0,
    biggestMultiplier,
    distribution,
  }
}

function symbol(
  name: string,
  slug: string,
  type: SlotSymbolType,
  reelWeight: number,
  payoutMultiplierThree: number | null,
  assetUrl: string,
  sortOrder: number,
): SlotSymbolConfig {
  return {
    name,
    slug,
    assetUrl,
    type,
    reelWeight,
    payoutMultiplierTwo: null,
    payoutMultiplierThree,
    isWild: false,
    isScatter: false,
    isBonus: false,
    isActive: true,
    sortOrder,
  }
}

function segment(
  label: string,
  type: SlotBonusWheelSegmentType,
  value: number,
  weight: number,
  sortOrder: number,
): SlotBonusWheelSegmentConfig {
  return { label, type, value, weight, isActive: true, sortOrder }
}

function line(...positions: Array<[0 | 1 | 2, 0 | 1 | 2]>): SlotPosition[] {
  return positions.map(([row, reel]) => ({ row, reel }))
}

function createGrid(symbols: SlotSymbolConfig[], random: RandomSource): SlotGrid {
  const reelSymbols = symbols.filter((slotSymbol) => slotSymbol.isActive && slotSymbol.reelWeight > 0)
  return [0, 1, 2].map(() =>
    [0, 1, 2].map(() => pickWeighted(reelSymbols, random).slug),
  ) as SlotGrid
}

function pickWeighted<T extends { weight?: number; reelWeight?: number }>(items: T[], random: RandomSource): T {
  if (!items.length) {
    throw new Error('Geen actieve slotitems gevonden')
  }
  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, item.weight ?? item.reelWeight ?? 0), 0)
  if (totalWeight <= 0) return items[0]

  let cursor = random() * totalWeight
  for (const item of items) {
    cursor -= Math.max(0, item.weight ?? item.reelWeight ?? 0)
    if (cursor <= 0) return item
  }
  return items[items.length - 1]
}

function evaluateScatterWin(grid: SlotGrid, symbols: SlotSymbolConfig[], stake: number) {
  const scatters = countSymbols(grid, (slotSymbol) => slotSymbol.isScatter, symbols)
  if (scatters >= 3) return roundCredits(stake * 3)
  if (scatters === 2) return roundCredits(stake)
  return 0
}

function countSymbols(
  grid: SlotGrid,
  predicate: (slotSymbol: SlotSymbolConfig) => boolean,
  symbols = defaultSlotSymbols,
) {
  const symbolBySlug = new Map(symbols.map((slotSymbol) => [slotSymbol.slug, slotSymbol]))
  return grid.flat().filter((slug) => {
    const slotSymbol = symbolBySlug.get(slug)
    return slotSymbol ? predicate(slotSymbol) : false
  }).length
}

function pickFeature(random: RandomSource): Exclude<SlotFeatureType, 'MIEL_CELEBRATION'> {
  const features: Array<Exclude<SlotFeatureType, 'MIEL_CELEBRATION'>> = [
    'MIEL_SMASH_WILD',
    'MIEL_NUDGE',
    'DOUBLE_SMASH',
    'NUMBER_20_MULTIPLIER',
    'BANANA_RAIN',
  ]
  return features[Math.floor(random() * features.length)] ?? 'MIEL_SMASH_WILD'
}

function applyFeature(
  type: Exclude<SlotFeatureType, 'MIEL_CELEBRATION'>,
  grid: SlotGrid,
  symbols: SlotSymbolConfig[],
  random: RandomSource,
): AppliedFeature {
  const nextGrid = cloneGrid(grid)
  const wild = symbols.find((slotSymbol) => slotSymbol.isWild)
  const banana = symbols.find((slotSymbol) => slotSymbol.slug === 'banaan')
  const regularPositions = allPositions().filter((position) => {
    const slotSymbol = symbols.find((symbolConfig) => symbolConfig.slug === nextGrid[position.row][position.reel])
    return slotSymbol && !slotSymbol.isScatter && !slotSymbol.isBonus
  })

  if (type === 'NUMBER_20_MULTIPLIER') {
    const multiplier = [2, 3, 5][Math.floor(random() * 3)] ?? 2
    return {
      grid: nextGrid,
      multiplier,
      plan: { type, multiplier, payload: { shirtNumber: 20, multiplier } },
    }
  }

  if (type === 'MIEL_NUDGE') {
    const reel = Math.floor(random() * 3) as 0 | 1 | 2
    const direction = random() < 0.5 ? 'UP' : 'DOWN'
    const before = nextGrid.map((row) => row[reel])
    const shifted = direction === 'UP' ? [before[1], before[2], before[0]] : [before[2], before[0], before[1]]
    nextGrid[0][reel] = shifted[0]
    nextGrid[1][reel] = shifted[1]
    nextGrid[2][reel] = shifted[2]
    return {
      grid: nextGrid,
      multiplier: 1,
      plan: { type, payload: { reel, direction, before, after: shifted } },
    }
  }

  if (type === 'BANANA_RAIN' && banana) {
    const changed = regularPositions.slice(0, 2).map((position) => ({ ...position, from: nextGrid[position.row][position.reel] }))
    for (const position of changed) nextGrid[position.row][position.reel] = banana.slug
    return { grid: nextGrid, multiplier: 1, plan: { type, payload: { changed } } }
  }

  if (type === 'DOUBLE_SMASH' && wild) {
    const changed = regularPositions.slice(0, 2).map((position) => ({ ...position, from: nextGrid[position.row][position.reel] }))
    for (const position of changed) nextGrid[position.row][position.reel] = wild.slug
    return { grid: nextGrid, multiplier: 1, plan: { type, payload: { changed, to: wild.slug } } }
  }

  const target = regularPositions[Math.floor(random() * regularPositions.length)] ?? { row: 1, reel: 1 }
  const previousSymbol = nextGrid[target.row][target.reel]
  if (wild) nextGrid[target.row][target.reel] = wild.slug
  return {
    grid: nextGrid,
    multiplier: 1,
    plan: {
      type: 'MIEL_SMASH_WILD',
      payload: { row: target.row, reel: target.reel, from: previousSymbol, to: wild?.slug ?? previousSymbol },
    },
  }
}

function allPositions(): SlotPosition[] {
  return [
    { row: 0, reel: 0 },
    { row: 0, reel: 1 },
    { row: 0, reel: 2 },
    { row: 1, reel: 0 },
    { row: 1, reel: 1 },
    { row: 1, reel: 2 },
    { row: 2, reel: 0 },
    { row: 2, reel: 1 },
    { row: 2, reel: 2 },
  ]
}

function cloneGrid(grid: SlotGrid): SlotGrid {
  return grid.map((row) => [...row]) as SlotGrid
}

function roundCredits(value: number) {
  return Math.round(value)
}
