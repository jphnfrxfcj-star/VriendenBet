import { PrismaClient } from '@prisma/client'
import { defaultBonusWheelSegments, defaultSlotPaylines, defaultSlotSymbols } from '../lib/slot-machine'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true }, orderBy: { displayName: 'asc' } })
  if (!admin) {
    throw new Error('Maak eerst minstens een actieve ADMIN-user aan')
  }

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
      createdByUserId: admin.id,
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
      createdByUserId: admin.id,
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

  const challenge = await prisma.slotChallenge.upsert({
    where: { id: 'seed-slot-challenge-drink-een-pint' },
    update: {
      title: 'Drink een pint',
      description: 'Neem een frisse feestpauze en laat de groep tellen.',
      rewardCredits: 0,
      requiresAdminCompletion: true,
      isActive: true,
    },
    create: {
      id: 'seed-slot-challenge-drink-een-pint',
      title: 'Drink een pint',
      description: 'Neem een frisse feestpauze en laat de groep tellen.',
      rewardCredits: 0,
      requiresAdminCompletion: true,
      isActive: true,
    },
  })

  const wheel =
    (await prisma.slotBonusWheelConfiguration.findFirst({ where: { slotConfigurationId: configuration.id } })) ??
    (await prisma.slotBonusWheelConfiguration.create({ data: { slotConfigurationId: configuration.id, isActive: true } }))

  for (const segment of defaultBonusWheelSegments) {
    await prisma.slotBonusWheelSegment.upsert({
      where: {
        bonusWheelConfigurationId_label: {
          bonusWheelConfigurationId: wheel.id,
          label: segment.label,
        },
      },
      update: {
        type: segment.type,
        value: segment.value,
        weight: segment.weight,
        challengeId: segment.type === 'MYSTERY_CHALLENGE' ? challenge.id : null,
        isActive: segment.isActive,
        sortOrder: segment.sortOrder,
      },
      create: {
        bonusWheelConfigurationId: wheel.id,
        label: segment.label,
        type: segment.type,
        value: segment.value,
        weight: segment.weight,
        challengeId: segment.type === 'MYSTERY_CHALLENGE' ? challenge.id : null,
        isActive: segment.isActive,
        sortOrder: segment.sortOrder,
      },
    })
  }

  await Promise.all(
    [
      ['MINI', 100, 0.01, 300, 0.002],
      ['MAJOR', 300, 0.015, 900, 0.0008],
      ['MIELPOT', 500, 0.02, 1500, 0.0003],
    ].map(([type, startAmount, contributionRate, maxAmount, triggerChance]) =>
      prisma.slotJackpot.upsert({
        where: { type: type as 'MINI' | 'MAJOR' | 'MIELPOT' },
        update: {
          startAmount: Number(startAmount),
          contributionRate: Number(contributionRate),
          maxAmount: Number(maxAmount),
          triggerType: 'RANDOM',
          triggerChance: Number(triggerChance),
          isActive: true,
        },
        create: {
          type: type as 'MINI' | 'MAJOR' | 'MIELPOT',
          startAmount: Number(startAmount),
          currentAmount: Number(startAmount),
          contributionRate: Number(contributionRate),
          maxAmount: Number(maxAmount),
          triggerType: 'RANDOM',
          triggerChance: Number(triggerChance),
          isActive: true,
        },
      }),
    ),
  )

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SEED_SLOT_MODULE',
      entityType: 'SlotConfiguration',
      entityId: configuration.id,
      metadataJson: { version: configuration.version },
    },
  })
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
