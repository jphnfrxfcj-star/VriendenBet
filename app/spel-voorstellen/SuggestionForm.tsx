'use client'

import { useState, useTransition } from 'react'
import { submitSuggestionAction } from '@/app/actions/suggestions'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'

export function SuggestionForm({ attributeOptions }: { attributeOptions: string[] }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [teams, setTeams] = useState('2')
  const [size, setSize] = useState('1')
  return <form className="grid gap-4" onSubmit={(event) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setMessage('')
    startTransition(async () => {
      try {
        const result = await submitSuggestionAction({
          title: String(data.get('title') ?? ''), description: String(data.get('description') ?? ''),
          proposedRules: String(data.get('proposedRules') ?? ''), proposedFormat: 'TEAM',
          proposedTeamCount: Number(teams), proposedPlayersPerTeam: Number(size),
          proposedAttributes: data.getAll('attribute'),
        })
        setMessage(result.message)
        if (result.ok) { form.reset(); setTeams('2'); setSize('1') }
      } catch { setMessage('Indienen is niet gelukt. Je invoer blijft staan; probeer opnieuw.') }
    })
  }}>
    <fieldset disabled={pending} className="grid min-w-0 gap-4">
      <label className="grid gap-2 text-sm font-bold">Naam van het spel<Input name="title" required maxLength={120} placeholder="Bijvoorbeeld: beerpong" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">Aantal teams<Input name="teamCount" type="number" min={2} max={8} required value={teams} onChange={(event) => setTeams(event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-bold">Spelers per team<Input name="playersPerTeam" type="number" min={1} max={50} required value={size} onChange={(event) => setSize(event.target.value)} /></label>
      </div>
      <p className="text-sm text-primary">{Number(teams) || 0} teams · {Number(size) || 0} spelers per team · {(Number(teams) || 0) * (Number(size) || 0)} spelers in totaal</p>
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-bold">Omschrijving, regels en parameters (optioneel)</summary>
        <div className="mt-3 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Omschrijving (optioneel)<Textarea name="description" maxLength={1500} placeholder="Extra uitleg, als je wilt" /></label>
          <label className="grid gap-2 text-sm font-bold">Regels (optioneel)<Textarea name="proposedRules" maxLength={2500} /></label>
          {attributeOptions.length > 0 && <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-bold">Parameters die meetellen (optioneel)</legend>
            {attributeOptions.map((name) => <label key={name} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="attribute" value={name} />{name}</label>)}
          </fieldset>}
        </div>
      </details>
      <Button type="submit">{pending ? 'Indienen…' : 'Spel aanvragen'}</Button>
    </fieldset>
    {message && <p role="status" className="rounded-md border p-3 text-sm">{message}</p>}
  </form>
}
