export type GooglePriceLevel =
  | 'PRICE_LEVEL_UNSPECIFIED'
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE';

export type PriceLevelDisplay = {
  icon: string;
  label: string;
  colorClass: string;
};

export function getPriceLevelDisplay(priceLevel: string | null, showUnknown = false): PriceLevelDisplay | null {
  if (!priceLevel || priceLevel === 'PRICE_LEVEL_UNSPECIFIED') {
    if (showUnknown) {
      return {
        icon: '🅿️',
        label: 'Paid',
        colorClass: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
      };
    }
    return null;
  }

  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE':
      return {
        icon: '💚',
        label: 'Free',
        colorClass: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
      };
    case 'PRICE_LEVEL_INEXPENSIVE':
      return {
        icon: '💛',
        label: '€',
        colorClass: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
      };
    case 'PRICE_LEVEL_MODERATE':
      return {
        icon: '🟠',
        label: '€€',
        colorClass: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
      };
    case 'PRICE_LEVEL_EXPENSIVE':
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return {
        icon: '🔴',
        label: '€€€',
        colorClass: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
      };
    default:
      return null;
  }
}

export function formatDuration(durationString: string): string {
  const seconds = parseInt(durationString.replace('s', ''), 10);
  if (isNaN(seconds)) return durationString;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}min`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
