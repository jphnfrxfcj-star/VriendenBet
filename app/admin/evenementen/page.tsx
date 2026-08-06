import {
  addEventTeamMemberAction,
  createEventAction,
  createEventTeamAction,
  overrideEventTeamOddsAction,
  setEventParticipantAction,
  updateEventStatusAction,
} from '../actions'
import {
  AdminCard,
  AdminPageShell,
  CheckField,
  EmptyState,
  Field,
  SelectField,
  SubmitButton,
  TextField,
} from '../shared'
import { prisma } from '@/lib/prisma'
import { formatCredits, formatOdd } from '@/lib/utils'

const eventStatuses = [
  'DRAFT',
  'OPEN_FOR_SELECTION',
  'ODDS_READY',
  'BET_PLACED',
  'IN_PROGRESS',
  'SETTLED',
  'CANCELLED',
].map((status) => ({ value: status, label: status }))

export default async function AdminEventsPage() {
  const [events, templates, participants] = await Promise.all([
    prisma.event.findMany({
      include: {
        gameTemplate: true,
        participants: { include: { participant: true } },
        teams: { include: { members: { include: { participant: true } } } },
        bets: { include: { selectedTeam: true, mielUser: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.gameTemplate.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.participant.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <AdminPageShell
      title="Evenementen en weekendodds"
      subtitle="Maak concrete events, selecteer deelnemers, beheer teams, status en odds-overrides."
    >
      <AdminCard title="Nieuw evenement">
        <form action={createEventAction} className="grid gap-4 md:grid-cols-2">
          <SelectField
            name="gameTemplateId"
            label="Template"
            options={templates.map((template) => ({ value: template.id, label: template.name }))}
          />
          <Field name="title" label="Titel" required />
          <Field name="opensAt" label="Opent op" type="datetime-local" />
          <Field name="startsAt" label="Start op" type="datetime-local" />
          <div className="md:col-span-2">
            <TextField name="description" label="Omschrijving" />
          </div>
          <div className="md:col-span-2">
            <SubmitButton>Evenement toevoegen</SubmitButton>
          </div>
        </form>
      </AdminCard>

      <AdminCard title="Evenementen beheren">
        <div className="grid gap-4">
          {events.length ? (
            events.map((event) => (
              <div key={event.id} className="grid gap-4 rounded-md border bg-secondary p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">{event.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {event.gameTemplate.name} · {event.status} · {event.startsAt?.toLocaleString('nl-BE') ?? 'geen startmoment'}
                    </p>
                  </div>
                  <form action={updateEventStatusAction} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={event.id} />
                    <SelectField name="status" label="Status" defaultValue={event.status} options={eventStatuses} />
                    <SubmitButton>Status</SubmitButton>
                  </form>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-md border bg-background p-3">
                    <h3 className="font-black">Beschikbare deelnemers</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {participants.map((participant) => {
                        const availability = event.participants.find((row) => row.participantId === participant.id)
                        return (
                          <form key={participant.id} action={setEventParticipantAction} className="flex items-center justify-between gap-2 rounded-md bg-secondary p-2">
                            <input type="hidden" name="eventId" value={event.id} />
                            <input type="hidden" name="participantId" value={participant.id} />
                            <CheckField
                              name="isAvailable"
                              label={participant.name}
                              defaultChecked={availability?.isAvailable ?? false}
                            />
                            <SubmitButton>OK</SubmitButton>
                          </form>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-md border bg-background p-3">
                    <h3 className="font-black">Team toevoegen</h3>
                    <form action={createEventTeamAction} className="mt-3 grid gap-3">
                      <input type="hidden" name="eventId" value={event.id} />
                      <Field name="name" label="Teamnaam" required />
                      <Field name="calculatedOdds" label="Calculated odd" type="number" step="0.01" />
                      <Field name="finalOdds" label="Final odd" type="number" step="0.01" />
                      <SubmitButton>Team toevoegen</SubmitButton>
                    </form>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {event.teams.map((team) => (
                    <div key={team.id} className="rounded-md border bg-background p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-black">{team.name}</h3>
                        <span className="text-sm text-primary">
                          final {team.finalOdds ? formatOdd(Number(team.finalOdds)) : '-'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Leden: {team.members.map((member) => member.participant.name).join(', ') || 'nog geen leden'}
                      </p>
                      <form action={addEventTeamMemberAction} className="mt-3 flex items-end gap-2">
                        <input type="hidden" name="eventTeamId" value={team.id} />
                        <SelectField
                          name="participantId"
                          label="Teamlid"
                          options={participants.map((participant) => ({ value: participant.id, label: participant.name }))}
                        />
                        <SubmitButton>Toevoegen</SubmitButton>
                      </form>
                      <form action={overrideEventTeamOddsAction} className="mt-3 grid gap-2 md:grid-cols-[120px_1fr_auto]">
                        <input type="hidden" name="id" value={team.id} />
                        <Field name="overriddenOdds" label="Override" type="number" step="0.01" defaultValue={team.overriddenOdds ? String(team.overriddenOdds) : undefined} />
                        <Field name="reason" label="Reden" placeholder="Verplicht" />
                        <div className="grid content-end">
                          <SubmitButton>Override</SubmitButton>
                        </div>
                      </form>
                    </div>
                  ))}
                </div>

                {event.bets.length ? (
                  <div className="rounded-md border bg-background p-3">
                    <h3 className="font-black">Weddenschappen</h3>
                    <div className="mt-2 grid gap-2">
                      {event.bets.map((bet) => (
                        <p key={bet.id} className="text-sm text-muted-foreground">
                          {bet.mielUser.displayName} koos {bet.selectedTeam.name} · inzet {formatCredits(Number(bet.stake))} · @{' '}
                          {String(bet.oddsAtPlacement)} · status {bet.status}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <EmptyState>Nog geen evenementen.</EmptyState>
          )}
        </div>
      </AdminCard>
    </AdminPageShell>
  )
}
