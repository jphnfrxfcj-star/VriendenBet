import { createAttributeAction, setParticipantScoreAction, updateAttributeAction } from '../actions'
import {
  AdminCard,
  AdminPageShell,
  CheckField,
  EmptyState,
  Field,
  SubmitButton,
  TextField,
} from '../shared'
import { prisma } from '@/lib/prisma'

export default async function AdminAttributesPage() {
  const [attributes, participants] = await Promise.all([
    prisma.attribute.findMany({ orderBy: { name: 'asc' } }),
    prisma.participant.findMany({
      include: { attributes: { include: { attribute: true } } },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <AdminPageShell
      title="Eigenschappen en scores"
      subtitle="Beheer ratingparameters en zet scores per deelnemer. Deze scores voeden de oddsberekening."
    >
      <AdminCard title="Nieuwe eigenschap">
        <form action={createAttributeAction} className="grid gap-4 md:grid-cols-2">
          <Field name="name" label="Naam" required />
          <Field name="minValue" label="Minimum" type="number" defaultValue={1} />
          <Field name="maxValue" label="Maximum" type="number" defaultValue={10} />
          <TextField name="description" label="Omschrijving" />
          <div className="md:col-span-2">
            <SubmitButton>Eigenschap toevoegen</SubmitButton>
          </div>
        </form>
      </AdminCard>

      <AdminCard title="Eigenschappen">
        <div className="grid gap-3">
          {attributes.map((attribute) => (
            <form
              key={attribute.id}
              action={updateAttributeAction}
              className="grid gap-3 rounded-md border bg-secondary p-3 md:grid-cols-[1fr_100px_100px_1fr_auto]"
            >
              <input type="hidden" name="id" value={attribute.id} />
              <Field name="name" label="Naam" defaultValue={attribute.name} required />
              <Field name="minValue" label="Min" type="number" defaultValue={attribute.minValue} />
              <Field name="maxValue" label="Max" type="number" defaultValue={attribute.maxValue} />
              <TextField name="description" label="Omschrijving" defaultValue={attribute.description} />
              <div className="grid content-end gap-2">
                <CheckField name="isActive" label="Actief" defaultChecked={attribute.isActive} />
                <SubmitButton>Opslaan</SubmitButton>
              </div>
            </form>
          ))}
        </div>
      </AdminCard>

      <AdminCard title="Scores per deelnemer">
        {attributes.length && participants.length ? (
          <div className="grid gap-3">
            {participants.map((participant) => (
              <div key={participant.id} className="rounded-md border bg-secondary p-3">
                <h2 className="font-black">{participant.name}</h2>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {attributes.map((attribute) => {
                    const existing = participant.attributes.find((score) => score.attributeId === attribute.id)
                    return (
                      <form key={attribute.id} action={setParticipantScoreAction} className="flex items-end gap-2">
                        <input type="hidden" name="participantId" value={participant.id} />
                        <input type="hidden" name="attributeId" value={attribute.id} />
                        <Field
                          name="score"
                          label={attribute.name}
                          type="number"
                          min={attribute.minValue}
                          max={attribute.maxValue}
                          defaultValue={existing?.score ?? attribute.minValue}
                        />
                        <SubmitButton>OK</SubmitButton>
                      </form>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Maak eerst deelnemers en eigenschappen aan.</EmptyState>
        )}
      </AdminCard>
    </AdminPageShell>
  )
}
