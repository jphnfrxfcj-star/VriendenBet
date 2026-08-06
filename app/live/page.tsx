import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/StatusBadge'
import { getDashboardData } from '@/lib/dashboard'
import { formatCredits, formatOdd } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function LivePage() {
  const dashboard = await getDashboardData()
  const openTickets = dashboard.tickets.filter((ticket) => ['PENDING', 'PLACED', 'DRAFT'].includes(ticket.status))

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:py-10">
      <div>
        <p className="mb-2 text-xs font-black uppercase text-primary">Read-only</p>
        <h1 className="text-4xl font-black tracking-normal md:text-5xl">Live overzicht</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Actuele status op basis van Miels wallet, open bets en administratief ingestelde resultaten.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric title="Saldo" value={formatCredits(dashboard.balance)} />
        <Metric title="Open inzet" value={formatCredits(dashboard.openStake)} />
        <Metric title="Mogelijke return" value={formatCredits(dashboard.possibleReturn)} />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {dashboard.nextEvent ? (
          <Card>
            <CardHeader>
              <CardTitle>{dashboard.nextEvent.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <StatusBadge status={dashboard.nextEvent.status} />
              <p className="text-muted-foreground">{dashboard.nextEvent.startsAt}</p>
              <p className="font-black">Open inzet: {formatCredits(dashboard.openStake)}</p>
            </CardContent>
          </Card>
        ) : null}

        {dashboard.activeMatch ? (
          <Card>
            <CardHeader>
              <CardTitle>{dashboard.activeMatch.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <StatusBadge status={dashboard.activeMatch.status} />
              <p className="text-muted-foreground">
                {dashboard.activeMatch.homeTeam} vs {dashboard.activeMatch.awayTeam}
              </p>
              <p className="font-black">
                Betbuilder:{' '}
                {dashboard.currentBuilder
                  ? `${dashboard.currentBuilder.selectionCount} selecties @ ${formatOdd(dashboard.currentBuilder.finalOdds)}`
                  : 'geen open betbuilder'}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Openstaande weddenschappen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {openTickets.length ? (
            openTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-md border bg-secondary p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-primary">{ticket.type}</p>
                    <h2 className="font-black">{ticket.title}</h2>
                    <p className="text-sm text-muted-foreground">{ticket.subtitle}</p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  <p className="flex justify-between rounded-md bg-card px-3 py-2">
                    <span>Inzet</span>
                    <strong>{formatCredits(ticket.stake)}</strong>
                  </p>
                  <p className="flex justify-between rounded-md bg-card px-3 py-2">
                    <span>Odd</span>
                    <strong className="text-primary">@ {formatOdd(ticket.odds)}</strong>
                  </p>
                  <p className="flex justify-between rounded-md bg-card px-3 py-2">
                    <span>Mogelijk</span>
                    <strong className="text-primary">{formatCredits(ticket.potentialPayout)}</strong>
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">
              Geen openstaande weddenschappen.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-black uppercase text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-black text-primary">{value}</p>
      </CardContent>
    </Card>
  )
}
