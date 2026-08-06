import { z } from 'zod'

export const loginSchema = z.object({
  displayName: z.string().min(1, 'Kies je naam'),
  pin: z.string().min(4, 'Pincode bestaat uit minstens 4 cijfers').max(12),
})

export const stakeSchema = z.object({
  stake: z.coerce.number().int().min(10).max(250),
})

const proposedAttributesSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (!value) return []
    const attributes = Array.isArray(value) ? value : value.split(',')
    return Array.from(new Set(attributes.map((attribute) => attribute.trim()).filter(Boolean))).slice(0, 12)
  })

export const suggestionSchema = z
  .object({
    title: z.string().min(3, 'Titel is verplicht').max(120),
    description: z.string().min(10, 'Omschrijving is te kort').max(1500),
    proposedRules: z.string().max(2500).optional(),
    proposedFormat: z.enum(['TEAM', 'INDIVIDUAL']).default('TEAM'),
    proposedTeamCount: z.coerce.number().int().min(2).max(8).optional(),
    proposedPlayersPerTeam: z.coerce.number().int().min(1).max(12).optional(),
    proposedAttributes: proposedAttributesSchema,
  })
  .transform((value) => ({
    ...value,
    proposedTeamCount: value.proposedFormat === 'TEAM' ? value.proposedTeamCount : undefined,
    proposedPlayersPerTeam: value.proposedFormat === 'TEAM' ? value.proposedPlayersPerTeam : undefined,
  }))
  .superRefine((value, context) => {
    if (value.proposedFormat === 'TEAM' && !value.proposedTeamCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proposedTeamCount'],
        message: 'Aantal teams is verplicht voor een teamspel',
      })
    }
  })

export const oddsOverrideSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  overriddenOdds: z.coerce.number().min(1.1).max(50),
  reason: z.string().min(8, 'Een reden is verplicht').max(500),
})
