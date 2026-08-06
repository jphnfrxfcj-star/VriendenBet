import { updateSuggestionAction } from '../actions'
import { AdminCard, AdminPageShell, EmptyState, SelectField, SubmitButton, TextField } from '../shared'
import { prisma } from '@/lib/prisma'

const suggestionStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED'].map((status) => ({
  value: status,
  label: status,
}))

export default async function AdminSuggestionsPage() {
  const suggestions = await prisma.gameSuggestion.findMany({
    include: { submittedByUser: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <AdminPageShell title="Spelvoorstellen" subtitle="Beoordeel voorstellen van viewers en zet ze later om naar templates.">
      <AdminCard title="Voorstellen beheren">
        <div className="grid gap-3">
          {suggestions.length ? (
            suggestions.map((suggestion) => (
              <form key={suggestion.id} action={updateSuggestionAction} className="grid gap-3 rounded-md border bg-secondary p-3">
                <input type="hidden" name="id" value={suggestion.id} />
                <div>
                  <h2 className="text-xl font-black">{suggestion.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    Door {suggestion.submittedByUser.displayName} · {suggestion.createdAt.toLocaleString('nl-BE')}
                  </p>
                  <p className="mt-2 text-sm">{suggestion.description}</p>
                  {suggestion.proposedRules ? <p className="mt-2 text-sm text-muted-foreground">{suggestion.proposedRules}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SuggestionFact label="Format" value={suggestion.proposedFormat === 'INDIVIDUAL' ? 'Individueel' : 'Teamspel'} />
                    {suggestion.proposedFormat !== 'INDIVIDUAL' ? (
                      <>
                        <SuggestionFact label="Teams" value={String(suggestion.proposedTeamCount ?? '-')} />
                        <SuggestionFact label="Spelers/team" value={String(suggestion.proposedPlayersPerTeam ?? '-')} />
                      </>
                    ) : null}
                    {getSuggestedAttributes(suggestion.proposedAttributesJson).map((attribute) => (
                      <span key={attribute} className="rounded-md bg-card px-3 py-2 text-xs font-black text-primary">
                        {attribute}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
                  <SelectField name="status" label="Status" defaultValue={suggestion.status} options={suggestionStatuses} />
                  <TextField name="adminNotes" label="Adminnotities" defaultValue={suggestion.adminNotes} />
                  <div className="grid content-end">
                    <SubmitButton>Opslaan</SubmitButton>
                  </div>
                </div>
              </form>
            ))
          ) : (
            <EmptyState>Nog geen spelvoorstellen.</EmptyState>
          )}
        </div>
      </AdminCard>
    </AdminPageShell>
  )
}

function SuggestionFact({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md bg-card px-3 py-2 text-xs font-black">
      <span className="text-muted-foreground">{label}</span> {value}
    </span>
  )
}

function getSuggestedAttributes(value: unknown) {
  if (!value || typeof value !== 'object') return []
  const selected = (value as { selected?: unknown; raw?: unknown }).selected
  if (Array.isArray(selected)) {
    return selected.filter((item): item is string => typeof item === 'string')
  }

  const raw = (value as { raw?: unknown }).raw
  if (typeof raw === 'string') {
    return raw.split(',').map((item) => item.trim()).filter(Boolean)
  }

  return []
}
