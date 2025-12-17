'use client';

import { useState, useCallback } from 'react';
import type { DrivingCondition, VehicleFuelType } from '@/config/maintenance-intervals';

export type MaintenanceItem = {
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
};

export type MaintenanceScheduleData = {
  make: string;
  model?: string;
  currentMileageKm: number;
  serviceInterval: {
    defaultKm: number;
    defaultMonths: number;
    longLifeAvailable: boolean;
    longLifeKm?: number;
  };
  items: MaintenanceItem[];
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

type MaintenanceScheduleState = {
  isLoading: boolean;
  data: MaintenanceScheduleData | null;
  error: string | null;
};

export type MaintenanceRequestParams = {
  make: string;
  model?: string;
  year?: number;
  currentMileageKm: number;
  lastServiceMileageKm?: number;
  fuelType?: VehicleFuelType;
  drivingCondition?: DrivingCondition;
};

export function useMaintenanceSchedule() {
  const [state, setState] = useState<MaintenanceScheduleState>({
    isLoading: false,
    data: null,
    error: null,
  });

  const getSchedule = useCallback(async (params: MaintenanceRequestParams): Promise<MaintenanceScheduleData | null> => {
    setState({ isLoading: true, data: null, error: null });

    try {
      const response = await fetch('/api/maintenance-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (result.success) {
        setState({ isLoading: false, data: result.data, error: null });
        return result.data;
      } else {
        setState({ isLoading: false, data: null, error: result.error });
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch maintenance schedule';
      setState({ isLoading: false, data: null, error: errorMessage });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, data: null, error: null });
  }, []);

  return {
    ...state,
    getSchedule,
    reset,
  };
}

/**
 * Format maintenance schedule as a message for the chat
 */
export function formatMaintenanceMessage(data: MaintenanceScheduleData): string {
  const { make, model, currentMileageKm, items, summary, notes } = data;
  
  let message = `🔧 **Maintenance Schedule for ${make}${model ? ` ${model}` : ''}**\n`;
  message += `📏 Current mileage: **${currentMileageKm.toLocaleString()} km**\n\n`;
  
  // Summary
  if (summary.overdueCount > 0) {
    message += `🔴 **${summary.overdueCount} overdue** service(s)!\n`;
  }
  if (summary.soonCount > 0) {
    message += `🟡 **${summary.soonCount}** service(s) due soon\n`;
  }
  message += `🟢 ${summary.okCount} items OK\n\n`;
  
  // Urgent items first
  const urgentItems = items.filter(i => i.status.urgency !== 'ok');
  if (urgentItems.length > 0) {
    message += `**⚠️ Attention Required:**\n`;
    urgentItems.forEach(item => {
      const icon = item.status.urgency === 'overdue' ? '🔴' : '🟡';
      const cost = item.estimatedCost ? ` (€${item.estimatedCost.min}-${item.estimatedCost.max})` : '';
      message += `${icon} **${item.name}** — `;
      if (item.status.urgency === 'overdue') {
        message += `OVERDUE by ${Math.abs(item.status.kmRemaining).toLocaleString()} km${cost}\n`;
      } else {
        message += `${item.status.kmRemaining.toLocaleString()} km remaining${cost}\n`;
      }
    });
    message += '\n';
  }
  
  // Next critical service
  if (summary.nextCriticalService) {
    message += `🛑 **Next Safety-Critical Service:**\n`;
    message += `${summary.nextCriticalService.name} in ${summary.nextCriticalService.kmRemaining.toLocaleString()} km\n\n`;
  }
  
  // Full schedule (condensed)
  message += `**📋 Full Schedule:**\n`;
  const okItems = items.filter(i => i.status.urgency === 'ok').slice(0, 5);
  okItems.forEach(item => {
    message += `🟢 ${item.name} — ${item.status.kmRemaining.toLocaleString()} km\n`;
  });
  
  if (items.filter(i => i.status.urgency === 'ok').length > 5) {
    message += `... and ${items.filter(i => i.status.urgency === 'ok').length - 5} more items\n`;
  }
  
  // Notes
  if (notes && notes.length > 0) {
    message += `\n💡 **Tips for ${make}:**\n`;
    notes.slice(0, 2).forEach(note => {
      message += `- ${note}\n`;
    });
  }
  
  return message;
}

/**
 * Get urgency color for UI
 */
export function getUrgencyColor(urgency: 'ok' | 'soon' | 'overdue'): string {
  switch (urgency) {
    case 'overdue':
      return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    case 'soon':
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    case 'ok':
      return 'text-green-600 bg-green-100 dark:bg-green-900/30';
  }
}

/**
 * Get urgency icon
 */
export function getUrgencyIcon(urgency: 'ok' | 'soon' | 'overdue'): string {
  switch (urgency) {
    case 'overdue':
      return '🔴';
    case 'soon':
      return '🟡';
    case 'ok':
      return '🟢';
  }
}
