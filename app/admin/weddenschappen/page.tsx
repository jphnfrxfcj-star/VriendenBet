import Link from 'next/link'
import { openEventForBettingAction, openFootballMatchForBettingAction } from '../actions'
import { AdminCard, AdminPageShell, EmptyState, SubmitButton } from '../shared'
import { StatusBadge } from '@/components/StatusBadge'
import { prisma } from '@/lib/prisma'
import { formatCredits, formatOdd } from '@/lib/utils'

type AdminBetRow = {
  id: string
  type: string
  title: string
  selection: string
  user: string
  status: string
  stake: number
  odds: number
  potentialPayout: number
  payout: number | null
  placedAt: Date | null
}

type BetOpenControl = {
  id: string
  kind: 'weekend' | 'football'
  title: string
  subtitle: string
  status: string
  href: string
  readyLabel: string
  canOpen: boolean
  blockedReason?: string
}

const openStatuses = new Set(['PENDING', 'PLACED', 'DRAFT'])

export default async function AdminBetsPage() {
  const [bets, controls] = await Promise.all([getAdminBets(), getBetOpenControls()])
  const openBets = bets.filter((bet) => openStatuses.has(bet.status))
  const settledBets = bets.filter((bet) => !openStatuses.has(bet.status))

  return (
    <AdminPageShell
      title="Weddenschappen"
      subtitle="Alle openstaande en afgehandelde bets van Miel, inclusief inzet, odds, return en payout."
    >
      <AdminCard
        title="Weddenschappen openzetten"
        description="Maak weekendspellen of voetbalmarkten beschikbaar voor Miel zodra odds en selecties klaarstaan."
      >
        {controls.length ? <OpenControlList controls={controls} /> : <EmptyState>Geen spellen of matches om open te zetten.</EmptyState>}
      </AdminCard>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Openstaand" value={String(openBets.length)} />
        <Metric label="Open inzet" value={formatCredits(openBets.reduce((sum, bet) => sum + bet.stake, 0))} />
        <Metric
          label="Mogelijke return"
          value={formatCredits(openBets.reduce((sum, bet) => sum + bet.potentialPayout, 0))}
        />
      </section>

      <AdminCard title="Openstaande weddenschappen">
        {openBets.length ? (
          <BetList bets={openBets} />
        ) : (
          <EmptyState>Geen openstaande weddenschappen.</EmptyState>
        )}
      </AdminCard>

      <AdminCard title="Wedgeschiedenis">
        {settledBets.length ? (
          <BetList bets={settledBets} />
        ) : (
          <EmptyState>Nog geen afgehandelde weddenschappen.</EmptyState>
        )}
      </AdminCard>
    </AdminPageShell>
  )
}

function OpenControlList({ controls }: { controls: BetOpenControl[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {controls.map((control) => (
        <article key={`${control.kind}-${control.id}`} className="grid gap-3 rounded-md border bg-secondary p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-primary">
                {control.kind === 'weekend' ? 'Weekendspel' : 'Voetbalmatch'}
              </p>
              <h2 className="break-words text-lg font-black leading-tight">{control.title}</h2>
              <p className="text-sm text-muted-foreground">{control.subtitle}</p>
            </div>
            <StatusBadge status={control.status} />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-md bg-card p-3">
            <div>
              <p className="text-sm font-black">{control.readyLabel}</p>
              {control.blockedReason ? (
                <p className="mt-1 text-xs font-bold text-muted-foreground">{control.blockedReason}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={control.href} className="inline-flex min-h-11 items-center rounded-md bg-secondary px-3 py-2 text-sm font-black">
                Beheren
              </Link>
              <form action={control.kind === 'weekend' ? openEventForBettingAction : openFootballMatchForBettingAction}>
                <input type="hidden" name="id" value={control.id} />
                <SubmitButton disabled={!control.canOpen}>
                  {control.status === 'ODDS_READY' || control.status === 'OPEN' ? 'Staat open' : 'Openzetten'}
                </SubmitButton>
              </form>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black text-primary">{value}</p>
    </div>
  )
}

function BetList({ bets }: { bets: AdminBetRow[] }) {
  return (
    <div className="grid gap-3">
      {bets.map((bet) => (
        <article key={bet.id} className="grid gap-3 rounded-md border bg-secondary p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-primary">{bet.type}</p>
              <h2 className="text-xl font-black">{bet.title}</h2>
              <p className="text-sm text-muted-foreground">
                {bet.selection} · {bet.user}
              </p>
            </div>
            <StatusBadge status={bet.status} />
          </div>
          <div className="grid gap-2 text-sm md:grid-cols-5">
            <Line label="Inzet" value={formatCredits(bet.stake)} />
            <Line label="Odd" value={`@ ${formatOdd(bet.odds)}`} highlight />
            <Line label="Mogelijk" value={formatCredits(bet.potentialPayout)} highlight />
            <Line label="Payout" value={bet.payout === null ? '-' : formatCredits(bet.payout)} />
            <Line label="Geplaatst" value={bet.placedAt?.toLocaleString('nl-BE') ?? '-'} />
          </div>
        </article>
      ))}
    </div>
  )
}

function Line({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <p className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2">
      <span className="font-bold text-muted-foreground">{label}</span>
      <strong className={highlight ? 'text-primary' : ''}>{value}</strong>
    </p>
  )
}

async function getBetOpenControls(): Promise<BetOpenControl[]> {
  const [events, matches] = await Promise.all([
    prisma.event.findMany({
      include: { gameTemplate: true, teams: true, bets: true },
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
      take: 8,
    }),
    prisma.footballMatch.findMany({
      include: { markets: { include: { selections: true } }, betBuilders: true },
      orderBy: [{ startsAt: 'asc' }],
      take: 8,
    }),
  ])

  return [
    ...events.map((event) => {
      const teamsWithOdds = event.teams.filter((team) => team.finalOdds).length
      const isClosed = ['BET_PLACED', 'IN_PROGRESS', 'SETTLED', 'CANCELLED'].includes(event.status)
      const isOpen = event.status === 'ODDS_READY'
      const canOpen = !isOpen && !isClosed && teamsWithOdds >= 2
      return {
        id: event.id,
        kind: 'weekend' as const,
        title: event.title,
        subtitle: `${event.gameTemplate.name} · ${event.startsAt?.toLocaleString('nl-BE') ?? 'geen startmoment'}`,
        status: event.status,
        href: '/admin/evenementen',
        readyLabel: `${teamsWithOdds} teams met final odds · ${event.bets.length} bets`,
        canOpen,
        blockedReason: canOpen || isOpen ? undefined : teamsWithOdds < 2 ? 'Voeg minstens twee teams met final odds toe.' : 'Deze status kan niet meer opengezet worden.',
      }
    }),
    ...matches.map((match) => {
      const openableMarkets = match.markets.filter((market) => !['SETTLED', 'CANCELLED'].includes(market.status))
      const selectionCount = openableMarkets.reduce((sum, market) => sum + market.selections.length, 0)
      const isClosed = ['LOCKED', 'LIVE', 'FINISHED', 'SETTLED', 'CANCELLED'].includes(match.status)
      const isOpen = match.status === 'OPEN'
      const canOpen = !isOpen && !isClosed && openableMarkets.length > 0 && selectionCount > 0
      return {
        id: match.id,
        kind: 'football' as const,
        title: match.title,
        subtitle: `${match.homeTeam} vs ${match.awayTeam} · ${match.startsAt.toLocaleString('nl-BE')}`,
        status: match.status,
        href: '/admin/voetbal',
        readyLabel: `${openableMarkets.length} markten · ${selectionCount} selecties · ${match.betBuilders.length} betbuilders`,
        canOpen,
        blockedReason: canOpen || isOpen ? undefined : selectionCount < 1 ? 'Maak minstens een markt met selectie aan.' : 'Deze status kan niet meer opengezet worden.',
      }
    }),
  ]
}

async function getAdminBets(): Promise<AdminBetRow[]> {
  const [eventBets, builders] = await Promise.all([
    prisma.eventBet.findMany({
      include: { event: true, selectedTeam: true, mielUser: true },
      orderBy: { placedAt: 'desc' },
    }),
    prisma.footballBetBuilder.findMany({
      include: {
        footballMatch: true,
        mielUser: true,
        selections: { include: { footballSelection: true } },
      },
      orderBy: [{ placedAt: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  return [
    ...eventBets.map((bet) => ({
      id: bet.id,
      type: 'Weekendspel',
      title: bet.event.title,
      selection: bet.selectedTeam.name,
      user: bet.mielUser.displayName,
      status: bet.status,
      stake: Number(bet.stake),
      odds: Number(bet.oddsAtPlacement),
      potentialPayout: Number(bet.potentialPayout),
      payout: bet.payout === null ? null : Number(bet.payout),
      placedAt: bet.placedAt,
    })),
    ...builders.map((builder) => ({
      id: builder.id,
      type: 'Voetbalbetbuilder',
      title: builder.footballMatch.title,
      selection: builder.selections.map((selection) => selection.footballSelection.label).join(' + '),
      user: builder.mielUser.displayName,
      status: builder.status,
      stake: Number(builder.stake),
      odds: Number(builder.finalOdds),
      potentialPayout: Number(builder.potentialPayout),
      payout: builder.payout === null ? null : Number(builder.payout),
      placedAt: builder.placedAt ?? builder.createdAt,
    })),
  ].sort((a, b) => (b.placedAt?.getTime() ?? 0) - (a.placedAt?.getTime() ?? 0))
}
