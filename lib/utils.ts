import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCredits(value: number) {
  return new Intl.NumberFormat('nl-BE', {
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatOdd(value: number) {
  return value.toFixed(2).replace('.', ',')
}
