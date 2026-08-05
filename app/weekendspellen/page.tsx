import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/StatusBadge'
import { weekendEvents } from '@/lib/demo-data'
import { formatOdd } from '@/lib/utils'

export default function WeekendGamesPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:py-10">
      <div>
        <p className="mb-2 text-xs font-black uppercase text-primary">Module 1</p>
        <h1 className="text-4xl font-black tracking-normal md:text-5xl">Dynamische weekendspellen</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Miel stelt deelnemers of teams samen. De server berekent scores, kansen en odds op basis
          van eigenschappen en templategewichten.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {weekendEvents.map((event) => (
          <Link key={event.id} href={`/weekendspellen/${event.id}`}>
            <Card className="h-full transition hover:border-primary">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{event.title}</CardTitle>
                  <StatusBadge status={event.status} />
                </div>
                <p className="text-sm text-muted-foreground">{event.startsAt}</p>
              </CardHeader>
              <CardContent className="grid gap-3">
                {event.odds.length ? (
                  event.odds.map((odd) => (
                    <div key={odd.teamId} className="flex items-center justify-between rounded-md bg-secondary p-3">
                      <span className="font-black">{odd.name}</span>
                      <span className="rounded bg-primary px-2 py-1 text-sm font-black text-primary-foreground">
                        {formatOdd(odd.finalOdds)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    Nog geen teams of odds beschikbaar.
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
