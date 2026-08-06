'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, X } from 'lucide-react'
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
  proposedAttributes?: string[]
}

export function SuggestionForm({ attributeOptions }: { attributeOptions: string[] }) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [selectedAttribute, setSelectedAttribute] = useState(attributeOptions[0] ?? '')
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([])
  const { register, handleSubmit, reset, watch } = useForm<SuggestionValues>({
    defaultValues: { proposedFormat: 'TEAM', proposedTeamCount: 2, proposedPlayersPerTeam: 4 },
  })
  const format = watch('proposedFormat')
  const isTeamGame = format !== 'INDIVIDUAL'
  const availableAttributes = attributeOptions.filter((attribute) => !selectedAttributes.includes(attribute))

  function onSubmit(values: SuggestionValues) {
    const payload: SuggestionValues = {
      ...values,
      proposedTeamCount: isTeamGame ? Number(values.proposedTeamCount) : undefined,
      proposedPlayersPerTeam: isTeamGame ? Number(values.proposedPlayersPerTeam) : undefined,
      proposedAttributes: selectedAttributes,
    }

    startTransition(async () => {
      const result = await submitSuggestionAction(payload)
      setMessage(result.message)
      if (result.ok) {
        reset()
        setSelectedAttributes([])
        setSelectedAttribute(attributeOptions[0] ?? '')
      }
    })
  }

  function addAttribute() {
    if (!selectedAttribute || selectedAttributes.includes(selectedAttribute)) return
    setSelectedAttributes((current) => [...current, selectedAttribute])
    setSelectedAttribute(availableAttributes.find((attribute) => attribute !== selectedAttribute) ?? '')
  }

  function removeAttribute(attribute: string) {
    setSelectedAttributes((current) => current.filter((item) => item !== attribute))
    if (!selectedAttribute) {
      setSelectedAttribute(attribute)
    }
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
      <div className="grid gap-3">
        <div className={`grid gap-4 ${isTeamGame ? 'sm:grid-cols-3' : 'sm:grid-cols-[minmax(0,1fr)_2fr]'}`}>
          <label className="grid gap-2 text-sm font-black">
            Format
            <Select {...register('proposedFormat')}>
              <option value="TEAM">Teamspel</option>
              <option value="INDIVIDUAL">Individueel</option>
            </Select>
          </label>
          {isTeamGame ? (
            <>
              <label className="grid gap-2 text-sm font-black">
                Teams
                <Input type="number" min={2} max={8} {...register('proposedTeamCount')} />
              </label>
              <label className="grid gap-2 text-sm font-black">
                Spelers/team
                <Input type="number" min={1} max={12} {...register('proposedPlayersPerTeam')} />
              </label>
            </>
          ) : null}
        </div>
        {!isTeamGame ? (
          <p className="rounded-md border border-dashed p-3 text-sm font-bold text-muted-foreground">
            Individueel spel: geen teaminfo nodig.
          </p>
        ) : null}
      </div>
      <div className="grid gap-2 text-sm font-black">
        Relevante eigenschappen
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Select value={selectedAttribute} onChange={(event) => setSelectedAttribute(event.target.value)}>
            {availableAttributes.length ? (
              availableAttributes.map((attribute) => (
                <option key={attribute} value={attribute}>
                  {attribute}
                </option>
              ))
            ) : (
              <option value="">Alle parameters gekozen</option>
            )}
          </Select>
          <Button type="button" variant="secondary" onClick={addAttribute} disabled={!selectedAttribute}>
            <Plus className="size-4" />
            Toevoegen
          </Button>
        </div>
        {selectedAttributes.length ? (
          <div className="flex flex-wrap gap-2">
            {selectedAttributes.map((attribute) => (
              <button
                key={attribute}
                type="button"
                onClick={() => removeAttribute(attribute)}
                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-secondary px-3 text-xs font-black"
              >
                {attribute}
                <X className="size-3.5" />
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Kies minstens de parameters die volgens jou de odds moeten beïnvloeden.
          </p>
        )}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Indienen...' : 'Voorstel indienen'}
      </Button>
      {message ? <p className="rounded-md border bg-secondary p-3 text-sm font-bold">{message}</p> : null}
    </form>
  )
}
