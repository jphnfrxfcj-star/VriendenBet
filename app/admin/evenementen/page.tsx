import { GameRequests } from './GameRequests'
import { DeleteButton } from '../DeleteButton'
import { TeamSizeForm } from './TeamSizeForm'
import Link from 'next/link'
import { AdminForm } from '../AdminForm'
import { SearchableList } from '../SearchableList'
import { openEventForBettingAction, setEventParticipantsAction, settleEventAction } from '../actions'
import { AdminCard, AdminPageShell, EmptyState, SelectField, SubmitButton } from '../shared'
import { StatusBadge } from '@/components/StatusBadge'
import { prisma } from '@/lib/prisma'
import { formatCredits, formatOdd } from '@/lib/utils'
import { NewGameForm } from './NewGameForm'
import { prepareWeekendGameAction } from './actions'

export default async function AdminEventsPage() {
  const [events, attributes, participants] = await Promise.all([
    prisma.event.findMany({
      include: {
        gameTemplate: true,
        participants: true,
        teams: { include: { members: { include: { participant: true } } } },
        bets: { include: { selectedTeam: true, mielUser: true } },
      },
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.attribute.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.participant.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  ])
  return <AdminPageShell title="Weekendspellen" subtitle="Spel toevoegen → spelers kiezen → inzetten openen. De odds worden automatisch berekend.">
    <AdminCard title="Nieuw spel"><NewGameForm attributes={attributes} /></AdminCard>
    <GameRequests />
    <AdminCard title="Jullie spellen">
      {!events.length ? <EmptyState>Voeg hierboven jullie eerste spel toe.</EmptyState> : <SearchableList label="Spel zoeken" items={events.map((event) => {
        const size = event.gameTemplate.exactTeamSize ?? event.gameTemplate.maxPlayersPerTeam
        const finished = ['SETTLED', 'CANCELLED'].includes(event.status)
        const selecting = event.status === 'OPEN_FOR_SELECTION'
        const ready = event.teams.length === event.gameTemplate.teamCount && event.teams.every((team) => team.members.length === size && Number(team.finalOdds) > 1)
        return { id: event.id, search: event.title, content: <article className="grid gap-4 rounded-md border bg-secondary p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">{event.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{event.gameTemplate.teamCount} teams · {size} spelers per team{event.startsAt ? ` · ${event.startsAt.toLocaleString('nl-BE')}` : ''}</p>
            </div>
            <StatusBadge status={event.status} />
          </div>
          {['DRAFT', 'OPEN_FOR_SELECTION', 'ODDS_READY'].includes(event.status) && !event.bets.length && <TeamSizeForm key={`${event.id}:${size}`} eventId={event.id} playersPerTeam={size} teamCount={event.gameTemplate.teamCount} />}
          {event.description && <p className="whitespace-pre-wrap text-sm">{event.description}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {event.teams.map((team) => <div key={team.id} className="rounded-md bg-card p-3">
              <div className="flex items-center justify-between gap-2"><h3 className="font-bold">{team.name}</h3><span className="text-sm">{team.members.length}/{size}</span></div>
              <p className="mt-2 text-sm text-muted-foreground">{team.members.map((member) => member.participant.name).join(', ') || 'Nog geen spelers gekozen'}</p>
              {team.finalOdds && <p className="mt-2 text-sm font-bold text-primary">Odd {formatOdd(Number(team.finalOdds))}</p>}
            </div>)}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {event.status === 'DRAFT' ? <AdminForm action={prepareWeekendGameAction}>
              <input type="hidden" name="id" value={event.id} /><SubmitButton>Spel klaarzetten</SubmitButton>
            </AdminForm> : <Link href={`/weekendspellen/${event.id}`} className="rounded-md bg-primary px-4 py-3 text-sm font-black text-primary-foreground">{selecting ? 'Spelers kiezen' : 'Spel bekijken'} →</Link>}
            {selecting && ready && <AdminForm action={openEventForBettingAction}>
              <input type="hidden" name="id" value={event.id} /><SubmitButton>Open voor inzetten</SubmitButton>
            </AdminForm>}
          </div>
          {selecting && <p className="text-sm text-muted-foreground">{ready ? 'De teams en odds zijn klaar. Je kunt de inzetten openen.' : `Kies ${size} spelers per team en sla de teams op. De odds verschijnen vanzelf.`}</p>}
          {event.status === 'ODDS_READY' && <p className="text-sm font-bold text-primary">Miel kan nu inzetten.</p>}
          {!finished && <details className="rounded-md border bg-background p-3">
            <summary className="cursor-pointer text-sm font-bold">Winnaar kiezen of spel annuleren</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <AdminForm action={settleEventAction} className="grid gap-3">
                <input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="eventStatus" value="SETTLED" />
                <SelectField name="winningTeamId" label="Welk team heeft gewonnen?" options={event.teams.map((team) => ({ value: team.id, label: team.name }))} />
                <SubmitButton disabled={!event.teams.length}>Winnaar opslaan en uitbetalen</SubmitButton>
              </AdminForm>
              <AdminForm action={settleEventAction} className="grid content-end gap-3">
                <input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="eventStatus" value="CANCELLED" />
                <p className="text-sm text-muted-foreground">Bij annuleren worden geplaatste inzetten terugbetaald.</p>
                <SubmitButton>Spel annuleren</SubmitButton>
              </AdminForm>
            </div>
          </details>}
          {!finished && ['DRAFT', 'OPEN_FOR_SELECTION'].includes(event.status) && <details className="rounded-md border bg-background p-3">
            <summary className="cursor-pointer text-sm font-bold">Beschikbare spelers aanpassen</summary>
            <p className="mt-2 text-sm text-muted-foreground">Standaard kan iedereen meedoen. Vink af wie dit spel niet kan spelen.</p>
            <AdminForm action={setEventParticipantsAction} className="mt-3 grid gap-3">
              <input type="hidden" name="eventId" value={event.id} />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {participants.map((participant) => <label key={participant.id} className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="hidden" name="participantId" value={participant.id} />
                  <input type="checkbox" name="availableParticipantId" value={participant.id} defaultChecked={event.participants.find((row) => row.participantId === participant.id)?.isAvailable ?? true} />{participant.name}
                </label>)}
              </div>
              <SubmitButton>Beschikbaarheid opslaan</SubmitButton>
            </AdminForm>
          </details>}
          <DeleteButton kind="event" id={event.id} name={event.title} consequences="Het spel en de teamindeling verdwijnen. Een gekoppelde aanvraag wordt afgewezen. Spellen met weddenschappen kunnen niet worden verwijderd." />
          {event.bets.length > 0 && <details className="rounded-md border bg-background p-3">
            <summary className="cursor-pointer text-sm font-bold">{event.bets.length} weddenschappen bekijken</summary>
            <div className="mt-3 grid gap-2">{event.bets.map((bet) => <p key={bet.id} className="text-sm">{bet.mielUser.displayName} · {bet.selectedTeam.name} · {formatCredits(Number(bet.stake))} · @{formatOdd(Number(bet.oddsAtPlacement))}</p>)}</div>
          </details>}
        </article> }
      })} />}
    </AdminCard>
  </AdminPageShell>
}
