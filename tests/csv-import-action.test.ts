import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  transaction: vi.fn(),
  tx: {
    participant: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    attribute: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    participantAttribute: { findUnique: vi.fn(), upsert: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))
vi.mock('@/lib/auth', () => ({ requireRole: mocks.requireRole }))
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: mocks.transaction } }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
import { importParticipants } from '../app/admin/deelnemers/import-action'

const payload = { overwrite: false, rows: [{ name: 'CSV Naam', participantId: 'p1', shirtSize: 'L', scores: { kracht: 0.5 } }] }
beforeEach(() => {
  vi.resetAllMocks()
  mocks.requireRole.mockResolvedValue({ userId: 'admin' })
  mocks.transaction.mockImplementation((fn) => fn(mocks.tx))
  mocks.tx.participant.findMany.mockResolvedValue([{ id: 'p1', name: 'Bestaande Naam', shirtSize: 'M' }])
  mocks.tx.attribute.findMany.mockResolvedValue([{ id: 'a1', name: 'kracht', minValue: 1, maxValue: 10 }])
  mocks.tx.attribute.update.mockResolvedValue({ id: 'a1', name: 'kracht', minValue: 0, maxValue: 10 })
  mocks.tx.participantAttribute.findUnique.mockResolvedValue({ score: 7 })
})

describe('CSV opslaan', () => {
  it('vereist adminrechten voordat iets wordt gelezen of opgeslagen', async () => {
    mocks.requireRole.mockRejectedValue(new Error('Geen toegang'))
    await expect(importParticipants(payload)).rejects.toThrow('Geen toegang')
    expect(mocks.requireRole).toHaveBeenCalledWith(['ADMIN'])
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
  it('behoudt standaard bestaande scores en shirtmaten', async () => {
    const result = await importParticipants(payload)
    expect(result.ok).toBe(true)
    expect(result.message).toContain('1 bestaande scores behouden')
    expect(mocks.tx.participantAttribute.upsert).not.toHaveBeenCalled()
    expect(mocks.tx.participant.update).not.toHaveBeenCalled()
    expect(mocks.tx.attribute.update).not.toHaveBeenCalled()
    expect(mocks.tx.auditLog.create).toHaveBeenCalled()
  })
  it('slaat decimalen exact op en verruimt de schaal voor nul na expliciet overschrijven', async () => {
    expect((await importParticipants({ ...payload, overwrite: true })).ok).toBe(true)
    expect(mocks.tx.participantAttribute.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { score: 0.5 } }))
    expect(mocks.tx.attribute.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { minValue: 0, maxValue: 10 } })
    expect(mocks.tx.participant.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { shirtSize: 'L' } })
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: 'Serializable' }))
  })
  it('vult ontbrekende scores ook zonder overschrijven aan', async () => {
    mocks.tx.participantAttribute.findUnique.mockResolvedValue(null)
    expect((await importParticipants(payload)).ok).toBe(true)
    expect(mocks.tx.participantAttribute.upsert).toHaveBeenCalledTimes(1)
  })
  it('weigert dubbele koppelingen en ongeldige scores voor de transactie', async () => {
    expect((await importParticipants({ ...payload, rows: [payload.rows[0], payload.rows[0]] })).ok).toBe(false)
    expect((await importParticipants({ ...payload, rows: [{ ...payload.rows[0], scores: { kracht: -5 } }] })).ok).toBe(false)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
  it('weigert verdwenen deelnemers en dubbele nieuwe namen', async () => {
    expect((await importParticipants({ ...payload, rows: [{ ...payload.rows[0], participantId: 'verdwenen' }] })).ok).toBe(false)
    expect((await importParticipants({ ...payload, rows: [{ ...payload.rows[0], participantId: null, name: 'bestaande naam' }] })).ok).toBe(false)
    expect(mocks.tx.participant.create).not.toHaveBeenCalled()
    expect(mocks.tx.participantAttribute.upsert).not.toHaveBeenCalled()
  })
  it('hergebruikt oude parameternamen zonder dubbele parameters te maken', async () => {
    mocks.tx.attribute.findMany.mockResolvedValue([{ id: 'geluk', name: 'geluk', minValue: 0, maxValue: 10 }])
    mocks.tx.participantAttribute.findUnique.mockResolvedValue(null)
    await importParticipants({ ...payload, rows: [{ ...payload.rows[0], scores: { 'Lucky factor': 5 } }] })
    expect(mocks.tx.attribute.create).not.toHaveBeenCalled()
    expect(mocks.tx.participantAttribute.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { participantId: 'p1', attributeId: 'geluk', score: 5 } }))
  })
})
