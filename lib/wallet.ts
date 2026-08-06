export type WalletState = {
  balance: number
  transactions: Array<{
    amount: number
    type: 'STARTING_BALANCE' | 'BET_STAKE' | 'BET_WIN' | 'BET_REFUND' | 'ADMIN_ADJUSTMENT' | 'BONUS'
    description: string
  }>
}

export function assertStakeAllowed(balance: number, stake: number) {
  if (!Number.isInteger(stake) || stake < 10) {
    throw new Error('Minimuminzet is €10')
  }

  if (stake > 250) {
    throw new Error('Maximuminzet is €250')
  }

  if (stake > balance) {
    throw new Error('Onvoldoende saldo')
  }
}

export function debitStake(wallet: WalletState, stake: number, description: string): WalletState {
  assertStakeAllowed(wallet.balance, stake)

  return {
    balance: wallet.balance - stake,
    transactions: [
      ...wallet.transactions,
      {
        amount: -stake,
        type: 'BET_STAKE',
        description,
      },
    ],
  }
}

export function creditWin(wallet: WalletState, payout: number, description: string): WalletState {
  if (payout <= 0) {
    throw new Error('Uitbetaling moet positief zijn')
  }

  return {
    balance: wallet.balance + payout,
    transactions: [
      ...wallet.transactions,
      {
        amount: payout,
        type: 'BET_WIN',
        description,
      },
    ],
  }
}

export function applyAdminAdjustment(wallet: WalletState, amount: number, reason: string): WalletState {
  if (!reason || reason.trim().length < 8) {
    throw new Error('Een saldoaanpassing vereist een reden')
  }

  if (wallet.balance + amount < 0) {
    throw new Error('Saldo mag niet negatief worden')
  }

  return {
    balance: wallet.balance + amount,
    transactions: [
      ...wallet.transactions,
      {
        amount,
        type: 'ADMIN_ADJUSTMENT',
        description: reason,
      },
    ],
  }
}
