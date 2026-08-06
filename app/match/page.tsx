import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/StatusBadge'
import { OddsButton } from '@/components/OddsButton'
import { footballMatch } from '@/lib/demo-data'
import { getEligibleFootballSelectionsForMiel } from '@/lib/eligibility'
import { prisma } from '@/lib/prisma'
import { BetBuilder } from './BetBuilder'

export const dynamic = 'force-dynamic'

export default async function MatchPage() {
  const match = await getMatchData()

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:py-10">
      <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-5 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-black uppercase text-primary">Module 2 · Sportsbook</p>
                  <h1 className="text-4xl font-black tracking-normal md:text-5xl">{match.title}</h1>
                  <p className="mt-3 text-muted-foreground">
                    {match.homeTeam} vs {match.awayTeam} · {match.startsAt}
                  </p>
                </div>
                <StatusBadge status={match.status} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Populaire voetbalmarkten</CardTitle>
              <p className="text-sm text-muted-foreground">
                Verboden of manipuleerbare selecties blijven zichtbaar als read-only maar kunnen niet in de betbuilder.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {match.selections.map((selection) => (
                <OddsButton
                  key={selection.id}
                  label={selection.disabled ? `${selection.label} · geblokkeerd` : selection.label}
                  odds={selection.finalOdds}
                  disabled={selection.disabled}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Betbuilder</CardTitle>
              <p className="text-sm text-muted-foreground">Kies minstens twee selecties. De inzet wordt meteen van Miels saldo gehaald.</p>
            </CardHeader>
            <CardContent>
              <BetBuilder matchId={match.dbBacked ? match.id : undefined} selections={match.selections} />
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  )
}

async function getMatchData() {
  try {
    const match = await prisma.footballMatch.findFirst({
      where: { status: { in: ['OPEN', 'LIVE', 'LOCKED'] } },
      include: {
        markets: {
          where: { status: { in: ['OPEN', 'LOCKED'] } },
          include: { selections: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { startsAt: 'asc' },
    })
    if (match) {
      const selections = match.markets.flatMap((market) => market.selections)
      const eligible = getEligibleFootballSelectionsForMiel(
        selections.map((selection) => ({
          id: selection.id,
          label: selection.label,
          finalOdds: Number(selection.finalOdds),
          eligibilityType: selection.eligibilityType,
          isManipulable: selection.isManipulable,
        })),
        true,
      )
      const eligibleIds = new Set(eligible.map((selection) => selection.id))

      return {
        id: match.id,
        dbBacked: true,
        title: match.title,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        status: match.status,
        startsAt: match.startsAt.toLocaleString('nl-BE'),
        selections: selections.map((selection) => ({
          id: selection.id,
          label: selection.line ? `${selection.label} ${selection.line}` : selection.label,
          finalOdds: Number(selection.finalOdds),
          disabled: !eligibleIds.has(selection.id) || match.status !== 'OPEN',
        })),
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
  }

  const eligible = getEligibleFootballSelectionsForMiel(footballMatch.selections, true)
  const eligibleIds = new Set(eligible.map((selection) => selection.id))
  return {
    id: 'demo-match',
    dbBacked: false,
    title: footballMatch.title,
    homeTeam: footballMatch.homeTeam,
    awayTeam: footballMatch.awayTeam,
    status: footballMatch.status,
    startsAt: footballMatch.startsAt,
    selections: footballMatch.selections.map((selection) => ({
      id: selection.id,
      label: selection.label,
      finalOdds: selection.finalOdds,
      disabled: !eligibleIds.has(selection.id),
    })),
  }
}
