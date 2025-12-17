import { describe, it, expect } from 'vitest'
import {
  getPriceLevelDisplay,
  formatDuration,
  formatDistance,
} from '@/lib/utils/price-level'

describe('getPriceLevelDisplay', () => {
  it('returns null for unspecified price level', () => {
    expect(getPriceLevelDisplay('PRICE_LEVEL_UNSPECIFIED')).toBeNull()
    expect(getPriceLevelDisplay(null)).toBeNull()
  })

  it('returns unknown display when showUnknown is true', () => {
    const result = getPriceLevelDisplay('PRICE_LEVEL_UNSPECIFIED', true)
    expect(result).toEqual({
      icon: '🅿️',
      label: 'Paid',
      colorClass: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
    })
  })

  it('returns correct display for FREE', () => {
    const result = getPriceLevelDisplay('PRICE_LEVEL_FREE')
    expect(result?.label).toBe('Free')
    expect(result?.icon).toBe('💚')
  })

  it('returns correct display for INEXPENSIVE', () => {
    const result = getPriceLevelDisplay('PRICE_LEVEL_INEXPENSIVE')
    expect(result?.label).toBe('€')
    expect(result?.icon).toBe('💛')
  })

  it('returns correct display for MODERATE', () => {
    const result = getPriceLevelDisplay('PRICE_LEVEL_MODERATE')
    expect(result?.label).toBe('€€')
    expect(result?.icon).toBe('🟠')
  })

  it('returns correct display for EXPENSIVE', () => {
    const result = getPriceLevelDisplay('PRICE_LEVEL_EXPENSIVE')
    expect(result?.label).toBe('€€€')
    expect(result?.icon).toBe('🔴')
  })

  it('returns correct display for VERY_EXPENSIVE', () => {
    const result = getPriceLevelDisplay('PRICE_LEVEL_VERY_EXPENSIVE')
    expect(result?.label).toBe('€€€')
  })

  it('returns null for unknown price level', () => {
    expect(getPriceLevelDisplay('UNKNOWN_LEVEL')).toBeNull()
  })
})

describe('formatDuration', () => {
  it('formats seconds to minutes', () => {
    expect(formatDuration('60s')).toBe('1 min')
    expect(formatDuration('120s')).toBe('2 min')
    expect(formatDuration('300s')).toBe('5 min')
  })

  it('formats large durations to hours and minutes', () => {
    expect(formatDuration('3600s')).toBe('1h 0min')
    expect(formatDuration('3900s')).toBe('1h 5min')
    expect(formatDuration('7200s')).toBe('2h 0min')
  })

  it('rounds to nearest minute', () => {
    expect(formatDuration('90s')).toBe('2 min')
    expect(formatDuration('150s')).toBe('3 min')
  })

  it('returns original string for invalid input', () => {
    expect(formatDuration('invalid')).toBe('invalid')
  })
})

describe('formatDistance (price-level)', () => {
  it('formats meters < 1000 with m unit', () => {
    expect(formatDistance(500)).toBe('500 m')
    expect(formatDistance(100)).toBe('100 m')
    expect(formatDistance(999)).toBe('999 m')
  })

  it('formats meters >= 1000 with km unit', () => {
    expect(formatDistance(1000)).toBe('1.0 km')
    expect(formatDistance(1500)).toBe('1.5 km')
    expect(formatDistance(10000)).toBe('10.0 km')
  })
})
