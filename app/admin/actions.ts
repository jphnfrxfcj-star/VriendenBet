'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { hashPin } from '@/lib/pin'

async function adminUser() {
  return requireRole(['ADMIN'])
}

async function audit(userId: string, action: string, entityType: string, entityId: string, metadata?: unknown) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      metadataJson: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
  })
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function optionalValue(formData: FormData, key: string) {
  const raw = value(formData, key)
  return raw.length ? raw : undefined
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const raw = Number(value(formData, key))
  return Number.isFinite(raw) ? raw : fallback
}

function boolValue(formData: FormData, key: string) {
  return value(formData, key) === 'on' || value(formData, key) === 'true'
}

export async function createParticipantAction(formData: FormData) {
  const session = await adminUser()
  const name = value(formData, 'name')
  if (!name) return

  const participant = await prisma.participant.create({
    data: {
      name,
      nickname: optionalValue(formData, 'nickname'),
      shirtSize: optionalValue(formData, 'shirtSize'),
      photoUrl: optionalValue(formData, 'photoUrl'),
    },
  })
  await audit(session.userId, 'PARTICIPANT_CREATED', 'Participant', participant.id, { name })
  revalidatePath('/admin/deelnemers')
  return
}

export async function updateParticipantAction(formData: FormData) {
  const session = await adminUser()
  const id = value(formData, 'id')
  const participant = await prisma.participant.update({
    where: { id },
    data: {
      name: value(formData, 'name'),
      nickname: optionalValue(formData, 'nickname'),
      shirtSize: optionalValue(formData, 'shirtSize'),
      photoUrl: optionalValue(formData, 'photoUrl'),
      isActive: boolValue(formData, 'isActive'),
    },
  })
  await audit(session.userId, 'PARTICIPANT_UPDATED', 'Participant', participant.id, { name: participant.name })
  revalidatePath('/admin/deelnemers')
  return
}

export async function createUserAction(formData: FormData) {
  const session = await adminUser()
  const displayName = value(formData, 'displayName')
  const pin = value(formData, 'pin')
  if (!displayName || !pin) return

  const user = await prisma.user.create({
    data: {
      displayName,
      pinHash: await hashPin(pin),
      role: value(formData, 'role') as 'ADMIN' | 'MIEL' | 'VIEWER',
      participantId: optionalValue(formData, 'participantId'),
    },
  })
  await audit(session.userId, 'USER_CREATED', 'User', user.id, { displayName, role: user.role })
  revalidatePath('/admin/deelnemers')
  return
}

export async function updateUserAction(formData: FormData) {
  const session = await adminUser()
  const id = value(formData, 'id')
  const pin = optionalValue(formData, 'pin')
  const user = await prisma.user.update({
    where: { id },
    data: {
      displayName: value(formData, 'displayName'),
      role: value(formData, 'role') as 'ADMIN' | 'MIEL' | 'VIEWER',
      isActive: boolValue(formData, 'isActive'),
      participantId: optionalValue(formData, 'participantId') ?? null,
      ...(pin ? { pinHash: await hashPin(pin) } : {}),
    },
  })
  await audit(session.userId, pin ? 'USER_PIN_RESET' : 'USER_UPDATED', 'User', user.id, {
    displayName: user.displayName,
    role: user.role,
  })
  revalidatePath('/admin/deelnemers')
  return
}

export async function createAttributeAction(formData: FormData) {
  const session = await adminUser()
  const name = value(formData, 'name')
  if (!name) return

  const attribute = await prisma.attribute.create({
    data: {
      name,
      description: optionalValue(formData, 'description'),
      minValue: numberValue(formData, 'minValue', 1),
      maxValue: numberValue(formData, 'maxValue', 10),
    },
  })
  await audit(session.userId, 'ATTRIBUTE_CREATED', 'Attribute', attribute.id, { name })
  revalidatePath('/admin/eigenschappen')
  return
}

export async function updateAttributeAction(formData: FormData) {
  const session = await adminUser()
  const id = value(formData, 'id')
  const attribute = await prisma.attribute.update({
    where: { id },
    data: {
      name: value(formData, 'name'),
      description: optionalValue(formData, 'description'),
      minValue: numberValue(formData, 'minValue', 1),
      maxValue: numberValue(formData, 'maxValue', 10),
      isActive: boolValue(formData, 'isActive'),
    },
  })
  await audit(session.userId, 'ATTRIBUTE_UPDATED', 'Attribute', attribute.id, { name: attribute.name })
  revalidatePath('/admin/eigenschappen')
  return
}

export async function setParticipantScoreAction(formData: FormData) {
  const session = await adminUser()
  const participantId = value(formData, 'participantId')
  const attributeId = value(formData, 'attributeId')
  const score = numberValue(formData, 'score', 1)
  const row = await prisma.participantAttribute.upsert({
    where: { participantId_attributeId: { participantId, attributeId } },
    update: { score },
    create: { participantId, attributeId, score },
  })
  await audit(session.userId, 'PARTICIPANT_SCORE_UPDATED', 'ParticipantAttribute', `${participantId}:${attributeId}`, {
    score: row.score,
  })
  revalidatePath('/admin/eigenschappen')
  revalidatePath('/admin/deelnemers')
  return
}

export async function createTemplateAction(formData: FormData) {
  const session = await adminUser()
  const attributeId = optionalValue(formData, 'attributeId')
  const template = await prisma.gameTemplate.create({
    data: {
      name: value(formData, 'name'),
      description: optionalValue(formData, 'description'),
      rules: optionalValue(formData, 'rules'),
      format: value(formData, 'format') as 'TEAM' | 'INDIVIDUAL',
      teamCount: numberValue(formData, 'teamCount', 2),
      minPlayersPerTeam: numberValue(formData, 'minPlayersPerTeam', 1),
      maxPlayersPerTeam: numberValue(formData, 'maxPlayersPerTeam', 4),
      exactTeamSize: optionalValue(formData, 'exactTeamSize') ? numberValue(formData, 'exactTeamSize') : undefined,
      defaultMargin: numberValue(formData, 'defaultMargin', 0.1),
      defaultSensitivity: numberValue(formData, 'defaultSensitivity', 1.2),
      attributes: attributeId ? { create: { attributeId, weight: 1 } } : undefined,
    },
  })
  await audit(session.userId, 'GAME_TEMPLATE_CREATED', 'GameTemplate', template.id, { name: template.name })
  revalidatePath('/admin/templates')
  return
}

export async function setTemplateAttributeAction(formData: FormData) {
  const session = await adminUser()
  const gameTemplateId = value(formData, 'gameTemplateId')
  const attributeId = value(formData, 'attributeId')
  const weight = numberValue(formData, 'weight', 0)
  await prisma.gameTemplateAttribute.upsert({
    where: { gameTemplateId_attributeId: { gameTemplateId, attributeId } },
    update: { weight },
    create: { gameTemplateId, attributeId, weight },
  })
  await audit(session.userId, 'GAME_TEMPLATE_WEIGHT_UPDATED', 'GameTemplateAttribute', `${gameTemplateId}:${attributeId}`, {
    weight,
  })
  revalidatePath('/admin/templates')
  return
}

export async function updateTemplateAction(formData: FormData) {
  const session = await adminUser()
  const id = value(formData, 'id')
  const template = await prisma.gameTemplate.update({
    where: { id },
    data: {
      name: value(formData, 'name'),
      description: optionalValue(formData, 'description'),
      rules: optionalValue(formData, 'rules'),
      format: value(formData, 'format') as 'TEAM' | 'INDIVIDUAL',
      teamCount: numberValue(formData, 'teamCount', 2),
      minPlayersPerTeam: numberValue(formData, 'minPlayersPerTeam', 1),
      maxPlayersPerTeam: numberValue(formData, 'maxPlayersPerTeam', 4),
      exactTeamSize: optionalValue(formData, 'exactTeamSize') ? numberValue(formData, 'exactTeamSize') : null,
      defaultMargin: numberValue(formData, 'defaultMargin', 0.1),
      defaultSensitivity: numberValue(formData, 'defaultSensitivity', 1.2),
      isActive: boolValue(formData, 'isActive'),
    },
  })
  await audit(session.userId, 'GAME_TEMPLATE_UPDATED', 'GameTemplate', template.id, { name: template.name })
  revalidatePath('/admin/templates')
  return
}

export async function createEventAction(formData: FormData) {
  const session = await adminUser()
  const event = await prisma.event.create({
    data: {
      title: value(formData, 'title'),
      description: optionalValue(formData, 'description'),
      gameTemplateId: value(formData, 'gameTemplateId'),
      startsAt: optionalValue(formData, 'startsAt') ? new Date(value(formData, 'startsAt')) : undefined,
      opensAt: optionalValue(formData, 'opensAt') ? new Date(value(formData, 'opensAt')) : undefined,
      createdById: session.userId,
    },
  })
  await audit(session.userId, 'EVENT_CREATED', 'Event', event.id, { title: event.title })
  revalidatePath('/admin/evenementen')
  return
}

export async function updateEventStatusAction(formData: FormData) {
  const session = await adminUser()
  const id = value(formData, 'id')
  const status = value(formData, 'status') as
    | 'DRAFT'
    | 'OPEN_FOR_SELECTION'
    | 'ODDS_READY'
    | 'BET_PLACED'
    | 'IN_PROGRESS'
    | 'SETTLED'
    | 'CANCELLED'
  const event = await prisma.event.update({
    where: { id },
    data: {
      status,
      lockedAt: ['BET_PLACED', 'IN_PROGRESS', 'SETTLED'].includes(status) ? new Date() : undefined,
      settledAt: status === 'SETTLED' ? new Date() : undefined,
    },
  })
  await audit(session.userId, 'EVENT_STATUS_UPDATED', 'Event', event.id, { status })
  revalidatePath('/admin/evenementen')
  return
}

export async function createEventTeamAction(formData: FormData) {
  const session = await adminUser()
  const team = await prisma.eventTeam.create({
    data: {
      eventId: value(formData, 'eventId'),
      name: value(formData, 'name'),
      calculatedOdds: optionalValue(formData, 'calculatedOdds') ? numberValue(formData, 'calculatedOdds') : undefined,
      finalOdds: optionalValue(formData, 'finalOdds') ? numberValue(formData, 'finalOdds') : undefined,
    },
  })
  await audit(session.userId, 'EVENT_TEAM_CREATED', 'EventTeam', team.id, { name: team.name })
  revalidatePath('/admin/evenementen')
  return
}

export async function setEventParticipantAction(formData: FormData) {
  const session = await adminUser()
  const eventId = value(formData, 'eventId')
  const participantId = value(formData, 'participantId')
  const isAvailable = boolValue(formData, 'isAvailable')
  await prisma.eventParticipant.upsert({
    where: { eventId_participantId: { eventId, participantId } },
    update: { isAvailable },
    create: { eventId, participantId, isAvailable },
  })
  await audit(session.userId, 'EVENT_PARTICIPANT_UPDATED', 'EventParticipant', `${eventId}:${participantId}`, {
    isAvailable,
  })
  revalidatePath('/admin/evenementen')
  return
}

export async function addEventTeamMemberAction(formData: FormData) {
  const session = await adminUser()
  const eventTeamId = value(formData, 'eventTeamId')
  const participantId = value(formData, 'participantId')
  const team = await prisma.eventTeam.findUniqueOrThrow({ where: { id: eventTeamId } })
  await prisma.eventTeamMember.create({
    data: {
      eventTeamId,
      eventId: team.eventId,
      participantId,
    },
  })
  await audit(session.userId, 'EVENT_TEAM_MEMBER_ADDED', 'EventTeamMember', `${eventTeamId}:${participantId}`)
  revalidatePath('/admin/evenementen')
  return
}

export async function overrideEventTeamOddsAction(formData: FormData) {
  const session = await adminUser()
  const id = value(formData, 'id')
  const reason = value(formData, 'reason')
  if (reason.length < 8) return

  const current = await prisma.eventTeam.findUniqueOrThrow({ where: { id } })
  const originalOdds = current.calculatedOdds ?? current.finalOdds
  if (!originalOdds) return

  const overriddenOdds = numberValue(formData, 'overriddenOdds')
  await prisma.$transaction([
    prisma.eventTeam.update({
      where: { id },
      data: { overriddenOdds, finalOdds: overriddenOdds },
    }),
    prisma.oddsOverride.create({
      data: {
        entityType: 'EventTeam',
        entityId: id,
        originalOdds,
        overriddenOdds,
        reason,
        overriddenByUserId: session.userId,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'ODDS_OVERRIDE',
        entityType: 'EventTeam',
        entityId: id,
        metadataJson: { originalOdds: String(originalOdds), overriddenOdds, reason },
      },
    }),
  ])
  revalidatePath('/admin/evenementen')
  return
}

export async function createFootballMatchAction(formData: FormData) {
  const session = await adminUser()
  const match = await prisma.footballMatch.create({
    data: {
      title: value(formData, 'title'),
      homeTeam: value(formData, 'homeTeam'),
      awayTeam: value(formData, 'awayTeam'),
      venue: optionalValue(formData, 'venue'),
      startsAt: new Date(value(formData, 'startsAt')),
      description: optionalValue(formData, 'description'),
      status: value(formData, 'status') as 'DRAFT' | 'OPEN' | 'LOCKED' | 'LIVE' | 'FINISHED' | 'SETTLED' | 'CANCELLED',
    },
  })
  await audit(session.userId, 'FOOTBALL_MATCH_CREATED', 'FootballMatch', match.id, { title: match.title })
  revalidatePath('/admin/voetbal')
  return
}

export async function updateFootballMatchStatusAction(formData: FormData) {
  const session = await adminUser()
  const id = value(formData, 'id')
  const status = value(formData, 'status') as 'DRAFT' | 'OPEN' | 'LOCKED' | 'LIVE' | 'FINISHED' | 'SETTLED' | 'CANCELLED'
  await prisma.footballMatch.update({ where: { id }, data: { status } })
  await audit(session.userId, 'FOOTBALL_MATCH_STATUS_UPDATED', 'FootballMatch', id, { status })
  revalidatePath('/admin/voetbal')
  return
}

export async function createFootballMarketAction(formData: FormData) {
  const session = await adminUser()
  const market = await prisma.footballMarket.create({
    data: {
      footballMatchId: value(formData, 'footballMatchId'),
      title: value(formData, 'title'),
      description: optionalValue(formData, 'description'),
      category: value(formData, 'category') || 'Algemeen',
      marketType: value(formData, 'marketType') as
        | 'MATCH_RESULT'
        | 'YES_NO'
        | 'OVER_UNDER'
        | 'PLAYER_SPECIAL'
        | 'TEAM_SPECIAL'
        | 'CUSTOM',
      status: value(formData, 'status') as 'DRAFT' | 'OPEN' | 'LOCKED' | 'SETTLED' | 'CANCELLED',
      sortOrder: numberValue(formData, 'sortOrder', 0),
    },
  })
  await audit(session.userId, 'FOOTBALL_MARKET_CREATED', 'FootballMarket', market.id, { title: market.title })
  revalidatePath('/admin/voetbal')
  return
}

export async function createFootballSelectionAction(formData: FormData) {
  const session = await adminUser()
  const finalOdds = numberValue(formData, 'finalOdds', 1.1)
  const selection = await prisma.footballSelection.create({
    data: {
      footballMarketId: value(formData, 'footballMarketId'),
      label: value(formData, 'label'),
      line: optionalValue(formData, 'line'),
      calculatedOdds: finalOdds,
      finalOdds,
      eligibilityType: value(formData, 'eligibilityType') as
        | 'ALWAYS_ALLOWED'
        | 'POSITIVE_MIEL_ONLY'
        | 'NOT_WHEN_MIEL_PLAYS'
        | 'ADMIN_ONLY',
      isManipulable: boolValue(formData, 'isManipulable'),
    },
  })
  await audit(session.userId, 'FOOTBALL_SELECTION_CREATED', 'FootballSelection', selection.id, {
    label: selection.label,
  })
  revalidatePath('/admin/voetbal')
  return
}

export async function updateFootballSelectionAction(formData: FormData) {
  const session = await adminUser()
  const id = value(formData, 'id')
  const selection = await prisma.footballSelection.update({
    where: { id },
    data: {
      label: value(formData, 'label'),
      line: optionalValue(formData, 'line'),
      finalOdds: numberValue(formData, 'finalOdds', 1.1),
      eligibilityType: value(formData, 'eligibilityType') as
        | 'ALWAYS_ALLOWED'
        | 'POSITIVE_MIEL_ONLY'
        | 'NOT_WHEN_MIEL_PLAYS'
        | 'ADMIN_ONLY',
      isManipulable: boolValue(formData, 'isManipulable'),
      resultStatus: value(formData, 'resultStatus') as 'PENDING' | 'WON' | 'LOST' | 'VOID',
      isWinningSelection: boolValue(formData, 'isWinningSelection'),
    },
  })
  await audit(session.userId, 'FOOTBALL_SELECTION_UPDATED', 'FootballSelection', selection.id, {
    label: selection.label,
  })
  revalidatePath('/admin/voetbal')
  return
}

export async function overrideFootballSelectionOddsAction(formData: FormData) {
  const session = await adminUser()
  const id = value(formData, 'id')
  const reason = value(formData, 'reason')
  if (reason.length < 8) return

  const current = await prisma.footballSelection.findUniqueOrThrow({ where: { id } })
  const originalOdds = current.calculatedOdds ?? current.finalOdds
  const overriddenOdds = numberValue(formData, 'overriddenOdds')
  await prisma.$transaction([
    prisma.footballSelection.update({
      where: { id },
      data: { overriddenOdds, finalOdds: overriddenOdds },
    }),
    prisma.oddsOverride.create({
      data: {
        entityType: 'FootballSelection',
        entityId: id,
        originalOdds,
        overriddenOdds,
        reason,
        overriddenByUserId: session.userId,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'ODDS_OVERRIDE',
        entityType: 'FootballSelection',
        entityId: id,
        metadataJson: { originalOdds: String(originalOdds), overriddenOdds, reason },
      },
    }),
  ])
  revalidatePath('/admin/voetbal')
  return
}

export async function adjustWalletAction(formData: FormData) {
  const session = await adminUser()
  const walletId = value(formData, 'walletId')
  const amount = numberValue(formData, 'amount', 0)
  const reason = value(formData, 'reason')
  const type = value(formData, 'type') as 'ADMIN_ADJUSTMENT' | 'BONUS'
  if (reason.length < 8) return

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: walletId } })
    const nextBalance = wallet.balance.plus(amount)
    if (nextBalance.isNegative()) {
      throw new Error('Saldo mag niet negatief worden')
    }
    await tx.wallet.update({ where: { id: walletId }, data: { balance: nextBalance } })
    await tx.walletTransaction.create({
      data: {
        walletId,
        amount,
        type,
        description: reason,
      },
    })
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'WALLET_ADJUSTMENT',
        entityType: 'Wallet',
        entityId: walletId,
        metadataJson: { amount, reason, type },
      },
    })
  })
  revalidatePath('/admin/wallet')
  revalidatePath('/admin')
  return
}

export async function updateSuggestionAction(formData: FormData) {
  const session = await adminUser()
  const id = value(formData, 'id')
  const suggestion = await prisma.gameSuggestion.update({
    where: { id },
    data: {
      status: value(formData, 'status') as 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CONVERTED',
      adminNotes: optionalValue(formData, 'adminNotes'),
    },
  })
  await audit(session.userId, 'GAME_SUGGESTION_REVIEWED', 'GameSuggestion', suggestion.id, {
    status: suggestion.status,
  })
  revalidatePath('/admin/voorstellen')
  return
}
