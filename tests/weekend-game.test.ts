import { beforeEach, describe, expect, it, vi } from 'vitest'
import { equalGameWeights, weekendGameSchema } from '../lib/weekend-game'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), transaction: vi.fn(),
  tx: {
    attribute: { findMany: vi.fn(), upsert: vi.fn() },
    event: { create: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    eventTeam: { createMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))
vi.mock('@/lib/auth', () => ({ requireRole: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: mocks.transaction } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { createWeekendGameAction, prepareWeekendGameAction } from '../app/admin/evenementen/actions'

function input() {
  const form = new FormData()
  Object.entries({ title: 'Kubb', playersPerTeam: '3', teamOne: 'Team Groen', teamTwo: 'Team Geel' }).forEach(([key, value]) => form.set(key, value))
  return form
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ userId: 'admin' })
  mocks.transaction.mockImplementation((fn) => fn(mocks.tx))
  mocks.tx.attribute.findMany.mockResolvedValue([{ id: 'kracht' }, { id: 'IQ' }])
  mocks.tx.event.create.mockResolvedValue({ id: 'spel' })
})
describe('Eenvoudig weekendspel', () => {
  it('maakt in één transactie een spel met twee teams en de exacte teamgrootte klaar', async () => {
    expect(await createWeekendGameAction(input())).toEqual({ id: 'spel' })
    expect(mocks.tx.event.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      title: 'Kubb', status: 'OPEN_FOR_SELECTION',
      teams: { create: [{ name: 'Team Groen' }, { name: 'Team Geel' }] },
      gameTemplate: { create: expect.objectContaining({ teamCount: 2, exactTeamSize: 3, minPlayersPerTeam: 3, maxPlayersPerTeam: 3, isActive: false, attributes: { create: [{ attributeId: 'kracht', weight: 0.5 }, { attributeId: 'IQ', weight: 0.5 }] } }) },
    }) })
    expect(mocks.tx.auditLog.create).toHaveBeenCalled()
  })
  it('gebruikt alleen de gekozen parameters en weigert onbekende IDs', async () => {
    const form = input(); form.append('attributeId', 'IQ')
    await createWeekendGameAction(form)
    expect(mocks.tx.event.create.mock.calls[0][0].data.gameTemplate.create.attributes.create).toEqual([{ attributeId: 'IQ', weight: 1 }])
    mocks.tx.event.create.mockClear()
    form.append('attributeId', 'onbekend')
    await expect(createWeekendGameAction(form)).rejects.toThrow()
    expect(mocks.tx.event.create).not.toHaveBeenCalled()
  })
  it('werkt ook wanneer er nog geen actieve parameters zijn', async () => {
    mocks.tx.attribute.findMany.mockResolvedValue([])
    mocks.tx.attribute.upsert.mockResolvedValue({ id: 'geluk' })
    await createWeekendGameAction(input())
    expect(mocks.tx.event.create.mock.calls[0][0].data.gameTemplate.create.attributes.create).toEqual([{ attributeId: 'geluk', weight: 1 }])
  })
  it('weigert onbevoegden en ongeldige aantallen vóór databasewijzigingen', async () => {
    const form = input(); form.set('playersPerTeam', '2.5')
    await expect(createWeekendGameAction(form)).rejects.toThrow()
    expect(mocks.transaction).not.toHaveBeenCalled()
    mocks.auth.mockRejectedValue(new Error('Geen toegang'))
    await expect(createWeekendGameAction(input())).rejects.toThrow('Geen toegang')
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
  it('valideert teamnamen, aantallen en planning', () => {
    const base = { title: 'Kubb', playersPerTeam: 2, teamOne: 'A', teamTwo: 'B', description: '', startsAt: '', attributeIds: [] }
    for (const change of [{ playersPerTeam: 0 }, { playersPerTeam: 51 }, { teamTwo: 'a' }, { startsAt: 'ongeldig' }, { title: ' ' }]) {
      expect(weekendGameSchema.safeParse({ ...base, ...change }).success).toBe(false)
    }
  })
  it('verdeelt gewichten zonder afrondingsfouten in de opgeslagen schaal', () => {
    for (const count of [3, 13, 17, 100]) {
      const weights = equalGameWeights(Array.from({ length: count }, (_, index) => String(index)))
      expect(weights.reduce((sum, row) => sum + Math.round(row.weight * 1_000_000), 0)).toBe(1_000_000)
    }
    expect(equalGameWeights(['a', 'a'])).toEqual([{ attributeId: 'a', weight: 1 }])
  })
  it('zet oudere conceptspellen klaar zonder bestaande teams te vervangen', async () => {
    mocks.tx.event.findUniqueOrThrow.mockResolvedValue({ status: 'DRAFT', gameTemplate: { teamCount: 2 }, teams: [{ id: 'bestaand' }] })
    const form = new FormData(); form.set('id', 'oud-spel')
    await prepareWeekendGameAction(form)
    expect(mocks.tx.eventTeam.createMany).toHaveBeenCalledWith({ data: [{ eventId: 'oud-spel', name: 'Team 2' }] })
    expect(mocks.tx.event.update).toHaveBeenCalledWith({ where: { id: 'oud-spel' }, data: { status: 'OPEN_FOR_SELECTION' } })
    mocks.tx.event.findUniqueOrThrow.mockResolvedValue({ status: 'BET_PLACED', gameTemplate: { teamCount: 2 }, teams: [] })
    mocks.tx.eventTeam.createMany.mockClear()
    await expect(prepareWeekendGameAction(form)).rejects.toThrow()
    expect(mocks.tx.eventTeam.createMany).not.toHaveBeenCalled()
  })
})
