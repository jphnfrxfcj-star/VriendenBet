'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createWeekendGame } from '@/lib/create-weekend-game'
import { weekendGameSchema } from '@/lib/weekend-game'

export async function approveGameSuggestionAction(formData: FormData) {
  const session = await requireRole(['ADMIN'])
  const id = String(formData.get('id') ?? '')
  await prisma.$transaction(async (tx) => {
    const suggestion = await tx.gameSuggestion.findUniqueOrThrow({ where: { id }, include: { event: true } })
    if (suggestion.event) return // Repeated approval never creates another game.
    if (suggestion.status === 'REJECTED') throw new Error('Deze aanvraag is afgewezen.')
    const activeAttributes = await tx.attribute.findMany({ where: { isActive: true }, select: { id: true, name: true } })
    const proposed = suggestion.proposedAttributesJson as { selected?: unknown; raw?: unknown } | null
    const names = Array.isArray(proposed?.selected) ? proposed.selected : typeof proposed?.raw === 'string' ? proposed.raw.split(',').map((name) => name.trim()) : []
    const attributeIds = activeAttributes.filter((attribute) => names.includes(attribute.name)).map((attribute) => attribute.id)
    const data = weekendGameSchema.parse({
      title: suggestion.title,
      teamCount: formData.get('teamCount') ?? suggestion.proposedTeamCount ?? 2,
      playersPerTeam: formData.get('playersPerTeam') ?? suggestion.proposedPlayersPerTeam ?? 1,
      teamOne: 'Team Groen', teamTwo: 'Team Geel',
      description: [suggestion.description, suggestion.proposedRules].filter(Boolean).join('\n\n'),
      startsAt: '', attributeIds,
    })
    const eventId = await createWeekendGame(tx, session.userId, data, id)
    await tx.gameSuggestion.update({ where: { id }, data: { status: 'CONVERTED' } })
    await tx.auditLog.create({ data: {
      userId: session.userId, action: 'GAME_SUGGESTION_APPROVED', entityType: 'GameSuggestion', entityId: id,
      metadataJson: { eventId },
    } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  refreshSuggestions()
}

export async function rejectGameSuggestionAction(formData: FormData) {
  const session = await requireRole(['ADMIN'])
  const id = String(formData.get('id') ?? '')
  await prisma.$transaction(async (tx) => {
    const suggestion = await tx.gameSuggestion.findUniqueOrThrow({ where: { id }, include: { event: true } })
    if (suggestion.event) throw new Error('Deze aanvraag is al toegevoegd als spel.')
    await tx.gameSuggestion.update({ where: { id }, data: { status: 'REJECTED' } })
    await tx.auditLog.create({ data: { userId: session.userId, action: 'GAME_SUGGESTION_REJECTED', entityType: 'GameSuggestion', entityId: id } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  refreshSuggestions()
}

function refreshSuggestions() {
  revalidatePath('/admin')
  revalidatePath('/admin/evenementen')
  revalidatePath('/admin/voorstellen')
  revalidatePath('/admin/weddenschappen')
  revalidatePath('/spel-voorstellen')
  revalidatePath('/weekendspellen')
}
