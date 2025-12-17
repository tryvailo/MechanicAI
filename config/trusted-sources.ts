/**
 * Trusted Sources Configuration for AI Responses
 * 
 * This file defines all trusted sources that the AI can reference.
 * IMPORTANT: For parts/catalog links, only AutoDoc is allowed.
 */

export type SourceCategory = 
  | 'parts_catalog'      // Parts shopping - AutoDoc ONLY
  | 'technical_guide'    // Technical articles and guides
  | 'video_tutorial'     // Video instructions
  | 'manufacturer'       // OEM manufacturer data
  | 'safety'             // Safety standards and regulations
  | 'community';         // Forums and community resources

export type TrustedSource = {
  id: string;
  name: string;
  category: SourceCategory;
  baseUrl: string;
  description: string;
  priority: number;      // 1 = highest priority
  localized?: Record<string, string>;  // Country-specific URLs
};

/**
 * AutoDoc - Primary and ONLY source for parts catalog
 */
export const AUTODOC_SOURCES: TrustedSource[] = [
  {
    id: 'autodoc_catalog',
    name: 'AutoDoc Catalog',
    category: 'parts_catalog',
    baseUrl: 'https://www.autodoc.co.uk',
    description: 'Official AutoDoc parts catalog - search and buy auto parts',
    priority: 1,
    localized: {
      'de': 'https://www.autodoc.de',
      'fr': 'https://www.autodoc.fr',
      'it': 'https://www.autodoc.it',
      'es': 'https://www.autodoc.es',
      'pl': 'https://www.autodoc.pl',
      'nl': 'https://www.autodoc.nl',
      'at': 'https://www.autodoc.at',
      'ch': 'https://www.autodoc.ch',
      'be': 'https://www.autodoc.be',
      'uk': 'https://www.autodoc.co.uk',
      'default': 'https://www.autodoc.co.uk',
    },
  },
  {
    id: 'club_autodoc',
    name: 'Club AutoDoc',
    category: 'video_tutorial',
    baseUrl: 'https://club.autodoc.co.uk',
    description: 'Free repair tutorials and video guides',
    priority: 1,
    localized: {
      'de': 'https://club.autodoc.de',
      'fr': 'https://club.autodoc.fr',
      'it': 'https://club.autodoc.it',
      'es': 'https://club.autodoc.es',
      'pl': 'https://club.autodoc.pl',
      'default': 'https://club.autodoc.co.uk',
    },
  },
  {
    id: 'autodoc_blog',
    name: 'AutoDoc Blog',
    category: 'technical_guide',
    baseUrl: 'https://www.autodoc.co.uk/info',
    description: 'Technical articles and maintenance guides',
    priority: 2,
  },
];

/**
 * Trusted Technical Sources (non-commercial)
 * 
 * PRIORITY SYSTEM:
 * 1 = AutoDoc (primary, always preferred)
 * 2 = European manufacturers (BMW, VW, Mercedes, Audi, Renault, Peugeot, Fiat, Volvo, Škoda)
 * 3 = European safety standards (TÜV, ECE, DEKRA)
 * 4 = European communities (Motor-Talk, etc.)
 * 5 = Asian manufacturers (Toyota, Honda, Hyundai, Kia) — secondary
 * 6 = American manufacturers (Ford, GM, Chrysler) — LAST RESORT ONLY
 */

// ============================================
// EUROPEAN MANUFACTURERS (Priority 2) — PREFERRED
// ============================================
export const EU_MANUFACTURER_SOURCES: TrustedSource[] = [
  // Germany
  {
    id: 'bmw_official',
    name: 'BMW Service',
    category: 'manufacturer',
    baseUrl: 'https://www.bmw.com',
    description: 'BMW official service information (Germany)',
    priority: 2,
  },
  {
    id: 'vw_official',
    name: 'Volkswagen Service',
    category: 'manufacturer',
    baseUrl: 'https://www.volkswagen.com',
    description: 'Volkswagen official service information (Germany)',
    priority: 2,
  },
  {
    id: 'mercedes_official',
    name: 'Mercedes-Benz Service',
    category: 'manufacturer',
    baseUrl: 'https://www.mercedes-benz.com',
    description: 'Mercedes-Benz official service information (Germany)',
    priority: 2,
  },
  {
    id: 'audi_official',
    name: 'Audi Service',
    category: 'manufacturer',
    baseUrl: 'https://www.audi.com',
    description: 'Audi official service information (Germany)',
    priority: 2,
  },
  {
    id: 'porsche_official',
    name: 'Porsche Service',
    category: 'manufacturer',
    baseUrl: 'https://www.porsche.com',
    description: 'Porsche official service information (Germany)',
    priority: 2,
  },
  {
    id: 'opel_official',
    name: 'Opel Service',
    category: 'manufacturer',
    baseUrl: 'https://www.opel.com',
    description: 'Opel official service information (Germany)',
    priority: 2,
  },
  // France
  {
    id: 'renault_official',
    name: 'Renault Service',
    category: 'manufacturer',
    baseUrl: 'https://www.renault.com',
    description: 'Renault official service information (France)',
    priority: 2,
  },
  {
    id: 'peugeot_official',
    name: 'Peugeot Service',
    category: 'manufacturer',
    baseUrl: 'https://www.peugeot.com',
    description: 'Peugeot official service information (France)',
    priority: 2,
  },
  {
    id: 'citroen_official',
    name: 'Citroën Service',
    category: 'manufacturer',
    baseUrl: 'https://www.citroen.com',
    description: 'Citroën official service information (France)',
    priority: 2,
  },
  // Italy
  {
    id: 'fiat_official',
    name: 'Fiat Service',
    category: 'manufacturer',
    baseUrl: 'https://www.fiat.com',
    description: 'Fiat official service information (Italy)',
    priority: 2,
  },
  {
    id: 'alfa_romeo_official',
    name: 'Alfa Romeo Service',
    category: 'manufacturer',
    baseUrl: 'https://www.alfaromeo.com',
    description: 'Alfa Romeo official service information (Italy)',
    priority: 2,
  },
  // Sweden
  {
    id: 'volvo_official',
    name: 'Volvo Service',
    category: 'manufacturer',
    baseUrl: 'https://www.volvocars.com',
    description: 'Volvo official service information (Sweden)',
    priority: 2,
  },
  // Czech Republic
  {
    id: 'skoda_official',
    name: 'Škoda Service',
    category: 'manufacturer',
    baseUrl: 'https://www.skoda-auto.com',
    description: 'Škoda official service information (Czech Republic)',
    priority: 2,
  },
  // Spain
  {
    id: 'seat_official',
    name: 'SEAT Service',
    category: 'manufacturer',
    baseUrl: 'https://www.seat.com',
    description: 'SEAT official service information (Spain)',
    priority: 2,
  },
  // UK
  {
    id: 'jaguar_official',
    name: 'Jaguar Service',
    category: 'manufacturer',
    baseUrl: 'https://www.jaguar.com',
    description: 'Jaguar official service information (UK)',
    priority: 2,
  },
  {
    id: 'land_rover_official',
    name: 'Land Rover Service',
    category: 'manufacturer',
    baseUrl: 'https://www.landrover.com',
    description: 'Land Rover official service information (UK)',
    priority: 2,
  },
  {
    id: 'mini_official',
    name: 'MINI Service',
    category: 'manufacturer',
    baseUrl: 'https://www.mini.com',
    description: 'MINI official service information (UK/Germany)',
    priority: 2,
  },
];

// ============================================
// EUROPEAN SAFETY & STANDARDS (Priority 3)
// ============================================
export const EU_SAFETY_SOURCES: TrustedSource[] = [
  {
    id: 'ece_regulations',
    name: 'ECE Regulations',
    category: 'safety',
    baseUrl: 'https://unece.org/transport/vehicle-regulations',
    description: 'UN ECE vehicle safety regulations (Europe)',
    priority: 3,
  },
  {
    id: 'tuv_info',
    name: 'TÜV',
    category: 'safety',
    baseUrl: 'https://www.tuv.com',
    description: 'TÜV German technical inspection standards',
    priority: 3,
  },
  {
    id: 'dekra_info',
    name: 'DEKRA',
    category: 'safety',
    baseUrl: 'https://www.dekra.com',
    description: 'DEKRA German vehicle inspection organization',
    priority: 3,
  },
  {
    id: 'euro_ncap',
    name: 'Euro NCAP',
    category: 'safety',
    baseUrl: 'https://www.euroncap.com',
    description: 'European New Car Assessment Programme — crash test ratings',
    priority: 3,
  },
];

// ============================================
// EUROPEAN COMMUNITIES (Priority 4)
// ============================================
export const EU_COMMUNITY_SOURCES: TrustedSource[] = [
  {
    id: 'motor_talk',
    name: 'Motor-Talk',
    category: 'community',
    baseUrl: 'https://www.motor-talk.de',
    description: 'Largest German automotive community',
    priority: 4,
  },
];

// ============================================
// ASIAN MANUFACTURERS (Priority 5) — Secondary
// ============================================
export const ASIAN_MANUFACTURER_SOURCES: TrustedSource[] = [
  {
    id: 'toyota_official',
    name: 'Toyota Service',
    category: 'manufacturer',
    baseUrl: 'https://www.toyota-europe.com',
    description: 'Toyota official service (European site preferred)',
    priority: 5,
  },
  {
    id: 'honda_official',
    name: 'Honda Service',
    category: 'manufacturer',
    baseUrl: 'https://www.honda.eu',
    description: 'Honda official service (European site preferred)',
    priority: 5,
  },
  {
    id: 'hyundai_official',
    name: 'Hyundai Service',
    category: 'manufacturer',
    baseUrl: 'https://www.hyundai.eu',
    description: 'Hyundai official service (European site preferred)',
    priority: 5,
  },
  {
    id: 'kia_official',
    name: 'Kia Service',
    category: 'manufacturer',
    baseUrl: 'https://www.kia.eu',
    description: 'Kia official service (European site preferred)',
    priority: 5,
  },
  {
    id: 'mazda_official',
    name: 'Mazda Service',
    category: 'manufacturer',
    baseUrl: 'https://www.mazda.eu',
    description: 'Mazda official service (European site preferred)',
    priority: 5,
  },
  {
    id: 'nissan_official',
    name: 'Nissan Service',
    category: 'manufacturer',
    baseUrl: 'https://www.nissan.eu',
    description: 'Nissan official service (European site preferred)',
    priority: 5,
  },
];

// ============================================
// AMERICAN MANUFACTURERS (Priority 6) — LAST RESORT
// Use ONLY when no European alternative exists
// ============================================
export const US_MANUFACTURER_SOURCES: TrustedSource[] = [
  {
    id: 'ford_official',
    name: 'Ford Service',
    category: 'manufacturer',
    baseUrl: 'https://www.ford.eu',
    description: 'Ford official service (European site preferred)',
    priority: 6,
  },
];

// ============================================
// COMBINED SOURCES — Sorted by priority
// ============================================
export const TECHNICAL_SOURCES: TrustedSource[] = [
  ...EU_MANUFACTURER_SOURCES,
  ...EU_SAFETY_SOURCES,
  ...EU_COMMUNITY_SOURCES,
  ...ASIAN_MANUFACTURER_SOURCES,
  ...US_MANUFACTURER_SOURCES,
].sort((a, b) => a.priority - b.priority);

/**
 * All trusted sources combined
 */
export const ALL_TRUSTED_SOURCES: TrustedSource[] = [
  ...AUTODOC_SOURCES,
  ...TECHNICAL_SOURCES,
];

/**
 * Get AutoDoc URL for a specific country/language
 */
export function getAutodocUrl(countryCode: string = 'uk'): string {
  const autodoc = AUTODOC_SOURCES.find(s => s.id === 'autodoc_catalog');
  if (!autodoc?.localized) return 'https://www.autodoc.co.uk';
  return autodoc.localized[countryCode.toLowerCase()] || autodoc.localized['default'] || 'https://www.autodoc.co.uk';
}

/**
 * Get Club AutoDoc URL for a specific country/language
 */
export function getClubAutodocUrl(countryCode: string = 'uk'): string {
  const club = AUTODOC_SOURCES.find(s => s.id === 'club_autodoc');
  if (!club?.localized) return 'https://club.autodoc.co.uk';
  return club.localized[countryCode.toLowerCase()] || club.localized['default'] || 'https://club.autodoc.co.uk';
}

/**
 * Format source citation for AI response
 */
export function formatSourceCitation(
  sourceId: string,
  articleTitle?: string,
  specificUrl?: string
): string {
  const source = ALL_TRUSTED_SOURCES.find(s => s.id === sourceId);
  if (!source) return '';
  
  const url = specificUrl || source.baseUrl;
  const title = articleTitle || source.name;
  
  return `[${title}](${url})`;
}

/**
 * Sources instruction block for system prompt
 */
export const SOURCES_INSTRUCTION = `
**Trusted Sources & Citations Policy:**

CRITICAL RULE: When recommending parts or products, you MUST ONLY link to AutoDoc:
- Parts catalog: https://www.autodoc.co.uk (or localized: .de, .fr, .it, .es, .pl, .nl)
- Video tutorials: https://club.autodoc.co.uk (or localized versions)
- Technical articles: https://www.autodoc.co.uk/info

NEVER link to:
❌ Amazon, eBay, AliExpress, or any other marketplace
❌ Rock Auto, EuroCarParts, Advance Auto Parts, AutoZone, or competing parts stores
❌ Random unknown websites
❌ American automotive forums (except for US-only vehicles like Mustang, Corvette)

**Source Priority (STRICTLY follow this order):**

🥇 **Priority 1 — AutoDoc (ALWAYS first for parts)**
- autodoc.co.uk / .de / .fr / .it / .es / .pl
- club.autodoc.co.uk (video tutorials)

🥈 **Priority 2 — European Manufacturers (PREFERRED)**
- Germany: BMW, Mercedes-Benz, Audi, Volkswagen, Porsche, Opel
- France: Renault, Peugeot, Citroën, DS
- Italy: Fiat, Alfa Romeo, Lancia, Maserati
- Sweden: Volvo
- Czech: Škoda
- Spain: SEAT
- UK: Jaguar, Land Rover, MINI

🥉 **Priority 3 — European Safety Standards**
- TÜV (tuv.com) — German inspection
- DEKRA (dekra.com) — German inspection
- Euro NCAP (euroncap.com) — European crash tests
- ECE/UN regulations (unece.org)

4️⃣ **Priority 4 — Asian Manufacturers (Use European sites!)**
- Toyota Europe (toyota-europe.com) — NOT toyota.com
- Honda Europe (honda.eu) — NOT honda.com
- Hyundai Europe (hyundai.eu)
- Kia Europe (kia.eu)
- Mazda Europe (mazda.eu)
- Nissan Europe (nissan.eu)

⚠️ **Priority 5 — American Sources (LAST RESORT ONLY)**
Only use for vehicles sold primarily in the US (Mustang, Corvette, RAM, etc.):
- Ford Europe (ford.eu) — prefer European site
- GM/Chevrolet — avoid if European alternative exists

**Source Format:**
When providing sources, use this format at the END of your response:

📚 **Sources:**
- [AutoDoc: Brake Pad Guide](https://www.autodoc.co.uk/info/brake-pads) — How to choose brake pads
- [Club AutoDoc: BMW 3 Series Brake Replacement](https://club.autodoc.co.uk) — Step-by-step video
- BMW Service Manual — Official torque specifications

**When to Include Sources:**
Add sources ONLY for:
1. Technical diagnostics with specific causes
2. Part recommendations (always link to AutoDoc catalog)
3. Repair procedures with torque specs or technical details
4. Safety-critical recommendations
5. Manufacturer-specific maintenance intervals

Do NOT add sources for:
- Simple greetings or casual chat
- Basic questions ("what's a spark plug?")
- Follow-up clarifications
- General tips without technical depth
`;

/**
 * Generate part search URL for AutoDoc
 */
export function generatePartSearchUrl(
  partName: string,
  vehicleInfo?: { make?: string; model?: string; year?: string },
  countryCode: string = 'uk'
): string {
  const baseUrl = getAutodocUrl(countryCode);
  const searchQuery = encodeURIComponent(partName);
  
  // Basic search URL
  let url = `${baseUrl}/search?query=${searchQuery}`;
  
  // If vehicle info is available, suggest searching in catalog
  if (vehicleInfo?.make) {
    const make = encodeURIComponent(vehicleInfo.make.toLowerCase());
    url = `${baseUrl}/car-parts/${make}`;
    
    if (vehicleInfo.model) {
      const model = encodeURIComponent(vehicleInfo.model.toLowerCase().replace(/\s+/g, '-'));
      url += `/${model}`;
    }
  }
  
  return url;
}

/**
 * Generate video tutorial URL for Club AutoDoc
 */
export function generateTutorialUrl(
  vehicleInfo: { make: string; model?: string },
  repairType?: string,
  countryCode: string = 'uk'
): string {
  const baseUrl = getClubAutodocUrl(countryCode);
  const make = encodeURIComponent(vehicleInfo.make.toLowerCase());
  
  let url = `${baseUrl}/manuals/${make}`;
  
  if (vehicleInfo.model) {
    const model = encodeURIComponent(vehicleInfo.model.toLowerCase().replace(/\s+/g, '-'));
    url += `/${model}`;
  }
  
  if (repairType) {
    url += `?topic=${encodeURIComponent(repairType)}`;
  }
  
  return url;
}
