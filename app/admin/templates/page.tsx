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
          <TextField name="description" label="Omschrijving" />
          <div className="md:col-span-2">
            <TextField name="rules" label="Regels" />
          </div>
          <div className="md:col-span-2">
            <SubmitButton>Template toevoegen</SubmitButton>
          </div>
        </form>
      </AdminCard>

      <AdminCard title="Bestaande templates">
        <div className="grid gap-4">
          {templates.length ? (
            templates.map((template) => {
              const weightTotal = template.attributes.reduce((sum, row) => sum + Number(row.weight), 0)
              return (
                <div key={template.id} className="grid gap-3 rounded-md border bg-secondary p-3">
                  <form action={updateTemplateAction} className="grid gap-3 lg:grid-cols-4">
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

                  <div className="rounded-md border bg-background p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-black">Eigenschapsgewichten</h3>
                      <span className={Math.abs(weightTotal - 1) < 0.001 ? 'text-sm text-primary' : 'text-sm text-destructive'}>
                        Som: {weightTotal.toFixed(2)}
                      </span>
                    </div>
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
                  </div>
                </div>
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
