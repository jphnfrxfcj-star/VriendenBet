import { describe, expect, it } from 'vitest'
import {
  defaultSlotEngineConfig,
  evaluatePaylines,
  evaluateSlotSpin,
  seededRandom,
  simulateSlot,
  type SlotGrid,
} from '../lib/slot-machine'

describe('Miel Smash slot engine', () => {
  it('evaluates a three-symbol payline', () => {
    const grid: SlotGrid = [
      ['pint', 'pint', 'pint'],
      ['bbq', 'bus', 'miel'],
      ['banaan', 'voetbal', 'premiumfles'],
    ]

    const result = evaluatePaylines(grid, defaultSlotEngineConfig.symbols, defaultSlotEngineConfig.paylines, 10)

    expect(result.totalWin).toBe(20)
    expect(result.lines[0]).toMatchObject({
      name: 'Bovenste rij',
      symbolSlug: 'pint',
      multiplier: 2,
    })
  })

  it('lets wilds replace regular symbols but not scatter or bonus', () => {
    const grid: SlotGrid = [
      ['voetbal', 'wild', 'voetbal'],
      ['scatter', 'wild', 'scatter'],
      ['bonus', 'wild', 'bonus'],
    ]

    const result = evaluatePaylines(grid, defaultSlotEngineConfig.symbols, defaultSlotEngineConfig.paylines, 10)

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].symbolSlug).toBe('voetbal')
    expect(result.totalWin).toBe(30)
  })

  it('awards scatter wins independently from paylines', () => {
    const config = {
      ...defaultSlotEngineConfig,
      gorillaFeatureChance: 0,
      bonusFeatureChance: 0,
      symbols: defaultSlotEngineConfig.symbols.map((symbol) => ({
        ...symbol,
        reelWeight: symbol.slug === 'scatter' ? 1 : 0,
      })),
    }

    const result = evaluateSlotSpin(config, 10, seededRandom(1))

    expect(result.scatterWin).toBe(30)
    expect(result.freeSpinsAwarded).toBeGreaterThanOrEqual(5)
  })

  it('caps the final win at the configured maximum multiplier', () => {
    const config = {
      ...defaultSlotEngineConfig,
      maxWinMultiplier: 5,
      gorillaFeatureChance: 0,
      bonusFeatureChance: 0,
      paylines: defaultSlotEngineConfig.paylines,
      symbols: defaultSlotEngineConfig.symbols.map((symbol) => ({
        ...symbol,
        reelWeight: symbol.slug === 'gouden-gorilla' ? 1 : 0,
      })),
    }

    const result = evaluateSlotSpin(config, 10, seededRandom(2))

    expect(result.uncappedWin).toBeGreaterThan(50)
    expect(result.finalWin).toBe(50)
    expect(result.capped).toBe(true)
  })

  it('runs reproducible simulations with a seed', () => {
    const first = simulateSlot(defaultSlotEngineConfig, 1000, 12345, 10)
    const second = simulateSlot(defaultSlotEngineConfig, 1000, 12345, 10)

    expect(second).toEqual(first)
    expect(first.spins).toBe(1000)
    expect(first.distribution).toHaveProperty('0x')
  })
})
