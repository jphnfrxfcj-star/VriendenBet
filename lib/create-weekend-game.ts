import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { equalGameWeights, weekendGameSchema } from './weekend-game'

export async function createWeekendGame(tx: Prisma.TransactionClient, userId: string, data: z.infer<typeof weekendGameSchema>, sourceSuggestionId?: string) {
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
        ...(sourceSuggestionId ? { sourceSuggestion: { connect: { id: sourceSuggestionId } } } : {}),
        title: data.title,
        description: data.description || undefined,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        status: 'OPEN_FOR_SELECTION',
        createdBy: { connect: { id: userId } },
        gameTemplate: {
          create: {
            name: data.title,
            format: 'TEAM',
            teamCount: data.teamCount,
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
        teams: { create: Array.from({ length: data.teamCount }, (_, index) => ({ name: index === 0 ? data.teamOne : index === 1 ? data.teamTwo : `Team ${index + 1}` })) },
      },
    })
    await tx.auditLog.create({ data: {
      userId: userId, action: 'WEEKEND_GAME_CREATED', entityType: 'Event', entityId: event.id,
      metadataJson: { playersPerTeam: data.playersPerTeam, teams: data.teamCount },
    } })
    return event.id
}
