import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Locale-aware number parsing for text inputs.
 *
 * Accepts both `1.5` and `1,5` (comma-decimal locales) and thousands
 * separators like `1.234,5` (de) or `1,234.5` (en). Falls back to `NaN`
 * for non-numeric strings so callers can use `Number.isFinite` guards.
 * Strips surrounding whitespace and common currency/unit suffixes are NOT
 * handled — keep inputs to bare numerics.
 */
export function parseNumber(raw: string): number {
  // Number() always returns a number (never null/undefined), so no
  // nullish fallback applies — NaN propagates for non-numeric input.
  if (typeof raw !== 'string') return Number(raw)
  const s = raw.trim()
  if (s === '') return NaN
  // If the string has both ',' and '.', the rightmost separator is the decimal.
  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  let normalized = s
  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(',')
    const lastDot = s.lastIndexOf('.')
    if (lastComma > lastDot) {
      // de/EU style: 1.234,5 → 1234.5
      normalized = s.replace(/\./g, '').replace(',', '.')
    } else {
      // en/US style: 1,234.5 → 1234.5
      normalized = s.replace(/,/g, '')
    }
  } else if (hasComma) {
    // Single separator that's a comma → treat as decimal.
    normalized = s.replace(',', '.')
  }
  return Number(normalized)
}

/** Clamp a value into [min, max]. Returns `fallback` when not finite. */
export function clampNumber(v: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback
  return Math.max(min, Math.min(max, v))
}
