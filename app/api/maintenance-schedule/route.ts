import { NextRequest, NextResponse } from 'next/server';
import {
  getMaintenanceStatus,
  getManufacturerSchedule,
  MANUFACTURER_SCHEDULES,
  type DrivingCondition,
  type VehicleFuelType,
} from '@/config/maintenance-intervals';

// Request types
type MaintenanceRequest = {
  make: string;
  model?: string;
  year?: number;
  currentMileageKm: number;
  lastServiceMileageKm?: number;
  fuelType?: VehicleFuelType;
  drivingCondition?: DrivingCondition;
};

// Response types
type MaintenanceResponse = {
  success: true;
  data: {
    make: string;
    model?: string;
    currentMileageKm: number;
    serviceInterval: {
      defaultKm: number;
      defaultMonths: number;
      longLifeAvailable: boolean;
      longLifeKm?: number;
    };
    items: Array<{
      id: string;
      name: string;
      category: string;
      intervalKm: number;
      critical: boolean;
      status: {
        nextServiceKm: number;
        kmRemaining: number;
        percentUsed: number;
        urgency: 'ok' | 'soon' | 'overdue';
      };
      estimatedCost?: { min: number; max: number };
      autodocLink?: string;
    }>;
    summary: {
      overdueCount: number;
      soonCount: number;
      okCount: number;
      nextCriticalService?: {
        name: string;
        kmRemaining: number;
      };
    };
    notes?: string[];
  };
} | {
  success: false;
  error: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MaintenanceRequest;

    // Validate required fields
    if (!body.make || typeof body.make !== 'string') {
      return NextResponse.json<MaintenanceResponse>(
        { success: false, error: 'Vehicle make is required' },
        { status: 400 }
      );
    }

    if (typeof body.currentMileageKm !== 'number' || body.currentMileageKm < 0) {
      return NextResponse.json<MaintenanceResponse>(
        { success: false, error: 'Valid currentMileageKm is required' },
        { status: 400 }
      );
    }

    const make = body.make.trim();
    const currentMileageKm = Math.round(body.currentMileageKm);
    const lastServiceMileageKm = body.lastServiceMileageKm ?? 0;
    const fuelType = body.fuelType ?? 'petrol';
    const drivingCondition = body.drivingCondition ?? 'normal';

    // Get maintenance status
    const status = getMaintenanceStatus(
      make,
      currentMileageKm,
      lastServiceMileageKm,
      fuelType,
      drivingCondition
    );

    const schedule = getManufacturerSchedule(make);

    // Build AutoDoc search URLs
    const buildAutodocLink = (searchTerm?: string) => {
      if (!searchTerm) return undefined;
      const query = encodeURIComponent(searchTerm);
      return `https://www.autodoc.co.uk/search?query=${query}`;
    };

    // Transform items for response
    const items = status.items.map(({ item, status: itemStatus }) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      intervalKm: item.intervalKm,
      critical: item.critical ?? false,
      status: itemStatus,
      estimatedCost: item.estimatedCostEur,
      autodocLink: buildAutodocLink(item.autodocSearchTerm),
    }));

    // Calculate summary
    const overdueCount = items.filter(i => i.status.urgency === 'overdue').length;
    const soonCount = items.filter(i => i.status.urgency === 'soon').length;
    const okCount = items.filter(i => i.status.urgency === 'ok').length;

    const response: MaintenanceResponse = {
      success: true,
      data: {
        make: status.make,
        model: body.model,
        currentMileageKm,
        serviceInterval: {
          defaultKm: schedule?.defaultIntervalKm ?? 15000,
          defaultMonths: schedule?.defaultIntervalMonths ?? 12,
          longLifeAvailable: schedule?.longLifeAvailable ?? false,
          longLifeKm: schedule?.longLifeIntervalKm,
        },
        items,
        summary: {
          overdueCount,
          soonCount,
          okCount,
          nextCriticalService: status.nextCriticalService ? {
            name: status.nextCriticalService.item.name,
            kmRemaining: status.nextCriticalService.kmRemaining,
          } : undefined,
        },
        notes: schedule?.notes,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<MaintenanceResponse>(
      { success: false, error: `Failed to get maintenance schedule: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// GET: List supported manufacturers
export async function GET() {
  const manufacturers = Object.keys(MANUFACTURER_SCHEDULES).sort();
  
  return NextResponse.json({
    success: true,
    manufacturers,
    count: manufacturers.length,
  });
}
