import type { Role } from './domain'

export function canAccessAdmin(role?: Role) {
  return role === 'ADMIN'
}

export function canPlaceBet(role?: Role) {
  return role === 'MIEL'
}

export function canSuggestGame(role?: Role) {
  return role === 'ADMIN' || role === 'MIEL' || role === 'VIEWER'
}

export function assertCanPlaceBet(role?: Role) {
  if (!canPlaceBet(role)) {
    throw new Error('Alleen Miel kan inzetten')
  }
}

export function assertAdmin(role?: Role) {
  if (!canAccessAdmin(role)) {
    throw new Error('Alleen admins hebben toegang')
  }
}
