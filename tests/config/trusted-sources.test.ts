import { describe, it, expect } from 'vitest'
import {
  getAutodocUrl,
  getClubAutodocUrl,
  generatePartSearchUrl,
  generateTutorialUrl,
  formatSourceCitation,
  AUTODOC_SOURCES,
  TECHNICAL_SOURCES,
  ALL_TRUSTED_SOURCES,
  EU_MANUFACTURER_SOURCES,
  EU_SAFETY_SOURCES,
  ASIAN_MANUFACTURER_SOURCES,
  US_MANUFACTURER_SOURCES,
} from '@/config/trusted-sources'

describe('Trusted Sources Configuration', () => {
  describe('AUTODOC_SOURCES', () => {
    it('has autodoc_catalog as primary source', () => {
      const catalog = AUTODOC_SOURCES.find(s => s.id === 'autodoc_catalog')
      expect(catalog).toBeDefined()
      expect(catalog?.priority).toBe(1)
      expect(catalog?.category).toBe('parts_catalog')
    })

    it('has club_autodoc for tutorials', () => {
      const club = AUTODOC_SOURCES.find(s => s.id === 'club_autodoc')
      expect(club).toBeDefined()
      expect(club?.category).toBe('video_tutorial')
    })

    it('has localized URLs for major markets', () => {
      const catalog = AUTODOC_SOURCES.find(s => s.id === 'autodoc_catalog')
      expect(catalog?.localized?.de).toBe('https://www.autodoc.de')
      expect(catalog?.localized?.fr).toBe('https://www.autodoc.fr')
      expect(catalog?.localized?.it).toBe('https://www.autodoc.it')
      expect(catalog?.localized?.es).toBe('https://www.autodoc.es')
      expect(catalog?.localized?.pl).toBe('https://www.autodoc.pl')
    })
  })

  describe('TECHNICAL_SOURCES', () => {
    it('includes major manufacturer sources', () => {
      const bmw = TECHNICAL_SOURCES.find(s => s.id === 'bmw_official')
      const vw = TECHNICAL_SOURCES.find(s => s.id === 'vw_official')
      const mercedes = TECHNICAL_SOURCES.find(s => s.id === 'mercedes_official')
      
      expect(bmw).toBeDefined()
      expect(vw).toBeDefined()
      expect(mercedes).toBeDefined()
    })

    it('includes safety sources', () => {
      const ece = TECHNICAL_SOURCES.find(s => s.id === 'ece_regulations')
      const tuv = TECHNICAL_SOURCES.find(s => s.id === 'tuv_info')
      
      expect(ece?.category).toBe('safety')
      expect(tuv?.category).toBe('safety')
    })

    it('is sorted by priority', () => {
      for (let i = 1; i < TECHNICAL_SOURCES.length; i++) {
        expect(TECHNICAL_SOURCES[i].priority).toBeGreaterThanOrEqual(TECHNICAL_SOURCES[i - 1].priority)
      }
    })
  })

  describe('EU_MANUFACTURER_SOURCES', () => {
    it('includes all major European brands', () => {
      const brands = EU_MANUFACTURER_SOURCES.map(s => s.id)
      
      // Germany
      expect(brands).toContain('bmw_official')
      expect(brands).toContain('mercedes_official')
      expect(brands).toContain('audi_official')
      expect(brands).toContain('vw_official')
      expect(brands).toContain('porsche_official')
      expect(brands).toContain('opel_official')
      
      // France
      expect(brands).toContain('renault_official')
      expect(brands).toContain('peugeot_official')
      expect(brands).toContain('citroen_official')
      
      // Italy
      expect(brands).toContain('fiat_official')
      expect(brands).toContain('alfa_romeo_official')
      
      // Sweden
      expect(brands).toContain('volvo_official')
      
      // Czech
      expect(brands).toContain('skoda_official')
      
      // UK
      expect(brands).toContain('jaguar_official')
      expect(brands).toContain('land_rover_official')
    })

    it('all EU manufacturers have priority 2', () => {
      EU_MANUFACTURER_SOURCES.forEach(source => {
        expect(source.priority).toBe(2)
      })
    })
  })

  describe('Priority System', () => {
    it('EU manufacturers have higher priority than Asian', () => {
      const euPriority = EU_MANUFACTURER_SOURCES[0].priority
      const asianPriority = ASIAN_MANUFACTURER_SOURCES[0].priority
      
      expect(euPriority).toBeLessThan(asianPriority)
    })

    it('Asian manufacturers have higher priority than US', () => {
      const asianPriority = ASIAN_MANUFACTURER_SOURCES[0].priority
      const usPriority = US_MANUFACTURER_SOURCES[0].priority
      
      expect(asianPriority).toBeLessThan(usPriority)
    })

    it('US manufacturers have lowest priority (6)', () => {
      US_MANUFACTURER_SOURCES.forEach(source => {
        expect(source.priority).toBe(6)
      })
    })

    it('Asian manufacturers use European URLs (not .com US sites)', () => {
      ASIAN_MANUFACTURER_SOURCES.forEach(source => {
        // Should use .eu or -europe.com or similar European domains
        const isEuropean = source.baseUrl.includes('.eu') || 
                           source.baseUrl.includes('-europe.com') ||
                           source.baseUrl.includes('europe.')
        expect(isEuropean).toBe(true)
      })
    })
  })

  describe('EU_SAFETY_SOURCES', () => {
    it('includes European safety standards', () => {
      const ids = EU_SAFETY_SOURCES.map(s => s.id)
      
      expect(ids).toContain('tuv_info')
      expect(ids).toContain('dekra_info')
      expect(ids).toContain('euro_ncap')
      expect(ids).toContain('ece_regulations')
    })

    it('all safety sources have priority 3', () => {
      EU_SAFETY_SOURCES.forEach(source => {
        expect(source.priority).toBe(3)
      })
    })
  })

  describe('ALL_TRUSTED_SOURCES', () => {
    it('combines AutoDoc and technical sources', () => {
      expect(ALL_TRUSTED_SOURCES.length).toBe(AUTODOC_SOURCES.length + TECHNICAL_SOURCES.length)
    })

    it('does not include any third-party marketplaces', () => {
      const forbidden = ['amazon', 'ebay', 'aliexpress', 'rockauto', 'eurocarparts']
      
      ALL_TRUSTED_SOURCES.forEach(source => {
        forbidden.forEach(marketplace => {
          expect(source.baseUrl.toLowerCase()).not.toContain(marketplace)
        })
      })
    })
  })
})

describe('getAutodocUrl', () => {
  it('returns German URL for de', () => {
    expect(getAutodocUrl('de')).toBe('https://www.autodoc.de')
  })

  it('returns French URL for fr', () => {
    expect(getAutodocUrl('fr')).toBe('https://www.autodoc.fr')
  })

  it('returns UK URL for uk', () => {
    expect(getAutodocUrl('uk')).toBe('https://www.autodoc.co.uk')
  })

  it('returns default URL for unknown country', () => {
    expect(getAutodocUrl('xyz')).toBe('https://www.autodoc.co.uk')
  })

  it('handles case insensitivity', () => {
    expect(getAutodocUrl('DE')).toBe('https://www.autodoc.de')
    expect(getAutodocUrl('Fr')).toBe('https://www.autodoc.fr')
  })
})

describe('getClubAutodocUrl', () => {
  it('returns German Club URL for de', () => {
    expect(getClubAutodocUrl('de')).toBe('https://club.autodoc.de')
  })

  it('returns French Club URL for fr', () => {
    expect(getClubAutodocUrl('fr')).toBe('https://club.autodoc.fr')
  })

  it('returns default Club URL for unknown', () => {
    expect(getClubAutodocUrl('xyz')).toBe('https://club.autodoc.co.uk')
  })
})

describe('generatePartSearchUrl', () => {
  it('generates basic search URL', () => {
    const url = generatePartSearchUrl('brake pads')
    expect(url).toContain('autodoc.co.uk')
    expect(url).toContain('brake%20pads')
  })

  it('generates vehicle-specific URL when make is provided', () => {
    const url = generatePartSearchUrl('brake pads', { make: 'BMW' })
    expect(url).toContain('/car-parts/bmw')
  })

  it('includes model in URL when provided', () => {
    const url = generatePartSearchUrl('brake pads', { make: 'BMW', model: '3 Series' })
    expect(url).toContain('/bmw/')
    expect(url).toContain('3-series')
  })

  it('uses localized URL for different countries', () => {
    const urlDE = generatePartSearchUrl('brake pads', undefined, 'de')
    const urlFR = generatePartSearchUrl('brake pads', undefined, 'fr')
    
    expect(urlDE).toContain('autodoc.de')
    expect(urlFR).toContain('autodoc.fr')
  })
})

describe('generateTutorialUrl', () => {
  it('generates URL for make', () => {
    const url = generateTutorialUrl({ make: 'BMW' })
    expect(url).toContain('club.autodoc')
    expect(url).toContain('/manuals/bmw')
  })

  it('includes model when provided', () => {
    const url = generateTutorialUrl({ make: 'BMW', model: '3 Series' })
    expect(url).toContain('/bmw/3-series')
  })

  it('adds repair type as query param', () => {
    const url = generateTutorialUrl({ make: 'BMW' }, 'brake replacement')
    expect(url).toContain('topic=')
    expect(url).toContain('brake')
  })

  it('uses localized URL', () => {
    const url = generateTutorialUrl({ make: 'BMW' }, undefined, 'de')
    expect(url).toContain('club.autodoc.de')
  })
})

describe('formatSourceCitation', () => {
  it('formats AutoDoc catalog citation', () => {
    const citation = formatSourceCitation('autodoc_catalog', 'Brake Pads Guide')
    expect(citation).toContain('Brake Pads Guide')
    expect(citation).toContain('autodoc')
  })

  it('returns empty string for unknown source', () => {
    const citation = formatSourceCitation('unknown_source')
    expect(citation).toBe('')
  })

  it('uses custom URL when provided', () => {
    const citation = formatSourceCitation('autodoc_catalog', 'Custom Title', 'https://custom.url')
    expect(citation).toContain('https://custom.url')
    expect(citation).toContain('Custom Title')
  })
})
