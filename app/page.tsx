import Link from 'next/link'
import Image from 'next/image'
import { Activity, Banknote, CalendarClock, Trophy, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/StatusBadge'
import { getDashboardData } from '@/lib/dashboard'
import { formatCredits, formatOdd } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const dashboard = await getDashboardData()

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:py-10">
      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="relative overflow-hidden rounded-md border bg-card/88 p-5 shadow-2xl shadow-black/20 md:p-8">
          <Image
            src="/hero-vriendenbet.png"
            alt=""
            fill
            priority
            className="absolute inset-0 -z-10 object-cover opacity-30"
            sizes="(min-width: 1024px) 760px, 100vw"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-card via-card/92 to-card/40" />
          <p className="mb-3 text-xs font-black uppercase text-primary">Besloten weekend sportsbook</p>
          <h1 className="max-w-3xl text-5xl font-black leading-none tracking-normal md:text-7xl">MielBet</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Twee ludieke modules: dynamische weekendspellen met ratings en een aparte betbuilder
            voor Miels voetbalwedstrijd. Alleen virtuele eurobudgetten, geen echt geld.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-black text-primary-foreground" href="/weekendspellen">
              Open weekendspellen
            </Link>
            <Link className="inline-flex min-h-11 items-center rounded-md bg-secondary px-4 py-2 text-sm font-black" href="/match">
              Naar voetbalmatch
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Wallet Miel</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-md bg-primary p-4 text-primary-foreground">
              <div className="text-xs font-black uppercase">Saldo</div>
              <div className="mt-1 text-4xl font-black">{formatCredits(dashboard.balance)}</div>
            </div>
            <Metric icon={Banknote} label="Openstaande inzet" value={formatCredits(dashboard.openStake)} />
            <Metric icon={Trophy} label="Mogelijke return" value={formatCredits(dashboard.possibleReturn)} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-5 text-primary" />
              Volgende activiteit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.nextEvent ? (
              <>
                <p className="font-black">{dashboard.nextEvent.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{dashboard.nextEvent.startsAt}</p>
                <div className="mt-4"><StatusBadge status={dashboard.nextEvent.status} /></div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Geen open weekendactiviteit.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              Actieve match
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.activeMatch ? (
              <>
                <p className="font-black">
                  {dashboard.activeMatch.homeTeam} vs {dashboard.activeMatch.awayTeam}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {dashboard.activeMatch.startsAt}
                  {dashboard.activeMatch.venue ? ` · ${dashboard.activeMatch.venue}` : ''}
                </p>
                <div className="mt-4"><StatusBadge status={dashboard.activeMatch.status} /></div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Geen open voetbalmatch.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Huidige betbuilder</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.currentBuilder ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {dashboard.currentBuilder.selectionCount} selecties gecombineerd
                </p>
                <p className="mt-2 text-3xl font-black text-primary">
                  @ {formatOdd(dashboard.currentBuilder.finalOdds)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Potentieel: {formatCredits(dashboard.currentBuilder.potentialPayout)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nog geen open betbuilder.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-secondary p-3">
      <span className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
        <Icon className="size-4 text-primary" />
        {label}
      </span>
      <span className="font-black">{value}</span>
    </div>
  )
}
