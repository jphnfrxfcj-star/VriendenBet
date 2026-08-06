'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Flame, Info, Minus, Play, Plus, Repeat2, RotateCw, Sparkles, Square, Trophy, Volume2, VolumeX, Zap } from 'lucide-react'
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
  showAnimationControls?: boolean
  smashVideoSources?: VideoSource[]
  initialBalance: number
  availableStakes: number[]
  symbols: SymbolView[]
  jackpots: JackpotView[]
  recentSpins: RecentSpinView[]
  activeFreeSpins: number
  initialGrid?: SlotSpinPayload['finalGrid']
}

type VideoSource = {
  src: string
  type: string
}

type CelebrationKind = 'win' | 'big-win' | 'mega-win' | 'jackpot' | 'free-spins' | 'free-spins-total' | 'smash'

type Celebration = {
  id: number
  kind: CelebrationKind
  title: string
  amount?: number
  detail?: string
}

type FreeSpinRun = {
  totalSpins: number
  remaining: number
  played: number
  totalWin: number
  lastWin: number
}

type SmashStage = {
  id: number
  sources: VideoSource[]
  title: string
  detail: string
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

function classifyWin(win: number, spinStake: number): CelebrationKind {
  if (win >= spinStake * 25) return 'mega-win'
  if (win >= spinStake * 10) return 'big-win'
  return 'win'
}

function titleForWin(kind: CelebrationKind) {
  if (kind === 'mega-win') return 'MEGA WIN'
  if (kind === 'big-win') return 'BIG WIN'
  return 'WIN'
}

export function SlotMachine({
  canSpin,
  showAnimationControls = false,
  smashVideoSources = [],
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
  const [gorillaTick, setGorillaTick] = useState(0)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [autoSpinTarget, setAutoSpinTarget] = useState(10)
  const [autoSpinsRemaining, setAutoSpinsRemaining] = useState(0)
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const [smashStage, setSmashStage] = useState<SmashStage | null>(null)
  const [freeSpinRun, setFreeSpinRun] = useState<FreeSpinRun | null>(() =>
    activeFreeSpins > 0
      ? {
          totalSpins: activeFreeSpins,
          remaining: activeFreeSpins,
          played: 0,
          totalWin: 0,
          lastWin: 0,
        }
      : null,
  )
  const freeSpinRunRef = useRef(freeSpinRun)
  const reelsRef = useRef<HTMLDivElement>(null)
  const smashTimerRef = useRef<number | null>(null)
  const smashResolveRef = useRef<(() => void) | null>(null)

  const stake = availableStakes[stakeIndex] ?? availableStakes[0] ?? 5
  const hasFreeSpin = freeSpins > 0
  const effectiveCost = hasFreeSpin ? 0 : stake
  const insufficientBalance = effectiveCost > balance
  const symbolBySlug = useMemo(() => new Map(symbols.map((slotSymbol) => [slotSymbol.slug, slotSymbol])), [symbols])
  const reduced = animationLevel !== 'full'
  const busy = isSpinning || Boolean(pendingKey)
  const autoRunning = autoSpinsRemaining > 0

  useEffect(() => {
    freeSpinRunRef.current = freeSpinRun
  }, [freeSpinRun])

  const playGorilla = useCallback((state: GorillaAnimationState) => {
    setGorillaState(state)
    setGorillaTick((current) => current + 1)
  }, [])

  const showCelebration = useCallback((next: Omit<Celebration, 'id'>) => {
    setCelebration({ ...next, id: Date.now() })
    if (window.innerWidth < 768) {
      window.setTimeout(() => reelsRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50)
    }
  }, [])

  useEffect(() => {
    if (!celebration) return
    const timer = window.setTimeout(
      () => setCelebration((current) => (current?.id === celebration.id ? null : current)),
      celebration.kind === 'free-spins-total' || celebration.kind === 'mega-win' || celebration.kind === 'jackpot' ? 4200 : 2400,
    )
    return () => window.clearTimeout(timer)
  }, [celebration])

  const finishSmashTransition = useCallback(() => {
    if (smashTimerRef.current) {
      window.clearTimeout(smashTimerRef.current)
      smashTimerRef.current = null
    }
    setSmashStage(null)
    smashResolveRef.current?.()
    smashResolveRef.current = null
  }, [])

  const playSmashTransition = useCallback((detail: string) => {
    if (window.innerWidth < 768) {
      window.setTimeout(() => reelsRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50)
    }
    if (smashTimerRef.current) {
      window.clearTimeout(smashTimerRef.current)
      smashTimerRef.current = null
    }
    smashResolveRef.current?.()
    smashResolveRef.current = null
    setCelebration(null)
    setSmashStage({
      id: Date.now(),
      sources: smashVideoSources,
      title: 'MIEL SMASH',
      detail,
    })

    return new Promise<void>((resolve) => {
      smashResolveRef.current = resolve
      smashTimerRef.current = window.setTimeout(finishSmashTransition, smashVideoSources.length ? 3600 : 2200)
    })
  }, [finishSmashTransition, smashVideoSources])

  useEffect(() => {
    return () => {
      if (smashTimerRef.current) {
        window.clearTimeout(smashTimerRef.current)
      }
      smashResolveRef.current?.()
    }
  }, [])

  function changeStake(direction: -1 | 1) {
    setStakeIndex((current) => Math.min(Math.max(current + direction, 0), availableStakes.length - 1))
  }

  function triggerAnimationDemo(kind: CelebrationKind | GorillaAnimationState) {
    if (kind === 'entrance' || kind === 'smash' || kind === 'nudge' || kind === 'celebrate' || kind === 'idle') {
      playGorilla(kind)
      if (kind === 'smash') {
        void playSmashTransition('Animatie-test zonder spin of walletwijziging.')
      }
      return
    }

    playGorilla(kind === 'free-spins' ? 'smash' : 'celebrate')
    if (kind === 'free-spins') {
      showCelebration({ kind, title: 'FREE SPINS', detail: '5 automatische spins gestart.' })
      return
    }
    showCelebration({
      kind,
      title: kind === 'free-spins-total' ? 'FREE SPINS TOTAAL' : titleForWin(kind),
      amount: kind === 'mega-win' || kind === 'free-spins-total' ? stake * 28 : kind === 'big-win' ? stake * 12 : stake * 4,
      detail: 'Animatie-test zonder walletwijziging.',
    })
  }

  const spin = useCallback(async (mode: 'manual' | 'auto' | 'free' = 'manual') => {
    if (!canSpin || isSpinning || pendingKey || insufficientBalance) return
    const freeSpinAtStart = freeSpins > 0
    const idempotencyKey = crypto.randomUUID()
    setPendingKey(idempotencyKey)
    setIsSpinning(true)
    setMessage('')
    playGorilla('entrance')
    setIsReeling(animationLevel !== 'skip')

    try {
      const startedAt = Date.now()
      const result = await spinSlotAction({ stake, idempotencyKey })
      const minimumSpinMs = animationLevel === 'full' ? 1450 : animationLevel === 'limited' ? 650 : 0
      const remainingMs = Math.max(0, minimumSpinMs - (Date.now() - startedAt))
      if (remainingMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingMs))
      }
      if (!result.ok || !result.spin) {
        setMessage(result.message)
        playGorilla('idle')
        setIsReeling(false)
        setAutoSpinsRemaining(0)
        setPendingKey(null)
        setIsSpinning(false)
        return
      }

      const spinResult = result.spin
      const jackpotWin = spinResult.jackpotResult?.reduce((sum, jackpot) => sum + jackpot.amount, 0) ?? 0
      setIsReeling(false)
      if (animationLevel === 'full' && spinResult.featureType) {
        setGrid(spinResult.initialGrid)
        playGorilla(spinResult.featureType.includes('NUDGE') ? 'nudge' : 'smash')
        await playSmashTransition('Miel slaat blokken naar beneden voor een betere combinatie.')
      }
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
      const nextFreeSpins = Math.max(0, freeSpins - (freeSpinAtStart ? 1 : 0) + spinResult.freeSpinsAwarded)
      setFreeSpins(nextFreeSpins)
      if (spinResult.freeSpinsAwarded > 0 && !freeSpinAtStart) {
        setFreeSpinRun({
          totalSpins: spinResult.freeSpinsAwarded,
          remaining: spinResult.freeSpinsAwarded,
          played: 0,
          totalWin: 0,
          lastWin: 0,
        })
        showCelebration({
          kind: 'free-spins',
          title: 'FREE SPINS',
          detail: `${spinResult.freeSpinsAwarded} automatische spins gewonnen.`,
        })
      }
      if (freeSpinAtStart) {
        const currentRun = freeSpinRunRef.current ?? {
          totalSpins: freeSpins,
          remaining: freeSpins,
          played: 0,
          totalWin: 0,
          lastWin: 0,
        }
        const updatedRun = {
          totalSpins: currentRun.totalSpins + spinResult.freeSpinsAwarded,
          remaining: Math.max(0, currentRun.remaining - 1 + spinResult.freeSpinsAwarded),
          played: currentRun.played + 1,
          totalWin: currentRun.totalWin + spinResult.finalWin,
          lastWin: spinResult.finalWin,
        }
        setFreeSpinRun(updatedRun.remaining > 0 ? updatedRun : null)
        if (updatedRun.remaining === 0) {
          const kind = classifyWin(updatedRun.totalWin, spinResult.stake)
          showCelebration({
            kind: 'free-spins-total',
            title: kind === 'mega-win' ? 'MEGA FREE WIN' : kind === 'big-win' ? 'BIG FREE WIN' : 'FREE SPINS TOTAAL',
            amount: updatedRun.totalWin,
            detail: `${updatedRun.played} free spins uitgespeeld.`,
          })
        } else if (spinResult.finalWin > 0) {
          showCelebration({
            kind: classifyWin(spinResult.finalWin, spinResult.stake),
            title: `FREE SPIN +${formatCredits(spinResult.finalWin)}`,
            amount: updatedRun.totalWin,
            detail: `Totaal na ${updatedRun.played}/${updatedRun.totalSpins} spins.`,
          })
        }
      } else if (jackpotWin > 0) {
        showCelebration({ kind: 'jackpot', title: 'JACKPOT', amount: jackpotWin, detail: 'Jackpot geraakt.' })
      } else if (spinResult.finalWin > 0 && spinResult.freeSpinsAwarded === 0) {
        const kind = classifyWin(spinResult.finalWin, spinResult.stake)
        showCelebration({ kind, title: titleForWin(kind), amount: spinResult.finalWin })
      }
      if (mode === 'auto' && !freeSpinAtStart) {
        setAutoSpinsRemaining((current) => Math.max(0, current - 1))
      }
      setMessage(result.message)

      if (animationLevel === 'skip') {
        playGorilla('idle')
      } else if (spinResult.featureType?.includes('NUDGE')) {
        playGorilla('nudge')
      } else if (spinResult.featureType) {
        playGorilla('smash')
      } else if (spinResult.finalWin > 0) {
        playGorilla('celebrate')
      } else {
        playGorilla('idle')
      }
      window.setTimeout(() => playGorilla(spinResult.finalWin > 0 ? 'celebrate' : 'idle'), reduced ? 250 : 900)
      setPendingKey(null)
      setIsSpinning(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Spin mislukt')
      playGorilla('idle')
      setIsReeling(false)
      setAutoSpinsRemaining(0)
      setPendingKey(null)
      setIsSpinning(false)
    }
  }, [animationLevel, canSpin, freeSpins, insufficientBalance, isSpinning, pendingKey, playGorilla, playSmashTransition, reduced, showCelebration, stake])

  useEffect(() => {
    if (!canSpin || busy || insufficientBalance) return

    if (freeSpins > 0) {
      const timer = window.setTimeout(() => {
        void spin('free')
      }, animationLevel === 'skip' ? 120 : 700)
      return () => window.clearTimeout(timer)
    }

    if (autoSpinsRemaining > 0) {
      const timer = window.setTimeout(() => {
        void spin('auto')
      }, animationLevel === 'skip' ? 120 : 800)
      return () => window.clearTimeout(timer)
    }
  }, [animationLevel, autoSpinsRemaining, busy, canSpin, freeSpins, insufficientBalance, spin])

  function toggleAutoSpin() {
    if (autoRunning) {
      setAutoSpinsRemaining(0)
      return
    }
    if (!canSpin || busy || insufficientBalance) return
    setAutoSpinsRemaining(autoSpinTarget)
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
            animationKey={gorillaTick}
            className="order-2 mx-auto w-full max-w-56 lg:order-none lg:max-w-none"
          />

          <div className="order-1 grid gap-4 lg:order-none">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Credits" value={formatCredits(balance)} />
              <Metric label="Inzet" value={hasFreeSpin ? 'Free spin' : formatCredits(stake)} />
              <Metric label="Laatste winst" value={formatCredits(lastSpin?.finalWin ?? 0)} />
              <Metric label="Free spins" value={String(freeSpins)} />
            </div>

            {freeSpinRun ? (
              <div className="grid gap-2 rounded-md border border-primary/45 bg-primary/10 p-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-black uppercase text-muted-foreground">Free spins run</p>
                  <p className="font-black text-foreground">
                    {freeSpinRun.played}/{freeSpinRun.totalSpins} gespeeld
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase text-muted-foreground">Opgeteld</p>
                  <p className="font-black text-primary">{formatCredits(freeSpinRun.totalWin)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase text-muted-foreground">Laatste free spin</p>
                  <p className="font-black text-foreground">{formatCredits(freeSpinRun.lastWin)}</p>
                </div>
              </div>
            ) : null}

            <div className="relative rounded-md border border-amber-300/55 bg-[#050b07] p-2 shadow-[0_0_50px_rgba(250,204,21,0.16)] sm:p-3">
              <div
                ref={reelsRef}
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
                {smashStage ? <SmashVideoOverlay muted={muted} stage={smashStage} onDone={finishSmashTransition} /> : null}
                {celebration ? <SlotCelebrationOverlay celebration={celebration} /> : null}
              </div>
            </div>

            <div className="grid gap-3 rounded-md border border-amber-300/25 bg-black/20 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => changeStake(-1)} disabled={stakeIndex === 0 || busy || autoRunning} aria-label="Inzet verlagen">
                  <Minus className="size-4" />
                </Button>
                <div className="min-w-28 rounded-md bg-card px-3 py-2 text-center font-black">{formatCredits(stake)}</div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => changeStake(1)}
                  disabled={stakeIndex >= availableStakes.length - 1 || busy || autoRunning}
                  aria-label="Inzet verhogen"
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <Button
                type="button"
                onClick={() => void spin('manual')}
                disabled={!canSpin || busy || insufficientBalance || autoRunning}
                className="min-h-14 text-lg"
              >
                <RotateCw className={cn('size-5', isSpinning ? 'animate-spin' : '')} />
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

            <div className="grid gap-3 rounded-md border border-amber-300/25 bg-black/20 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div className="grid gap-1">
                <p className="text-[11px] font-black uppercase leading-tight text-muted-foreground">Auto spin</p>
                <p className="text-sm font-black text-primary">
                  {freeSpins > 0 ? `Free spins automatisch: ${freeSpins}` : autoRunning ? `Nog ${autoSpinsRemaining} spins` : 'Kies aantal rondes'}
                </p>
                {freeSpinRun ? <p className="text-xs font-bold text-muted-foreground">Sessie totaal {formatCredits(freeSpinRun.totalWin)}</p> : null}
              </div>
              <Select
                value={String(autoSpinTarget)}
                onChange={(event) => setAutoSpinTarget(Number(event.target.value))}
                disabled={busy || autoRunning}
                className="w-full sm:w-28"
                aria-label="Aantal auto spins"
              >
                {[5, 10, 25, 50].map((count) => (
                  <option key={count} value={count}>
                    {count}x
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant={autoRunning ? 'danger' : 'secondary'}
                onClick={toggleAutoSpin}
                disabled={!canSpin || busy || (!autoRunning && insufficientBalance)}
              >
                {autoRunning ? <Square className="size-4" /> : <Repeat2 className="size-4" />}
                {autoRunning ? 'Stop' : 'Start'}
              </Button>
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

        {showAnimationControls ? (
          <section className="rounded-md border bg-card p-4">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <Play className="size-5 text-primary" />
              Test animaties
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={() => triggerAnimationDemo('smash')}>
                <Zap className="size-4" />
                Smash
              </Button>
              <Button type="button" variant="secondary" onClick={() => triggerAnimationDemo('win')}>
                <Sparkles className="size-4" />
                Win
              </Button>
              <Button type="button" variant="secondary" onClick={() => triggerAnimationDemo('big-win')}>
                <Trophy className="size-4" />
                Big win
              </Button>
              <Button type="button" variant="secondary" onClick={() => triggerAnimationDemo('free-spins')}>
                <Flame className="size-4" />
                Free spins
              </Button>
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  )
}

function SmashVideoOverlay({
  stage,
  muted,
  onDone,
}: {
  stage: SmashStage
  muted: boolean
  onDone: () => void
}) {
  return (
    <div key={stage.id} className="slot-smash-video pointer-events-none absolute inset-0 z-50 overflow-hidden rounded-md">
      <div className="absolute inset-0 bg-[url('/slot/miel-smash-backdrop.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-[#102616]/45 to-black/75" />
      {stage.sources.length ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted={muted}
          playsInline
          preload="auto"
          onEnded={onDone}
        >
          {stage.sources.map((source) => (
            <source key={source.src} src={source.src} type={source.type} />
          ))}
        </video>
      ) : (
        <div className="slot-smash-fallback absolute inset-0">
          <div className="slot-smash-block slot-smash-block-a" />
          <div className="slot-smash-block slot-smash-block-b" />
          <div className="slot-smash-block slot-smash-block-c" />
          <div className="slot-smash-impact" />
        </div>
      )}
      <div className="absolute inset-x-3 bottom-3 grid justify-items-start rounded-md border border-primary/55 bg-[#06110b]/82 p-3 shadow-[0_0_40px_rgba(183,255,26,0.28)] sm:inset-x-5 sm:bottom-5 sm:p-4">
        <span className="text-[11px] font-black uppercase text-amber-300">Feature video</span>
        <strong className="text-3xl font-black leading-none text-primary sm:text-5xl">{stage.title}</strong>
        <span className="mt-1 max-w-md text-sm font-bold text-foreground/88">{stage.detail}</span>
      </div>
    </div>
  )
}

function SlotCelebrationOverlay({ celebration }: { celebration: Celebration }) {
  const intense = celebration.kind === 'big-win' || celebration.kind === 'mega-win' || celebration.kind === 'jackpot' || celebration.kind === 'free-spins-total'

  return (
    <div
      key={celebration.id}
      className={cn(
        'pointer-events-none absolute inset-0 z-40 grid place-items-center overflow-hidden bg-[#06110b] p-4 text-center',
        intense ? 'slot-celebration-intense' : 'slot-celebration',
      )}
    >
      <div className="slot-celebration-rays absolute inset-0" />
      <div className="slot-celebration-shockwave absolute left-1/2 top-1/2 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-primary/70" />
      <div className="slot-celebration-coin slot-celebration-coin-a">€</div>
      <div className="slot-celebration-coin slot-celebration-coin-b">€</div>
      <div className="slot-celebration-coin slot-celebration-coin-c">€</div>
      <div className="relative z-10 grid w-full max-w-[min(92%,30rem)] justify-items-center gap-2 rounded-md border-2 border-primary bg-[#08130d] px-4 py-4 shadow-[0_0_70px_rgba(183,255,26,0.55)] sm:px-7 sm:py-6">
        <Image
          src="/slot/miel-gorilla/generated/miel-gorilla-v1.png"
          alt=""
          width={144}
          height={180}
          className="slot-celebration-miel h-20 w-auto object-contain drop-shadow-[0_0_22px_rgba(183,255,26,0.55)] sm:h-28"
        />
        <p className="text-[11px] font-black uppercase text-amber-300">{celebration.kind === 'smash' ? 'Feature' : 'Resultaat'}</p>
        <strong className="slot-celebration-title text-4xl font-black leading-none text-primary sm:text-6xl">{celebration.title}</strong>
        {typeof celebration.amount === 'number' ? (
          <span className="slot-count-pop text-4xl font-black leading-none text-foreground sm:text-6xl">{formatCredits(celebration.amount)}</span>
        ) : null}
        {celebration.detail ? <span className="max-w-80 text-sm font-bold text-foreground/82">{celebration.detail}</span> : null}
      </div>
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
