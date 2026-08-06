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
    : [
        { id: 'team-groen', name: 'Team Groen', memberParticipantIds: [] },
        { id: 'team-geel', name: 'Team Geel', memberParticipantIds: [] },
      ]

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

      <TeamBuilder
        initialTeams={initialTeams}
        participants={event.participants.length ? event.participants : participants}
        participantRatings={event.participantRatings.length ? event.participantRatings : participantRatings}
        weights={Object.keys(event.weights).length ? event.weights : tugOfWarWeights}
        status={event.status}
        role={session?.role}
        mielParticipantId={event.mielParticipantId ?? 'p-18'}
        exactTeamSize={event.exactTeamSize ?? 4}
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
        gameTemplate: { include: { attributes: { include: { attribute: true } } } },
        participants: { include: { participant: { include: { attributes: { include: { attribute: true } } } } } },
        teams: { include: { members: { include: { participant: true } } } },
      },
    })
    if (event) {
      const activeParticipants = event.participants.length
        ? event.participants.map((row) => row.participant)
        : await prisma.participant.findMany({
            where: { isActive: true },
            include: { attributes: { include: { attribute: true } } },
            orderBy: { name: 'asc' },
          })
      const miel = await prisma.user.findFirst({ where: { role: 'MIEL' }, select: { participantId: true } })

      return {
        id: event.id,
        title: event.title,
        status: event.status,
        startsAt: event.startsAt?.toLocaleString('nl-BE') ?? 'Nog te bepalen',
        dbBacked: true,
        exactTeamSize: event.gameTemplate.exactTeamSize ?? event.gameTemplate.maxPlayersPerTeam,
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
  return demoEvent ? { ...demoEvent, dbBacked: false, participants: [], participantRatings: [], weights: {} } : null
}
