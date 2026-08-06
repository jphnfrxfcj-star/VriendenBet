import { createTemplateAction, setTemplateAttributeAction, updateTemplateAction } from '../actions'
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

const formatOptions = [
  { value: 'TEAM', label: 'Teamspel' },
  { value: 'INDIVIDUAL', label: 'Individueel' },
]

export default async function AdminTemplatesPage() {
  const [templates, attributes] = await Promise.all([
    prisma.gameTemplate.findMany({
      include: { attributes: { include: { attribute: true } }, events: true },
      orderBy: { name: 'asc' },
    }),
    prisma.attribute.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  ])
  const invalidWeightCount = templates.filter((template) => {
    const total = template.attributes.reduce((sum, row) => sum + Number(row.weight), 0)
    return Math.abs(total - 1) >= 0.001
  }).length

  return (
    <AdminPageShell
      title="Speltemplates"
      subtitle="Maak herbruikbare speltypes, teamformaten, marges, gevoeligheid en eigenschapsgewichten."
    >
      <AdminCard title="Nieuw speltemplate">
        <form action={createTemplateAction} className="grid gap-4 md:grid-cols-2">
          <Field name="name" label="Naam" required />
          <SelectField name="format" label="Format" defaultValue="TEAM" options={formatOptions} />
          <Field name="teamCount" label="Aantal teams" type="number" defaultValue={2} min={1} />
          <Field name="minPlayersPerTeam" label="Min spelers/team" type="number" defaultValue={1} min={1} />
          <Field name="maxPlayersPerTeam" label="Max spelers/team" type="number" defaultValue={4} min={1} />
          <Field name="exactTeamSize" label="Exact teamformaat" type="number" placeholder="Optioneel" />
          <Field name="defaultMargin" label="Marge" type="number" step="0.01" defaultValue={0.1} />
          <Field name="defaultSensitivity" label="Gevoeligheid" type="number" step="0.01" defaultValue={1.2} />
          <SelectField
            name="attributeId"
            label="Eerste eigenschap"
            options={[
              { value: '', label: 'Later instellen' },
              ...attributes.map((attribute) => ({ value: attribute.id, label: attribute.name })),
            ]}
          />
          <div className="md:col-span-2">
            <TextField name="description" label="Omschrijving" />
          </div>
          <div className="md:col-span-2">
            <TextField name="rules" label="Regels" />
          </div>
          <div className="md:col-span-2">
            <SubmitButton>Template toevoegen</SubmitButton>
          </div>
        </form>
      </AdminCard>

      <section className="grid gap-3 md:grid-cols-3">
        <TemplateMetric label="Templates" value={String(templates.length)} />
        <TemplateMetric label="Actief" value={String(templates.filter((template) => template.isActive).length)} />
        <TemplateMetric label="Gewichten na te kijken" value={String(invalidWeightCount)} tone={invalidWeightCount ? 'warn' : 'ok'} />
      </section>

      <AdminCard title="Bestaande templates">
        <div className="grid gap-4">
          {templates.length ? (
            templates.map((template) => {
              const weightTotal = template.attributes.reduce((sum, row) => sum + Number(row.weight), 0)
              const weightOk = Math.abs(weightTotal - 1) < 0.001
              const playerRange = template.exactTeamSize
                ? `${template.exactTeamSize} exact`
                : `${template.minPlayersPerTeam}-${template.maxPlayersPerTeam}`
              return (
                <article key={template.id} className="grid gap-4 rounded-md border bg-secondary p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase text-primary">Template</p>
                      <h2 className="break-words text-2xl font-black leading-tight">{template.name}</h2>
                      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                        {template.description || 'Geen omschrijving ingevuld.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md bg-card px-3 py-2 text-xs font-black uppercase text-primary">
                        {template.format === 'TEAM' ? 'Teamspel' : 'Individueel'}
                      </span>
                      <span className={`rounded-md px-3 py-2 text-xs font-black uppercase ${template.isActive ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}>
                        {template.isActive ? 'Actief' : 'Inactief'}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    <TemplateFact label="Teams" value={String(template.teamCount)} />
                    <TemplateFact label="Spelers/team" value={playerRange} />
                    <TemplateFact label="Marge" value={formatPercent(Number(template.defaultMargin))} />
                    <TemplateFact label="Gevoeligheid" value={String(template.defaultSensitivity)} />
                    <TemplateFact label="Events" value={String(template.events.length)} />
                  </div>

                  <div className="rounded-md border bg-background p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-black">Eigenschapsmix</h3>
                      <span className={weightOk ? 'text-sm font-black text-primary' : 'text-sm font-black text-destructive'}>
                        Som {weightTotal.toFixed(2)}
                      </span>
                    </div>
                    {template.attributes.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {template.attributes
                          .sort((a, b) => Number(b.weight) - Number(a.weight))
                          .map((row) => (
                            <span key={row.attributeId} className="rounded-md bg-secondary px-3 py-2 text-sm font-bold">
                              {row.attribute.name} · {formatPercent(Number(row.weight))}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                        Nog geen eigenschappen gekoppeld.
                      </p>
                    )}
                  </div>

                  {template.rules ? (
                    <div className="rounded-md bg-card p-3 text-sm text-muted-foreground">
                      <strong className="text-foreground">Regels:</strong> {template.rules}
                    </div>
                  ) : null}

                  <details className="rounded-md border bg-background p-3">
                    <summary className="cursor-pointer text-sm font-black">Template aanpassen</summary>
                    <form action={updateTemplateAction} className="mt-3 grid gap-3 lg:grid-cols-4">
                      <input type="hidden" name="id" value={template.id} />
                      <Field name="name" label="Naam" defaultValue={template.name} required />
                      <SelectField name="format" label="Format" defaultValue={template.format} options={formatOptions} />
                      <Field name="teamCount" label="Teams" type="number" defaultValue={template.teamCount} />
                      <Field name="exactTeamSize" label="Exact" type="number" defaultValue={template.exactTeamSize} />
                      <Field name="minPlayersPerTeam" label="Min" type="number" defaultValue={template.minPlayersPerTeam} />
                      <Field name="maxPlayersPerTeam" label="Max" type="number" defaultValue={template.maxPlayersPerTeam} />
                      <Field name="defaultMargin" label="Marge" type="number" step="0.01" defaultValue={String(template.defaultMargin)} />
                      <Field
                        name="defaultSensitivity"
                        label="Gevoeligheid"
                        type="number"
                        step="0.01"
                        defaultValue={String(template.defaultSensitivity)}
                      />
                      <div className="lg:col-span-2">
                        <TextField name="description" label="Omschrijving" defaultValue={template.description} />
                      </div>
                      <div className="lg:col-span-2">
                        <TextField name="rules" label="Regels" defaultValue={template.rules} />
                      </div>
                      <div className="flex items-end gap-2 lg:col-span-4">
                        <CheckField name="isActive" label="Actief" defaultChecked={template.isActive} />
                        <SubmitButton>Template opslaan</SubmitButton>
                      </div>
                    </form>
                  </details>

                  <details className="rounded-md border bg-background p-3">
                    <summary className="cursor-pointer text-sm font-black">Gewichten beheren</summary>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {attributes.map((attribute) => {
                          const existing = template.attributes.find((row) => row.attributeId === attribute.id)
                          return (
                            <form key={attribute.id} action={setTemplateAttributeAction} className="flex items-end gap-2">
                              <input type="hidden" name="gameTemplateId" value={template.id} />
                              <input type="hidden" name="attributeId" value={attribute.id} />
                              <Field
                                name="weight"
                                label={attribute.name}
                                type="number"
                                step="0.01"
                                min={0}
                                max={1}
                                defaultValue={existing ? String(existing.weight) : 0}
                              />
                              <SubmitButton>OK</SubmitButton>
                            </form>
                          )
                        })}
                    </div>
                  </details>
                </article>
              )
            })
          ) : (
            <EmptyState>Nog geen templates.</EmptyState>
          )}
        </div>
      </AdminCard>
    </AdminPageShell>
  )
}

function TemplateMetric({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
      <p className={`mt-2 text-3xl font-black ${tone === 'warn' ? 'text-destructive' : 'text-primary'}`}>{value}</p>
    </div>
  )
}

function TemplateFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-card px-3 py-2">
      <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  )
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}
