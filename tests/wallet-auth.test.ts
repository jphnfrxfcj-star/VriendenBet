import { describe, expect, it } from 'vitest'
import { assertAdmin, assertCanPlaceBet } from '@/lib/access-control'
import { hashPin, verifyHashedPin } from '@/lib/pin'
import { applyAdminAdjustment, debitStake } from '@/lib/wallet'

describe('rollen en wallet', () => {
  it('authenticeert een geldige pincode en weigert een foute pincode', async () => {
    const hash = await hashPin('2525')
    await expect(verifyHashedPin('2525', hash)).resolves.toBe(true)
    await expect(verifyHashedPin('1111', hash)).resolves.toBe(false)
  })

  it('laat Miel en admins inzetten', () => {
    expect(() => assertCanPlaceBet('VIEWER')).toThrow('Alleen Miel of admin kan inzetten')
    expect(() => assertCanPlaceBet('ADMIN')).not.toThrow()
    expect(() => assertCanPlaceBet('MIEL')).not.toThrow()
  })

  it('beschermt adminroutes', () => {
    expect(() => assertAdmin('VIEWER')).toThrow('Alleen admins hebben toegang')
    expect(() => assertAdmin('ADMIN')).not.toThrow()
  })

  it('trekt inzet af en maakt een transactie', () => {
    const wallet = debitStake({ balance: 1000, transactions: [] }, 50, 'Bet geplaatst')
    expect(wallet.balance).toBe(950)
    expect(wallet.transactions[0]).toMatchObject({ amount: -50, type: 'BET_STAKE' })
  })

  it('weigert onvoldoende saldo en admincorrecties zonder reden', () => {
    expect(() => debitStake({ balance: 20, transactions: [] }, 50, 'Bet')).toThrow('Onvoldoende saldo')
    expect(() => applyAdminAdjustment({ balance: 20, transactions: [] }, -30, 'te kort')).toThrow(
      'Een saldoaanpassing vereist een reden',
    )
  })
})
