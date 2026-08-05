import { compare, hash } from 'bcryptjs'

export function hashPin(pin: string) {
  if (!/^\d{4,12}$/.test(pin)) {
    throw new Error('Pincode moet uit 4 tot 12 cijfers bestaan')
  }

  return hash(pin, 12)
}

export function verifyHashedPin(pin: string, pinHash: string) {
  return compare(pin, pinHash)
}
