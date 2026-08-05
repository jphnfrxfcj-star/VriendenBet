import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/StatusBadge'
import { OddsButton } from '@/components/OddsButton'
import { footballMatch } from '@/lib/demo-data'
import { getEligibleFootballSelectionsForMiel } from '@/lib/eligibility'
import { formatCredits, formatOdd } from '@/lib/utils'

export default function MatchPage() {
  const eligible = getEligibleFootballSelectionsForMiel(footballMatch.selections, true)
  const selected = eligible.slice(0, 3)

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:py-10">
      <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-5 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-black uppercase text-primary">Module 2 · Sportsbook</p>
                  <h1 className="text-4xl font-black tracking-normal md:text-5xl">{footballMatch.title}</h1>
                  <p className="mt-3 text-muted-foreground">
                    {footballMatch.homeTeam} vs {footballMatch.awayTeam} · {footballMatch.startsAt}
                  </p>
                </div>
                <StatusBadge status={footballMatch.status} />
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
              {footballMatch.selections.map((selection) => {
                const allowed = eligible.some((item) => item.id === selection.id)
                return (
                  <OddsButton
                    key={selection.id}
                    label={allowed ? selection.label : `${selection.label} · geblokkeerd`}
                    odds={selection.finalOdds}
                    disabled={!allowed}
                  />
                )
              })}
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Betbuilder</CardTitle>
              <p className="text-sm text-muted-foreground">Voorbeeldselecties met correctiefactor 0,90.</p>
            </CardHeader>
            <CardContent className="grid gap-3">
              {selected.map((selection) => (
                <div key={selection.id} className="flex items-center justify-between rounded-md bg-secondary p-3">
                  <span className="text-sm font-black">{selection.label}</span>
                  <span className="font-black text-primary">{formatOdd(selection.finalOdds)}</span>
                </div>
              ))}
              <div className="rounded-md border p-3 text-sm">
                <div className="flex justify-between"><span>Ruwe odd</span><strong>{formatOdd(footballMatch.betBuilder.rawCombinedOdds)}</strong></div>
                <div className="mt-1 flex justify-between"><span>Correctiefactor</span><strong>{footballMatch.betBuilder.correctionFactor}</strong></div>
                <div className="mt-2 flex justify-between text-lg"><span>Finale odd</span><strong className="text-primary">{formatOdd(footballMatch.betBuilder.finalOdds)}</strong></div>
              </div>
              <Input type="number" min={10} max={250} defaultValue={50} />
              <div className="rounded-md bg-primary p-3 font-black text-primary-foreground">
                Mogelijke uitbetaling: {formatCredits(footballMatch.betBuilder.potentialPayout)}
              </div>
              <Button>Plaats betbuilder</Button>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  )
}
