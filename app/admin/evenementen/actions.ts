'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { weekendGameSchema } from '@/lib/weekend-game'
import { createWeekendGame } from '@/lib/create-weekend-game'

export async function createWeekendGameAction(formData: FormData) {
  const session = await requireRole(['ADMIN'])
  const data = weekendGameSchema.parse({
    teamCount: formData.get('teamCount') ?? 2,
    title: formData.get('title'),
    playersPerTeam: formData.get('playersPerTeam'),
    teamOne: formData.get('teamOne'),
    teamTwo: formData.get('teamTwo'),
    description: String(formData.get('description') ?? ''),
    startsAt: String(formData.get('startsAt') ?? ''),
    attributeIds: formData.getAll('attributeId'),
  })
  const eventId = await prisma.$transaction(async (tx) => {
    return createWeekendGame(tx, session.userId, data)
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

export async function updateWeekendTeamSizeAction(formData: FormData) {
  const session = await requireRole(['ADMIN'])
  const id = String(formData.get('id') ?? '').trim()
  const size = Number(formData.get('playersPerTeam'))
  if (!id || !Number.isInteger(size) || size < 1 || size > 50) throw new Error('Kies 1 tot 50 spelers per team.')
  await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUniqueOrThrow({
      where: { id },
      include: { gameTemplate: { include: { attributes: true } }, _count: { select: { bets: true } } },
    })
    if (!['DRAFT', 'OPEN_FOR_SELECTION', 'ODDS_READY'].includes(event.status) || event._count.bets > 0) {
      throw new Error('Het aantal spelers kan niet meer veranderen zodra er is ingezet of het spel is gestart.')
    }
    const original = event.gameTemplate
    if ((original.exactTeamSize ?? original.maxPlayersPerTeam) === size) return
    // Clone settings: older games can share a template, but this change is per game.
    const settings = await tx.gameTemplate.create({ data: {
      name: original.name,
      description: original.description,
      rules: original.rules,
      format: original.format,
      teamCount: original.teamCount,
      minPlayersPerTeam: size,
      maxPlayersPerTeam: size,
      exactTeamSize: size,
      defaultMargin: original.defaultMargin,
      defaultSensitivity: original.defaultSensitivity,
      isActive: false,
      attributes: { create: original.attributes.map(({ attributeId, weight }) => ({ attributeId, weight })) },
    } })
    await tx.event.update({ where: { id }, data: {
      gameTemplateId: settings.id,
      status: event.status === 'DRAFT' ? 'DRAFT' : 'OPEN_FOR_SELECTION',
    } })
    await tx.eventTeam.updateMany({ where: { eventId: id }, data: {
      calculatedScore: null, calculatedProbability: null, calculatedOdds: null,
      overriddenOdds: null, finalOdds: null,
    } })
    await tx.auditLog.create({ data: {
      userId: session.userId, action: 'WEEKEND_TEAM_SIZE_UPDATED', entityType: 'Event', entityId: id,
      metadataJson: { previousSize: original.exactTeamSize ?? original.maxPlayersPerTeam, playersPerTeam: size },
    } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  revalidatePath('/admin/evenementen')
  revalidatePath('/admin/weddenschappen')
  revalidatePath('/weekendspellen')
  revalidatePath(`/weekendspellen/${id}`)
}
