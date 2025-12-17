import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MAINTENANCE_ITEMS,
  MANUFACTURER_SCHEDULES,
  CONDITION_MULTIPLIERS,
  getManufacturerSchedule,
  calculateNextService,
  getMaintenanceStatus,
} from '@/config/maintenance-intervals';

describe('Maintenance Intervals Configuration', () => {
  describe('DEFAULT_MAINTENANCE_ITEMS', () => {
    it('contains essential maintenance items', () => {
      const ids = DEFAULT_MAINTENANCE_ITEMS.map(i => i.id);
      
      expect(ids).toContain('engine_oil');
      expect(ids).toContain('air_filter');
      expect(ids).toContain('brake_pads_front');
      expect(ids).toContain('timing_belt');
      expect(ids).toContain('brake_fluid');
    });

    it('all items have required fields', () => {
      DEFAULT_MAINTENANCE_ITEMS.forEach(item => {
        expect(item.id).toBeDefined();
        expect(item.name).toBeDefined();
        expect(item.category).toBeDefined();
        expect(item.intervalKm).toBeGreaterThan(0);
        expect(item.intervalMonths).toBeGreaterThan(0);
      });
    });

    it('critical items are marked correctly', () => {
      const timingBelt = DEFAULT_MAINTENANCE_ITEMS.find(i => i.id === 'timing_belt');
      const brakeFluid = DEFAULT_MAINTENANCE_ITEMS.find(i => i.id === 'brake_fluid');
      const wiperBlades = DEFAULT_MAINTENANCE_ITEMS.find(i => i.id === 'wiper_blades');
      
      expect(timingBelt?.critical).toBe(true);
      expect(brakeFluid?.critical).toBe(true);
      expect(wiperBlades?.critical).toBeFalsy();
    });

    it('all items have autodocSearchTerm for linking', () => {
      DEFAULT_MAINTENANCE_ITEMS.forEach(item => {
        expect(item.autodocSearchTerm).toBeDefined();
        expect(item.autodocSearchTerm!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('MANUFACTURER_SCHEDULES', () => {
    it('includes all major European manufacturers', () => {
      const makes = Object.keys(MANUFACTURER_SCHEDULES);
      
      // Germany
      expect(makes).toContain('BMW');
      expect(makes).toContain('MERCEDES-BENZ');
      expect(makes).toContain('VOLKSWAGEN');
      expect(makes).toContain('AUDI');
      expect(makes).toContain('PORSCHE');
      
      // France
      expect(makes).toContain('RENAULT');
      expect(makes).toContain('PEUGEOT');
      expect(makes).toContain('CITROEN');
      
      // Italy
      expect(makes).toContain('FIAT');
      expect(makes).toContain('ALFA ROMEO');
      
      // Sweden
      expect(makes).toContain('VOLVO');
      
      // Czech
      expect(makes).toContain('SKODA');
    });

    it('all schedules have valid intervals', () => {
      Object.values(MANUFACTURER_SCHEDULES).forEach(schedule => {
        expect(schedule.defaultIntervalKm).toBeGreaterThan(0);
        expect(schedule.defaultIntervalMonths).toBeGreaterThan(0);
        
        if (schedule.longLifeAvailable) {
          expect(schedule.longLifeIntervalKm).toBeGreaterThan(schedule.defaultIntervalKm);
        }
      });
    });

    it('BMW has LongLife service option', () => {
      const bmw = MANUFACTURER_SCHEDULES['BMW'];
      expect(bmw.longLifeAvailable).toBe(true);
      expect(bmw.longLifeIntervalKm).toBe(30000);
    });

    it('manufacturers have helpful notes', () => {
      Object.values(MANUFACTURER_SCHEDULES).forEach(schedule => {
        expect(schedule.notes).toBeDefined();
        expect(schedule.notes!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('CONDITION_MULTIPLIERS', () => {
    it('has correct multipliers', () => {
      expect(CONDITION_MULTIPLIERS.normal).toBe(1.0);
      expect(CONDITION_MULTIPLIERS.highway).toBeGreaterThan(1.0);
      expect(CONDITION_MULTIPLIERS.city).toBeLessThan(1.0);
      expect(CONDITION_MULTIPLIERS.severe).toBeLessThan(CONDITION_MULTIPLIERS.city);
    });
  });
});

describe('getManufacturerSchedule', () => {
  it('finds schedule by exact make name', () => {
    const bmw = getManufacturerSchedule('BMW');
    expect(bmw).toBeDefined();
    expect(bmw?.make).toBe('BMW');
  });

  it('handles case insensitivity', () => {
    const bmw = getManufacturerSchedule('bmw');
    expect(bmw).toBeDefined();
    expect(bmw?.make).toBe('BMW');
  });

  it('handles VW alias', () => {
    const vw = getManufacturerSchedule('VW');
    expect(vw).toBeDefined();
    expect(vw?.make).toBe('Volkswagen');
  });

  it('handles Mercedes alias', () => {
    const mercedes = getManufacturerSchedule('Mercedes-Benz');
    expect(mercedes).toBeDefined();
    expect(mercedes?.make).toBe('Mercedes-Benz');
  });

  it('returns null for unknown make', () => {
    const unknown = getManufacturerSchedule('UnknownBrand');
    expect(unknown).toBeNull();
  });
});

describe('calculateNextService', () => {
  const oilChange = DEFAULT_MAINTENANCE_ITEMS.find(i => i.id === 'engine_oil')!;

  it('calculates next service correctly', () => {
    const result = calculateNextService(oilChange, 10000, 0, 'normal');
    
    expect(result.nextServiceKm).toBe(15000);
    expect(result.kmRemaining).toBe(5000);
    expect(result.percentUsed).toBe(67);
    expect(result.urgency).toBe('ok');
  });

  it('marks overdue items correctly', () => {
    const result = calculateNextService(oilChange, 20000, 0, 'normal');
    
    expect(result.kmRemaining).toBe(0);
    expect(result.urgency).toBe('overdue');
  });

  it('marks items due soon correctly', () => {
    const result = calculateNextService(oilChange, 14000, 0, 'normal');
    
    expect(result.kmRemaining).toBe(1000);
    expect(result.urgency).toBe('soon');
  });

  it('adjusts for city driving conditions', () => {
    const normalResult = calculateNextService(oilChange, 10000, 0, 'normal');
    const cityResult = calculateNextService(oilChange, 10000, 0, 'city');
    
    // City driving should have less km remaining
    expect(cityResult.kmRemaining).toBeLessThan(normalResult.kmRemaining);
  });

  it('adjusts for highway driving conditions', () => {
    const normalResult = calculateNextService(oilChange, 10000, 0, 'normal');
    const highwayResult = calculateNextService(oilChange, 10000, 0, 'highway');
    
    // Highway driving should have more km remaining
    expect(highwayResult.kmRemaining).toBeGreaterThan(normalResult.kmRemaining);
  });
});

describe('getMaintenanceStatus', () => {
  it('returns full maintenance status for a vehicle', () => {
    const status = getMaintenanceStatus('BMW', 50000, 40000, 'petrol', 'normal');
    
    expect(status.make).toBe('BMW');
    expect(status.items.length).toBeGreaterThan(0);
  });

  it('filters spark plugs for diesel vehicles', () => {
    // Use a generic car (not BMW which may have custom items)
    const petrolStatus = getMaintenanceStatus('UnknownBrand', 50000, 40000, 'petrol', 'normal');
    const dieselStatus = getMaintenanceStatus('UnknownBrand', 50000, 40000, 'diesel', 'normal');
    
    const petrolHasSparkPlugs = petrolStatus.items.some(i => i.item.id === 'spark_plugs');
    const dieselHasSparkPlugs = dieselStatus.items.some(i => i.item.id === 'spark_plugs');
    
    expect(petrolHasSparkPlugs).toBe(true);
    expect(dieselHasSparkPlugs).toBe(false);
  });

  it('filters fuel filter for electric vehicles', () => {
    // Use a generic car (not BMW which may have custom items)
    const petrolStatus = getMaintenanceStatus('UnknownBrand', 50000, 40000, 'petrol', 'normal');
    const electricStatus = getMaintenanceStatus('UnknownBrand', 50000, 40000, 'electric', 'normal');
    
    const petrolHasFuelFilter = petrolStatus.items.some(i => i.item.id === 'fuel_filter');
    const electricHasFuelFilter = electricStatus.items.some(i => i.item.id === 'fuel_filter');
    
    expect(petrolHasFuelFilter).toBe(true);
    expect(electricHasFuelFilter).toBe(false);
  });

  it('sorts items by urgency', () => {
    const status = getMaintenanceStatus('BMW', 100000, 0, 'petrol', 'normal');
    
    // First items should be overdue or soon
    const firstItem = status.items[0];
    expect(['overdue', 'soon']).toContain(firstItem.status.urgency);
  });

  it('identifies next critical service', () => {
    const status = getMaintenanceStatus('BMW', 50000, 40000, 'petrol', 'normal');
    
    if (status.nextCriticalService) {
      expect(status.nextCriticalService.item.critical).toBe(true);
    }
  });

  it('uses default items for unknown manufacturer', () => {
    const status = getMaintenanceStatus('UnknownBrand', 50000, 40000, 'petrol', 'normal');
    
    expect(status.items.length).toBeGreaterThan(0);
    expect(status.schedule).toBeNull();
  });
});
