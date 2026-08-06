import 'server-only'

import { footballMatch, wallet as demoWallet, weekendEvents } from './demo-data'
import { prisma } from './prisma'

export type DashboardTicket = {
  id: string
  type: 'Weekendspel' | 'Voetbalbetbuilder'
  title: string
  subtitle: string
  status: string
  stake: number
  odds: number
  potentialPayout: number
}

export type DashboardData = {
  balance: number
  openStake: number
  possibleReturn: number
  nextEvent: {
    id: string
    title: string
    startsAt: string
    status: string
  } | null
  activeMatch: {
    title: string
    homeTeam: string
    awayTeam: string
    startsAt: string
    venue?: string | null
    status: string
  } | null
  currentBuilder: {
    selectionCount: number
    finalOdds: number
    potentialPayout: number
    status: string
  } | null
  tickets: DashboardTicket[]
}

const openEventBetStatuses = new Set<string>(['PENDING'])
const openBuilderStatuses = new Set<string>(['DRAFT', 'PLACED'])

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const miel = await prisma.user.findFirst({
      where: { role: 'MIEL', isActive: true },
      include: { wallet: true },
    })
    if (!miel) return getDemoDashboardData()

    const [eventBets, builders, nextEvent, activeMatch] = await Promise.all([
      prisma.eventBet.findMany({
        where: { mielUserId: miel.id },
        include: { event: true, selectedTeam: true },
        orderBy: { placedAt: 'desc' },
        take: 12,
      }),
      prisma.footballBetBuilder.findMany({
        where: { mielUserId: miel.id },
        include: { footballMatch: true, selections: true },
        orderBy: [{ placedAt: 'desc' }, { createdAt: 'desc' }],
        take: 12,
      }),
      prisma.event.findFirst({
        where: { status: { in: ['OPEN_FOR_SELECTION', 'ODDS_READY', 'BET_PLACED', 'IN_PROGRESS'] } },
        orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.footballMatch.findFirst({
        where: { status: { in: ['OPEN', 'LOCKED', 'LIVE'] } },
        orderBy: { startsAt: 'asc' },
      }),
    ])

    const tickets: DashboardTicket[] = [
      ...eventBets.map((bet) => ({
        id: bet.id,
        type: 'Weekendspel' as const,
        title: bet.event.title,
        subtitle: bet.selectedTeam.name,
        status: bet.status,
        stake: Number(bet.stake),
        odds: Number(bet.oddsAtPlacement),
        potentialPayout: Number(bet.potentialPayout),
      })),
      ...builders.map((builder) => ({
        id: builder.id,
        type: 'Voetbalbetbuilder' as const,
        title: builder.footballMatch.title,
        subtitle: `${builder.selections.length} selecties`,
        status: builder.status,
        stake: Number(builder.stake),
        odds: Number(builder.finalOdds),
        potentialPayout: Number(builder.potentialPayout),
      })),
    ]
    const openTickets = tickets.filter((ticket) =>
      ticket.type === 'Weekendspel'
        ? openEventBetStatuses.has(ticket.status)
        : openBuilderStatuses.has(ticket.status),
    )
    const currentBuilder = builders.find((builder) => openBuilderStatuses.has(builder.status))

    return {
      balance: miel.wallet ? Number(miel.wallet.balance) : 0,
      openStake: openTickets.reduce((sum, ticket) => sum + ticket.stake, 0),
      possibleReturn: openTickets.reduce((sum, ticket) => sum + ticket.potentialPayout, 0),
      nextEvent: nextEvent
        ? {
            id: nextEvent.id,
            title: nextEvent.title,
            startsAt: nextEvent.startsAt?.toLocaleString('nl-BE') ?? 'Nog te bepalen',
            status: nextEvent.status,
          }
        : null,
      activeMatch: activeMatch
        ? {
            title: activeMatch.title,
            homeTeam: activeMatch.homeTeam,
            awayTeam: activeMatch.awayTeam,
            startsAt: activeMatch.startsAt.toLocaleString('nl-BE'),
            venue: activeMatch.venue,
            status: activeMatch.status,
          }
        : null,
      currentBuilder: currentBuilder
        ? {
            selectionCount: currentBuilder.selections.length,
            finalOdds: Number(currentBuilder.finalOdds),
            potentialPayout: Number(currentBuilder.potentialPayout),
            status: currentBuilder.status,
          }
        : null,
      tickets,
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error
    }

    return getDemoDashboardData()
  }
}

function getDemoDashboardData(): DashboardData {
  return {
    balance: demoWallet.balance,
    openStake: demoWallet.openStake,
    possibleReturn: demoWallet.potentialPayout,
    nextEvent: {
      id: weekendEvents[0].id,
      title: weekendEvents[0].title,
      startsAt: weekendEvents[0].startsAt,
      status: weekendEvents[0].status,
    },
    activeMatch: {
      title: footballMatch.title,
      homeTeam: footballMatch.homeTeam,
      awayTeam: footballMatch.awayTeam,
      startsAt: footballMatch.startsAt,
      venue: footballMatch.venue,
      status: footballMatch.status,
    },
    currentBuilder: {
      selectionCount: 3,
      finalOdds: footballMatch.betBuilder.finalOdds,
      potentialPayout: footballMatch.betBuilder.potentialPayout,
      status: 'PLACED',
    },
    tickets: [
      {
        id: 'demo-weekend',
        type: 'Weekendspel',
        title: weekendEvents[0].title,
        subtitle: 'Team Groen',
        status: 'PENDING',
        stake: 50,
        odds: weekendEvents[0].odds[0].finalOdds,
        potentialPayout: 50 * weekendEvents[0].odds[0].finalOdds,
      },
      {
        id: 'demo-builder',
        type: 'Voetbalbetbuilder',
        title: footballMatch.title,
        subtitle: '3 selecties',
        status: 'PLACED',
        stake: 50,
        odds: footballMatch.betBuilder.finalOdds,
        potentialPayout: footballMatch.betBuilder.potentialPayout,
      },
    ],
  }
}
