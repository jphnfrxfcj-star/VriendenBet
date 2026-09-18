import { TeamSizeForm } from '@/app/admin/evenementen/TeamSizeForm'
import { OddsOverrideForm } from '@/app/admin/evenementen/OddsOverrideForm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/StatusBadge'
import { getSessionUser } from '@/lib/auth'
import { participantRatings, participants, tugOfWarWeights, weekendEvents } from '@/lib/demo-data'
import { prisma } from '@/lib/prisma'
import { TeamBuilder } from './TeamBuilder'

export const dynamic = 'force-dynamic'

export default async function WeekendGameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await getWeekendEvent(id)
  if (!event) {
    notFound()
  }
  const session = await getSessionUser()
  const initialTeams = event.teams.length
    ? event.teams
    : createEmptyTeams(event.teamCount ?? 2)

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-black uppercase text-primary">Weekendspel</p>
          <h1 className="text-4xl font-black tracking-normal md:text-5xl">{event.title}</h1>
          <p className="mt-3 text-muted-foreground">{event.startsAt}</p>
        </div>
        <StatusBadge status={event.status} />
      </div>

      {session?.role === 'ADMIN' && <Link href="/admin/evenementen" className="font-bold text-primary underline">← Terug naar spelbeheer</Link>}
      {session?.role === 'ADMIN' && event.dbBacked && event.canResize && <TeamSizeForm key={`${event.id}:${event.exactTeamSize}`} eventId={event.id} playersPerTeam={event.exactTeamSize} teamCount={event.teamCount} />}
      {session?.role === 'ADMIN' && event.dbBacked && <section aria-label="Odds beheren" className="rounded-lg border bg-card p-4">
        <h2 className="text-lg font-black">Odds beheren · Admin</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {event.teams.map((team) => <div key={team.id} className="rounded-md bg-secondary p-3">
            <h3 className="font-black">{team.name}</h3>
            <OddsOverrideForm teamId={team.id} odds={event.savedOdds[team.id]} finished={['SETTLED', 'CANCELLED'].includes(event.status)} />
          </div>)}
        </div>
      </section>}
      <TeamBuilder
        initialTeams={initialTeams}
        savedOdds={event.savedOdds}
        participants={event.dbBacked ? event.participants : participants}
        participantRatings={event.dbBacked ? event.participantRatings : participantRatings}
        weights={event.dbBacked ? event.weights : tugOfWarWeights}
        status={event.status}
        role={session?.role}
        mielParticipantId={event.mielParticipantId ?? 'p-18'}
        exactTeamSize={event.exactTeamSize}
        eventId={event.dbBacked ? event.id : undefined}
      />
    </div>
  )
}

async function getWeekendEvent(id: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: { select: { bets: true } },
        gameTemplate: { include: { attributes: { include: { attribute: true } } } },
        participants: { include: { participant: { include: { attributes: { include: { attribute: true } } } } } },
        teams: {
          include: {
            members: {
              include: { participant: { include: { attributes: { include: { attribute: true } } } } },
            },
          },
        },
      },
    })
    if (event) {
      const teamParticipantRows = event.teams.flatMap((team) => team.members.map((member) => member.participant))
      const activeParticipantRows = event.participants.length
        ? event.participants.filter((row) => row.isAvailable).map((row) => row.participant)
        : await prisma.participant.findMany({
            where: { isActive: true },
            include: { attributes: { include: { attribute: true } } },
            orderBy: { name: 'asc' },
          })
      const activeParticipants = Array.from(
        new Map([...activeParticipantRows, ...teamParticipantRows].map((participant) => [participant.id, participant])).values(),
      )
      const miel = await prisma.user.findFirst({ where: { role: 'MIEL' }, select: { participantId: true } })

      return {
        id: event.id,
        title: event.title,
        status: event.status,
        startsAt: event.startsAt?.toLocaleString('nl-BE') ?? 'Nog te bepalen',
        dbBacked: true,
        canResize: ['DRAFT', 'OPEN_FOR_SELECTION', 'ODDS_READY'].includes(event.status) && event._count.bets === 0,
        exactTeamSize: event.gameTemplate.exactTeamSize ?? event.gameTemplate.maxPlayersPerTeam,
        teamCount: event.gameTemplate.teamCount,
        mielParticipantId: miel?.participantId,
        participants: activeParticipants.map((participant) => ({
          id: participant.id,
          name: participant.name,
          stats: Object.fromEntries(
            participant.attributes.map((score) => [score.attribute.name, score.score]),
          ) as Record<string, number>,
        })),
        participantRatings: activeParticipants.map((participant) => ({
          participantId: participant.id,
          name: participant.name,
          attributes: Object.fromEntries(
            participant.attributes.map((score) => [
              score.attribute.name,
              {
                attributeId: score.attribute.name,
                minValue: score.attribute.minValue,
                maxValue: score.attribute.maxValue,
                score: score.score,
              },
            ]),
          ),
        })),
        weights: Object.fromEntries(
          event.gameTemplate.attributes.map((row) => [row.attribute.name, Number(row.weight)]),
        ) as Record<string, number>,
        savedOdds: Object.fromEntries(event.teams.filter((team) => team.finalOdds).map((team) => [team.id, Number(team.finalOdds)])),
        teams: event.teams.map((team) => ({
          id: team.id,
          name: team.name,
          memberParticipantIds: team.members.map((member) => member.participantId),
        })),
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
  }

  const demoEvent = weekendEvents.find((item) => item.id === id)
  return demoEvent ? { ...demoEvent, savedOdds: {} as Record<string, number>, dbBacked: false, canResize: false, teamCount: 2, participants: [], participantRatings: [], weights: {} } : null
}

function createEmptyTeams(teamCount: number) {
  const defaultNames = teamCount === 2 ? ['Team Groen', 'Team Geel'] : []
  return Array.from({ length: teamCount }, (_, index) => ({
    id: `team-${index + 1}`,
    name: defaultNames[index] ?? `Team ${index + 1}`,
    memberParticipantIds: [],
  }))
}
