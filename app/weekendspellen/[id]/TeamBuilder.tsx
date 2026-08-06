'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, RotateCcw, Save, TicketCheck } from 'lucide-react'
import { placeWeekendBetAction, saveWeekendTeamsAction } from '@/app/actions/bets'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { ParticipantRating, Role, TeamInput } from '@/lib/domain'
import { getEligibleSelectionsForMiel } from '@/lib/eligibility'
import { assertValidTeamComposition, calculateTeamOdds } from '@/lib/odds'
import { canUseMielMode } from '@/lib/roles'
import { formatCredits, formatOdd } from '@/lib/utils'

type ParticipantOption = {
  id: string
  name: string
  stats: Record<string, number>
}

type TeamBuilderProps = {
  initialTeams: TeamInput[]
  participants: ParticipantOption[]
  participantRatings: ParticipantRating[]
  weights: Record<string, number>
  status: string
  role?: Role
  mielParticipantId: string
  exactTeamSize: number
  eventId?: string
}

export function TeamBuilder({
  initialTeams,
  participants,
  participantRatings,
  weights,
  status,
  role,
  mielParticipantId,
  exactTeamSize,
  eventId,
}: TeamBuilderProps) {
  const router = useRouter()
  const [teams, setTeams] = useState<TeamInput[]>(initialTeams)
  const [stake, setStake] = useState(50)
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeams[0]?.id ?? '')
  const [ticket, setTicket] = useState<{ teamName: string; stake: number; odds: number; payout: number } | null>(null)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const mielMode = canUseMielMode(role)
  const editable =
    mielMode &&
    !ticket &&
    (eventId ? status === 'OPEN_FOR_SELECTION' : ['OPEN_FOR_SELECTION', 'ODDS_READY'].includes(status))
  const selectedParticipantIds = useMemo(
    () => new Set(teams.flatMap((team) => team.memberParticipantIds)),
    [teams],
  )
  const availableParticipants = participants.filter((participant) => !selectedParticipantIds.has(participant.id))
  const validationError = useMemo(() => {
    try {
      assertValidTeamComposition(teams, exactTeamSize)
      return ''
    } catch (error) {
      return error instanceof Error ? error.message : 'Teamindeling is ongeldig'
    }
  }, [exactTeamSize, teams])

  const odds = useMemo(() => {
    if (validationError) {
      return []
    }

    try {
      return calculateTeamOdds(teams, participantRatings, weights, {}, { margin: 0.1, sensitivity: 1.25 })
    } catch {
      return []
    }
  }, [participantRatings, teams, validationError, weights])

  const eligibleTeamIds = useMemo(
    () => getEligibleSelectionsForMiel({ format: 'TEAM', teams }, mielParticipantId),
    [mielParticipantId, teams],
  )
  const selectedOdds = odds.find((item) => item.teamId === selectedTeamId)
  const canPlaceBet =
    mielMode &&
    !ticket &&
    status === 'ODDS_READY' &&
    !validationError &&
    selectedOdds &&
    eligibleTeamIds.includes(selectedTeamId) &&
    stake >= 10 &&
    stake <= 250

  function addParticipant(teamId: string, participantId: string) {
    setTeams((current) =>
      current.map((team) => {
        if (team.id !== teamId || team.memberParticipantIds.includes(participantId)) {
          return team
        }

        if (team.memberParticipantIds.length >= exactTeamSize) {
          return team
        }

        return {
          ...team,
          memberParticipantIds: [...team.memberParticipantIds, participantId],
        }
      }),
    )
  }

  function removeParticipant(teamId: string, participantId: string) {
    setTeams((current) =>
      current.map((team) =>
        team.id === teamId
          ? { ...team, memberParticipantIds: team.memberParticipantIds.filter((id) => id !== participantId) }
          : team,
      ),
    )
  }

  function placeBet() {
    if (!canPlaceBet || !selectedOdds) {
      return
    }

    if (eventId) {
      setMessage('')
      startTransition(async () => {
        const formData = new FormData()
        formData.set('eventId', eventId)
        formData.set('selectedTeamId', selectedTeamId)
        formData.set('stake', String(stake))
        const result = await placeWeekendBetAction(formData)
        setMessage(result.message)
        if (result.ok) {
          setTicket({
            teamName: selectedOdds.name,
            stake,
            odds: selectedOdds.finalOdds,
            payout: stake * selectedOdds.finalOdds,
          })
        }
      })
      return
    }

    setTicket({
      teamName: selectedOdds.name,
      stake,
      odds: selectedOdds.finalOdds,
      payout: stake * selectedOdds.finalOdds,
    })
  }

  function saveTeams() {
    if (!eventId || validationError || !editable) return

    setMessage('')
    startTransition(async () => {
      const formData = new FormData()
      formData.set('eventId', eventId)
      formData.set('teams', JSON.stringify(teams))
      const result = await saveWeekendTeamsAction(formData)
      setMessage(result.message)
      if (result.ok) {
        router.refresh()
      }
    })
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="grid gap-5">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{editable ? 'Team-builder actief' : 'Team-builder'}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Kies exact {exactTeamSize} spelers per team. Miel mag daarna alleen op zijn eigen team inzetten.
                </p>
              </div>
              {editable ? (
                <div className="flex flex-wrap gap-2">
                  {eventId ? (
                    <Button type="button" onClick={saveTeams} disabled={Boolean(validationError) || isPending}>
                      <Save className="size-4" />
                      {isPending ? 'Opslaan...' : 'Teams opslaan'}
                    </Button>
                  ) : null}
                  <Button type="button" variant="secondary" onClick={() => setTeams(initialTeams)}>
                    <RotateCcw className="size-4" />
                    Reset
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              {teams.map((team) => (
                <div key={team.id} className="rounded-md border bg-secondary p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-black">{team.name}</h2>
                    <span className="text-xs font-black text-muted-foreground">
                      {team.memberParticipantIds.length}/{exactTeamSize}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {team.memberParticipantIds.map((participantId) => {
                      const participant = participants.find((item) => item.id === participantId)
                      return (
                        <div
                          key={participantId}
                          className="flex min-h-11 items-center justify-between rounded bg-background px-3 py-2 text-sm font-bold"
                        >
                          <span>{participant?.name ?? participantId}</span>
                          {editable ? (
                            <button
                              type="button"
                              onClick={() => removeParticipant(team.id, participantId)}
                              className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                              aria-label={`${participant?.name ?? participantId} verwijderen uit ${team.name}`}
                            >
                              <Minus className="size-4" />
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>

                  {editable && availableParticipants.length ? (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-black uppercase text-primary">Toevoegen</p>
                      <div className="flex flex-wrap gap-2">
                        {availableParticipants.map((participant) => (
                          <button
                            key={participant.id}
                            type="button"
                            onClick={() => addParticipant(team.id, participant.id)}
                            disabled={team.memberParticipantIds.length >= exactTeamSize}
                            className="inline-flex min-h-9 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-black transition hover:border-primary disabled:pointer-events-none disabled:opacity-40"
                          >
                            <Plus className="size-3.5" />
                            {participant.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {!mielMode ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Alleen Miel en admins kunnen teams aanpassen. Viewers zien deze indeling read-only.
              </p>
            ) : eventId ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Teams kunnen alleen aangepast worden zolang dit event in Teams kiezen staat.
              </p>
            ) : null}
            {validationError ? (
              <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm font-bold text-destructive">
                {validationError}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live scores en odds</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {odds.length ? (
              odds.map((odd) => (
                <div key={odd.teamId} className="rounded-md border bg-secondary p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-black">{odd.name}</h2>
                    <span className="text-2xl font-black text-primary">@ {formatOdd(odd.finalOdds)}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Score {odd.score} · kans {(odd.probability * 100).toFixed(1)}% · calculated{' '}
                    {formatOdd(odd.calculatedOdds)}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">
                Maak eerst twee volledige teams om odds te berekenen.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Inzetformulier</CardTitle>
            <p className="text-sm text-muted-foreground">Miel en admins kunnen inzetten. Maximaal €250.</p>
          </CardHeader>
          <CardContent className="grid gap-3">
            {odds.map((odd) => (
              <button
                key={odd.teamId}
                type="button"
                onClick={() => setSelectedTeamId(odd.teamId)}
                disabled={!eligibleTeamIds.includes(odd.teamId) || Boolean(ticket)}
                className={`flex min-h-16 items-center justify-between rounded-md border bg-secondary px-3 py-2 text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-45 ${
                  selectedTeamId === odd.teamId ? 'border-primary ring-2 ring-primary/30' : ''
                }`}
              >
                <span className="text-sm font-extrabold leading-tight">
                  {eligibleTeamIds.includes(odd.teamId) ? odd.name : `${odd.name} · niet toegestaan`}
                </span>
                <span className="rounded bg-primary px-2.5 py-1 text-sm font-black text-primary-foreground">
                  {formatOdd(odd.finalOdds)}
                </span>
              </button>
            ))}
            <Input
              type="number"
              min={10}
              max={250}
              value={stake}
              disabled={Boolean(ticket)}
              onChange={(event) => setStake(Number(event.target.value))}
            />
            <div className="rounded-md bg-secondary p-3 text-sm">
              Mogelijke uitbetaling:
              <strong className="ml-2 text-primary">{formatCredits((selectedOdds?.finalOdds ?? 0) * stake)}</strong>
            </div>
            <Button type="button" disabled={!canPlaceBet || isPending} onClick={placeBet}>
              <TicketCheck className="size-4" />
              {isPending ? 'Bet plaatsen...' : 'Plaats virtuele bet'}
            </Button>
            {message ? (
              <p className="rounded-md border bg-secondary p-3 text-sm font-bold">{message}</p>
            ) : null}
            {ticket ? (
              <div className="rounded-md border border-primary/50 bg-primary/10 p-3 text-sm">
                <strong>Ticket geplaatst:</strong> {ticket.teamName} · {formatCredits(ticket.stake)} @{' '}
                {formatOdd(ticket.odds)} · mogelijk {formatCredits(ticket.payout)}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
