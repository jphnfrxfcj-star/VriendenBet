'use client'

import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { Info, Minus, Plus, RotateCw, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { GorillaAnimation, type GorillaAnimationState } from '@/components/slot/GorillaAnimation'
import { cn, formatCredits } from '@/lib/utils'
import { spinSlotAction, type SlotSpinPayload } from './actions'

type SymbolView = {
  slug: string
  name: string
  assetUrl: string
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
  const [isReeling, setIsReeling] = useState(false)
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
    setIsReeling(animationLevel !== 'skip')

    startTransition(async () => {
      const startedAt = Date.now()
      const result = await spinSlotAction({ stake, idempotencyKey })
      const minimumSpinMs = animationLevel === 'full' ? 1450 : animationLevel === 'limited' ? 650 : 0
      const remainingMs = Math.max(0, minimumSpinMs - (Date.now() - startedAt))
      if (remainingMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingMs))
      }
      if (!result.ok || !result.spin) {
        setMessage(result.message)
        setGorillaState('idle')
        setIsReeling(false)
        setPendingKey(null)
        return
      }

      const spinResult = result.spin
      setIsReeling(false)
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
      <section className="slot-machine-shell overflow-hidden rounded-md border border-amber-300/50 bg-[#102016] p-3 shadow-2xl shadow-black/25 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300/30 bg-black/35 px-4 py-3">
          <div>
            <p className="text-[11px] font-black uppercase text-amber-300">Temple reels</p>
            <h2 className="text-2xl font-black leading-none text-foreground">Smash-kast</h2>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-black text-primary">
            {jackpots.slice(0, 3).map((jackpot) => (
              <div key={jackpot.type} className="rounded border border-amber-300/30 bg-[#112416] px-2 py-1">
                <span className="block text-muted-foreground">{jackpot.type}</span>
                {formatCredits(jackpot.currentAmount)}
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <GorillaAnimation
            state={gorillaState}
            reduced={reduced}
            className="order-2 mx-auto w-full max-w-56 lg:order-none lg:max-w-none"
          />

          <div className="order-1 grid gap-4 lg:order-none">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Credits" value={formatCredits(balance)} />
              <Metric label="Inzet" value={hasFreeSpin ? 'Free spin' : formatCredits(stake)} />
              <Metric label="Laatste winst" value={formatCredits(lastSpin?.finalWin ?? 0)} />
              <Metric label="Free spins" value={String(freeSpins)} />
            </div>

            <div className="relative rounded-md border border-amber-300/55 bg-[#050b07] p-2 shadow-[0_0_50px_rgba(250,204,21,0.16)] sm:p-3">
              <div
                className={cn(
                  'relative grid aspect-square max-h-[min(70vh,520px)] min-h-72 w-full grid-cols-3 gap-2 overflow-hidden rounded-md bg-[#08130d] p-2 sm:gap-3 sm:p-3',
                  isReeling && animationLevel === 'full' ? 'animate-[slot-reel-pulse_700ms_ease-in-out_infinite]' : '',
                )}
                aria-label="Miel Smash rollen"
              >
                {[0, 1, 2].map((reelIndex) => (
                  <div key={reelIndex} className="slot-reel-window">
                    <div
                      className={cn('grid h-full grid-rows-3 gap-2 sm:gap-3', isReeling ? 'slot-reel-strip' : '')}
                      style={{ animationDelay: `${reelIndex * 110}ms`, animationDuration: `${520 + reelIndex * 95}ms` }}
                    >
                      {(isReeling ? spinningSymbols(symbols, reelIndex) : [0, 1, 2].map((rowIndex) => grid[rowIndex][reelIndex])).map((slug, rowIndex) => {
                        const visibleRow = isReeling ? rowIndex % 3 : rowIndex
                        const winning = !isReeling && lastSpin?.evaluatedPaylines.some((line) =>
                          line.positions.some((position) => position.row === visibleRow && position.reel === reelIndex),
                        )
                        return (
                          <SymbolTile
                            key={`${reelIndex}-${rowIndex}-${slug}`}
                            slotSymbol={symbolBySlug.get(slug)}
                            slug={slug}
                            winning={Boolean(winning)}
                            spinning={isReeling}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
                <PaylineOverlay lines={isReeling ? [] : lastSpin?.evaluatedPaylines ?? []} />
                {isReeling ? <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-px bg-primary/80 shadow-[0_0_18px_hsl(var(--primary))]" /> : null}
              </div>
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

function SymbolTile({
  slotSymbol,
  slug,
  winning,
  spinning,
}: {
  slotSymbol?: SymbolView
  slug: string
  winning: boolean
  spinning: boolean
}) {
  return (
    <div
      className={cn(
        'slot-symbol-tile grid min-h-0 place-items-center rounded-md border p-2 text-center shadow-inner',
        winning ? 'slot-symbol-winning border-primary text-primary' : 'border-white/10 text-foreground',
        slotSymbol?.isWild ? 'slot-symbol-wild' : '',
        slotSymbol?.isScatter ? 'slot-symbol-scatter' : '',
        slotSymbol?.isBonus ? 'slot-symbol-bonus' : '',
        spinning ? 'slot-symbol-spinning' : '',
      )}
    >
      <div className="grid justify-items-center gap-1">
        {slotSymbol?.assetUrl ? (
          <Image
            src={slotSymbol.assetUrl}
            alt=""
            width={72}
            height={72}
            className="h-10 w-10 object-contain drop-shadow-[0_0_10px_rgba(250,204,21,0.35)] sm:h-16 sm:w-16"
          />
        ) : (
          <span className="text-2xl font-black leading-none sm:text-4xl">{visualBySlug[slug] ?? slug.slice(0, 2).toUpperCase()}</span>
        )}
        <span className="max-w-full truncate text-[9px] font-black uppercase leading-tight opacity-85 sm:text-[11px]">
          {slotSymbol?.name ?? slug}
        </span>
      </div>
    </div>
  )
}

function PaylineOverlay({ lines }: { lines: NonNullable<SlotSpinPayload['evaluatedPaylines']> }) {
  if (!lines.length) return null

  return (
    <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full" viewBox="0 0 300 300" aria-hidden="true">
      {lines.map((line, index) => {
        const points = line.positions
          .map((position) => `${50 + position.reel * 100},${50 + position.row * 100}`)
          .join(' ')
        return (
          <polyline
            key={`${line.name}-${index}`}
            points={points}
            fill="none"
            stroke={index % 2 === 0 ? '#b7ff1a' : '#facc15'}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="slot-payline"
          />
        )
      })}
    </svg>
  )
}

function spinningSymbols(symbols: SymbolView[], reelIndex: number) {
  const active = symbols.map((slotSymbol) => slotSymbol.slug)
  if (!active.length) return emptyGrid.flat()
  return Array.from({ length: 18 }, (_, index) => active[(index + reelIndex * 4) % active.length])
}
