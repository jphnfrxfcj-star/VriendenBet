import { defaultSlotEngineConfig, simulateSlot } from '../lib/slot-machine'

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, value] = argument.replace(/^--/, '').split('=')
    return [key, value ?? 'true']
  }),
)

const spins = Number(args.get('spins') ?? 100000)
const seed = Number(args.get('seed') ?? 12345)
const stake = Number(args.get('stake') ?? defaultSlotEngineConfig.availableStakes[1] ?? 10)

if (!Number.isInteger(spins) || spins <= 0) {
  throw new Error('Gebruik --spins met een positief geheel getal')
}

const result = simulateSlot(defaultSlotEngineConfig, spins, seed, stake)

console.log(JSON.stringify(result, null, 2))
