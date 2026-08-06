import type { Role } from './domain'

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Admin + Miel-modus',
  MIEL: 'Miel',
  VIEWER: 'Viewer',
}

export const roleDescriptions: Record<Role, string> = {
  ADMIN: 'Beheer alles en test ook alle Miel-acties.',
  MIEL: 'Kan inzetten, teams kiezen en eigen weddenschappen bekijken.',
  VIEWER: 'Kan meekijken en spellen voorstellen.',
}

export function canUseMielMode(role?: Role) {
  return role === 'ADMIN' || role === 'MIEL'
}

export function roleOptionLabel(role: Role) {
  return `${roleLabels[role]} - ${roleDescriptions[role]}`
}
