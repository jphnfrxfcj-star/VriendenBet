import {
  createEventAction,
  createEventTeamAction,
  createEventTeamsFromTemplateAction,
  openEventForTeamSelectionAction,
  openEventForBettingAction,
  setEventParticipantsAction,
  setEventTeamMembersAction,
  setEventTeamOddsAction,
  settleEventAction,
  updateEventStatusAction,
} from '../actions'
import {
  AdminCard,
  AdminPageShell,
  EmptyState,
  Field,
  SelectField,
  SubmitButton,
  TextField,
} from '../shared'
import { StatusBadge } from '@/components/StatusBadge'
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
].map((status) => ({ value: status, label: statusLabel(status) }))

const closedEventStatuses = ['BET_PLACED', 'IN_PROGRESS', 'SETTLED', 'CANCELLED']

export default async function AdminEventsPage() {
  const [events, templates, participants] = await Promise.all([
    prisma.event.findMany({
      include: {
        gameTemplate: true,
        participants: { include: { participant: true } },
        teams: { include: { members: { include: { participant: true } } } },
        bets: { include: { selectedTeam: true, mielUser: true } },
      },
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.gameTemplate.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.participant.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <AdminPageShell
      title="Evenementen"
      subtitle="Snelle bediening voor weekendspellen: maken, teams zetten, odds invullen, openzetten en uitbetalen."
    >
      <AdminCard title="Snel nieuw event">
        <form action={createEventAction} className="grid gap-3 md:grid-cols-[1fr_1fr_220px_auto] md:items-end">
          <SelectField
            name="gameTemplateId"
            label="Template"
            options={templates.map((template) => ({ value: template.id, label: template.name }))}
          />
          <Field name="title" label="Titel" required placeholder="Bijv. Touwtrekken" />
          <Field name="startsAt" label="Start" type="datetime-local" />
          <SubmitButton>Toevoegen</SubmitButton>
          <details className="rounded-md border bg-secondary p-3 md:col-span-4">
            <summary className="cursor-pointer text-sm font-black">Extra velden</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field name="opensAt" label="Opent op" type="datetime-local" />
              <TextField name="description" label="Omschrijving" rows={2} textareaClassName="min-h-20" />
            </div>
          </details>
        </form>
      </AdminCard>

      <AdminCard title="Events beheren">
        <div className="grid gap-4">
          {events.length ? (
            events.map((event) => {
              const teamsWithOdds = event.teams.filter((team) => team.finalOdds).length
              const teamTarget = event.gameTemplate.teamCount
              const missingTeams = Math.max(0, teamTarget - event.teams.length)
              const hasAvailabilityRows = event.participants.length > 0
              const availableParticipants = hasAvailabilityRows
                ? participants.filter((participant) =>
                    event.participants.some((row) => row.participantId === participant.id && row.isAvailable),
                  )
                : participants
              const availableCount = hasAvailabilityRows ? availableParticipants.length : participants.length
              const isOpen = event.status === 'ODDS_READY'
              const isClosed = closedEventStatuses.includes(event.status)
              const canLetMielChooseTeams = event.status === 'DRAFT'
              const canOpenBets = event.status === 'OPEN_FOR_SELECTION' && teamsWithOdds >= 2

              return (
                <article key={event.id} className="grid gap-4 rounded-md border bg-secondary p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase text-primary">{event.gameTemplate.name}</p>
                      <h2 className="break-words text-2xl font-black leading-tight">{event.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {event.startsAt?.toLocaleString('nl-BE') ?? 'Geen startmoment'}
                      </p>
                    </div>
                    <StatusBadge status={event.status} />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <EventFact label="Teams" value={`${event.teams.length}/${teamTarget}`} warn={missingTeams > 0} />
                    <EventFact label="Odds klaar" value={`${teamsWithOdds}/${Math.max(event.teams.length, 1)}`} warn={teamsWithOdds < 2} />
                    <EventFact label="Aanwezig" value={`${availableCount}/${participants.length}`} />
                    <EventFact label="Bets" value={String(event.bets.length)} />
                  </div>

                  <div className="flex flex-wrap gap-2 rounded-md bg-card p-3">
                    <form action={createEventTeamsFromTemplateAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <SubmitButton disabled={missingTeams === 0}>
                        {missingTeams ? `Maak ${missingTeams} teams` : 'Teams klaar'}
                      </SubmitButton>
                    </form>
                    <form action={openEventForTeamSelectionAction}>
                      <input type="hidden" name="id" value={event.id} />
                      <SubmitButton disabled={!canLetMielChooseTeams}>
                        {event.status === 'OPEN_FOR_SELECTION' ? 'Miel kan kiezen' : 'Laat Miel teams kiezen'}
                      </SubmitButton>
                    </form>
                    <form action={openEventForBettingAction}>
                      <input type="hidden" name="id" value={event.id} />
                      <SubmitButton disabled={!canOpenBets}>
                        {isOpen ? 'Staat open' : 'Open voor inzetten'}
                      </SubmitButton>
                    </form>
                    <details className="min-w-56 rounded-md border bg-background p-3">
                      <summary className="cursor-pointer text-sm font-black">Status wijzigen</summary>
                      <form action={updateEventStatusAction} className="mt-3 grid gap-2">
                        <input type="hidden" name="id" value={event.id} />
                        <SelectField name="status" label="Status" defaultValue={event.status} options={eventStatuses} />
                        <SubmitButton>Status opslaan</SubmitButton>
                      </form>
                    </details>
                  </div>

                  {!canOpenBets && !isOpen ? (
                    <p className="rounded-md border border-dashed p-3 text-sm font-bold text-muted-foreground">
                      {openBlockedText(event.status, teamsWithOdds)}
                    </p>
                  ) : null}

                  <details className="rounded-md border bg-background p-3">
                    <summary className="cursor-pointer text-sm font-black">Aanwezigen</summary>
                    <form action={setEventParticipantsAction} className="mt-3 grid gap-3">
                      <input type="hidden" name="eventId" value={event.id} />
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {participants.map((participant) => {
                          const availability = event.participants.find((row) => row.participantId === participant.id)
                          return (
                            <label key={participant.id} className="flex min-h-11 items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-black">
                              <input type="hidden" name="participantId" value={participant.id} />
                              <input
                                name="availableParticipantId"
                                type="checkbox"
                                value={participant.id}
                                defaultChecked={availability?.isAvailable ?? true}
                                className="size-5 accent-lime-300"
                              />
                              {participant.name}
                            </label>
                          )
                        })}
                      </div>
                      <SubmitButton>Aanwezigen opslaan</SubmitButton>
                    </form>
                  </details>

                  <details className="rounded-md border bg-background p-3" open>
                    <summary className="cursor-pointer text-sm font-black">Teams en odds</summary>
                    <div className="mt-3 grid gap-3">
                      <form action={createEventTeamAction} className="grid gap-3 rounded-md bg-secondary p-3 md:grid-cols-[1fr_140px_auto] md:items-end">
                        <input type="hidden" name="eventId" value={event.id} />
                        <Field name="name" label="Nieuw team" required placeholder="Teamnaam" />
                        <Field name="finalOdds" label="Odd" type="number" step="0.01" min={1.01} />
                        <SubmitButton>Team toevoegen</SubmitButton>
                      </form>

                      {event.teams.length ? (
                        <div className="grid gap-3 lg:grid-cols-2">
                          {event.teams.map((team) => (
                            <div key={team.id} className="grid gap-3 rounded-md border bg-secondary p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <h3 className="font-black">{team.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {team.members.map((member) => member.participant.name).join(', ') || 'Nog geen leden'}
                                  </p>
                                </div>
                                <span className="rounded-md bg-card px-3 py-2 text-sm font-black text-primary">
                                  @ {team.finalOdds ? formatOdd(Number(team.finalOdds)) : '-'}
                                </span>
                              </div>

                              <form action={setEventTeamOddsAction} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                                <input type="hidden" name="id" value={team.id} />
                                <Field
                                  name="finalOdds"
                                  label="Odd"
                                  type="number"
                                  step="0.01"
                                  min={1.01}
                                  defaultValue={team.finalOdds ? String(team.finalOdds) : undefined}
                                />
                                <SubmitButton>Odd opslaan</SubmitButton>
                              </form>

                              <form action={setEventTeamMembersAction} className="grid gap-3">
                                <input type="hidden" name="eventTeamId" value={team.id} />
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {availableParticipants.map((participant) => (
                                    <label key={participant.id} className="flex min-h-10 items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold">
                                      <input
                                        name="participantId"
                                        type="checkbox"
                                        value={participant.id}
                                        defaultChecked={team.members.some((member) => member.participantId === participant.id)}
                                        className="size-5 accent-lime-300"
                                      />
                                      {participant.name}
                                    </label>
                                  ))}
                                </div>
                                <SubmitButton>Leden opslaan</SubmitButton>
                              </form>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState>Nog geen teams.</EmptyState>
                      )}
                    </div>
                  </details>

                  {event.bets.length ? (
                    <details className="rounded-md border bg-background p-3">
                      <summary className="cursor-pointer text-sm font-black">Weddenschappen</summary>
                      <div className="mt-3 grid gap-2">
                        {event.bets.map((bet) => (
                          <p key={bet.id} className="rounded-md bg-secondary p-3 text-sm text-muted-foreground">
                            {bet.mielUser.displayName} koos {bet.selectedTeam.name} · inzet {formatCredits(Number(bet.stake))} · @{' '}
                            {formatOdd(Number(bet.oddsAtPlacement))} · {bet.status}
                          </p>
                        ))}
                      </div>
                    </details>
                  ) : null}

                  <details className="rounded-md border bg-background p-3">
                    <summary className="cursor-pointer text-sm font-black">Resultaat en uitbetaling</summary>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <form action={settleEventAction} className="grid gap-3 rounded-md bg-secondary p-3">
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="eventStatus" value="SETTLED" />
                        <SelectField
                          name="winningTeamId"
                          label="Winnaar"
                          options={event.teams.map((team) => ({ value: team.id, label: team.name }))}
                        />
                        <SubmitButton disabled={!event.teams.length}>Winnaar uitbetalen</SubmitButton>
                      </form>
                      <form action={settleEventAction} className="grid content-end gap-3 rounded-md bg-secondary p-3">
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="eventStatus" value="CANCELLED" />
                        <SubmitButton>Annuleren en terugbetalen</SubmitButton>
                      </form>
                    </div>
                  </details>
                </article>
              )
            })
          ) : (
            <EmptyState>Nog geen evenementen.</EmptyState>
          )}
        </div>
      </AdminCard>
    </AdminPageShell>
  )
}

function EventFact({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-md bg-card px-3 py-2">
      <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-black ${warn ? 'text-destructive' : 'text-primary'}`}>{value}</p>
    </div>
  )
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Voorbereiding',
    OPEN_FOR_SELECTION: 'Teams kiezen',
    ODDS_READY: 'Open voor inzetten',
    BET_PLACED: 'Bet geplaatst',
    IN_PROGRESS: 'Bezig',
    SETTLED: 'Uitbetaald',
    CANCELLED: 'Geannuleerd',
  }
  return labels[status] ?? status
}

function openBlockedText(status: string, teamsWithOdds: number) {
  if (closedEventStatuses.includes(status)) {
    return 'Dit event is al gestart, afgehandeld of geannuleerd.'
  }

  if (status === 'DRAFT') {
    return 'Klik eerst op Laat Miel teams kiezen.'
  }

  if (teamsWithOdds < 2) {
    return 'Vul minstens twee teams met odds in om inzetten te openen.'
  }

  return 'Nog niet klaar om open te zetten.'
}
