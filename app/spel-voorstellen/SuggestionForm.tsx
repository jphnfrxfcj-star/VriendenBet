'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { submitSuggestionAction } from '@/app/actions/suggestions'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

type SuggestionValues = {
  title: string
  description: string
  proposedRules?: string
  proposedFormat?: 'TEAM' | 'INDIVIDUAL'
  proposedTeamCount?: number
  proposedPlayersPerTeam?: number
  proposedAttributes?: string
}

export function SuggestionForm() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const { register, handleSubmit, reset } = useForm<SuggestionValues>({
    defaultValues: { proposedFormat: 'TEAM', proposedTeamCount: 2, proposedPlayersPerTeam: 4 },
  })

  function onSubmit(values: SuggestionValues) {
    startTransition(async () => {
      const result = await submitSuggestionAction(values)
      setMessage(result.message)
      if (result.ok) {
        reset()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <label className="grid gap-2 text-sm font-black">
        Titel
        <Input {...register('title')} placeholder="Bijvoorbeeld: Nachtelijke penalty shoot-out" />
      </label>
      <label className="grid gap-2 text-sm font-black">
        Omschrijving
        <Textarea {...register('description')} placeholder="Wat is het idee en waarom wordt dit grappig?" />
      </label>
      <label className="grid gap-2 text-sm font-black">
        Regels
        <Textarea {...register('proposedRules')} placeholder="Korte spelregels" />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-black">
          Format
          <Select {...register('proposedFormat')}>
            <option value="TEAM">Teamspel</option>
            <option value="INDIVIDUAL">Individueel</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-black">
          Teams
          <Input type="number" min={1} max={8} {...register('proposedTeamCount')} />
        </label>
        <label className="grid gap-2 text-sm font-black">
          Spelers/team
          <Input type="number" min={1} max={12} {...register('proposedPlayersPerTeam')} />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-black">
        Relevante eigenschappen
        <Input {...register('proposedAttributes')} placeholder="kracht, geluk, communicatie..." />
      </label>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Indienen...' : 'Voorstel indienen'}
      </Button>
      {message ? <p className="rounded-md border bg-secondary p-3 text-sm font-bold">{message}</p> : null}
    </form>
  )
}
