import { describe, it, expect } from 'vitest'
import { formatVinMessage, type VinResult } from '@/hooks/useVinOcr'

describe('formatVinMessage', () => {
  it('formats basic VIN result', () => {
    const result: VinResult = {
      vin: 'WBAPH5C55BA123456',
      confidence: 'high',
    }
    const message = formatVinMessage(result)
    expect(message).toContain('WBAPH5C55BA123456')
    expect(message).toContain('✅ High')
  })

  it('formats medium confidence', () => {
    const result: VinResult = {
      vin: 'WBAPH5C55BA123456',
      confidence: 'medium',
    }
    const message = formatVinMessage(result)
    expect(message).toContain('⚠️ Medium')
  })

  it('formats low confidence', () => {
    const result: VinResult = {
      vin: 'WBAPH5C55BA123456',
      confidence: 'low',
    }
    const message = formatVinMessage(result)
    expect(message).toContain('❓ Low')
  })

  it('includes vehicle info when available', () => {
    const result: VinResult = {
      vin: 'WBAPH5C55BA123456',
      confidence: 'high',
      vehicleInfo: {
        make: 'BMW',
        model: '3 Series',
        year: '2021',
        engine: '2.0L Turbo',
        country: 'Germany',
      },
    }
    const message = formatVinMessage(result)
    expect(message).toContain('BMW')
    expect(message).toContain('3 Series')
    expect(message).toContain('2021')
    expect(message).toContain('2.0L Turbo')
    expect(message).toContain('Germany')
  })

  it('handles partial vehicle info', () => {
    const result: VinResult = {
      vin: 'WBAPH5C55BA123456',
      confidence: 'high',
      vehicleInfo: {
        make: 'BMW',
      },
    }
    const message = formatVinMessage(result)
    expect(message).toContain('BMW')
    expect(message).not.toContain('Model:')
  })
})
