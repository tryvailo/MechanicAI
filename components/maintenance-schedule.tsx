'use client';

import { useState } from 'react';
import { Wrench, AlertTriangle, CheckCircle, Clock, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  useMaintenanceSchedule,
  getUrgencyColor,
  type MaintenanceScheduleData,
  type MaintenanceRequestParams,
} from '@/hooks/useMaintenanceSchedule';

interface MaintenanceScheduleProps {
  initialData?: MaintenanceScheduleData;
  onClose?: () => void;
}

export function MaintenanceScheduleCard({ 
  item 
}: { 
  item: MaintenanceScheduleData['items'][0] 
}) {
  const urgencyColor = getUrgencyColor(item.status.urgency);
  const UrgencyIcon = item.status.urgency === 'overdue' 
    ? AlertTriangle 
    : item.status.urgency === 'soon' 
      ? Clock 
      : CheckCircle;

  return (
    <div className={`p-3 rounded-lg border ${urgencyColor} border-current/20`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <UrgencyIcon className="h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">{item.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
          </div>
        </div>
        {item.critical && (
          <span className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded font-medium">
            SAFETY
          </span>
        )}
      </div>
      
      <div className="mt-2">
        <div className="flex justify-between text-xs mb-1">
          <span>
            {item.status.urgency === 'overdue' 
              ? `Overdue by ${Math.abs(item.status.kmRemaining).toLocaleString()} km`
              : `${item.status.kmRemaining.toLocaleString()} km remaining`
            }
          </span>
          <span>{item.status.percentUsed}%</span>
        </div>
        <Progress 
          value={Math.min(100, item.status.percentUsed)} 
          className="h-1.5"
        />
      </div>
      
      <div className="mt-2 flex items-center justify-between">
        {item.estimatedCost && (
          <span className="text-xs text-muted-foreground">
            €{item.estimatedCost.min}-{item.estimatedCost.max}
          </span>
        )}
        {item.autodocLink && (
          <a 
            href={item.autodocLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            Find part <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export function MaintenanceScheduleView({ 
  data,
  expanded = false,
}: { 
  data: MaintenanceScheduleData;
  expanded?: boolean;
}) {
  const [showAll, setShowAll] = useState(expanded);
  
  const overdueItems = data.items.filter(i => i.status.urgency === 'overdue');
  const soonItems = data.items.filter(i => i.status.urgency === 'soon');
  const okItems = data.items.filter(i => i.status.urgency === 'ok');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Wrench className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">
          Maintenance Schedule — {data.make}{data.model ? ` ${data.model}` : ''}
        </h3>
      </div>
      
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
          <p className="text-2xl font-bold text-red-600">{data.summary.overdueCount}</p>
          <p className="text-xs text-red-600">Overdue</p>
        </div>
        <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
          <p className="text-2xl font-bold text-yellow-600">{data.summary.soonCount}</p>
          <p className="text-xs text-yellow-600">Due Soon</p>
        </div>
        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
          <p className="text-2xl font-bold text-green-600">{data.summary.okCount}</p>
          <p className="text-xs text-green-600">OK</p>
        </div>
      </div>
      
      {/* Next Critical Service */}
      {data.summary.nextCriticalService && (
        <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
              Next Safety Service: {data.summary.nextCriticalService.name}
            </p>
          </div>
          <p className="text-xs text-orange-600 mt-1">
            In {data.summary.nextCriticalService.kmRemaining.toLocaleString()} km
          </p>
        </div>
      )}
      
      {/* Overdue Items */}
      {overdueItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-600 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Overdue ({overdueItems.length})
          </h4>
          {overdueItems.map(item => (
            <MaintenanceScheduleCard key={item.id} item={item} />
          ))}
        </div>
      )}
      
      {/* Soon Items */}
      {soonItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-yellow-600 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Due Soon ({soonItems.length})
          </h4>
          {soonItems.map(item => (
            <MaintenanceScheduleCard key={item.id} item={item} />
          ))}
        </div>
      )}
      
      {/* OK Items (collapsible) */}
      {okItems.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-between text-sm font-medium text-green-600 hover:text-green-700"
          >
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              OK ({okItems.length})
            </span>
            {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showAll && okItems.map(item => (
            <MaintenanceScheduleCard key={item.id} item={item} />
          ))}
        </div>
      )}
      
      {/* Notes */}
      {data.notes && data.notes.length > 0 && (
        <div className="p-3 rounded-lg bg-muted text-xs space-y-1">
          <p className="font-medium">💡 Tips for {data.make}:</p>
          {data.notes.slice(0, 3).map((note, i) => (
            <p key={i} className="text-muted-foreground">• {note}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export function MaintenanceScheduleForm({
  onResult,
}: {
  onResult: (data: MaintenanceScheduleData) => void;
}) {
  const { isLoading, error, getSchedule } = useMaintenanceSchedule();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [mileage, setMileage] = useState('');
  const [lastService, setLastService] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const params: MaintenanceRequestParams = {
      make: make.trim(),
      model: model.trim() || undefined,
      currentMileageKm: parseInt(mileage) || 0,
      lastServiceMileageKm: parseInt(lastService) || 0,
    };

    const data = await getSchedule(params);
    if (data) {
      onResult(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Make (e.g., BMW)"
          value={make}
          onChange={(e) => setMake(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-border bg-background"
          required
        />
        <input
          type="text"
          placeholder="Model (optional)"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-border bg-background"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          placeholder="Current mileage (km)"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-border bg-background"
          required
        />
        <input
          type="number"
          placeholder="Last service (km)"
          value={lastService}
          onChange={(e) => setLastService(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-border bg-background"
        />
      </div>
      
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Checking...' : 'Check Maintenance Schedule'}
      </Button>
    </form>
  );
}

export default function MaintenanceSchedule({ initialData, onClose }: MaintenanceScheduleProps) {
  const [data, setData] = useState<MaintenanceScheduleData | null>(initialData || null);

  return (
    <div className="p-4 bg-card rounded-xl border border-border shadow-lg max-w-md mx-auto">
      {data ? (
        <>
          <MaintenanceScheduleView data={data} />
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => setData(null)}
          >
            Check Another Vehicle
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Maintenance Schedule</h3>
          </div>
          <MaintenanceScheduleForm onResult={setData} />
        </>
      )}
    </div>
  );
}
