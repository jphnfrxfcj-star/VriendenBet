'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { assertEventSelectionAllowed, assertFootballSelectionAllowed } from '@/lib/eligibility'
import { assertCompatibleSelections, calculateBetBuilderOdds } from '@/lib/football'
import { prisma } from '@/lib/prisma'
import { assertStakeAllowed } from '@/lib/wallet'

type BetActionResult = {
  ok: boolean
  message: string
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const raw = Number(value(formData, key))
  return Number.isFinite(raw) ? raw : fallback
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

export async function placeWeekendBetAction(formData: FormData): Promise<BetActionResult> {
  const session = await requireRole(['ADMIN', 'MIEL'])
  const eventId = value(formData, 'eventId')
  const selectedTeamId = value(formData, 'selectedTeamId')
  const stake = numberValue(formData, 'stake')

  try {
    await prisma.$transaction(async (tx) => {
      const bettingUser =
        session.role === 'ADMIN'
          ? await tx.user.findFirstOrThrow({
              where: { role: 'MIEL', isActive: true },
              include: { wallet: true },
            })
          : await tx.user.findUniqueOrThrow({
              where: { id: session.userId },
              include: { wallet: true },
            })
      const wallet = bettingUser.wallet
      if (!wallet) throw new Error('Geen wallet gevonden voor Miel')

      const event = await tx.event.findUniqueOrThrow({
        where: { id: eventId },
        include: {
          gameTemplate: true,
          teams: { include: { members: true } },
          bets: { where: { mielUserId: bettingUser.id } },
        },
      })
      if (event.status !== 'ODDS_READY') throw new Error('Dit weekendspel staat niet open voor inzetten')
      if (event.bets.length) throw new Error('Miel heeft al een bet op dit weekendspel')

      const selectedTeam = event.teams.find((team) => team.id === selectedTeamId)
      if (!selectedTeam || !selectedTeam.finalOdds) throw new Error('Deze odd is nog niet beschikbaar')

      assertEventSelectionAllowed(
        {
          format: event.gameTemplate.format,
          teams: event.teams.map((team) => ({
            id: team.id,
            name: team.name,
            memberParticipantIds: team.members.map((member) => member.participantId),
          })),
        },
        selectedTeamId,
        bettingUser.participantId ?? undefined,
      )
      assertStakeAllowed(Number(wallet.balance), stake)

      const odds = Number(selectedTeam.finalOdds)
      const bet = await tx.eventBet.create({
        data: {
          eventId,
          mielUserId: bettingUser.id,
          selectedTeamId,
          stake,
          oddsAtPlacement: odds,
          potentialPayout: roundMoney(stake * odds),
        },
      })
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: Number(wallet.balance) - stake },
      })
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          eventBetId: bet.id,
          amount: -stake,
          type: 'BET_STAKE',
          description: `Inzet op ${event.title} - ${selectedTeam.name}`,
        },
      })
      await tx.event.update({
        where: { id: eventId },
        data: { status: 'BET_PLACED', lockedAt: new Date() },
      })
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'EVENT_BET_PLACED',
          entityType: 'EventBet',
          entityId: bet.id,
          metadataJson: { eventId, selectedTeamId, stake, odds, placedForUserId: bettingUser.id },
        },
      })
    })
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Bet plaatsen is mislukt' }
  }

  revalidatePath('/mijn-bets')
  revalidatePath('/weekendspellen')
  revalidatePath(`/weekendspellen/${eventId}`)
  revalidatePath('/admin')
  revalidatePath('/admin/evenementen')
  revalidatePath('/admin/weddenschappen')
  return { ok: true, message: 'Bet geplaatst. Je saldo is aangepast.' }
}

export async function placeFootballBetBuilderAction(formData: FormData): Promise<BetActionResult> {
  const session = await requireRole(['ADMIN', 'MIEL'])
  const stake = numberValue(formData, 'stake')
  const selectionIds = formData
    .getAll('selectionId')
    .map((selectionId) => String(selectionId).trim())
    .filter(Boolean)

  try {
    await prisma.$transaction(async (tx) => {
      const bettingUser =
        session.role === 'ADMIN'
          ? await tx.user.findFirstOrThrow({
              where: { role: 'MIEL', isActive: true },
              include: { wallet: true },
            })
          : await tx.user.findUniqueOrThrow({
              where: { id: session.userId },
              include: { wallet: true },
            })
      const wallet = bettingUser.wallet
      if (!wallet) throw new Error('Geen wallet gevonden voor Miel')
      if (selectionIds.length < 2) throw new Error('Kies minstens twee selecties')

      const selections = await tx.footballSelection.findMany({
        where: { id: { in: selectionIds } },
        include: { footballMarket: { include: { footballMatch: true } } },
      })
      if (selections.length !== selectionIds.length) throw new Error('Een selectie bestaat niet meer')

      const matchIds = new Set(selections.map((selection) => selection.footballMarket.footballMatchId))
      if (matchIds.size !== 1) throw new Error('Alle selecties moeten uit dezelfde match komen')

      const match = selections[0].footballMarket.footballMatch
      if (match.status !== 'OPEN') throw new Error('Deze match staat niet open voor inzetten')
      if (selections.some((selection) => selection.footballMarket.status !== 'OPEN')) {
        throw new Error('Een markt staat niet open voor inzetten')
      }

      const selectionInputs = selections.map((selection) => ({
        id: selection.id,
        label: selection.label,
        finalOdds: Number(selection.finalOdds),
        eligibilityType: selection.eligibilityType,
        isManipulable: selection.isManipulable,
      }))
      for (const selection of selectionInputs) {
        assertFootballSelectionAllowed(selectionInputs, selection.id, Boolean(bettingUser.participantId))
      }

      const relations = await tx.footballSelectionRelation.findMany({
        where: {
          selectionAId: { in: selectionIds },
          selectionBId: { in: selectionIds },
        },
      })
      assertCompatibleSelections(
        selectionIds,
        relations.map((relation) => ({
          selectionAId: relation.selectionAId,
          selectionBId: relation.selectionBId,
          type: relation.type,
          reason: relation.reason ?? undefined,
        })),
      )
      assertStakeAllowed(Number(wallet.balance), stake)

      const calculation = calculateBetBuilderOdds(selectionInputs, stake)
      const builder = await tx.footballBetBuilder.create({
        data: {
          footballMatchId: match.id,
          mielUserId: bettingUser.id,
          status: 'PLACED',
          stake,
          rawCombinedOdds: calculation.rawCombinedOdds,
          correctionFactor: calculation.correctionFactor,
          calculatedOdds: calculation.calculatedOdds,
          overriddenOdds: calculation.overriddenOdds,
          finalOdds: calculation.finalOdds,
          potentialPayout: calculation.potentialPayout,
          placedAt: new Date(),
          selections: {
            create: selections.map((selection) => ({
              footballSelectionId: selection.id,
              oddsAtPlacement: selection.finalOdds,
            })),
          },
        },
      })
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: Number(wallet.balance) - stake },
      })
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          footballBetBuilderId: builder.id,
          amount: -stake,
          type: 'BET_STAKE',
          description: `Betbuilder ${match.title}`,
        },
      })
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'FOOTBALL_BETBUILDER_PLACED',
          entityType: 'FootballBetBuilder',
          entityId: builder.id,
          metadataJson: { matchId: match.id, selectionIds, stake, finalOdds: calculation.finalOdds, placedForUserId: bettingUser.id },
        },
      })
    })
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Betbuilder plaatsen is mislukt' }
  }

  revalidatePath('/mijn-bets')
  revalidatePath('/match')
  revalidatePath('/admin')
  revalidatePath('/admin/voetbal')
  revalidatePath('/admin/weddenschappen')
  return { ok: true, message: 'Betbuilder geplaatst. Je saldo is aangepast.' }
}
