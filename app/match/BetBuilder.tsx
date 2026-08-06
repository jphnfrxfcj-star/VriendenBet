'use client'

import { useMemo, useState, useTransition } from 'react'
import { TicketCheck } from 'lucide-react'
import { placeFootballBetBuilderAction } from '@/app/actions/bets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { calculateBetBuilderOdds } from '@/lib/football'
import { formatCredits, formatOdd } from '@/lib/utils'

type BetBuilderSelection = {
  id: string
  label: string
  finalOdds: number
  disabled?: boolean
}

export function BetBuilder({
  matchId,
  selections,
}: {
  matchId?: string
  selections: BetBuilderSelection[]
}) {
  const allowedSelections = selections.filter((selection) => !selection.disabled)
  const [selectedIds, setSelectedIds] = useState(() => allowedSelections.slice(0, 3).map((selection) => selection.id))
  const [stake, setStake] = useState(50)
  const [message, setMessage] = useState('')
  const [ticketPlaced, setTicketPlaced] = useState(false)
  const [isPending, startTransition] = useTransition()

  const selected = useMemo(
    () => selections.filter((selection) => selectedIds.includes(selection.id)),
    [selectedIds, selections],
  )
  const calculation = useMemo(() => {
    try {
      return calculateBetBuilderOdds(
        selected.map((selection) => ({
          id: selection.id,
          label: selection.label,
          finalOdds: selection.finalOdds,
          eligibilityType: 'ALWAYS_ALLOWED' as const,
        })),
        stake,
      )
    } catch {
      return null
    }
  }, [selected, stake])
  const canSubmit = selected.length >= 2 && stake >= 10 && stake <= 250 && Boolean(calculation) && !ticketPlaced

  function toggleSelection(selection: BetBuilderSelection) {
    if (selection.disabled || ticketPlaced) return

    setSelectedIds((current) =>
      current.includes(selection.id)
        ? current.filter((id) => id !== selection.id)
        : [...current, selection.id],
    )
  }

  function placeBetBuilder() {
    if (!canSubmit || !calculation) return

    if (!matchId) {
      setTicketPlaced(true)
      setMessage('Demo betbuilder geplaatst. In productie wordt deze in je geschiedenis bewaard.')
      return
    }

    setMessage('')
    startTransition(async () => {
      const formData = new FormData()
      formData.set('stake', String(stake))
      selectedIds.forEach((selectionId) => formData.append('selectionId', selectionId))
      const result = await placeFootballBetBuilderAction(formData)
      setMessage(result.message)
      if (result.ok) {
        setTicketPlaced(true)
      }
    })
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        {selections.map((selection) => {
          const selectedSelection = selectedIds.includes(selection.id)
          return (
            <button
              key={selection.id}
              type="button"
              onClick={() => toggleSelection(selection)}
              disabled={selection.disabled || ticketPlaced}
              className={`flex min-h-14 items-center justify-between rounded-md border bg-secondary px-3 py-2 text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-45 ${
                selectedSelection ? 'border-primary ring-2 ring-primary/30' : ''
              }`}
            >
              <span className="text-sm font-black">
                {selection.disabled ? `${selection.label} · geblokkeerd` : selection.label}
              </span>
              <span className="font-black text-primary">{formatOdd(selection.finalOdds)}</span>
            </button>
          )
        })}
      </div>

      <div className="rounded-md border p-3 text-sm">
        <div className="flex justify-between">
          <span>Selecties</span>
          <strong>{selected.length}</strong>
        </div>
        <div className="mt-1 flex justify-between">
          <span>Ruwe odd</span>
          <strong>{calculation ? formatOdd(calculation.rawCombinedOdds) : '-'}</strong>
        </div>
        <div className="mt-1 flex justify-between">
          <span>Correctiefactor</span>
          <strong>0,90</strong>
        </div>
        <div className="mt-2 flex justify-between text-lg">
          <span>Finale odd</span>
          <strong className="text-primary">{calculation ? formatOdd(calculation.finalOdds) : '-'}</strong>
        </div>
      </div>

      <Input
        type="number"
        min={10}
        max={250}
        value={stake}
        disabled={ticketPlaced}
        onChange={(event) => setStake(Number(event.target.value))}
      />
      <div className="rounded-md bg-primary p-3 font-black text-primary-foreground">
        Mogelijke uitbetaling: {formatCredits(calculation?.potentialPayout ?? 0)}
      </div>
      <Button type="button" disabled={!canSubmit || isPending} onClick={placeBetBuilder}>
        <TicketCheck className="size-4" />
        {isPending ? 'Betbuilder plaatsen...' : 'Plaats betbuilder'}
      </Button>
      {message ? <p className="rounded-md border bg-secondary p-3 text-sm font-bold">{message}</p> : null}
    </div>
  )
}
