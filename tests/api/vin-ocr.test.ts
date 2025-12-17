import { describe, it, expect } from 'vitest'

function validateVin(vin: string): boolean {
  if (!vin || vin.length !== 17) return false
  const cleanVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (cleanVin.length !== 17) return false
  if (/[IOQ]/.test(cleanVin)) return false
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)
}

function decodeVinYear(char: string): string | null {
  const yearCodes: Record<string, string> = {
    A: '2010', B: '2011', C: '2012', D: '2013', E: '2014',
    F: '2015', G: '2016', H: '2017', J: '2018', K: '2019',
    L: '2020', M: '2021', N: '2022', P: '2023', R: '2024',
    S: '2025', T: '2026', V: '2027', W: '2028', X: '2029',
    Y: '2030', '1': '2031', '2': '2032', '3': '2033', '4': '2034',
    '5': '2035', '6': '2036', '7': '2037', '8': '2038', '9': '2039',
  }
  return yearCodes[char.toUpperCase()] || null
}

function decodeWmi(wmi: string): { make?: string; country?: string } {
  const wmiDatabase: Record<string, { make: string; country: string }> = {
    WBA: { make: 'BMW', country: 'Germany' },
    WVW: { make: 'Volkswagen', country: 'Germany' },
    WDB: { make: 'Mercedes-Benz', country: 'Germany' },
    WAU: { make: 'Audi', country: 'Germany' },
    VF1: { make: 'Renault', country: 'France' },
    VF3: { make: 'Peugeot', country: 'France' },
    ZFA: { make: 'Fiat', country: 'Italy' },
    ZFF: { make: 'Ferrari', country: 'Italy' },
    SAJ: { make: 'Jaguar', country: 'UK' },
    TMB: { make: 'Škoda', country: 'Czech Republic' },
    YV1: { make: 'Volvo', country: 'Sweden' },
  }
  const prefix = wmi.toUpperCase().substring(0, 3)
  return wmiDatabase[prefix] || {}
}

describe('VIN Validation', () => {
  it('validates correct VIN formats', () => {
    expect(validateVin('WBAPH5C55BA123456')).toBe(true) // BMW
    expect(validateVin('WVWZZZ3CZWE123456')).toBe(true) // VW
    expect(validateVin('WDB1234567A890123')).toBe(true) // Mercedes
  })

  it('rejects VINs with invalid length', () => {
    expect(validateVin('WBAPH5C55BA12345')).toBe(false) // 16 chars
    expect(validateVin('WBAPH5C55BA1234567')).toBe(false) // 18 chars
    expect(validateVin('')).toBe(false)
  })

  it('rejects VINs with forbidden characters I, O, Q', () => {
    expect(validateVin('WBAPH5C55BI123456')).toBe(false) // contains I
    expect(validateVin('WBAPH5C55BO123456')).toBe(false) // contains O
    expect(validateVin('WBAPH5C55BQ123456')).toBe(false) // contains Q
  })

  it('handles lowercase input', () => {
    expect(validateVin('wbaph5c55ba123456')).toBe(true)
  })

  it('rejects VINs with special characters', () => {
    expect(validateVin('WBAPH5C55BA-12345')).toBe(false)
    expect(validateVin('WBAPH5C55BA 12345')).toBe(false)
  })
})

describe('VIN Year Decoding', () => {
  it('decodes recent year codes correctly', () => {
    expect(decodeVinYear('L')).toBe('2020')
    expect(decodeVinYear('M')).toBe('2021')
    expect(decodeVinYear('N')).toBe('2022')
    expect(decodeVinYear('P')).toBe('2023')
    expect(decodeVinYear('R')).toBe('2024')
  })

  it('decodes older year codes', () => {
    expect(decodeVinYear('A')).toBe('2010')
    expect(decodeVinYear('K')).toBe('2019')
  })

  it('handles lowercase input', () => {
    expect(decodeVinYear('m')).toBe('2021')
  })

  it('returns null for invalid year codes', () => {
    expect(decodeVinYear('I')).toBeNull() // forbidden
    expect(decodeVinYear('O')).toBeNull() // forbidden
    expect(decodeVinYear('Z')).toBeNull() // not in cycle
  })
})

describe('WMI (Manufacturer) Decoding', () => {
  it('decodes German manufacturers', () => {
    expect(decodeWmi('WBA')).toEqual({ make: 'BMW', country: 'Germany' })
    expect(decodeWmi('WVW')).toEqual({ make: 'Volkswagen', country: 'Germany' })
    expect(decodeWmi('WDB')).toEqual({ make: 'Mercedes-Benz', country: 'Germany' })
    expect(decodeWmi('WAU')).toEqual({ make: 'Audi', country: 'Germany' })
  })

  it('decodes French manufacturers', () => {
    expect(decodeWmi('VF1')).toEqual({ make: 'Renault', country: 'France' })
    expect(decodeWmi('VF3')).toEqual({ make: 'Peugeot', country: 'France' })
  })

  it('decodes Italian manufacturers', () => {
    expect(decodeWmi('ZFA')).toEqual({ make: 'Fiat', country: 'Italy' })
    expect(decodeWmi('ZFF')).toEqual({ make: 'Ferrari', country: 'Italy' })
  })

  it('decodes other European manufacturers', () => {
    expect(decodeWmi('SAJ')).toEqual({ make: 'Jaguar', country: 'UK' })
    expect(decodeWmi('TMB')).toEqual({ make: 'Škoda', country: 'Czech Republic' })
    expect(decodeWmi('YV1')).toEqual({ make: 'Volvo', country: 'Sweden' })
  })

  it('handles lowercase input', () => {
    expect(decodeWmi('wba')).toEqual({ make: 'BMW', country: 'Germany' })
  })

  it('returns empty object for unknown WMI', () => {
    expect(decodeWmi('XXX')).toEqual({})
    expect(decodeWmi('123')).toEqual({})
  })
})
