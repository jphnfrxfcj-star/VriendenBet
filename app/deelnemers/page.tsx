import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { participants } from '@/lib/demo-data'

export default function ParticipantsPage() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:py-10">
      <div>
        <p className="mb-2 text-xs font-black uppercase text-primary">Ratings</p>
        <h1 className="text-4xl font-black tracking-normal md:text-5xl">Deelnemers</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((participant) => {
          const values = Object.values(participant.stats)
          const average = values.reduce((sum, value) => sum + value, 0) / values.length
          const sorted = Object.entries(participant.stats).sort((a, b) => b[1] - a[1])
          return (
            <Card key={participant.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-md bg-primary text-lg font-black text-primary-foreground">
                    {participant.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle>{participant.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{participant.nickname ?? 'Weekenddeelnemer'}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-center justify-between rounded-md bg-secondary p-3">
                  <span className="text-sm font-bold text-muted-foreground">Gemiddelde rating</span>
                  <strong className="text-primary">{average.toFixed(1)}</strong>
                </div>
                <p className="text-sm text-muted-foreground">Sterk: {sorted.slice(0, 3).map(([name]) => name).join(', ')}</p>
                <p className="text-sm text-muted-foreground">Werkpunt: {sorted.slice(-2).map(([name]) => name).join(', ')}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
