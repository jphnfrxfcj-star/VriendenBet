import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/StatusBadge'
import { getSessionUser } from '@/lib/auth'
import { participantRatings, participants, tugOfWarWeights, weekendEvents } from '@/lib/demo-data'
import { TeamBuilder } from './TeamBuilder'

export default async function WeekendGameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = weekendEvents.find((item) => item.id === id)
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
        participants={participants}
        participantRatings={participantRatings}
        weights={tugOfWarWeights}
        status={event.status}
        role={session?.role}
        mielParticipantId="p-18"
        exactTeamSize={4}
      />
    </div>
  )
}
