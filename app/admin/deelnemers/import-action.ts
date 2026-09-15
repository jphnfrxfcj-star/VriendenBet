'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { csvImportSchema, normalizeName, parameterName } from '@/lib/csv-import'

export async function importParticipants(input: unknown) {
  const session = await requireRole(['ADMIN'])
  const parsed = csvImportSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Controleer de namen en scores. Scores moeten tussen 0 en 10 liggen.' }
  const { rows, overwrite } = parsed.data
  const targets = rows.map((r) => r.participantId ?? `new:${normalizeName(r.name)}`)
  if (new Set(targets).size !== targets.length) return { ok: false, message: 'Elke deelnemer mag maar één keer worden gekoppeld.' }
  try {
    const counts = await prisma.$transaction(async (tx) => {
      const existingParticipants = await tx.participant.findMany()
      const existingAttributes = await tx.attribute.findMany()
      let created = 0, saved = 0, kept = 0
      for (const row of rows) {
        if (row.participantId && !existingParticipants.some((p) => p.id === row.participantId)) throw new Error('Deelnemer bestaat niet meer. Vernieuw het overzicht.')
        if (!row.participantId && existingParticipants.some((p) => normalizeName(p.name) === normalizeName(row.name))) throw new Error(`Koppel ${row.name} aan de bestaande deelnemer.`)
        const participant = row.participantId
          ? existingParticipants.find((p) => p.id === row.participantId)!
          : await tx.participant.create({ data: { name: row.name, shirtSize: row.shirtSize || undefined } })
        if (!row.participantId) created++
        if (row.participantId && row.shirtSize && (overwrite || !participant.shirtSize)) {
          await tx.participant.update({ where: { id: participant.id }, data: { shirtSize: row.shirtSize } })
        }
        for (const [name, score] of Object.entries(row.scores)) {
          let attribute = existingAttributes.find((a) => a.name === name) ?? existingAttributes.find((a) => parameterName(a.name) === name)
          if (!attribute) {
            attribute = await tx.attribute.create({ data: { name, minValue: 0, maxValue: 10 } })
            existingAttributes.push(attribute)
          }
          const key = { participantId: participant.id, attributeId: attribute.id }
          const existing = await tx.participantAttribute.findUnique({ where: { participantId_attributeId: key } })
          if (existing && !overwrite) { kept++; continue }
          // Zero is a valid survey rating; widen existing bounds only when needed.
          if (score < attribute.minValue || score > attribute.maxValue) {
            attribute = await tx.attribute.update({ where: { id: attribute.id }, data: { minValue: Math.min(attribute.minValue, Math.floor(score)), maxValue: Math.max(attribute.maxValue, Math.ceil(score)) } })
            const updatedAttribute = attribute
            existingAttributes[existingAttributes.findIndex((a) => a.id === updatedAttribute.id)] = updatedAttribute
          }
          await tx.participantAttribute.upsert({ where: { participantId_attributeId: key }, update: { score }, create: { ...key, score } })
          saved++
        }
      }
      await tx.auditLog.create({ data: { userId: session.userId, action: 'PARTICIPANTS_CSV_IMPORTED', entityType: 'Participant', entityId: 'csv-import', metadataJson: { participants: rows.length, created, saved, kept, overwrite } } })
      return { created, saved, kept }
    }, { timeout: 60_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    revalidatePath('/admin', 'layout')
    revalidatePath('/weekendspellen', 'layout')
    revalidatePath('/spel-voorstellen')
    return { ok: true, message: `${rows.length} deelnemers verwerkt: ${counts.created} nieuw, ${counts.saved} scores opgeslagen, ${counts.kept} bestaande scores behouden.` }
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Koppel ') || error.message.startsWith('Deelnemer bestaat'))) return { ok: false, message: error.message }
    console.error('CSV-import mislukt', error)
    return { ok: false, message: 'Importeren is niet gelukt. Er is niets opgeslagen. Controleer de databaseverbinding en probeer opnieuw.' }
  }
}
