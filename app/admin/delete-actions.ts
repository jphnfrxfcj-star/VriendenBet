'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

class DeleteBlocked extends Error {}

export async function deleteAdminItem(kind: string, id: string) {
  const session = await requireRole(['ADMIN'])
  if (!id) return { ok: false, message: 'Geen item geselecteerd.' }
  try {
    await prisma.$transaction(async (tx) => {
      switch (kind) {
        case 'event': {
          const event = await tx.event.findUniqueOrThrow({ where: { id }, include: { _count: { select: { bets: true } } } })
          if (event._count.bets) throw new DeleteBlocked('Dit spel heeft weddenschappen. Gebruik Spel annuleren om open inzetten terug te betalen; de historiek blijft bewaard.')
          await tx.event.delete({ where: { id } })
          if (event.sourceSuggestionId) await tx.gameSuggestion.update({ where: { id: event.sourceSuggestionId }, data: { status: 'REJECTED' } })
          await tx.gameTemplate.deleteMany({ where: { id: event.gameTemplateId, isActive: false, events: { none: {} } } })
          break
        }
        case 'suggestion': {
          if (await tx.event.count({ where: { sourceSuggestionId: id } })) throw new DeleteBlocked('Deze aanvraag is gekoppeld aan een spel. Verwijder eerst het spel.')
          await tx.gameSuggestion.delete({ where: { id } })
          break
        }
        case 'participant': {
          const item = await tx.participant.findUniqueOrThrow({ where: { id }, include: { _count: { select: { user: true, events: true, teamMembers: true } } } })
          if (Object.values(item._count).some(Boolean)) throw new DeleteBlocked('Deze deelnemer is gekoppeld aan een account of spel. Zet de deelnemer op inactief om de historiek te bewaren.')
          await tx.participant.delete({ where: { id } })
          break
        }
        case 'attribute': {
          if (await tx.gameTemplateAttribute.count({ where: { attributeId: id } })) throw new DeleteBlocked('Deze parameter wordt gebruikt door een spelconfiguratie. Zet de parameter op inactief.')
          await tx.attribute.delete({ where: { id } })
          break
        }
        case 'footballMatch':
          await tx.footballMatch.delete({ where: { id } })
          break
        case 'footballMarket':
          await tx.footballMarket.delete({ where: { id } })
          break
        case 'footballSelection':
          await tx.footballSelection.delete({ where: { id } })
          break
        default: throw new DeleteBlocked('Dit type kan niet worden verwijderd.')
      }
      await tx.auditLog.create({ data: { userId: session.userId, action: 'ITEM_DELETED', entityType: kind, entityId: id } })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof DeleteBlocked) return { ok: false, message: error.message }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') return { ok: false, message: 'Dit item is al gekoppeld aan andere gegevens of weddenschappen en kan niet worden verwijderd. De historiek blijft bewaard.' }
      if (error.code === 'P2025') return { ok: false, message: 'Dit item bestaat niet meer. Vernieuw het overzicht.' }
      if (error.code === 'P2034') return { ok: false, message: 'Dit item werd ondertussen aangepast. Probeer opnieuw.' }
    }
    return { ok: false, message: 'Verwijderen is niet gelukt. Probeer opnieuw.' }
  }
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Verwijderd.' }
}
