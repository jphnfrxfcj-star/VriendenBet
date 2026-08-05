import { z } from 'zod'

export const loginSchema = z.object({
  displayName: z.string().min(1, 'Kies je naam'),
  pin: z.string().min(4, 'Pincode bestaat uit minstens 4 cijfers').max(12),
})

export const stakeSchema = z.object({
  stake: z.coerce.number().int().min(10).max(250),
})

export const suggestionSchema = z.object({
  title: z.string().min(3, 'Titel is verplicht').max(120),
  description: z.string().min(10, 'Omschrijving is te kort').max(1500),
  proposedRules: z.string().max(2500).optional(),
  proposedFormat: z.enum(['TEAM', 'INDIVIDUAL']).optional(),
  proposedTeamCount: z.coerce.number().int().min(1).max(8).optional(),
  proposedPlayersPerTeam: z.coerce.number().int().min(1).max(12).optional(),
  proposedAttributes: z.string().max(800).optional(),
})

export const oddsOverrideSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  overriddenOdds: z.coerce.number().min(1.1).max(50),
  reason: z.string().min(8, 'Een reden is verplicht').max(500),
})
