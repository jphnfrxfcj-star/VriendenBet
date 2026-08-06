'use client'

import { useMemo, useState, useTransition } from 'react'
import { Info, Minus, Plus, RotateCw, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { GorillaAnimation, type GorillaAnimationState } from '@/components/slot/GorillaAnimation'
import { cn, formatCredits } from '@/lib/utils'
import { spinSlotAction, type SlotSpinPayload } from './actions'

type SymbolView = {
  slug: string
  name: string
  type: string
  isWild: boolean
  isScatter: boolean
  isBonus: boolean
}

type JackpotView = {
  type: string
  currentAmount: number
}

type RecentSpinView = {
  id: string
  stake: number
  finalWin: number
  featureType: string | null
  createdAt: string
}

type SlotMachineProps = {
  canSpin: boolean
  initialBalance: number
  availableStakes: number[]
  symbols: SymbolView[]
  jackpots: JackpotView[]
  recentSpins: RecentSpinView[]
  activeFreeSpins: number
  initialGrid?: SlotSpinPayload['finalGrid']
}

const emptyGrid: SlotSpinPayload['finalGrid'] = [
  ['pint', 'voetbal', 'bbq'],
  ['truitje-20', 'miel', 'banaan'],
  ['bus', 'premiumfles', 'wild'],
]

const visualBySlug: Record<string, string> = {
  pint: 'PT',
  voetbal: 'VB',
  bbq: 'BQ',
  bus: 'BUS',
  premiumfles: 'GF',
  'truitje-20': '20',
  banaan: 'BN',
  miel: 'MI',
  'gouden-gorilla': 'GG',
  wild: 'W',
  scatter: 'SC',
  bonus: 'BO',
}

export function SlotMachine({
  canSpin,
  initialBalance,
  availableStakes,
  symbols,
  jackpots,
  recentSpins,
  activeFreeSpins,
  initialGrid,
}: SlotMachineProps) {
  const [balance, setBalance] = useState(initialBalance)
  const [stakeIndex, setStakeIndex] = useState(0)
  const [grid, setGrid] = useState(initialGrid ?? emptyGrid)
  const [lastSpin, setLastSpin] = useState<SlotSpinPayload | null>(null)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState(recentSpins)
  const [freeSpins, setFreeSpins] = useState(activeFreeSpins)
  const [muted, setMuted] = useState(true)
  const [animationLevel, setAnimationLevel] = useState<'full' | 'limited' | 'skip'>('full')
  const [gorillaState, setGorillaState] = useState<GorillaAnimationState>('idle')
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const stake = availableStakes[stakeIndex] ?? availableStakes[0] ?? 5
  const hasFreeSpin = freeSpins > 0
  const effectiveCost = hasFreeSpin ? 0 : stake
  const insufficientBalance = effectiveCost > balance
  const symbolBySlug = useMemo(() => new Map(symbols.map((slotSymbol) => [slotSymbol.slug, slotSymbol])), [symbols])
  const reduced = animationLevel !== 'full'

  function changeStake(direction: -1 | 1) {
    setStakeIndex((current) => Math.min(Math.max(current + direction, 0), availableStakes.length - 1))
  }

  function spin() {
    if (!canSpin || isPending || pendingKey || insufficientBalance) return
    const idempotencyKey = crypto.randomUUID()
    setPendingKey(idempotencyKey)
    setMessage('')
    setGorillaState('entrance')

    startTransition(async () => {
      const result = await spinSlotAction({ stake, idempotencyKey })
      if (!result.ok || !result.spin) {
        setMessage(result.message)
        setGorillaState('idle')
        setPendingKey(null)
        return
      }

      const spinResult = result.spin
      setGrid(spinResult.finalGrid)
      setBalance(spinResult.balanceAfter)
      setLastSpin(spinResult)
      setHistory((items) => [
        {
          id: spinResult.spinId,
          stake: spinResult.stake,
          finalWin: spinResult.finalWin,
          featureType: spinResult.featureType,
          createdAt: spinResult.createdAt,
        },
        ...items.slice(0, 7),
      ])
      setFreeSpins((current) => Math.max(0, current - (current > 0 ? 1 : 0) + spinResult.freeSpinsAwarded))
      setMessage(result.message)

      if (animationLevel === 'skip') {
        setGorillaState('idle')
      } else if (spinResult.featureType?.includes('NUDGE')) {
        setGorillaState('nudge')
      } else if (spinResult.featureType) {
        setGorillaState('smash')
      } else if (spinResult.finalWin >= spinResult.stake * 10) {
        setGorillaState('celebrate')
      } else {
        setGorillaState('idle')
      }
      window.setTimeout(() => setGorillaState(spinResult.finalWin > 0 ? 'celebrate' : 'idle'), reduced ? 250 : 900)
      setPendingKey(null)
    })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="slot-machine-shell overflow-hidden rounded-md border border-amber-300/35 bg-[#102016] p-3 shadow-2xl shadow-black/25 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <GorillaAnimation state={gorillaState} reduced={reduced} />

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Credits" value={formatCredits(balance)} />
              <Metric label="Inzet" value={hasFreeSpin ? 'Free spin' : formatCredits(stake)} />
              <Metric label="Laatste winst" value={formatCredits(lastSpin?.finalWin ?? 0)} />
              <Metric label="Free spins" value={String(freeSpins)} />
            </div>

            <div
              className={cn(
                'grid aspect-square max-h-[min(70vh,520px)] min-h-72 w-full grid-cols-3 gap-2 rounded-md border border-amber-300/45 bg-[#08130d] p-2 sm:gap-3 sm:p-3',
                isPending && animationLevel === 'full' ? 'animate-[slot-reel-pulse_700ms_ease-in-out_infinite]' : '',
              )}
              aria-label="Miel Smash rollen"
            >
              {grid.flatMap((row, rowIndex) =>
                row.map((slug, reelIndex) => {
                  const slotSymbol = symbolBySlug.get(slug)
                  const winning = lastSpin?.evaluatedPaylines.some((line) =>
                    line.positions.some((position) => position.row === rowIndex && position.reel === reelIndex),
                  )
                  return (
                    <div
                      key={`${rowIndex}-${reelIndex}`}
                      className={cn(
                        'grid min-h-0 place-items-center rounded-md border bg-[#123121] p-2 text-center shadow-inner',
                        winning ? 'border-primary text-primary' : 'border-white/10 text-foreground',
                        slotSymbol?.isWild ? 'bg-amber-300 text-[#11180d]' : '',
                        slotSymbol?.isScatter ? 'bg-cyan-300 text-[#07171b]' : '',
                        slotSymbol?.isBonus ? 'bg-fuchsia-300 text-[#1d0a1f]' : '',
                      )}
                    >
                      <div className="grid gap-1">
                        <span className="text-2xl font-black leading-none sm:text-4xl">
                          {visualBySlug[slug] ?? slug.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-[10px] font-black uppercase leading-tight opacity-80 sm:text-xs">
                          {slotSymbol?.name ?? slug}
                        </span>
                      </div>
                    </div>
                  )
                }),
              )}
            </div>

            <div className="grid gap-3 rounded-md border border-amber-300/25 bg-black/20 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => changeStake(-1)} disabled={stakeIndex === 0 || isPending} aria-label="Inzet verlagen">
                  <Minus className="size-4" />
                </Button>
                <div className="min-w-28 rounded-md bg-card px-3 py-2 text-center font-black">{formatCredits(stake)}</div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => changeStake(1)}
                  disabled={stakeIndex >= availableStakes.length - 1 || isPending}
                  aria-label="Inzet verhogen"
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <Button
                type="button"
                onClick={spin}
                disabled={!canSpin || isPending || Boolean(pendingKey) || insufficientBalance}
                className="min-h-14 text-lg"
              >
                <RotateCw className={cn('size-5', isPending ? 'animate-spin' : '')} />
                {hasFreeSpin ? 'FREE SPIN' : 'SPIN'}
              </Button>

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setMuted((current) => !current)} aria-label={muted ? 'Geluid aanzetten' : 'Geluid dempen'}>
                  {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </Button>
                <label className="sr-only" htmlFor="animationLevel">
                  Animatieniveau
                </label>
                <Select id="animationLevel" value={animationLevel} onChange={(event) => setAnimationLevel(event.target.value as typeof animationLevel)} className="w-36">
                  <option value="full">Animaties</option>
                  <option value="limited">Beperkt</option>
                  <option value="skip">Overslaan</option>
                </Select>
              </div>
            </div>

            {message || insufficientBalance || !canSpin ? (
              <p className="rounded-md border border-amber-300/25 bg-black/20 px-3 py-2 text-sm font-bold text-muted-foreground">
                {!canSpin ? 'Alleen Miel kan spins uitvoeren.' : insufficientBalance ? 'Onvoldoende credits voor deze inzet.' : message}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <aside className="grid gap-5 xl:self-start">
        <section className="rounded-md border bg-card p-4">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Info className="size-5 text-primary" />
            Jackpots
          </h2>
          <div className="mt-3 grid gap-2">
            {jackpots.map((jackpot) => (
              <div key={jackpot.type} className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2">
                <span className="font-black">{jackpot.type}</span>
                <strong className="text-primary">{formatCredits(jackpot.currentAmount)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border bg-card p-4">
          <h2 className="text-lg font-black">Recente spins</h2>
          <div className="mt-3 grid gap-2">
            {history.length ? (
              history.map((spinResult) => (
                <div key={spinResult.id} className="grid gap-1 rounded-md bg-secondary px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{formatCredits(spinResult.stake)}</strong>
                    <strong className={spinResult.finalWin > 0 ? 'text-primary' : 'text-muted-foreground'}>
                      {formatCredits(spinResult.finalWin)}
                    </strong>
                  </div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">{spinResult.featureType ?? 'Basis spin'}</p>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Nog geen spins.</p>
            )}
          </div>
        </section>
      </aside>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-amber-300/25 bg-black/25 p-3">
      <p className="text-[11px] font-black uppercase leading-tight text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xl font-black text-primary sm:text-2xl">{value}</p>
    </div>
  )
}
