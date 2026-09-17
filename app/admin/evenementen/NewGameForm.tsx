'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminForm } from '../AdminForm'
import { Field, SubmitButton, TextField } from '../shared'
import { createWeekendGameAction } from './actions'

export function NewGameForm({ attributes }: { attributes: { id: string; name: string }[] }) {
  const [size, setSize] = useState(2)
  const [teamCount, setTeamCount] = useState(2)
  const router = useRouter()
  return <AdminForm action={async (data) => {
    const event = await createWeekendGameAction(data)
    router.push(`/weekendspellen/${event.id}`)
  }} className="grid gap-4">
    <div className="grid gap-4 sm:grid-cols-3">
      <Field name="title" label="Naam van het spel" placeholder="Bijv. beerpong, kubb of touwtrekken" required />
      <label className="grid gap-2 text-sm font-black">Aantal teams
        <input className="min-h-11 w-full rounded-md border bg-background px-3" name="teamCount" type="number" min={2} max={8} required value={teamCount} onChange={(event) => setTeamCount(Number(event.target.value))} />
      </label>
      <label className="grid gap-2 text-sm font-black">Spelers per team
        <input className="min-h-11 w-full rounded-md border bg-background px-3" name="playersPerTeam" type="number" min={1} max={50} required value={size} onChange={(event) => setSize(Number(event.target.value))} />
      </label>
    </div>
    <p className="text-sm font-bold text-primary">{teamCount || 0} teams · {size || 0} spelers per team · {(size || 0) * (teamCount || 0)} spelers in totaal</p>
    <details className="rounded-md border p-3">
      <summary className="cursor-pointer text-sm font-bold">Teamnamen, regels en extra opties</summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field name="teamOne" label="Naam team 1" defaultValue="Team Groen" required />
        <Field name="teamTwo" label="Naam team 2" defaultValue="Team Geel" required />
        <Field name="startsAt" label="Startmoment (optioneel)" type="datetime-local" />
        <TextField name="description" label="Spelregels (optioneel)" rows={2} />
      </div>
      {attributes.length > 0 && <fieldset className="mt-4 grid gap-2">
        <legend className="mb-2 text-sm font-bold">Welke parameters tellen mee? (optioneel)</legend>
        <p className="text-sm text-muted-foreground">Kies bijvoorbeeld kracht voor touwtrekken of IQ voor een quiz. Zonder selectie tellen alle actieve parameters even zwaar mee.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {attributes.map((attribute) => <label key={attribute.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="attributeId" value={attribute.id} />{attribute.name}</label>)}
        </div>
      </fieldset>}
    </details>
    <div><SubmitButton>Spel toevoegen</SubmitButton></div>
    <p className="text-sm text-muted-foreground">De teams staan meteen klaar. Jij of Miel kan daarna de spelers kiezen.</p>
  </AdminForm>
}
