'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { equalGameWeights, weekendGameSchema } from '@/lib/weekend-game'

export async function createWeekendGameAction(formData: FormData) {
  const session = await requireRole(['ADMIN'])
  const data = weekendGameSchema.parse({
    title: formData.get('title'),
    playersPerTeam: formData.get('playersPerTeam'),
    teamOne: formData.get('teamOne'),
    teamTwo: formData.get('teamTwo'),
    description: String(formData.get('description') ?? ''),
    startsAt: String(formData.get('startsAt') ?? ''),
    attributeIds: formData.getAll('attributeId'),
  })
  const eventId = await prisma.$transaction(async (tx) => {
    let attributes = await tx.attribute.findMany({ where: { isActive: true }, select: { id: true } })
    if (data.attributeIds.some((id) => !attributes.some((attribute) => attribute.id === id))) {
      throw new Error('Een gekozen parameter is niet meer beschikbaar.')
    }
    if (!attributes.length) {
      const attribute = await tx.attribute.upsert({
        where: { name: 'Lucky factor' }, update: { isActive: true },
        create: { name: 'Lucky factor', minValue: 0, maxValue: 10 },
      })
      attributes = [attribute]
    }
    const weights = equalGameWeights(data.attributeIds.length ? data.attributeIds : attributes.map((attribute) => attribute.id))
    const event = await tx.event.create({
      data: {
        title: data.title,
        description: data.description || undefined,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        status: 'OPEN_FOR_SELECTION',
        createdBy: { connect: { id: session.userId } },
        gameTemplate: {
          create: {
            name: data.title,
            format: 'TEAM',
            teamCount: 2,
            minPlayersPerTeam: data.playersPerTeam,
            maxPlayersPerTeam: data.playersPerTeam,
            exactTeamSize: data.playersPerTeam,
            defaultMargin: 0.1,
            defaultSensitivity: 1.25,
            // Event-specific settings are not reusable choices in the legacy catalog.
            isActive: false,
            attributes: { create: weights },
          },
        },
        teams: { create: [{ name: data.teamOne }, { name: data.teamTwo }] },
      },
    })
    await tx.auditLog.create({ data: {
      userId: session.userId, action: 'WEEKEND_GAME_CREATED', entityType: 'Event', entityId: event.id,
      metadataJson: { playersPerTeam: data.playersPerTeam, teams: 2 },
    } })
    return event.id
  })
  revalidatePath('/admin/evenementen')
  revalidatePath('/admin/weddenschappen')
  revalidatePath('/weekendspellen')
  return { id: eventId }
}

/** Older draft games can enter the same flow without manually creating teams. */
export async function prepareWeekendGameAction(formData: FormData) {
  const session = await requireRole(['ADMIN'])
  const id = String(formData.get('id') ?? '')
  await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUniqueOrThrow({ where: { id }, include: { gameTemplate: true, teams: true } })
    if (event.status !== 'DRAFT') throw new Error('Dit spel is al klaargezet.')
    const missing = Math.max(0, event.gameTemplate.teamCount - event.teams.length)
    if (missing) await tx.eventTeam.createMany({ data: Array.from({ length: missing }, (_, index) => ({ eventId: id, name: `Team ${event.teams.length + index + 1}` })) })
    await tx.event.update({ where: { id }, data: { status: 'OPEN_FOR_SELECTION' } })
    await tx.auditLog.create({ data: { userId: session.userId, action: 'WEEKEND_GAME_PREPARED', entityType: 'Event', entityId: id } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  revalidatePath('/admin/evenementen')
  revalidatePath('/admin/weddenschappen')
  revalidatePath('/weekendspellen')
  revalidatePath(`/weekendspellen/${id}`)
}
