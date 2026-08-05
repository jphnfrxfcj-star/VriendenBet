import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { footballMatch, wallet, weekendEvents } from '@/lib/demo-data'
import { formatCredits } from '@/lib/utils'

export default function AdminDashboardPage() {
  const metrics = [
    ['Actieve evenementen', weekendEvents.filter((event) => event.status !== 'DRAFT').length],
    ['Af te handelen', 2],
    ['Miels saldo', formatCredits(wallet.balance)],
    ['Open voetbalmarkten', footballMatch.selections.length],
  ]

  return (
    <div className="grid gap-5">
      <div>
        <p className="mb-2 text-xs font-black uppercase text-primary">Bert en Jean</p>
        <h1 className="text-4xl font-black tracking-normal">Admin dashboard</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-primary">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Recente auditacties</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <p>SEED_DATABASE · System · MielBet basisdata</p>
          <p>ODDS_CALCULATED · EventTeam · Touwtrekken 4 tegen 4</p>
          <p>WALLET_CREATED · Wallet · Miel startcredits</p>
        </CardContent>
      </Card>
    </div>
  )
}
