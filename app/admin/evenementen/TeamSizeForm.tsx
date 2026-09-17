'use client'

import { useState } from 'react'
import { AdminForm } from '../AdminForm'
import { SubmitButton } from '../shared'
import { updateWeekendTeamSizeAction } from './actions'

export function TeamSizeForm({ eventId, playersPerTeam, teamCount }: { eventId: string; playersPerTeam: number; teamCount: number }) {
  const [size, setSize] = useState(String(playersPerTeam))
  return <AdminForm action={updateWeekendTeamSizeAction} className="grid gap-3 rounded-md border bg-card p-3">
    <input type="hidden" name="id" value={eventId} />
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-2 text-sm font-bold">Spelers per team
        <input name="playersPerTeam" type="number" min={1} max={50} required value={size} onChange={(event) => setSize(event.target.value)} className="min-h-11 w-28 rounded-md border bg-background px-3" />
      </label>
      <SubmitButton>Aantal aanpassen</SubmitButton>
    </div>
    <p className="text-sm font-bold">{teamCount} teams · {Number(size) || 0} spelers per team · {teamCount * (Number(size) || 0)} in totaal</p>
    <p className="text-xs text-muted-foreground">Gekozen spelers blijven staan. Pas daarna de teams aan en sla ze opnieuw op om de odds te berekenen.</p>
  </AdminForm>
}
