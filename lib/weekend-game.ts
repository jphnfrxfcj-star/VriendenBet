import { z } from 'zod'

export const weekendGameSchema = z.object({
  title: z.string().trim().min(1).max(120),
  teamCount: z.coerce.number().int().min(2).max(8).default(2),
  playersPerTeam: z.coerce.number().int().min(1).max(50),
  teamOne: z.string().trim().min(1).max(80),
  teamTwo: z.string().trim().min(1).max(80),
  description: z.string().trim().max(5000),
  startsAt: z.string().refine((value) => !value || Number.isFinite(new Date(value).getTime())),
  attributeIds: z.array(z.string().min(1)).max(100),
}).refine((data) => data.teamOne.toLowerCase() !== data.teamTwo.toLowerCase(), { message: 'Geef de teams verschillende namen.' })

/** Integer millionths ensure the stored six-decimal weights add up to one. */
export function equalGameWeights(attributeIds: string[]) {
  const ids = [...new Set(attributeIds)]
  if (!ids.length) throw new Error('Kies minstens één parameter.')
  const base = Math.floor(1_000_000 / ids.length)
  const remainder = 1_000_000 % ids.length
  return ids.map((attributeId, index) => ({ attributeId, weight: (base + (index < remainder ? 1 : 0)) / 1_000_000 }))
}
