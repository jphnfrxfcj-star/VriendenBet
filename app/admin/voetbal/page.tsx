import {
  createFootballMarketAction,
  createFootballMatchAction,
  createFootballSelectionAction,
  overrideFootballSelectionOddsAction,
  updateFootballMatchStatusAction,
  updateFootballSelectionAction,
} from '../actions'
import {
  AdminCard,
  AdminPageShell,
  CheckField,
  EmptyState,
  Field,
  SelectField,
  SubmitButton,
  TextField,
} from '../shared'
import { prisma } from '@/lib/prisma'
import { formatCredits, formatOdd } from '@/lib/utils'

const matchStatuses = ['DRAFT', 'OPEN', 'LOCKED', 'LIVE', 'FINISHED', 'SETTLED', 'CANCELLED'].map((status) => ({
  value: status,
  label: status,
}))
const marketTypes = ['MATCH_RESULT', 'YES_NO', 'OVER_UNDER', 'PLAYER_SPECIAL', 'TEAM_SPECIAL', 'CUSTOM'].map((type) => ({
  value: type,
  label: type,
}))
const marketStatuses = ['DRAFT', 'OPEN', 'LOCKED', 'SETTLED', 'CANCELLED'].map((status) => ({
  value: status,
  label: status,
}))
const eligibilityTypes = ['ALWAYS_ALLOWED', 'POSITIVE_MIEL_ONLY', 'NOT_WHEN_MIEL_PLAYS', 'ADMIN_ONLY'].map((type) => ({
  value: type,
  label: type,
}))
const resultStatuses = ['PENDING', 'WON', 'LOST', 'VOID'].map((status) => ({ value: status, label: status }))

export default async function AdminFootballPage() {
  const matches = await prisma.footballMatch.findMany({
    include: {
      markets: {
        include: { selections: true },
        orderBy: { sortOrder: 'asc' },
      },
      betBuilders: { include: { mielUser: true, selections: { include: { footballSelection: true } } } },
    },
    orderBy: { startsAt: 'desc' },
  })

  const marketOptions = matches.flatMap((match) =>
    match.markets.map((market) => ({
      value: market.id,
      label: `${match.title} · ${market.title}`,
    })),
  )

  return (
    <AdminPageShell
      title="Voetbalwedstrijd en sportsbook"
      subtitle="Beheer wedstrijden, marketgroepen, selecties, eligibility, odds, resultaten en betbuilders."
    >
      <AdminCard title="Nieuwe voetbalwedstrijd">
        <form action={createFootballMatchAction} className="grid gap-4 md:grid-cols-2">
          <Field name="title" label="Titel" required />
          <SelectField name="status" label="Status" defaultValue="DRAFT" options={matchStatuses} />
          <Field name="homeTeam" label="Thuisploeg" required />
          <Field name="awayTeam" label="Uitploeg" required />
          <Field name="venue" label="Locatie" />
          <Field name="startsAt" label="Start" type="datetime-local" required />
          <div className="md:col-span-2">
            <TextField name="description" label="Omschrijving" />
          </div>
          <div className="md:col-span-2">
            <SubmitButton>Wedstrijd toevoegen</SubmitButton>
          </div>
        </form>
      </AdminCard>

      {matches.length ? (
        <AdminCard title="Nieuwe markt">
          <form action={createFootballMarketAction} className="grid gap-4 md:grid-cols-2">
            <SelectField
              name="footballMatchId"
              label="Wedstrijd"
              options={matches.map((match) => ({ value: match.id, label: match.title }))}
            />
            <Field name="title" label="Markttitel" required />
            <Field name="category" label="Categorie" defaultValue="Algemeen" />
            <SelectField name="marketType" label="Type" defaultValue="CUSTOM" options={marketTypes} />
            <SelectField name="status" label="Status" defaultValue="OPEN" options={marketStatuses} />
            <Field name="sortOrder" label="Sortering" type="number" defaultValue={0} />
            <div className="md:col-span-2">
              <TextField name="description" label="Omschrijving" />
            </div>
            <div className="md:col-span-2">
              <SubmitButton>Markt toevoegen</SubmitButton>
            </div>
          </form>
        </AdminCard>
      ) : null}

      {marketOptions.length ? (
        <AdminCard title="Nieuwe selectie">
          <form action={createFootballSelectionAction} className="grid gap-4 md:grid-cols-2">
            <SelectField name="footballMarketId" label="Markt" options={marketOptions} />
            <Field name="label" label="Label" required />
            <Field name="line" label="Lijn" placeholder="Bijv. meer dan 2,5" />
            <Field name="finalOdds" label="Odd" type="number" step="0.01" min={1.1} defaultValue={1.8} />
            <SelectField name="eligibilityType" label="Eligibility" defaultValue="ALWAYS_ALLOWED" options={eligibilityTypes} />
            <CheckField name="isManipulable" label="Manipuleerbaar door Miel" />
            <div className="md:col-span-2">
              <SubmitButton>Selectie toevoegen</SubmitButton>
            </div>
          </form>
        </AdminCard>
      ) : null}

      <AdminCard title="Wedstrijden beheren">
        <div className="grid gap-4">
          {matches.length ? (
            matches.map((match) => (
              <div key={match.id} className="grid gap-4 rounded-md border bg-secondary p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">{match.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {match.homeTeam} vs {match.awayTeam} · {match.startsAt.toLocaleString('nl-BE')} · {match.status}
                    </p>
                  </div>
                  <form action={updateFootballMatchStatusAction} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={match.id} />
                    <SelectField name="status" label="Status" defaultValue={match.status} options={matchStatuses} />
                    <SubmitButton>Status</SubmitButton>
                  </form>
                </div>

                {match.markets.map((market) => (
                  <div key={market.id} className="rounded-md border bg-background p-3">
                    <h3 className="font-black">
                      {market.title} <span className="text-sm text-muted-foreground">· {market.marketType} · {market.status}</span>
                    </h3>
                    <div className="mt-3 grid gap-3">
                      {market.selections.map((selection) => (
                        <div key={selection.id} className="grid gap-2 rounded-md bg-secondary p-3">
                          <form action={updateFootballSelectionAction} className="grid gap-3 lg:grid-cols-[1fr_120px_160px_140px_auto]">
                            <input type="hidden" name="id" value={selection.id} />
                            <Field name="label" label="Label" defaultValue={selection.label} required />
                            <Field name="line" label="Lijn" defaultValue={selection.line} />
                            <Field name="finalOdds" label="Odd" type="number" step="0.01" defaultValue={String(selection.finalOdds)} />
                            <SelectField name="resultStatus" label="Resultaat" defaultValue={selection.resultStatus} options={resultStatuses} />
                            <div className="grid content-end gap-2">
                              <SelectField
                                name="eligibilityType"
                                label="Eligibility"
                                defaultValue={selection.eligibilityType}
                                options={eligibilityTypes}
                              />
                              <CheckField name="isManipulable" label="Manipuleerbaar" defaultChecked={selection.isManipulable} />
                              <CheckField name="isWinningSelection" label="Winnaar" defaultChecked={selection.isWinningSelection} />
                              <SubmitButton>Opslaan</SubmitButton>
                            </div>
                          </form>
                          <form action={overrideFootballSelectionOddsAction} className="grid gap-2 md:grid-cols-[140px_1fr_auto]">
                            <input type="hidden" name="id" value={selection.id} />
                            <Field
                              name="overriddenOdds"
                              label="Override"
                              type="number"
                              step="0.01"
                              defaultValue={selection.overriddenOdds ? String(selection.overriddenOdds) : String(selection.finalOdds)}
                            />
                            <Field name="reason" label="Reden" placeholder="Verplicht voor override" />
                            <div className="grid content-end">
                              <SubmitButton>Override</SubmitButton>
                            </div>
                          </form>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {match.betBuilders.length ? (
                  <div className="rounded-md border bg-background p-3">
                    <h3 className="font-black">Betbuilders</h3>
                    <div className="mt-2 grid gap-2">
                      {match.betBuilders.map((builder) => (
                        <p key={builder.id} className="text-sm text-muted-foreground">
                          {builder.mielUser.displayName} · {builder.status} · inzet {formatCredits(Number(builder.stake))} · @{' '}
                          {formatOdd(Number(builder.finalOdds))} ·{' '}
                          {builder.selections.map((selection) => selection.footballSelection.label).join(' + ')}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <EmptyState>Nog geen voetbalwedstrijden.</EmptyState>
          )}
        </div>
      </AdminCard>
    </AdminPageShell>
  )
}
