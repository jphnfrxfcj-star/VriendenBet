import { parameterName } from '@/lib/csv-import'
import { AdminForm } from '../AdminForm'
import { SearchableList } from '../SearchableList'
import { CsvImport } from './CsvImport'
import {
  createParticipantAction,
  createUserAction,
  setParticipantScoresAction,
  updateParticipantAction,
  updateUserAction,
} from '../actions'
import {
  AdminCard,
  AdminPageShell,
  CheckField,
  EmptyState,
  Field,
  SelectField,
  SubmitButton,
} from '../shared'
import { prisma } from '@/lib/prisma'
import { roleOptionLabel } from '@/lib/roles'

const roleOptions = [
  { value: 'ADMIN', label: roleOptionLabel('ADMIN') },
  { value: 'MIEL', label: roleOptionLabel('MIEL') },
  { value: 'VIEWER', label: roleOptionLabel('VIEWER') },
]

export default async function AdminParticipantsPage() {
  const [participants, users, attributes] = await Promise.all([
    prisma.participant.findMany({
      include: { attributes: { include: { attribute: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({ include: { participant: true }, orderBy: { displayName: 'asc' } }),
    prisma.attribute.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <AdminPageShell
      title="Deelnemers en accounts"
      subtitle="Beheer fysieke deelnemers, koppel accounts, wijzig rollen en reset pincodes."
    >
      <AdminCard title="Deelnemers en scores importeren">
        <CsvImport participants={participants.map(({ id, name, nickname, attributes }) => ({ id, name, nickname, scores: Object.fromEntries(attributes.map((row) => [parameterName(row.attribute.name) ?? row.attribute.name, row.score])) }))} />
      </AdminCard>
      <AdminCard title="Nieuwe deelnemer" collapsed>
        <AdminForm action={createParticipantAction} className="grid gap-4 md:grid-cols-2">
          <Field name="name" label="Naam" required />
          <Field name="nickname" label="Bijnaam" />
          <Field name="shirtSize" label="Shirtmaat" />
          <Field name="photoUrl" label="Foto URL" />
          <div className="md:col-span-2">
            <SubmitButton>Deelnemer toevoegen</SubmitButton>
          </div>
        </AdminForm>
      </AdminCard>

      <AdminCard title="Deelnemers">
        <div className="grid gap-3">
          {participants.length ? (
            <SearchableList label="Deelnemer zoeken" items={participants.map((participant) => ({ id: participant.id, search: `${participant.name} ${participant.nickname ?? ''}`, content: (
              <details className="rounded-md border bg-secondary p-3">
                <summary className="cursor-pointer font-black">{participant.name}{participant.nickname ? ` · ${participant.nickname}` : ''} <span className="text-xs font-normal text-muted-foreground">· {participant.attributes.length} scores · {participant.isActive ? 'Actief' : 'Inactief'}</span></summary>
                <div className="mt-4 grid gap-4">
                <AdminForm action={updateParticipantAction} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={participant.id} />
                  <Field name="name" label="Naam" defaultValue={participant.name} required />
                  <Field name="nickname" label="Bijnaam" defaultValue={participant.nickname} />
                  <Field name="shirtSize" label="Shirt" defaultValue={participant.shirtSize} />
                  <Field name="photoUrl" label="Foto URL" defaultValue={participant.photoUrl} />
                  <div className="grid content-end gap-2">
                    <CheckField name="isActive" label="Actief" defaultChecked={participant.isActive} />
                    <SubmitButton>Profiel opslaan</SubmitButton>
                  </div>
                </AdminForm>

                <div className="rounded-md border bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-black">Ratings voor {participant.name}</h2>
                    <span className="text-xs font-black uppercase text-muted-foreground">
                      {attributes.length} parameters
                    </span>
                  </div>
                  {attributes.length ? (
                    <AdminForm action={setParticipantScoresAction} className="mt-3 grid gap-3">
                      <input type="hidden" name="participantId" value={participant.id} />
                      <p className="text-sm text-muted-foreground">Pas meerdere scores aan en sla ze samen op. Lege velden blijven ongewijzigd.</p>
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {attributes.map((attribute) => {
                        const existing = participant.attributes.find((score) => score.attributeId === attribute.id)
                        return (
                          <Field
                            key={attribute.id}
                            name={`score:${attribute.id}`}
                            label={attribute.name}
                            type="number"
                            step="any"
                            min={attribute.minValue}
                            max={attribute.maxValue}
                            defaultValue={existing?.score}
                          />
                        )
                      })}
                      </div>
                      <div>
                        <SubmitButton>Ratings opslaan</SubmitButton>
                      </div>
                    </AdminForm>
                  ) : (
                    <EmptyState>Maak eerst eigenschappen aan om spelers te kunnen scoren.</EmptyState>
                  )}
                </div>
                </div>
              </details>
            ) }))} />
          ) : (
            <EmptyState>Nog geen deelnemers.</EmptyState>
          )}
        </div>
      </AdminCard>

      <AdminCard title="Nieuwe gebruiker" collapsed>
        <AdminForm action={createUserAction} className="grid gap-4 md:grid-cols-2">
          <Field name="displayName" label="Naam" required />
          <Field name="pin" label="Pincode" type="password" required />
          <SelectField
            name="role"
            label="Rol"
            defaultValue="VIEWER"
            options={roleOptions}
          />
          <SelectField
            name="participantId"
            label="Gekoppelde deelnemer"
            options={[
              { value: '', label: 'Geen koppeling' },
              ...participants.map((participant) => ({ value: participant.id, label: participant.name })),
            ]}
          />
          <div className="md:col-span-2">
            <SubmitButton>Gebruiker toevoegen</SubmitButton>
          </div>
        </AdminForm>
      </AdminCard>

      <AdminCard title="Gebruikersaccounts">
        <div className="grid gap-3">
          <SearchableList label="Gebruiker zoeken" items={users.map((user) => ({ id: user.id, search: `${user.displayName} ${user.participant?.name ?? ''}`, content: (
            <details className="rounded-md border bg-secondary p-3">
              <summary className="cursor-pointer font-black">{user.displayName} <span className="text-xs font-normal text-muted-foreground">· {roleOptionLabel(user.role)} · {user.isActive ? 'Actief' : 'Inactief'}</span></summary>
            <AdminForm
              key={user.id}
              action={updateUserAction}
              className="grid gap-3 rounded-md border bg-secondary p-3 sm:grid-cols-2"
            >
              <input type="hidden" name="id" value={user.id} />
              <Field name="displayName" label="Naam" defaultValue={user.displayName} required />
              <SelectField
                name="role"
                label="Rol"
                defaultValue={user.role}
                options={roleOptions}
              />
              <SelectField
                name="participantId"
                label="Deelnemer"
                defaultValue={user.participantId}
                options={[
                  { value: '', label: 'Geen koppeling' },
                  ...participants.map((participant) => ({ value: participant.id, label: participant.name })),
                ]}
              />
              <Field name="pin" label="Nieuwe pincode" type="password" placeholder="Leeg laten = behouden" />
              <div className="grid content-end gap-2">
                <CheckField name="isActive" label="Actief" defaultChecked={user.isActive} />
                <SubmitButton>Opslaan</SubmitButton>
              </div>
            </AdminForm>
            </details>
          ) }))} />
        </div>
      </AdminCard>
    </AdminPageShell>
  )
}
