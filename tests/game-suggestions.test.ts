import { beforeEach, describe, expect, it, vi } from 'vitest'
import { suggestionSchema } from '../lib/validation'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), transaction: vi.fn(), createGame: vi.fn(),
  tx: { gameSuggestion: { findUniqueOrThrow: vi.fn(), update: vi.fn() }, attribute: { findMany: vi.fn() }, auditLog: { create: vi.fn() } },
}))
vi.mock('@/lib/auth', () => ({ requireRole: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: mocks.transaction } }))
vi.mock('@/lib/create-weekend-game', () => ({ createWeekendGame: mocks.createGame }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { approveGameSuggestionAction, rejectGameSuggestionAction } from '../app/admin/evenementen/suggestions'

const request = { id: 'request', title: 'Kubb', description: '', proposedRules: '', proposedTeamCount: 2, proposedPlayersPerTeam: 1, proposedAttributesJson: { selected: ['kracht'] }, status: 'SUBMITTED', event: null }
function form(values: Record<string, string> = {}) { const data = new FormData(); data.set('id', 'request'); for (const [key, value] of Object.entries(values)) data.set(key, value); return data }
beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ userId: 'admin' })
  mocks.transaction.mockImplementation((fn) => fn(mocks.tx))
  mocks.tx.gameSuggestion.findUniqueOrThrow.mockResolvedValue(request)
  mocks.tx.attribute.findMany.mockResolvedValue([{ id: 'strength', name: 'kracht' }])
  mocks.createGame.mockResolvedValue('new-game')
})
describe('Centrale spelaanvragen', () => {
  it('accepteert ontbrekende en korte omschrijvingen', () => {
    const base = { title: 'Kubb', proposedTeamCount: 2, proposedPlayersPerTeam: 1 }
    for (const description of [undefined, '', 'Kort']) expect(suggestionSchema.safeParse({ ...base, description }).success).toBe(true)
    expect(suggestionSchema.parse(base).description).toBe('')
    expect(suggestionSchema.safeParse({ ...base, description: 'x'.repeat(1501) }).success).toBe(false)
    expect(suggestionSchema.safeParse({ ...base, title: ' ' }).success).toBe(false)
  })
  it('maakt goedkeuren en koppelen één transactie, met de aangevraagde spelersaantallen', async () => {
    await approveGameSuggestionAction(form())
    expect(mocks.createGame).toHaveBeenCalledWith(mocks.tx, 'admin', expect.objectContaining({ title: 'Kubb', teamCount: 2, playersPerTeam: 1, description: '', attributeIds: ['strength'] }), 'request')
    expect(mocks.tx.gameSuggestion.update).toHaveBeenCalledWith({ where: { id: 'request' }, data: { status: 'CONVERTED' } })
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
  })
  it('maakt bij herhaald goedkeuren geen tweede spel', async () => {
    await approveGameSuggestionAction(form())
    mocks.tx.gameSuggestion.findUniqueOrThrow.mockResolvedValue({ ...request, event: { id: 'new-game' }, status: 'CONVERTED' })
    await approveGameSuggestionAction(form())
    expect(mocks.createGame).toHaveBeenCalledTimes(1)
  })
  it('behoudt regels en laat de beheerder aantallen corrigeren', async () => {
    mocks.tx.gameSuggestion.findUniqueOrThrow.mockResolvedValue({ ...request, description: 'Uitleg', proposedRules: 'Spelregels' })
    await approveGameSuggestionAction(form({ teamCount: '3', playersPerTeam: '2' }))
    expect(mocks.createGame).toHaveBeenCalledWith(mocks.tx, 'admin', expect.objectContaining({ teamCount: 3, playersPerTeam: 2, description: 'Uitleg\n\nSpelregels' }), 'request')
  })
  it('voegt ook vroeger goedgekeurde aanvragen zonder gekoppeld spel alsnog toe', async () => {
    mocks.tx.gameSuggestion.findUniqueOrThrow.mockResolvedValue({ ...request, status: 'APPROVED' })
    await approveGameSuggestionAction(form())
    expect(mocks.createGame).toHaveBeenCalledTimes(1)
  })
  it('laat een aanvraag onaangeraakt als het aanmaken mislukt', async () => {
    mocks.createGame.mockRejectedValue(new Error('Databasefout'))
    await expect(approveGameSuggestionAction(form())).rejects.toThrow()
    expect(mocks.tx.gameSuggestion.update).not.toHaveBeenCalled()
  })
  it('weigert ongeldige aantallen en afgewezen aanvragen', async () => {
    await expect(approveGameSuggestionAction(form({ playersPerTeam: '0' }))).rejects.toThrow()
    mocks.tx.gameSuggestion.findUniqueOrThrow.mockResolvedValue({ ...request, status: 'REJECTED' })
    await expect(approveGameSuggestionAction(form())).rejects.toThrow()
    expect(mocks.createGame).not.toHaveBeenCalled()
  })
  it('wijst af zonder een spel te maken en beschermt goedgekeurde spellen', async () => {
    await rejectGameSuggestionAction(form())
    expect(mocks.tx.gameSuggestion.update).toHaveBeenCalledWith({ where: { id: 'request' }, data: { status: 'REJECTED' } })
    expect(mocks.createGame).not.toHaveBeenCalled()
    mocks.tx.gameSuggestion.findUniqueOrThrow.mockResolvedValue({ ...request, event: { id: 'new-game' } })
    await expect(rejectGameSuggestionAction(form())).rejects.toThrow()
  })
  it('vereist adminrechten voor goedkeuren en afwijzen', async () => {
    mocks.auth.mockRejectedValue(new Error('Geen toegang'))
    await expect(approveGameSuggestionAction(form())).rejects.toThrow('Geen toegang')
    await expect(rejectGameSuggestionAction(form())).rejects.toThrow('Geen toegang')
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
