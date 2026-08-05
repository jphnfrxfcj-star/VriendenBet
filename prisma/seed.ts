import { PrismaClient } from '@prisma/client'
import { hashPin } from '../lib/pin'
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
        create: participants.slice(0, 12).map((participant) => ({
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

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
