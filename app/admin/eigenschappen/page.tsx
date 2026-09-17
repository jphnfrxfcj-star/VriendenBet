import { AdminForm } from '../AdminForm'
import Link from 'next/link'
import { createAttributeAction, updateAttributeAction } from '../actions'
import {
  AdminCard,
  AdminPageShell,
  CheckField,
  Field,
  SubmitButton,
  TextField,
} from '../shared'
import { prisma } from '@/lib/prisma'

export default async function AdminAttributesPage() {
  const attributes = await prisma.attribute.findMany({ orderBy: { name: 'asc' } })

  return (
    <AdminPageShell
      title="Parameters"
      subtitle="Beheer de parameters en hun schaal. Scores pas je samen aan bij deelnemers."
    >
      <Link href="/admin/deelnemers" className="font-bold text-primary underline">Deelnemers en scores beheren of CSV importeren →</Link>
      <AdminCard title="Nieuwe eigenschap" collapsed>
        <AdminForm action={createAttributeAction} className="grid gap-4 md:grid-cols-2">
          <Field name="name" label="Naam" required />
          <Field name="minValue" label="Minimum" type="number" defaultValue={1} />
          <Field name="maxValue" label="Maximum" type="number" defaultValue={10} />
          <div className="md:col-span-2">
            <TextField name="description" label="Omschrijving" />
          </div>
          <div className="md:col-span-2">
            <SubmitButton>Eigenschap toevoegen</SubmitButton>
          </div>
        </AdminForm>
      </AdminCard>

      <AdminCard title="Eigenschappen">
        <div className="grid gap-3">
          {attributes.map((attribute) => (
            <AdminForm
              key={attribute.id}
              action={updateAttributeAction}
              className="grid gap-3 rounded-md border bg-secondary p-3 sm:grid-cols-2 sm:items-end"
            >
              <input type="hidden" name="id" value={attribute.id} />
              <Field name="name" label="Naam" defaultValue={attribute.name} required />
              <Field name="minValue" label="Min" type="number" defaultValue={attribute.minValue} />
              <Field name="maxValue" label="Max" type="number" defaultValue={attribute.maxValue} />
              <TextField
                name="description"
                label="Omschrijving"
                defaultValue={attribute.description}
                rows={1}
                textareaClassName="min-h-11 resize-y"
              />
              <div className="grid content-end gap-2">
                <CheckField name="isActive" label="Actief" defaultChecked={attribute.isActive} />
                <SubmitButton>Opslaan</SubmitButton>
              </div>
            </AdminForm>
          ))}
        </div>
      </AdminCard>


    </AdminPageShell>
  )
}
