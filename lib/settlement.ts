export type WeekendBetSettlementInput = {
  currentStatus: 'PENDING' | 'WON' | 'LOST' | 'REFUNDED'
  stake: number
  oddsAtPlacement: number
  selectedTeamId: string
  winningTeamId?: string
  eventStatus: 'SETTLED' | 'CANCELLED'
}

export function settleWeekendBet(input: WeekendBetSettlementInput) {
  if (input.currentStatus !== 'PENDING') {
    throw new Error('Deze weddenschap is al afgehandeld')
  }

  if (input.eventStatus === 'CANCELLED') {
    return {
      status: 'REFUNDED' as const,
      payout: roundMoney(input.stake),
      transactionType: 'BET_REFUND' as const,
    }
  }

  if (!input.winningTeamId) {
    throw new Error('Winnaar is verplicht voor settlement')
  }

  if (input.selectedTeamId !== input.winningTeamId) {
    return {
      status: 'LOST' as const,
      payout: 0,
      transactionType: undefined,
    }
  }

  return {
    status: 'WON' as const,
    payout: roundMoney(input.stake * input.oddsAtPlacement),
    transactionType: 'BET_WIN' as const,
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}
