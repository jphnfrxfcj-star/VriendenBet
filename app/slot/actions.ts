'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  assertSlotStakeAllowed,
  cryptoRandom,
  evaluateSlotSpin,
  type SlotBonusWheelSegmentConfig,
  type SlotEngineConfig,
  type SlotPaylineConfig,
  type SlotPosition,
  type SlotSpinEvaluation,
  type SlotSymbolConfig,
} from '@/lib/slot-machine'

const spinSchema = z.object({
  stake: z.coerce.number().int().positive(),
  idempotencyKey: z.string().min(12).max(120),
})

type SpinActionResult = {
  ok: boolean
  message: string
  spin?: SlotSpinPayload
}

export type SlotSpinPayload = SlotSpinEvaluation & {
  spinId: string
  configurationVersionId: string
  stake: number
  balanceBefore: number
  balanceAfterStake: number
  balanceAfter: number
  createdAt: string
  jackpotResult: Array<{ type: string; amount: number }> | null
}

export async function spinSlotAction(input: unknown): Promise<SpinActionResult> {
  const session = await requireRole(['MIEL'])
  const request = spinSchema.parse(input)

  try {
    const spin = await prisma.$transaction(async (tx) => {
      const existing = await tx.slotSpin.findUnique({
        where: {
          userId_idempotencyKey: {
            userId: session.userId,
            idempotencyKey: request.idempotencyKey,
          },
        },
      })
      if (existing) return toSpinPayload(existing)

      const [user, configuration, activeFreeSpinSession] = await Promise.all([
        tx.user.findUniqueOrThrow({ where: { id: session.userId }, include: { wallet: true } }),
        tx.slotConfiguration.findFirst({
          where: { status: 'ACTIVE', isPublished: true },
          include: {
            symbols: { orderBy: { sortOrder: 'asc' } },
            paylines: { orderBy: { sortOrder: 'asc' } },
            bonusWheelConfigurations: {
              where: { isActive: true },
              take: 1,
              include: { segments: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
            },
          },
        }),
        tx.slotFreeSpinSession.findFirst({
          where: { userId: session.userId, status: 'ACTIVE', remainingSpins: { gt: 0 } },
          orderBy: { createdAt: 'asc' },
        }),
      ])

      if (!user.wallet) throw new Error('Geen wallet gevonden voor Miel')
      if (!configuration) throw new Error('Miel Smash staat nog niet actief')

      const config = toEngineConfig(configuration)
      const isFreeSpin = Boolean(activeFreeSpinSession)
      const stake = isFreeSpin ? Number(activeFreeSpinSession!.stake) : request.stake
      assertSlotStakeAllowed(config.availableStakes, stake, isFreeSpin ? Number.POSITIVE_INFINITY : Number(user.wallet.balance))

      const balanceBefore = Number(user.wallet.balance)
      const balanceAfterStake = isFreeSpin ? balanceBefore : balanceBefore - stake

      if (!isFreeSpin) {
        await tx.wallet.update({
          where: { id: user.wallet.id },
          data: { balance: balanceAfterStake },
        })
      }

      const jackpotResult = await growAndEvaluateJackpots(tx, session.userId, stake, isFreeSpin)
      const rawEvaluation = evaluateSlotSpin(config, stake, cryptoRandom())
      const jackpotWin = jackpotResult.reduce((sum, jackpot) => sum + jackpot.amount, 0)
      const uncappedWin = rawEvaluation.uncappedWin + jackpotWin
      const finalWin = Math.min(uncappedWin, stake * config.maxWinMultiplier)
      const balanceAfter = balanceAfterStake + finalWin

      const createdSpin = await tx.slotSpin.create({
        data: {
          userId: session.userId,
          walletId: user.wallet.id,
          configurationVersionId: configuration.id,
          idempotencyKey: request.idempotencyKey,
          stake,
          initialGridJson: rawEvaluation.initialGrid,
          finalGridJson: rawEvaluation.finalGrid,
          evaluatedPaylinesJson: rawEvaluation.evaluatedPaylines,
          baseWin: rawEvaluation.baseWin,
          scatterWin: rawEvaluation.scatterWin,
          featureWin: rawEvaluation.featureWin,
          bonusWin: rawEvaluation.bonusWin,
          jackpotWin,
          uncappedWin,
          finalWin,
          featureType: rawEvaluation.featureType,
          featurePayloadJson: toInputJson(rawEvaluation.featurePayload),
          bonusResultJson: toInputJson(rawEvaluation.bonusResult),
          jackpotResultJson: jackpotResult.length ? jackpotResult : undefined,
          status: 'COMPLETED',
          randomReference: randomUUID(),
          freeSpinSessionId: activeFreeSpinSession?.id,
          balanceBefore,
          balanceAfterStake,
          balanceAfter,
          freeSpinsAwarded: rawEvaluation.freeSpinsAwarded,
          completedAt: new Date(),
          winLines: {
            create: rawEvaluation.evaluatedPaylines
              .map((lineResult) => {
                const symbol = configuration.symbols.find((slotSymbol) => slotSymbol.slug === lineResult.symbolSlug)
                const payline = configuration.paylines.find((line) => line.name === lineResult.name)
                if (!symbol || !payline) return null
                return {
                  slotPaylineId: payline.id,
                  symbolId: symbol.id,
                  matchedCount: lineResult.matchedCount,
                  multiplier: lineResult.multiplier,
                  winAmount: lineResult.winAmount,
                }
              })
              .filter((lineResult): lineResult is NonNullable<typeof lineResult> => Boolean(lineResult)),
          },
          featureResults: rawEvaluation.featureType
            ? {
                create: {
                  type: rawEvaluation.featureType,
                  payloadJson: toInputJson(rawEvaluation.featurePayload ?? {})!,
                  multiplier: rawEvaluation.featureMultiplier === 1 ? undefined : rawEvaluation.featureMultiplier,
                  winAmount: rawEvaluation.featureWin,
                },
              }
            : undefined,
        },
      })

      if (!isFreeSpin) {
        await tx.walletTransaction.create({
          data: {
            walletId: user.wallet.id,
            slotSpinId: createdSpin.id,
            amount: -stake,
            type: 'SLOT_STAKE',
            description: `Miel Smash inzet ${stake} credits`,
          },
        })
      }

      if (finalWin > 0) {
        await tx.wallet.update({ where: { id: user.wallet.id }, data: { balance: balanceAfter } })
        const jackpotPaid = Math.min(jackpotWin, finalWin)
        const slotPaid = finalWin - jackpotPaid
        if (slotPaid > 0) {
          await tx.walletTransaction.create({
            data: {
              walletId: user.wallet.id,
              slotSpinId: createdSpin.id,
              amount: slotPaid,
              type: 'SLOT_WIN',
              description: `Miel Smash winst ${slotPaid} credits`,
            },
          })
        }
        if (jackpotPaid > 0) {
          await tx.walletTransaction.create({
            data: {
              walletId: user.wallet.id,
              slotSpinId: createdSpin.id,
              amount: jackpotPaid,
              type: 'SLOT_JACKPOT_WIN',
              description: `Miel Smash jackpot ${jackpotPaid} credits`,
            },
          })
        }
      }

      for (const jackpot of jackpotResult) {
        await tx.slotJackpotWin.create({
          data: {
            jackpotId: jackpot.id,
            slotSpinId: createdSpin.id,
            userId: session.userId,
            amount: jackpot.amount,
            jackpotBefore: jackpot.before,
            jackpotAfter: jackpot.after,
          },
        })
      }

      if (activeFreeSpinSession) {
        const remainingAfter = Math.max(0, activeFreeSpinSession.remainingSpins - 1 + rawEvaluation.freeSpinsAwarded)
        await tx.slotFreeSpinSession.update({
          where: { id: activeFreeSpinSession.id },
          data: {
            remainingSpins: remainingAfter,
            awardedSpins: { increment: rawEvaluation.freeSpinsAwarded },
            totalWin: { increment: finalWin },
            status: remainingAfter === 0 ? 'COMPLETED' : 'ACTIVE',
            completedAt: remainingAfter === 0 ? new Date() : undefined,
          },
        })
      } else if (rawEvaluation.freeSpinsAwarded > 0) {
        await tx.slotFreeSpinSession.create({
          data: {
            userId: session.userId,
            triggeringSpinId: createdSpin.id,
            stake,
            awardedSpins: rawEvaluation.freeSpinsAwarded,
            remainingSpins: rawEvaluation.freeSpinsAwarded,
          },
        })
      }

      if (rawEvaluation.bonusResult?.type === 'MYSTERY_CHALLENGE') {
        const challenge =
          (rawEvaluation.bonusResult.challengeId
            ? await tx.slotChallenge.findUnique({ where: { id: rawEvaluation.bonusResult.challengeId } })
            : null) ?? (await tx.slotChallenge.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } }))

        if (challenge) {
          await tx.slotChallengeAssignment.create({
            data: {
              challengeId: challenge.id,
              slotSpinId: createdSpin.id,
              userId: session.userId,
            },
          })
        }
      }

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'SLOT_SPIN_COMPLETED',
          entityType: 'SlotSpin',
          entityId: createdSpin.id,
          metadataJson: {
            stake,
            finalWin,
            featureType: rawEvaluation.featureType,
            bonusType: rawEvaluation.bonusResult?.type,
            jackpotWin,
          },
        },
      })

      return {
        ...toSpinPayload(createdSpin),
        jackpotResult: jackpotResult.map(({ type, amount }) => ({ type, amount })),
      }
    })

    revalidatePath('/slot')
    revalidatePath('/slot/live')
    revalidatePath('/mijn-bets')
    revalidatePath('/admin/slot')
    return { ok: true, message: 'Spin voltooid.', spin }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Spin mislukt' }
  }
}

function toEngineConfig(configuration: {
  id: string
  version: number
  name: string
  availableStakesJson: unknown
  maxWinMultiplier: number
  gorillaFeatureChance: unknown
  scatterFeatureChance: unknown
  bonusFeatureChance: unknown
  freeSpinRetriggerChance: unknown
  symbols: Array<Record<string, unknown>>
  paylines: Array<Record<string, unknown>>
  bonusWheelConfigurations: Array<{ segments: Array<Record<string, unknown>> }>
}): SlotEngineConfig {
  return {
    id: configuration.id,
    version: configuration.version,
    name: configuration.name,
    availableStakes: Array.isArray(configuration.availableStakesJson)
      ? configuration.availableStakesJson.map(Number).filter(Number.isFinite)
      : [],
    maxWinMultiplier: configuration.maxWinMultiplier,
    gorillaFeatureChance: Number(configuration.gorillaFeatureChance),
    scatterFeatureChance: Number(configuration.scatterFeatureChance),
    bonusFeatureChance: Number(configuration.bonusFeatureChance),
    freeSpinRetriggerChance: Number(configuration.freeSpinRetriggerChance),
    symbols: configuration.symbols.map((slotSymbol) => ({
      id: String(slotSymbol.id),
      name: String(slotSymbol.name),
      slug: String(slotSymbol.slug),
      assetUrl: String(slotSymbol.assetUrl),
      type: String(slotSymbol.type) as SlotSymbolConfig['type'],
      reelWeight: Number(slotSymbol.reelWeight),
      payoutMultiplierTwo: slotSymbol.payoutMultiplierTwo === null ? null : Number(slotSymbol.payoutMultiplierTwo),
      payoutMultiplierThree: slotSymbol.payoutMultiplierThree === null ? null : Number(slotSymbol.payoutMultiplierThree),
      isWild: Boolean(slotSymbol.isWild),
      isScatter: Boolean(slotSymbol.isScatter),
      isBonus: Boolean(slotSymbol.isBonus),
      isActive: Boolean(slotSymbol.isActive),
      sortOrder: Number(slotSymbol.sortOrder),
    })),
    paylines: configuration.paylines.map((payline) => ({
      id: String(payline.id),
      name: String(payline.name),
      positions: parsePositions(payline.positionsJson),
      isActive: Boolean(payline.isActive),
      sortOrder: Number(payline.sortOrder),
    })),
    bonusWheelSegments: (configuration.bonusWheelConfigurations[0]?.segments ?? []).map((segment) => ({
      id: String(segment.id),
      label: String(segment.label),
      type: String(segment.type) as SlotBonusWheelSegmentConfig['type'],
      value: Number(segment.value),
      weight: Number(segment.weight),
      challengeId: segment.challengeId ? String(segment.challengeId) : null,
      isActive: Boolean(segment.isActive),
      sortOrder: Number(segment.sortOrder),
    })),
  }
}

function parsePositions(value: unknown): SlotPosition[] {
  if (!Array.isArray(value)) return []
  return value
    .map((position) => {
      if (!position || typeof position !== 'object') return null
      const row = Number((position as { row?: unknown }).row)
      const reel = Number((position as { reel?: unknown }).reel)
      if (![0, 1, 2].includes(row) || ![0, 1, 2].includes(reel)) return null
      return { row: row as 0 | 1 | 2, reel: reel as 0 | 1 | 2 }
    })
    .filter((position): position is SlotPosition => Boolean(position))
}

async function growAndEvaluateJackpots(
  tx: Prisma.TransactionClient,
  userId: string,
  stake: number,
  isFreeSpin: boolean,
) {
  const random = cryptoRandom()
  const jackpots = await tx.slotJackpot.findMany({ where: { isActive: true }, orderBy: { type: 'asc' } })
  const results: Array<{ id: string; type: string; amount: number; before: number; after: number }> = []

  for (const jackpot of jackpots) {
    const before = Number(jackpot.currentAmount)
    const contribution = isFreeSpin ? 0 : Math.max(0, Math.round(stake * Number(jackpot.contributionRate)))
    const grown = Math.min(Number(jackpot.maxAmount ?? Number.POSITIVE_INFINITY), before + contribution)
    const triggerChance = jackpot.triggerType === 'RANDOM' ? Number(jackpot.triggerChance ?? 0) : 0
    const won = triggerChance > 0 && random() < triggerChance

    if (won) {
      await tx.slotJackpot.update({
        where: { id: jackpot.id },
        data: {
          currentAmount: jackpot.startAmount,
          lastWinnerUserId: userId,
          lastWonAt: new Date(),
        },
      })
      results.push({
        id: jackpot.id,
        type: jackpot.type,
        amount: grown,
        before: grown,
        after: Number(jackpot.startAmount),
      })
    } else if (contribution > 0) {
      await tx.slotJackpot.update({
        where: { id: jackpot.id },
        data: { currentAmount: grown },
      })
    }
  }

  return results
}

function toInputJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function toSpinPayload(spin: {
  id: string
  configurationVersionId: string
  stake: unknown
  initialGridJson: unknown
  finalGridJson: unknown
  evaluatedPaylinesJson: unknown
  baseWin: unknown
  scatterWin: unknown
  featureWin: unknown
  bonusWin: unknown
  jackpotWin: unknown
  uncappedWin: unknown
  finalWin: unknown
  featureType: unknown
  featurePayloadJson: unknown
  bonusResultJson: unknown
  jackpotResultJson?: unknown
  balanceBefore: unknown
  balanceAfterStake: unknown
  balanceAfter: unknown
  freeSpinsAwarded: number
  createdAt: Date
}): SlotSpinPayload {
  return {
    spinId: spin.id,
    configurationVersionId: spin.configurationVersionId,
    stake: Number(spin.stake),
    initialGrid: spin.initialGridJson as SlotSpinPayload['initialGrid'],
    finalGrid: spin.finalGridJson as SlotSpinPayload['finalGrid'],
    evaluatedPaylines: spin.evaluatedPaylinesJson as SlotSpinPayload['evaluatedPaylines'],
    baseWin: Number(spin.baseWin),
    scatterWin: Number(spin.scatterWin),
    featureWin: Number(spin.featureWin),
    bonusWin: Number(spin.bonusWin),
    jackpotWin: Number(spin.jackpotWin),
    uncappedWin: Number(spin.uncappedWin),
    finalWin: Number(spin.finalWin),
    featureType: spin.featureType as SlotSpinPayload['featureType'],
    featurePayload: spin.featurePayloadJson as SlotSpinPayload['featurePayload'],
    featureMultiplier: 1,
    bonusResult: spin.bonusResultJson as SlotSpinPayload['bonusResult'],
    freeSpinsAwarded: spin.freeSpinsAwarded,
    balanceBefore: Number(spin.balanceBefore),
    balanceAfterStake: Number(spin.balanceAfterStake),
    balanceAfter: Number(spin.balanceAfter),
    jackpotResult: (spin.jackpotResultJson as SlotSpinPayload['jackpotResult']) ?? null,
    capped: Number(spin.finalWin) < Number(spin.uncappedWin),
    createdAt: spin.createdAt.toISOString(),
  }
}
