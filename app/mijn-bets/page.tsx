import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { footballMatch, weekendEvents } from '@/lib/demo-data'
import { formatCredits, formatOdd } from '@/lib/utils'

export default function MyBetsPage() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 md:py-10">
      <div>
        <p className="mb-2 text-xs font-black uppercase text-primary">Miel only</p>
        <h1 className="text-4xl font-black tracking-normal md:text-5xl">Mijn bets</h1>
      </div>

      <div className="grid grid-cols-4 overflow-hidden rounded-md border text-center text-sm font-black">
        {['Openstaand', 'Gewonnen', 'Verloren', 'Terugbetaald'].map((tab, index) => (
          <div key={tab} className={index === 0 ? 'bg-primary p-3 text-primary-foreground' : 'bg-card p-3 text-muted-foreground'}>
            {tab}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekendspel</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 rounded-md bg-secondary p-4">
          <div>
            <p className="font-black">{weekendEvents[0].title}</p>
            <p className="text-sm text-muted-foreground">Team Groen · inzet {formatCredits(50)}</p>
          </div>
          <strong className="text-primary">@ {formatOdd(weekendEvents[0].odds[0].finalOdds)}</strong>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voetbalbetbuilder</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 rounded-md bg-secondary p-4">
          <div>
            <p className="font-black">{footballMatch.title}</p>
            <p className="text-sm text-muted-foreground">3 selecties · potentieel {formatCredits(footballMatch.betBuilder.potentialPayout)}</p>
          </div>
          <strong className="text-primary">@ {formatOdd(footballMatch.betBuilder.finalOdds)}</strong>
        </CardContent>
      </Card>
    </div>
  )
}
