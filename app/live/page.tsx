import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/StatusBadge'
import { footballMatch, weekendEvents, wallet } from '@/lib/demo-data'
import { formatCredits } from '@/lib/utils'

export default function LivePage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:py-10">
      <div>
        <p className="mb-2 text-xs font-black uppercase text-primary">Read-only</p>
        <h1 className="text-4xl font-black tracking-normal md:text-5xl">Live overzicht</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{weekendEvents[0].title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <StatusBadge status={weekendEvents[0].status} />
            <p className="text-muted-foreground">Miels keuze: Team Groen</p>
            <p className="font-black">Mogelijke winst: {formatCredits(wallet.openStake * weekendEvents[0].odds[0].finalOdds)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{footballMatch.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <StatusBadge status={footballMatch.status} />
            <p className="text-muted-foreground">Betbuilder: 3 selecties</p>
            <p className="font-black">Mogelijke winst: {formatCredits(footballMatch.betBuilder.potentialPayout)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
