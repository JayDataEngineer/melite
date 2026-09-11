/**
 * Tests for the locale-aware number parsing helpers in lib/utils.
 *
 * Covers the comma-decimal (de/EU), dot-decimal (en/US), and mixed
 * thousands+decimal cases that <input type="number"> users paste in.
 */
import { describe, it, expect } from 'vitest'
import { parseNumber, clampNumber } from '@melite/ui'

describe('parseNumber', () => {
  it('parses plain dot-decimals', () => {
    expect(parseNumber('1.5')).toBe(1.5)
    expect(parseNumber('42')).toBe(42)
  })

  it('parses comma-decimals (EU locale)', () => {
    expect(parseNumber('1,5')).toBe(1.5)
    expect(parseNumber('0,25')).toBe(0.25)
  })

  it('parses en/US thousands + decimal: 1,234.5 → 1234.5', () => {
    expect(parseNumber('1,234.5')).toBe(1234.5)
  })

  it('parses de/EU thousands + decimal: 1.234,5 → 1234.5', () => {
    expect(parseNumber('1.234,5')).toBe(1234.5)
  })

  it('trims whitespace', () => {
    expect(parseNumber('  3,14  ')).toBe(3.14)
  })

  it('returns NaN for empty / non-numeric', () => {
    expect(parseNumber('')).toBeNaN()
    expect(parseNumber('abc')).toBeNaN()
  })

  it('passes finite numbers through unchanged', () => {
    expect(parseNumber(7 as unknown as string)).toBe(7)
  })
})

describe('clampNumber', () => {
  it('clamps within range', () => {
    expect(clampNumber(50, 0, 100, 0)).toBe(50)
    expect(clampNumber(-5, 0, 100, 0)).toBe(0)
    expect(clampNumber(200, 0, 100, 0)).toBe(100)
  })

  it('returns the fallback for non-finite input', () => {
    expect(clampNumber(NaN, 0, 100, 42)).toBe(42)
    expect(clampNumber(Infinity, 0, 100, 7)).toBe(7)
  })
})
