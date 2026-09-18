import { AdminForm } from '../AdminForm'
import { overrideEventTeamOddsAction } from '../actions'
import { Field, SubmitButton } from '../shared'

export function OddsOverrideForm({ teamId, odds, finished }: { teamId: string; odds?: number; finished: boolean }) {
  return <div className="mt-3 grid gap-3 border-t pt-3">
    <h3 className="text-sm font-black text-primary">Odds aanpassen</h3>
    {finished ? <p className="text-sm text-muted-foreground">Dit spel is afgesloten. De odds kunnen niet meer worden aangepast.</p>
      : !odds ? <p className="text-sm text-muted-foreground">Kies eerst de spelers en sla de volledige teams op. Daarna kun je hier de odds aanpassen.</p>
      : <AdminForm key={`${teamId}:${odds}`} action={overrideEventTeamOddsAction} className="grid gap-3">
        <input type="hidden" name="id" value={teamId} />
        <Field name="overriddenOdds" label="Nieuwe odd" type="number" min={1.01} max={999999.99} step="0.01" defaultValue={odds} required />
        <Field name="reason" label="Reden" placeholder="Bijvoorbeeld: Correctie" required />
        <p className="text-xs text-muted-foreground">Geldt voor nieuwe inzetten. Bestaande weddenschappen behouden hun odd. Teams opnieuw opslaan berekent de odds opnieuw.</p>
        <SubmitButton>Odds opslaan</SubmitButton>
      </AdminForm>}
  </div>
}
