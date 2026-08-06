import type { Role } from './domain'
import { canUseMielMode } from './roles'

export function canAccessAdmin(role?: Role) {
  return role === 'ADMIN'
}

export function canPlaceBet(role?: Role) {
  return canUseMielMode(role)
}

export function canSuggestGame(role?: Role) {
  return role === 'ADMIN' || role === 'MIEL' || role === 'VIEWER'
}

export function assertCanPlaceBet(role?: Role) {
  if (!canPlaceBet(role)) {
    throw new Error('Alleen Miel of admin kan inzetten')
  }
}

export function assertAdmin(role?: Role) {
  if (!canAccessAdmin(role)) {
    throw new Error('Alleen admins hebben toegang')
  }
}
