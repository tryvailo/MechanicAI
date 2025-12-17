/**
 * Maintenance Intervals Database
 * 
 * Service intervals for European vehicles based on manufacturer recommendations.
 * Intervals are in kilometers (km) unless specified otherwise.
 * 
 * Sources:
 * - Official manufacturer service schedules
 * - TÜV recommendations
 * - AutoDoc technical guides
 */

// ============================================
// TYPES
// ============================================

export type MaintenanceItem = {
  id: string;
  name: string;
  nameDE?: string;
  nameFR?: string;
  nameES?: string;
  nameIT?: string;
  nameRU?: string;
  nameUK?: string;
  category: 'oil' | 'filters' | 'brakes' | 'suspension' | 'timing' | 'fluids' | 'electrical' | 'other';
  intervalKm: number;
  intervalMonths: number;
  flexibleInterval?: boolean;  // Can be adjusted based on driving conditions
  critical?: boolean;          // Safety-critical component
  estimatedCostEur?: { min: number; max: number };
  autodocSearchTerm?: string;  // For linking to AutoDoc catalog
};

export type DrivingCondition = 'normal' | 'city' | 'highway' | 'severe';

export type VehicleFuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric';

export type ManufacturerSchedule = {
  make: string;
  defaultIntervalKm: number;       // Base service interval
  defaultIntervalMonths: number;
  longLifeAvailable?: boolean;     // e.g., BMW LongLife, VW LongLife
  longLifeIntervalKm?: number;
  items: MaintenanceItem[];
  notes?: string[];
};

// ============================================
// DEFAULT MAINTENANCE ITEMS (European standards)
// ============================================

export const DEFAULT_MAINTENANCE_ITEMS: MaintenanceItem[] = [
  // OIL & FILTERS
  {
    id: 'engine_oil',
    name: 'Engine Oil & Filter',
    nameDE: 'Motoröl & Filter',
    nameFR: 'Huile moteur & Filtre',
    nameRU: 'Моторное масло и фильтр',
    category: 'oil',
    intervalKm: 15000,
    intervalMonths: 12,
    flexibleInterval: true,
    estimatedCostEur: { min: 50, max: 150 },
    autodocSearchTerm: 'engine oil filter',
  },
  {
    id: 'air_filter',
    name: 'Air Filter',
    nameDE: 'Luftfilter',
    nameFR: 'Filtre à air',
    nameRU: 'Воздушный фильтр',
    category: 'filters',
    intervalKm: 30000,
    intervalMonths: 24,
    estimatedCostEur: { min: 15, max: 50 },
    autodocSearchTerm: 'air filter',
  },
  {
    id: 'cabin_filter',
    name: 'Cabin/Pollen Filter',
    nameDE: 'Innenraumfilter',
    nameFR: 'Filtre habitacle',
    nameRU: 'Салонный фильтр',
    category: 'filters',
    intervalKm: 20000,
    intervalMonths: 12,
    estimatedCostEur: { min: 15, max: 40 },
    autodocSearchTerm: 'cabin filter pollen',
  },
  {
    id: 'fuel_filter',
    name: 'Fuel Filter',
    nameDE: 'Kraftstofffilter',
    nameFR: 'Filtre à carburant',
    nameRU: 'Топливный фильтр',
    category: 'filters',
    intervalKm: 60000,
    intervalMonths: 48,
    estimatedCostEur: { min: 20, max: 80 },
    autodocSearchTerm: 'fuel filter',
  },
  
  // BRAKES
  {
    id: 'brake_pads_front',
    name: 'Front Brake Pads',
    nameDE: 'Bremsbeläge vorne',
    nameFR: 'Plaquettes de frein avant',
    nameRU: 'Передние тормозные колодки',
    category: 'brakes',
    intervalKm: 40000,
    intervalMonths: 36,
    flexibleInterval: true,
    critical: true,
    estimatedCostEur: { min: 40, max: 150 },
    autodocSearchTerm: 'brake pads front',
  },
  {
    id: 'brake_pads_rear',
    name: 'Rear Brake Pads',
    nameDE: 'Bremsbeläge hinten',
    nameFR: 'Plaquettes de frein arrière',
    nameRU: 'Задние тормозные колодки',
    category: 'brakes',
    intervalKm: 60000,
    intervalMonths: 48,
    flexibleInterval: true,
    critical: true,
    estimatedCostEur: { min: 30, max: 120 },
    autodocSearchTerm: 'brake pads rear',
  },
  {
    id: 'brake_discs_front',
    name: 'Front Brake Discs',
    nameDE: 'Bremsscheiben vorne',
    nameFR: 'Disques de frein avant',
    nameRU: 'Передние тормозные диски',
    category: 'brakes',
    intervalKm: 80000,
    intervalMonths: 72,
    flexibleInterval: true,
    critical: true,
    estimatedCostEur: { min: 80, max: 300 },
    autodocSearchTerm: 'brake discs front',
  },
  {
    id: 'brake_fluid',
    name: 'Brake Fluid',
    nameDE: 'Bremsflüssigkeit',
    nameFR: 'Liquide de frein',
    nameRU: 'Тормозная жидкость',
    category: 'fluids',
    intervalKm: 60000,
    intervalMonths: 24,
    critical: true,
    estimatedCostEur: { min: 30, max: 80 },
    autodocSearchTerm: 'brake fluid DOT4',
  },
  
  // TIMING
  {
    id: 'timing_belt',
    name: 'Timing Belt Kit',
    nameDE: 'Zahnriemensatz',
    nameFR: 'Kit distribution',
    nameRU: 'Комплект ГРМ',
    category: 'timing',
    intervalKm: 120000,
    intervalMonths: 72,
    critical: true,
    estimatedCostEur: { min: 300, max: 800 },
    autodocSearchTerm: 'timing belt kit water pump',
  },
  {
    id: 'serpentine_belt',
    name: 'Serpentine/Drive Belt',
    nameDE: 'Keilrippenriemen',
    nameFR: 'Courroie accessoires',
    nameRU: 'Приводной ремень',
    category: 'timing',
    intervalKm: 100000,
    intervalMonths: 60,
    estimatedCostEur: { min: 30, max: 100 },
    autodocSearchTerm: 'serpentine belt',
  },
  
  // SPARK PLUGS (Petrol only)
  {
    id: 'spark_plugs',
    name: 'Spark Plugs',
    nameDE: 'Zündkerzen',
    nameFR: 'Bougies d\'allumage',
    nameRU: 'Свечи зажигания',
    category: 'electrical',
    intervalKm: 60000,
    intervalMonths: 48,
    estimatedCostEur: { min: 30, max: 120 },
    autodocSearchTerm: 'spark plugs',
  },
  
  // FLUIDS
  {
    id: 'coolant',
    name: 'Coolant/Antifreeze',
    nameDE: 'Kühlmittel',
    nameFR: 'Liquide de refroidissement',
    nameRU: 'Антифриз',
    category: 'fluids',
    intervalKm: 100000,
    intervalMonths: 60,
    estimatedCostEur: { min: 40, max: 100 },
    autodocSearchTerm: 'coolant antifreeze',
  },
  {
    id: 'transmission_fluid',
    name: 'Transmission Fluid',
    nameDE: 'Getriebeöl',
    nameFR: 'Huile de boîte',
    nameRU: 'Трансмиссионное масло',
    category: 'fluids',
    intervalKm: 80000,
    intervalMonths: 60,
    estimatedCostEur: { min: 80, max: 200 },
    autodocSearchTerm: 'transmission oil ATF',
  },
  
  // SUSPENSION
  {
    id: 'shock_absorbers',
    name: 'Shock Absorbers',
    nameDE: 'Stoßdämpfer',
    nameFR: 'Amortisseurs',
    nameRU: 'Амортизаторы',
    category: 'suspension',
    intervalKm: 80000,
    intervalMonths: 72,
    flexibleInterval: true,
    estimatedCostEur: { min: 100, max: 400 },
    autodocSearchTerm: 'shock absorbers',
  },
  
  // OTHER
  {
    id: 'wiper_blades',
    name: 'Wiper Blades',
    nameDE: 'Scheibenwischer',
    nameFR: 'Essuie-glaces',
    nameRU: 'Щётки стеклоочистителя',
    category: 'other',
    intervalKm: 20000,
    intervalMonths: 12,
    estimatedCostEur: { min: 15, max: 50 },
    autodocSearchTerm: 'wiper blades',
  },
  {
    id: 'battery',
    name: 'Battery',
    nameDE: 'Batterie',
    nameFR: 'Batterie',
    nameRU: 'Аккумулятор',
    category: 'electrical',
    intervalKm: 100000,
    intervalMonths: 48,
    flexibleInterval: true,
    estimatedCostEur: { min: 80, max: 250 },
    autodocSearchTerm: 'car battery',
  },
];

// ============================================
// MANUFACTURER-SPECIFIC SCHEDULES
// ============================================

export const MANUFACTURER_SCHEDULES: Record<string, ManufacturerSchedule> = {
  // === GERMANY ===
  'BMW': {
    make: 'BMW',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    longLifeAvailable: true,
    longLifeIntervalKm: 30000,
    items: [
      { ...DEFAULT_MAINTENANCE_ITEMS.find(i => i.id === 'engine_oil')!, intervalKm: 15000 },
      { ...DEFAULT_MAINTENANCE_ITEMS.find(i => i.id === 'timing_belt')!, intervalKm: 100000, 
        name: 'Timing Chain (inspection)', intervalMonths: 120 }, // BMW mostly uses chains
    ],
    notes: [
      'BMW Condition Based Service (CBS) monitors actual wear',
      'LongLife oil extends intervals up to 30,000 km',
      'Timing chains typically last vehicle lifetime but should be inspected at 100k km',
    ],
  },
  
  'MERCEDES-BENZ': {
    make: 'Mercedes-Benz',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    longLifeAvailable: true,
    longLifeIntervalKm: 25000,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'ASSYST service indicator calculates intervals based on driving style',
      'Service A (minor) every 15,000 km or 12 months',
      'Service B (major) every 30,000 km or 24 months',
    ],
  },
  
  'VOLKSWAGEN': {
    make: 'Volkswagen',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    longLifeAvailable: true,
    longLifeIntervalKm: 30000,
    items: [
      ...DEFAULT_MAINTENANCE_ITEMS,
      {
        id: 'dsg_service',
        name: 'DSG Transmission Service',
        nameDE: 'DSG-Getriebeservice',
        category: 'fluids',
        intervalKm: 60000,
        intervalMonths: 48,
        estimatedCostEur: { min: 200, max: 400 },
        autodocSearchTerm: 'DSG oil filter',
      },
    ],
    notes: [
      'VW LongLife service requires approved LongLife oils only',
      'DSG gearboxes require oil & filter change every 60,000 km',
      '1.4/1.8/2.0 TSI engines: check timing chain tensioner',
    ],
  },
  
  'AUDI': {
    make: 'Audi',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    longLifeAvailable: true,
    longLifeIntervalKm: 30000,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'Same platform as VW — DSG/S-Tronic service required',
      'Quattro models: check Haldex coupling fluid (if equipped)',
      '2.0 TFSI (EA888): timing chain issues on early models',
    ],
  },
  
  'PORSCHE': {
    make: 'Porsche',
    defaultIntervalKm: 20000,
    defaultIntervalMonths: 24,
    items: [
      { ...DEFAULT_MAINTENANCE_ITEMS.find(i => i.id === 'engine_oil')!, 
        intervalKm: 20000, estimatedCostEur: { min: 150, max: 350 } },
      { ...DEFAULT_MAINTENANCE_ITEMS.find(i => i.id === 'brake_pads_front')!, 
        estimatedCostEur: { min: 200, max: 500 } },
    ],
    notes: [
      'Minor service every 20,000 km or 2 years',
      'Major service every 40,000 km or 4 years',
      'PDK transmission: fluid change every 60,000 km',
    ],
  },
  
  'OPEL': {
    make: 'Opel',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'IntelliLink/OnStar shows service reminders',
      '1.4 Turbo: timing chain inspection at 100k km',
    ],
  },
  
  // === FRANCE ===
  'RENAULT': {
    make: 'Renault',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    longLifeAvailable: true,
    longLifeIntervalKm: 30000,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'Diesel engines: DPF regeneration cycles affect intervals',
      '1.2 TCe: timing chain, check at 80k km',
      '1.5/1.6 dCi: timing belt every 120,000 km or 6 years',
    ],
  },
  
  'PEUGEOT': {
    make: 'Peugeot',
    defaultIntervalKm: 20000,
    defaultIntervalMonths: 24,
    items: [
      { ...DEFAULT_MAINTENANCE_ITEMS.find(i => i.id === 'engine_oil')!, intervalKm: 20000 },
    ],
    notes: [
      'PSA engines: 20,000 km intervals with approved oils',
      'PureTech 1.2: timing belt every 100,000 km or 10 years',
      'BlueHDi diesels: AdBlue refill required',
    ],
  },
  
  'CITROEN': {
    make: 'Citroën',
    defaultIntervalKm: 20000,
    defaultIntervalMonths: 24,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'Same PSA platform as Peugeot',
      'Hydraulic suspension (if equipped): check LHM fluid',
    ],
  },
  
  // === ITALY ===
  'FIAT': {
    make: 'Fiat',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'MultiAir engines: check oil more frequently',
      '1.3 Multijet: timing belt every 100,000 km',
      'Dual-clutch transmission: fluid change at 60k km',
    ],
  },
  
  'ALFA ROMEO': {
    make: 'Alfa Romeo',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'Quadrifoglio models: more frequent brake service',
      'MultiAir engines: higher oil consumption is normal',
    ],
  },
  
  // === SWEDEN ===
  'VOLVO': {
    make: 'Volvo',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    longLifeAvailable: true,
    longLifeIntervalKm: 30000,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'Volvo Service Protocol calculates intervals',
      'T4/T5/T6 engines: timing belt every 120,000 km or 10 years',
      'All-wheel drive: check rear differential fluid',
    ],
  },
  
  // === CZECH ===
  'SKODA': {
    make: 'Škoda',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    longLifeAvailable: true,
    longLifeIntervalKm: 30000,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'VW Group platform — same intervals as VW',
      'DSG service same as VW',
    ],
  },
  
  // === SPAIN ===
  'SEAT': {
    make: 'SEAT',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    longLifeAvailable: true,
    longLifeIntervalKm: 30000,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'VW Group platform — same intervals as VW',
    ],
  },
  
  // === UK ===
  'JAGUAR': {
    make: 'Jaguar',
    defaultIntervalKm: 16000,
    defaultIntervalMonths: 12,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'Ingenium engines: timing chain, long-life',
      'F-PACE, XE, XF: check rear differential fluid',
    ],
  },
  
  'LAND ROVER': {
    make: 'Land Rover',
    defaultIntervalKm: 16000,
    defaultIntervalMonths: 12,
    items: [
      ...DEFAULT_MAINTENANCE_ITEMS,
      {
        id: 'transfer_case',
        name: 'Transfer Case Fluid',
        category: 'fluids',
        intervalKm: 100000,
        intervalMonths: 72,
        estimatedCostEur: { min: 100, max: 200 },
        autodocSearchTerm: 'transfer case oil',
      },
    ],
    notes: [
      'All-terrain vehicles: more frequent checks if off-road use',
      'Air suspension: check compressor and air bags',
    ],
  },
  
  'MINI': {
    make: 'MINI',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    longLifeAvailable: true,
    longLifeIntervalKm: 30000,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'BMW platform — similar to BMW maintenance',
      'Cooper S/JCW: may need more frequent brake service',
    ],
  },
  
  // === ASIAN (Popular in Europe) ===
  'TOYOTA': {
    make: 'Toyota',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    items: [
      { ...DEFAULT_MAINTENANCE_ITEMS.find(i => i.id === 'timing_belt')!, 
        name: 'Timing Chain (inspection)', intervalKm: 150000 }, // Toyota mostly uses chains
    ],
    notes: [
      'Hybrid models: inverter coolant change every 150,000 km',
      'Timing chains typically maintenance-free',
      'CVT transmission: fluid check every 60,000 km',
    ],
  },
  
  'HONDA': {
    make: 'Honda',
    defaultIntervalKm: 12000,
    defaultIntervalMonths: 12,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'Maintenance Minder system calculates intervals',
      'VTEC engines: check valve clearance at 100k km',
    ],
  },
  
  'HYUNDAI': {
    make: 'Hyundai',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      '5-year warranty covers many maintenance items',
      'Dual-clutch transmission (DCT): fluid change at 60k km',
    ],
  },
  
  'KIA': {
    make: 'Kia',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      '7-year warranty in Europe',
      'Same platform as Hyundai',
    ],
  },
  
  'MAZDA': {
    make: 'Mazda',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'SKYACTIV engines: low-viscosity oil required',
      'Timing chains on most models',
    ],
  },
  
  'NISSAN': {
    make: 'Nissan',
    defaultIntervalKm: 15000,
    defaultIntervalMonths: 12,
    items: DEFAULT_MAINTENANCE_ITEMS,
    notes: [
      'CVT transmission: use only Nissan NS-3 fluid',
      'Timing chains on most recent models',
    ],
  },
};

// ============================================
// DRIVING CONDITION MULTIPLIERS
// ============================================

export const CONDITION_MULTIPLIERS: Record<DrivingCondition, number> = {
  'normal': 1.0,
  'highway': 1.2,    // Can extend intervals slightly
  'city': 0.8,       // More frequent service needed
  'severe': 0.6,     // Harsh conditions (dust, extreme temps, towing)
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get maintenance schedule for a specific make
 */
export function getManufacturerSchedule(make: string): ManufacturerSchedule | null {
  const normalizedMake = make.toUpperCase().replace(/[^A-Z]/g, '');
  
  // Handle variations
  const aliases: Record<string, string> = {
    'VW': 'VOLKSWAGEN',
    'MERCEDESBENZ': 'MERCEDESBENZ',
    'MERCEDES': 'MERCEDESBENZ',
    'ALFAROMEO': 'ALFAROMEO',
    'LANDROVER': 'LANDROVER',
  };
  
  const key = aliases[normalizedMake] || normalizedMake;
  
  for (const [scheduleMake, schedule] of Object.entries(MANUFACTURER_SCHEDULES)) {
    if (scheduleMake.toUpperCase().replace(/[^A-Z]/g, '') === key) {
      return schedule;
    }
  }
  
  return null;
}

/**
 * Calculate next service for a specific item based on current mileage
 */
export function calculateNextService(
  item: MaintenanceItem,
  currentMileageKm: number,
  lastServiceMileageKm: number = 0,
  condition: DrivingCondition = 'normal'
): {
  nextServiceKm: number;
  kmRemaining: number;
  percentUsed: number;
  urgency: 'ok' | 'soon' | 'overdue';
} {
  const multiplier = CONDITION_MULTIPLIERS[condition];
  const adjustedInterval = Math.round(item.intervalKm * multiplier);
  
  const nextServiceKm = lastServiceMileageKm + adjustedInterval;
  const kmRemaining = nextServiceKm - currentMileageKm;
  const percentUsed = Math.round(((currentMileageKm - lastServiceMileageKm) / adjustedInterval) * 100);
  
  let urgency: 'ok' | 'soon' | 'overdue' = 'ok';
  if (kmRemaining <= 0) {
    urgency = 'overdue';
  } else if (kmRemaining <= adjustedInterval * 0.1) {
    urgency = 'soon';
  }
  
  return {
    nextServiceKm,
    kmRemaining: Math.max(0, kmRemaining),
    percentUsed: Math.min(100, Math.max(0, percentUsed)),
    urgency,
  };
}

/**
 * Get full maintenance schedule with status for a vehicle
 */
export function getMaintenanceStatus(
  make: string,
  currentMileageKm: number,
  lastServiceMileageKm: number = 0,
  fuelType: VehicleFuelType = 'petrol',
  condition: DrivingCondition = 'normal'
): {
  make: string;
  schedule: ManufacturerSchedule | null;
  items: Array<{
    item: MaintenanceItem;
    status: ReturnType<typeof calculateNextService>;
  }>;
  nextCriticalService: {
    item: MaintenanceItem;
    kmRemaining: number;
  } | null;
} {
  const schedule = getManufacturerSchedule(make);
  const items = schedule?.items || DEFAULT_MAINTENANCE_ITEMS;
  
  // Filter items based on fuel type
  const applicableItems = items.filter(item => {
    // Skip spark plugs for diesel/electric
    if (item.id === 'spark_plugs' && (fuelType === 'diesel' || fuelType === 'electric')) {
      return false;
    }
    // Skip fuel filter for electric
    if (item.id === 'fuel_filter' && fuelType === 'electric') {
      return false;
    }
    return true;
  });
  
  const itemsWithStatus = applicableItems.map(item => ({
    item,
    status: calculateNextService(item, currentMileageKm, lastServiceMileageKm, condition),
  }));
  
  // Sort by urgency and km remaining
  itemsWithStatus.sort((a, b) => {
    const urgencyOrder = { overdue: 0, soon: 1, ok: 2 };
    if (urgencyOrder[a.status.urgency] !== urgencyOrder[b.status.urgency]) {
      return urgencyOrder[a.status.urgency] - urgencyOrder[b.status.urgency];
    }
    return a.status.kmRemaining - b.status.kmRemaining;
  });
  
  // Find next critical service
  const criticalItems = itemsWithStatus.filter(i => i.item.critical);
  const nextCritical = criticalItems.length > 0 ? {
    item: criticalItems[0].item,
    kmRemaining: criticalItems[0].status.kmRemaining,
  } : null;
  
  return {
    make: schedule?.make || make,
    schedule,
    items: itemsWithStatus,
    nextCriticalService: nextCritical,
  };
}

/**
 * Format maintenance item for display in chat
 */
export function formatMaintenanceForChat(
  item: MaintenanceItem,
  status: ReturnType<typeof calculateNextService>,
  language: string = 'en'
): string {
  const name = (language === 'de' && item.nameDE) ? item.nameDE :
               (language === 'fr' && item.nameFR) ? item.nameFR :
               (language === 'ru' && item.nameRU) ? item.nameRU :
               item.name;
  
  const urgencyIcon = status.urgency === 'overdue' ? '🔴' :
                      status.urgency === 'soon' ? '🟡' : '🟢';
  
  const costRange = item.estimatedCostEur 
    ? `€${item.estimatedCostEur.min}-${item.estimatedCostEur.max}`
    : '';
  
  return `${urgencyIcon} **${name}** — ${status.kmRemaining.toLocaleString()} km remaining (${status.percentUsed}% used)${costRange ? ` | Est. ${costRange}` : ''}`;
}
