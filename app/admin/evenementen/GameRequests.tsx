import Link from 'next/link'
import { DeleteButton } from '../DeleteButton'
import { prisma } from '@/lib/prisma'
import { AdminForm } from '../AdminForm'
import { AdminCard, Field, SubmitButton } from '../shared'
import { approveGameSuggestionAction, rejectGameSuggestionAction } from './suggestions'

export async function GameRequests() {
  const requests = await prisma.gameSuggestion.findMany({ include: { submittedByUser: true, event: true }, orderBy: { createdAt: 'desc' } })
  const pending = requests.filter((request) => !request.event && request.status !== 'REJECTED')
  const handled = requests.filter((request) => request.event || request.status === 'REJECTED')
  return <section id="aanvragen" className="scroll-mt-4">
    <AdminCard title={`Spelaanvragen (${pending.length})`} description="Goedkeuren voegt het spel meteen toe aan jullie overzicht. Controleer de teams en het aantal spelers per team.">
      <div className="grid gap-3">
        {!pending.length && <p className="text-sm text-muted-foreground">Geen aanvragen om te beoordelen.</p>}
        {pending.map((request) => <article key={request.id} className="grid gap-3 rounded-md border bg-secondary p-3">
          <div><h3 className="font-black">{request.title}</h3><p className="text-xs text-muted-foreground">Aangevraagd door {request.submittedByUser?.displayName ?? 'anoniem'}</p></div>
          {request.description && <p className="whitespace-pre-wrap text-sm">{request.description}</p>}
          {request.proposedRules && <p className="whitespace-pre-wrap text-sm">{request.proposedRules}</p>}
          <AdminForm action={approveGameSuggestionAction} className="grid gap-3 sm:grid-cols-3 sm:items-end">
            <input type="hidden" name="id" value={request.id} />
            <Field name="teamCount" label="Aantal teams" type="number" min={2} max={8} defaultValue={request.proposedTeamCount ?? 2} required />
            <Field name="playersPerTeam" label="Spelers per team" type="number" min={1} max={50} defaultValue={request.proposedPlayersPerTeam ?? 1} required />
            <SubmitButton>Goedkeuren en spel toevoegen</SubmitButton>
          </AdminForm>
          <AdminForm action={rejectGameSuggestionAction}><input type="hidden" name="id" value={request.id} /><SubmitButton>Afwijzen</SubmitButton></AdminForm>
          <DeleteButton kind="suggestion" id={request.id} name={request.title} consequences="De aanvraag verdwijnt uit het overzicht." />
        </article>)}
        {handled.length > 0 && <details><summary className="cursor-pointer text-sm font-bold">Afgehandelde aanvragen ({handled.length})</summary>
          <div className="mt-3 grid gap-2">{handled.map((request) => <div key={request.id} className="rounded-md border p-3"><p className="text-sm">{request.title} · {request.event ? <Link className="text-primary underline" href={`/weekendspellen/${request.event.id}`}>Goedgekeurd — bekijk spel</Link> : 'Afgewezen'}</p><DeleteButton kind="suggestion" id={request.id} name={request.title} consequences="De aanvraag verdwijnt. Aanvragen die nog aan een spel gekoppeld zijn, kunnen niet worden verwijderd." /></div>)}</div>
        </details>}
      </div>
    </AdminCard>
  </section>
}
