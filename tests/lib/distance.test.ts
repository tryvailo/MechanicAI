import { describe, it, expect } from 'vitest'
import {
  calculateDistance,
  formatDistance,
  calculateDistanceBetween,
  type Coordinates,
} from '@/lib/utils/distance'

describe('calculateDistance', () => {
  it('calculates distance between Kyiv and Lviv correctly', () => {
    const distance = calculateDistance(50.4501, 30.5234, 49.8397, 24.0297)
    expect(distance).toBeCloseTo(467.5, 0)
  })

  it('returns 0 for same coordinates', () => {
    const distance = calculateDistance(50.4501, 30.5234, 50.4501, 30.5234)
    expect(distance).toBe(0)
  })

  it('calculates short distance correctly', () => {
    // ~1km apart
    const distance = calculateDistance(50.4501, 30.5234, 50.4591, 30.5234)
    expect(distance).toBeCloseTo(1, 0)
  })

  it('handles cross-hemisphere coordinates', () => {
    // New York to Sydney
    const distance = calculateDistance(40.7128, -74.006, -33.8688, 151.2093)
    expect(distance).toBeCloseTo(15990, -2)
  })
})

describe('formatDistance', () => {
  it('formats distances >= 1km with km unit', () => {
    expect(formatDistance(1.5)).toBe('1.5 km')
    expect(formatDistance(10.0)).toBe('10.0 km')
    expect(formatDistance(1.0)).toBe('1.0 km')
  })

  it('formats distances < 1km in meters', () => {
    expect(formatDistance(0.5)).toBe('500 m')
    expect(formatDistance(0.1)).toBe('100 m')
    expect(formatDistance(0.05)).toBe('50 m')
  })

  it('rounds meters correctly', () => {
    expect(formatDistance(0.555)).toBe('555 m')
    expect(formatDistance(0.999)).toBe('999 m')
  })
})

describe('calculateDistanceBetween', () => {
  it('calculates distance between coordinate objects', () => {
    const from: Coordinates = { lat: 50.4501, lng: 30.5234 }
    const to: Coordinates = { lat: 49.8397, lng: 24.0297 }
    const distance = calculateDistanceBetween(from, to)
    expect(distance).toBeCloseTo(467.5, 0)
  })

  it('returns 0 for same coordinates', () => {
    const point: Coordinates = { lat: 50.4501, lng: 30.5234 }
    expect(calculateDistanceBetween(point, point)).toBe(0)
  })
})
