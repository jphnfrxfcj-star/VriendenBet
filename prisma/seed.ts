import { PrismaClient } from '@prisma/client'
import { hashPin } from '../lib/pin'
import { defaultBonusWheelSegments, defaultSlotPaylines, defaultSlotSymbols } from '../lib/slot-machine'
import {
  attributes,
  footballSelections,
  participants,
  tugOfWarOdds,
  tugOfWarTeams,
  tugOfWarWeights,
  users,
} from '../lib/demo-data'

const prisma = new PrismaClient()
const localPin = process.env.SEED_PIN ?? '2525'

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_PIN) {
    throw new Error('SEED_PIN is verplicht in production')
  }

  const pinHash = await hashPin(localPin)

  const attributeRows = await Promise.all(
    attributes.map((name) =>
      prisma.attribute.upsert({
        where: { name },
        update: { isActive: true, minValue: 1, maxValue: 10 },
        create: {
          name,
          minValue: 1,
          maxValue: 10,
          description: `Fictieve score voor ${name}.`,
        },
      }),
    ),
  )
  const attributeByName = new Map(attributeRows.map((attribute) => [attribute.name, attribute]))

  const participantRows = await Promise.all(
    participants.map((participant) =>
      prisma.participant.upsert({
        where: { name: participant.name },
        update: {
          nickname: participant.nickname,
          isActive: true,
        },
        create: {
          name: participant.name,
          nickname: participant.nickname,
        },
      }),
    ),
  )
  const participantByName = new Map(participantRows.map((participant) => [participant.name, participant]))
  const participantByDemoId = new Map(
    participants.map((participant) => [participant.id, participantByName.get(participant.name)!]),
  )

  for (const participant of participants) {
    const participantRow = participantByName.get(participant.name)!

    for (const [attributeName, score] of Object.entries(participant.stats)) {
      const attribute = attributeByName.get(attributeName)!
      await prisma.participantAttribute.upsert({
        where: {
          participantId_attributeId: {
            participantId: participantRow.id,
            attributeId: attribute.id,
          },
        },
        update: { score },
        create: {
          participantId: participantRow.id,
          attributeId: attribute.id,
          score,
        },
      })
    }
  }

  const userRows = await Promise.all(
    users.map((user) =>
      prisma.user.upsert({
        where: { id: `seed-user-${user.displayName.toLowerCase().replaceAll(' ', '-')}` },
        update: {
          displayName: user.displayName,
          role: user.role,
          pinHash,
          isActive: true,
          participantId: participantByName.get(user.displayName)?.id,
        },
        create: {
          id: `seed-user-${user.displayName.toLowerCase().replaceAll(' ', '-')}`,
          displayName: user.displayName,
          role: user.role,
          pinHash,
          isActive: true,
          participantId: participantByName.get(user.displayName)?.id,
        },
      }),
    ),
  )
  const userByName = new Map(userRows.map((user) => [user.displayName, user]))
  const miel = userByName.get('Miel')!
  const bert = userByName.get('Bert')!

  const wallet = await prisma.wallet.upsert({
    where: { userId: miel.id },
    update: {},
    create: {
      userId: miel.id,
      balance: 1000,
      transactions: {
        create: {
          amount: 1000,
          type: 'STARTING_BALANCE',
          description: 'Startsaldo voor Miel',
        },
      },
    },
  })

  const templates = [
    ['Touwtrekken', 'TEAM', 2],
    ['Penaltycompetitie', 'INDIVIDUAL', 1],
    ['Bierestafette', 'TEAM', 3],
    ['Quiz', 'TEAM', 2],
    ['Behendigheidsparcours', 'INDIVIDUAL', 1],
  ] as const

  const templateRows = await Promise.all(
    templates.map(([name, format, teamCount]) =>
      prisma.gameTemplate.create({
        data: {
          name,
          format,
          teamCount,
          minPlayersPerTeam: format === 'TEAM' ? 2 : 1,
          maxPlayersPerTeam: format === 'TEAM' ? 6 : 1,
          exactTeamSize: name === 'Touwtrekken' ? 4 : undefined,
          description: `${name} voor het vrijgezellenweekend.`,
          rules: 'Admins kunnen deze regels aanpassen voor de echte editie.',
          attributes: {
            create: Object.entries(tugOfWarWeights).map(([attributeName, weight]) => ({
              attributeId: attributeByName.get(attributeName)!.id,
              weight,
            })),
          },
        },
      }),
    ),
  )

  const event = await prisma.event.create({
    data: {
      title: 'Touwtrekken 4 tegen 4',
      description: 'Voorbeeld-evenement met twee teams en berekende odds.',
      status: 'ODDS_READY',
      gameTemplateId: templateRows[0].id,
      createdById: bert.id,
      participants: {
        create: participants.map((participant) => ({
          participantId: participantByName.get(participant.name)!.id,
          isAvailable: true,
        })),
      },
    },
  })

  for (const team of tugOfWarTeams) {
    const odds = tugOfWarOdds.find((item) => item.teamId === team.id)!
    await prisma.eventTeam.create({
      data: {
        eventId: event.id,
        name: team.name,
        calculatedScore: odds.score,
        calculatedProbability: odds.probability,
        calculatedOdds: odds.calculatedOdds,
        finalOdds: odds.finalOdds,
        members: {
          create: team.memberParticipantIds.map((demoId) => ({
            eventId: event.id,
            participantId: participantByDemoId.get(demoId)!.id,
          })),
        },
      },
    })
  }

  const footballMatch = await prisma.footballMatch.create({
    data: {
      title: 'Miels laatste match',
      homeTeam: 'Miels ploeg',
      awayTeam: 'De tegenstanders',
      venue: 'Zaterdagveld',
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
      status: 'OPEN',
      description: 'Ludieke sportsbooksectie voor de zaterdagmatch.',
    },
  })

  const footballMarket = await prisma.footballMarket.create({
    data: {
      footballMatchId: footballMatch.id,
      title: 'Populaire combinaties',
      category: 'Hoofdmarkets',
      marketType: 'CUSTOM',
      status: 'OPEN',
      sortOrder: 1,
    },
  })

  await prisma.footballSelection.createMany({
    data: footballSelections.map((selection) => ({
      footballMarketId: footballMarket.id,
      label: selection.label,
      finalOdds: selection.finalOdds,
      calculatedOdds: selection.finalOdds,
      eligibilityType: selection.eligibilityType,
      isManipulable: selection.isManipulable ?? false,
    })),
  })

  await seedSlotData(bert.id)

  await prisma.auditLog.create({
    data: {
      userId: bert.id,
      action: 'SEED_DATABASE',
      entityType: 'System',
      entityId: wallet.id,
      metadataJson: { project: 'MielBet' },
    },
  })
}

async function seedSlotData(adminUserId: string) {
  const configuration = await prisma.slotConfiguration.upsert({
    where: { version: 1 },
    update: {
      name: 'Miel Smash',
      status: 'ACTIVE',
      availableStakesJson: [5, 10, 25, 50],
      targetRtp: 92,
      volatility: 'Medium feestvolatiel',
      maxWinMultiplier: 50,
      gorillaFeatureChance: 0.12,
      scatterFeatureChance: 0.1,
      bonusFeatureChance: 0.08,
      freeSpinRetriggerChance: 0.06,
      isPublished: true,
      publishedAt: new Date(),
      createdByUserId: adminUserId,
    },
    create: {
      version: 1,
      name: 'Miel Smash',
      status: 'ACTIVE',
      availableStakesJson: [5, 10, 25, 50],
      targetRtp: 92,
      volatility: 'Medium feestvolatiel',
      maxWinMultiplier: 50,
      gorillaFeatureChance: 0.12,
      scatterFeatureChance: 0.1,
      bonusFeatureChance: 0.08,
      freeSpinRetriggerChance: 0.06,
      isPublished: true,
      publishedAt: new Date(),
      createdByUserId: adminUserId,
    },
  })

  for (const slotSymbol of defaultSlotSymbols) {
    await prisma.slotSymbol.upsert({
      where: {
        slotConfigurationId_slug: {
          slotConfigurationId: configuration.id,
          slug: slotSymbol.slug,
        },
      },
      update: {
        name: slotSymbol.name,
        assetUrl: slotSymbol.assetUrl,
        type: slotSymbol.type,
        reelWeight: slotSymbol.reelWeight,
        payoutMultiplierTwo: slotSymbol.payoutMultiplierTwo,
        payoutMultiplierThree: slotSymbol.payoutMultiplierThree,
        isWild: slotSymbol.isWild,
        isScatter: slotSymbol.isScatter,
        isBonus: slotSymbol.isBonus,
        isActive: slotSymbol.isActive,
        sortOrder: slotSymbol.sortOrder,
      },
      create: {
        slotConfigurationId: configuration.id,
        name: slotSymbol.name,
        slug: slotSymbol.slug,
        assetUrl: slotSymbol.assetUrl,
        type: slotSymbol.type,
        reelWeight: slotSymbol.reelWeight,
        payoutMultiplierTwo: slotSymbol.payoutMultiplierTwo,
        payoutMultiplierThree: slotSymbol.payoutMultiplierThree,
        isWild: slotSymbol.isWild,
        isScatter: slotSymbol.isScatter,
        isBonus: slotSymbol.isBonus,
        isActive: slotSymbol.isActive,
        sortOrder: slotSymbol.sortOrder,
      },
    })
  }

  for (const payline of defaultSlotPaylines) {
    await prisma.slotPayline.upsert({
      where: {
        slotConfigurationId_name: {
          slotConfigurationId: configuration.id,
          name: payline.name,
        },
      },
      update: {
        positionsJson: payline.positions,
        isActive: payline.isActive,
        sortOrder: payline.sortOrder,
      },
      create: {
        slotConfigurationId: configuration.id,
        name: payline.name,
        positionsJson: payline.positions,
        isActive: payline.isActive,
        sortOrder: payline.sortOrder,
      },
    })
  }

  const challenges = await Promise.all(
    [
      ['Drink een pint', 'Neem een frisse feestpauze en laat de groep tellen.', 0],
      ['Kies iemand voor een challenge', 'Miel kiest iemand die onmiddellijk een korte opdracht krijgt.', 25],
      ['Speech van een minuut', 'Miel geeft een speech van exact een minuut.', 50],
      ['Zing een refrein', 'Kies een refrein en breng het met overtuiging.', 25],
    ].map(([title, description, rewardCredits]) =>
      prisma.slotChallenge.upsert({
        where: { id: `seed-slot-challenge-${String(title).toLowerCase().replaceAll(' ', '-')}` },
        update: { title: String(title), description: String(description), rewardCredits: Number(rewardCredits), isActive: true },
        create: {
          id: `seed-slot-challenge-${String(title).toLowerCase().replaceAll(' ', '-')}`,
          title: String(title),
          description: String(description),
          rewardCredits: Number(rewardCredits) || null,
          requiresAdminCompletion: true,
          isActive: true,
        },
      }),
    ),
  )

  const bonusWheel =
    (await prisma.slotBonusWheelConfiguration.findFirst({ where: { slotConfigurationId: configuration.id } })) ??
    (await prisma.slotBonusWheelConfiguration.create({ data: { slotConfigurationId: configuration.id, isActive: true } }))
  const mysteryChallenge = challenges[0]

  for (const segment of defaultBonusWheelSegments) {
    await prisma.slotBonusWheelSegment.upsert({
      where: {
        bonusWheelConfigurationId_label: {
          bonusWheelConfigurationId: bonusWheel.id,
          label: segment.label,
        },
      },
      update: {
        type: segment.type,
        value: segment.value,
        weight: segment.weight,
        challengeId: segment.type === 'MYSTERY_CHALLENGE' ? mysteryChallenge.id : null,
        isActive: segment.isActive,
        sortOrder: segment.sortOrder,
      },
      create: {
        bonusWheelConfigurationId: bonusWheel.id,
        label: segment.label,
        type: segment.type,
        value: segment.value,
        weight: segment.weight,
        challengeId: segment.type === 'MYSTERY_CHALLENGE' ? mysteryChallenge.id : null,
        isActive: segment.isActive,
        sortOrder: segment.sortOrder,
      },
    })
  }

  await Promise.all(
    [
      ['MINI', 100, 100, 0.01, 300, 0.002],
      ['MAJOR', 300, 300, 0.015, 900, 0.0008],
      ['MIELPOT', 500, 500, 0.02, 1500, 0.0003],
    ].map(([type, startAmount, currentAmount, contributionRate, maxAmount, triggerChance]) =>
      prisma.slotJackpot.upsert({
        where: { type: type as 'MINI' | 'MAJOR' | 'MIELPOT' },
        update: {
          startAmount: Number(startAmount),
          currentAmount: Number(currentAmount),
          contributionRate: Number(contributionRate),
          maxAmount: Number(maxAmount),
          triggerType: 'RANDOM',
          triggerChance: Number(triggerChance),
          isActive: true,
        },
        create: {
          type: type as 'MINI' | 'MAJOR' | 'MIELPOT',
          startAmount: Number(startAmount),
          currentAmount: Number(currentAmount),
          contributionRate: Number(contributionRate),
          maxAmount: Number(maxAmount),
          triggerType: 'RANDOM',
          triggerChance: Number(triggerChance),
          isActive: true,
        },
      }),
    ),
  )
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
