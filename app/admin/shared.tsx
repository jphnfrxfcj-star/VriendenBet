import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AdminSection({ title, rows }: { title: string; rows: Array<[string, string, string]> }) {
  return (
    <div className="grid gap-5">
      <div>
        <p className="mb-2 text-xs font-black uppercase text-primary">Adminomgeving</p>
        <h1 className="text-4xl font-black tracking-normal">{title}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Overzicht</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {rows.map((row) => (
            <div key={`${row[0]}-${row[1]}`} className="grid gap-2 rounded-md bg-secondary p-3 text-sm md:grid-cols-3">
              <strong>{row[0]}</strong>
              <span className="text-muted-foreground">{row[1]}</span>
              <span className="text-muted-foreground">{row[2]}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
