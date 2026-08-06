'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function optionalValue(formData: FormData, key: string) {
  const raw = value(formData, key)
  return raw.length ? raw : undefined
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const parsed = Number(value(formData, key))
  return Number.isFinite(parsed) ? parsed : fallback
}

function boolValue(formData: FormData, key: string) {
  return value(formData, key) === 'on' || value(formData, key) === 'true'
}

function stakesValue(formData: FormData) {
  return value(formData, 'availableStakes')
    .split(',')
    .map((stake) => Number(stake.trim()))
    .filter((stake) => Number.isInteger(stake) && stake > 0)
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

export async function createSlotDraftFromActiveAction() {
  const session = await requireRole(['ADMIN'])
  const active = await prisma.slotConfiguration.findFirst({
    where: { status: 'ACTIVE', isPublished: true },
    include: {
      symbols: true,
      paylines: true,
      bonusWheelConfigurations: { include: { segments: true } },
    },
  })
  if (!active) throw new Error('Geen actieve slotconfiguratie gevonden')

  const maxVersion = await prisma.slotConfiguration.aggregate({ _max: { version: true } })
  const draft = await prisma.slotConfiguration.create({
    data: {
      version: (maxVersion._max.version ?? active.version) + 1,
      name: `${active.name} concept`,
      status: 'DRAFT',
      availableStakesJson: active.availableStakesJson as Prisma.InputJsonValue,
      targetRtp: active.targetRtp,
      volatility: active.volatility,
      maxWinMultiplier: active.maxWinMultiplier,
      gorillaFeatureChance: active.gorillaFeatureChance,
      scatterFeatureChance: active.scatterFeatureChance,
      bonusFeatureChance: active.bonusFeatureChance,
      freeSpinRetriggerChance: active.freeSpinRetriggerChance,
      isPublished: false,
      createdByUserId: session.userId,
      symbols: {
        create: active.symbols.map((symbol) => ({
          name: symbol.name,
          slug: symbol.slug,
          assetUrl: symbol.assetUrl,
          type: symbol.type,
          reelWeight: symbol.reelWeight,
          payoutMultiplierTwo: symbol.payoutMultiplierTwo,
          payoutMultiplierThree: symbol.payoutMultiplierThree,
          isWild: symbol.isWild,
          isScatter: symbol.isScatter,
          isBonus: symbol.isBonus,
          isActive: symbol.isActive,
          sortOrder: symbol.sortOrder,
        })),
      },
      paylines: {
        create: active.paylines.map((payline) => ({
          name: payline.name,
          positionsJson: payline.positionsJson as Prisma.InputJsonValue,
          isActive: payline.isActive,
          sortOrder: payline.sortOrder,
        })),
      },
      bonusWheelConfigurations: {
        create: active.bonusWheelConfigurations.map((wheel) => ({
          isActive: wheel.isActive,
          segments: {
            create: wheel.segments.map((segment) => ({
              label: segment.label,
              type: segment.type,
              value: segment.value,
              weight: segment.weight,
              challengeId: segment.challengeId,
              isActive: segment.isActive,
              sortOrder: segment.sortOrder,
            })),
          },
        })),
      },
    },
  })

  await audit(session.userId, 'SLOT_DRAFT_CREATED', 'SlotConfiguration', draft.id, { version: draft.version })
  revalidatePath('/admin/slot')
}

export async function updateSlotConfigurationAction(formData: FormData) {
  const session = await requireRole(['ADMIN'])
  const id = value(formData, 'id')
  const configuration = await prisma.slotConfiguration.findUniqueOrThrow({ where: { id } })
  if (configuration.status !== 'DRAFT') throw new Error('Maak eerst een conceptversie om instellingen te wijzigen')

  const stakes = stakesValue(formData)
  if (!stakes.length) throw new Error('Geef minstens een inzetniveau op')

  const updated = await prisma.slotConfiguration.update({
    where: { id },
    data: {
      name: value(formData, 'name'),
      availableStakesJson: stakes,
      volatility: value(formData, 'volatility'),
      targetRtp: optionalValue(formData, 'targetRtp') ? numberValue(formData, 'targetRtp') : null,
      maxWinMultiplier: numberValue(formData, 'maxWinMultiplier', 50),
      gorillaFeatureChance: numberValue(formData, 'gorillaFeatureChance', 0.12),
      scatterFeatureChance: numberValue(formData, 'scatterFeatureChance', 0.1),
      bonusFeatureChance: numberValue(formData, 'bonusFeatureChance', 0.08),
      freeSpinRetriggerChance: numberValue(formData, 'freeSpinRetriggerChance', 0.06),
    },
  })
  await audit(session.userId, 'SLOT_CONFIGURATION_UPDATED', 'SlotConfiguration', updated.id, { version: updated.version })
  revalidatePath('/admin/slot')
}

export async function publishSlotConfigurationAction(formData: FormData) {
  const session = await requireRole(['ADMIN'])
  const id = value(formData, 'id')
  const configuration = await prisma.slotConfiguration.findUniqueOrThrow({ where: { id } })
  if (configuration.status !== 'DRAFT') throw new Error('Alleen een conceptversie kan gepubliceerd worden')

  await prisma.$transaction([
    prisma.slotConfiguration.updateMany({
      where: { status: 'ACTIVE' },
      data: { status: 'ARCHIVED', isPublished: false },
    }),
    prisma.slotConfiguration.update({
      where: { id },
      data: { status: 'ACTIVE', isPublished: true, publishedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'SLOT_CONFIGURATION_PUBLISHED',
        entityType: 'SlotConfiguration',
        entityId: id,
        metadataJson: { version: configuration.version },
      },
    }),
  ])
  revalidatePath('/slot')
  revalidatePath('/slot/live')
  revalidatePath('/admin/slot')
}

export async function updateSlotSymbolAction(formData: FormData) {
  const session = await requireRole(['ADMIN'])
  const id = value(formData, 'id')
  const symbol = await prisma.slotSymbol.findUniqueOrThrow({ where: { id }, include: { slotConfiguration: true } })
  if (symbol.slotConfiguration.status !== 'DRAFT') throw new Error('Symbolen zijn alleen in een conceptversie wijzigbaar')

  const updated = await prisma.slotSymbol.update({
    where: { id },
    data: {
      name: value(formData, 'name'),
      assetUrl: value(formData, 'assetUrl'),
      reelWeight: numberValue(formData, 'reelWeight'),
      payoutMultiplierTwo: optionalValue(formData, 'payoutMultiplierTwo') ? numberValue(formData, 'payoutMultiplierTwo') : null,
      payoutMultiplierThree: optionalValue(formData, 'payoutMultiplierThree') ? numberValue(formData, 'payoutMultiplierThree') : null,
      isActive: boolValue(formData, 'isActive'),
    },
  })
  await audit(session.userId, 'SLOT_SYMBOL_UPDATED', 'SlotSymbol', updated.id, { name: updated.name })
  revalidatePath('/admin/slot')
}

export async function updateSlotBonusSegmentAction(formData: FormData) {
  const session = await requireRole(['ADMIN'])
  const id = value(formData, 'id')
  const segment = await prisma.slotBonusWheelSegment.findUniqueOrThrow({
    where: { id },
    include: { bonusWheelConfiguration: { include: { slotConfiguration: true } } },
  })
  if (segment.bonusWheelConfiguration.slotConfiguration.status !== 'DRAFT') {
    throw new Error('Bonuswiel is alleen in een conceptversie wijzigbaar')
  }

  const updated = await prisma.slotBonusWheelSegment.update({
    where: { id },
    data: {
      label: value(formData, 'label'),
      value: numberValue(formData, 'value'),
      weight: numberValue(formData, 'weight'),
      isActive: boolValue(formData, 'isActive'),
      challengeId: optionalValue(formData, 'challengeId') ?? null,
    },
  })
  await audit(session.userId, 'SLOT_BONUS_SEGMENT_UPDATED', 'SlotBonusWheelSegment', updated.id, { label: updated.label })
  revalidatePath('/admin/slot')
}

export async function updateSlotJackpotAction(formData: FormData) {
  const session = await requireRole(['ADMIN'])
  const id = value(formData, 'id')
  const reason = value(formData, 'reason')
  if (reason.length < 8) throw new Error('Een jackpotwijziging vereist een reden')

  const updated = await prisma.slotJackpot.update({
    where: { id },
    data: {
      startAmount: numberValue(formData, 'startAmount'),
      currentAmount: numberValue(formData, 'currentAmount'),
      contributionRate: numberValue(formData, 'contributionRate'),
      triggerChance: numberValue(formData, 'triggerChance'),
      isActive: boolValue(formData, 'isActive'),
    },
  })
  await audit(session.userId, 'SLOT_JACKPOT_UPDATED', 'SlotJackpot', updated.id, { type: updated.type, reason })
  revalidatePath('/admin/slot')
  revalidatePath('/slot')
  revalidatePath('/slot/live')
}

export async function createSlotChallengeAction(formData: FormData) {
  const session = await requireRole(['ADMIN'])
  const challenge = await prisma.slotChallenge.create({
    data: {
      title: value(formData, 'title'),
      description: value(formData, 'description'),
      rewardCredits: optionalValue(formData, 'rewardCredits') ? numberValue(formData, 'rewardCredits') : null,
      requiresAdminCompletion: true,
      isActive: true,
    },
  })
  await audit(session.userId, 'SLOT_CHALLENGE_CREATED', 'SlotChallenge', challenge.id, { title: challenge.title })
  revalidatePath('/admin/slot')
}

export async function completeSlotChallengeAssignmentAction(formData: FormData) {
  const session = await requireRole(['ADMIN'])
  const id = value(formData, 'id')
  const assignment = await prisma.slotChallengeAssignment.findUniqueOrThrow({
    where: { id },
    include: { challenge: true, user: { include: { wallet: true } } },
  })
  if (assignment.status !== 'PENDING') return
  if (!assignment.user.wallet) throw new Error('Geen wallet gevonden')

  await prisma.$transaction(async (tx) => {
    await tx.slotChallengeAssignment.update({
      where: { id },
      data: { status: 'COMPLETED', completedByUserId: session.userId, completedAt: new Date() },
    })
    if (assignment.challenge.rewardCredits && assignment.challenge.rewardCredits > 0) {
      await tx.wallet.update({
        where: { id: assignment.user.wallet!.id },
        data: { balance: { increment: assignment.challenge.rewardCredits } },
      })
      await tx.walletTransaction.create({
        data: {
          walletId: assignment.user.wallet!.id,
          slotChallengeAssignmentId: id,
          amount: assignment.challenge.rewardCredits,
          type: 'SLOT_CHALLENGE_REWARD',
          description: `Beloning challenge: ${assignment.challenge.title}`,
        },
      })
    }
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'SLOT_CHALLENGE_COMPLETED',
        entityType: 'SlotChallengeAssignment',
        entityId: id,
        metadataJson: { rewardCredits: assignment.challenge.rewardCredits ?? 0 },
      },
    })
  })
  revalidatePath('/admin/slot')
  revalidatePath('/slot')
}
