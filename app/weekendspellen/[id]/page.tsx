import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/StatusBadge'
import { OddsButton } from '@/components/OddsButton'
import { participants, weekendEvents } from '@/lib/demo-data'
import { formatCredits, formatOdd } from '@/lib/utils'
import { getEligibleSelectionsForMiel } from '@/lib/eligibility'

export default async function WeekendGameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = weekendEvents.find((item) => item.id === id)
  if (!event) {
    notFound()
  }

  const eligible = getEligibleSelectionsForMiel(
    {
      format: 'TEAM',
      teams: event.teams,
    },
    'p-18',
  )

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-black uppercase text-primary">Weekendspel</p>
          <h1 className="text-4xl font-black tracking-normal md:text-5xl">{event.title}</h1>
          <p className="mt-3 text-muted-foreground">{event.startsAt}</p>
        </div>
        <StatusBadge status={event.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Team-builder</CardTitle>
              <p className="text-sm text-muted-foreground">
                MVP-regel: teamscore is het gemiddelde van de individuele scores, niet de som.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {event.teams.length ? event.teams.map((team) => (
                <div key={team.id} className="rounded-md border bg-secondary p-4">
                  <h2 className="font-black">{team.name}</h2>
                  <div className="mt-3 grid gap-2">
                    {team.memberParticipantIds.map((participantId) => {
                      const participant = participants.find((item) => item.id === participantId)
                      return (
                        <div key={participantId} className="rounded bg-background px-3 py-2 text-sm font-bold">
                          {participant?.name ?? participantId}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">Teams worden zichtbaar zodra Miel ze bevestigt.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scores en odds</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {event.odds.map((odd) => (
                <div key={odd.teamId} className="rounded-md border bg-secondary p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-black">{odd.name}</h2>
                    <span className="text-2xl font-black text-primary">@ {formatOdd(odd.finalOdds)}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Score {odd.score} · kans {(odd.probability * 100).toFixed(1)}% · calculated {formatOdd(odd.calculatedOdds)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Inzetformulier</CardTitle>
              <p className="text-sm text-muted-foreground">Alleen Miel kan inzetten. Maximaal 250 credits.</p>
            </CardHeader>
            <CardContent className="grid gap-3">
              {event.odds.map((odd) => (
                <OddsButton
                  key={odd.teamId}
                  label={eligible.includes(odd.teamId) ? odd.name : `${odd.name} · niet toegestaan`}
                  odds={odd.finalOdds}
                  disabled={!eligible.includes(odd.teamId)}
                />
              ))}
              <Input type="number" min={10} max={250} defaultValue={50} />
              <div className="rounded-md bg-secondary p-3 text-sm">
                Mogelijke uitbetaling bij @ {event.odds[0] ? formatOdd(event.odds[0].finalOdds) : '0,00'}:
                <strong className="ml-2 text-primary">{formatCredits((event.odds[0]?.finalOdds ?? 0) * 50)}</strong>
              </div>
              <Button disabled={event.status !== 'ODDS_READY'}>Plaats virtuele bet</Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
