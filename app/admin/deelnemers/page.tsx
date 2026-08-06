import {
  createParticipantAction,
  createUserAction,
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

export default async function AdminParticipantsPage() {
  const [participants, users] = await Promise.all([
    prisma.participant.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ include: { participant: true }, orderBy: { displayName: 'asc' } }),
  ])

  return (
    <AdminPageShell
      title="Deelnemers en accounts"
      subtitle="Beheer fysieke deelnemers, koppel accounts, wijzig rollen en reset pincodes."
    >
      <AdminCard title="Nieuwe deelnemer">
        <form action={createParticipantAction} className="grid gap-4 md:grid-cols-2">
          <Field name="name" label="Naam" required />
          <Field name="nickname" label="Bijnaam" />
          <Field name="shirtSize" label="Shirtmaat" />
          <Field name="photoUrl" label="Foto URL" />
          <div className="md:col-span-2">
            <SubmitButton>Deelnemer toevoegen</SubmitButton>
          </div>
        </form>
      </AdminCard>

      <AdminCard title="Deelnemers">
        <div className="grid gap-3">
          {participants.length ? (
            participants.map((participant) => (
              <form
                key={participant.id}
                action={updateParticipantAction}
                className="grid gap-3 rounded-md border bg-secondary p-3 lg:grid-cols-[1fr_1fr_120px_1fr_auto]"
              >
                <input type="hidden" name="id" value={participant.id} />
                <Field name="name" label="Naam" defaultValue={participant.name} required />
                <Field name="nickname" label="Bijnaam" defaultValue={participant.nickname} />
                <Field name="shirtSize" label="Shirt" defaultValue={participant.shirtSize} />
                <Field name="photoUrl" label="Foto URL" defaultValue={participant.photoUrl} />
                <div className="grid content-end gap-2">
                  <CheckField name="isActive" label="Actief" defaultChecked={participant.isActive} />
                  <SubmitButton>Opslaan</SubmitButton>
                </div>
              </form>
            ))
          ) : (
            <EmptyState>Nog geen deelnemers.</EmptyState>
          )}
        </div>
      </AdminCard>

      <AdminCard title="Nieuwe gebruiker">
        <form action={createUserAction} className="grid gap-4 md:grid-cols-2">
          <Field name="displayName" label="Naam" required />
          <Field name="pin" label="Pincode" type="password" required />
          <SelectField
            name="role"
            label="Rol"
            defaultValue="VIEWER"
            options={[
              { value: 'ADMIN', label: 'ADMIN' },
              { value: 'MIEL', label: 'MIEL' },
              { value: 'VIEWER', label: 'VIEWER' },
            ]}
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
        </form>
      </AdminCard>

      <AdminCard title="Gebruikersaccounts">
        <div className="grid gap-3">
          {users.map((user) => (
            <form
              key={user.id}
              action={updateUserAction}
              className="grid gap-3 rounded-md border bg-secondary p-3 lg:grid-cols-[1fr_150px_1fr_1fr_auto]"
            >
              <input type="hidden" name="id" value={user.id} />
              <Field name="displayName" label="Naam" defaultValue={user.displayName} required />
              <SelectField
                name="role"
                label="Rol"
                defaultValue={user.role}
                options={[
                  { value: 'ADMIN', label: 'ADMIN' },
                  { value: 'MIEL', label: 'MIEL' },
                  { value: 'VIEWER', label: 'VIEWER' },
                ]}
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
            </form>
          ))}
        </div>
      </AdminCard>
    </AdminPageShell>
  )
}
