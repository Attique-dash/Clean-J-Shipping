// Delivery time estimation based on service mode and destination
export interface DeliveryEstimate {
  estimatedDays: number;
  estimatedDate: Date;
  serviceMode: 'air' | 'ocean' | 'local';
  originCountry: string;
  destinationCountry: string;
  isExpress: boolean;
}

/**
 * Calculate estimated delivery time
 */
export function estimateDeliveryTime(
  serviceMode: 'air' | 'ocean' | 'local',
  originCountry: string,
  destinationCountry: string,
  isExpress: boolean = false,
  startDate: Date = new Date()
): DeliveryEstimate {
  let baseDays = 0;
  
  // Base delivery times by service mode
  if (serviceMode === 'local') {
    baseDays = isExpress ? 1 : 2; // Same day or next day for local
  } else if (serviceMode === 'air') {
    if (originCountry === destinationCountry) {
      baseDays = isExpress ? 2 : 4; // Domestic air: 2-4 days
    } else {
      // International air
      const isSameRegion = isSameRegionCheck(originCountry, destinationCountry);
      baseDays = isSameRegion 
        ? (isExpress ? 3 : 7)  // Same region: 3-7 days
        : (isExpress ? 5 : 14); // Different region: 5-14 days
    }
  } else if (serviceMode === 'ocean') {
    if (originCountry === destinationCountry) {
      baseDays = isExpress ? 7 : 14; // Domestic ocean: 7-14 days
    } else {
      // International ocean
      const isSameRegion = isSameRegionCheck(originCountry, destinationCountry);
      baseDays = isSameRegion 
        ? (isExpress ? 14 : 30)  // Same region: 14-30 days
        : (isExpress ? 21 : 45); // Different region: 21-45 days
    }
  }
  
  // Add customs clearance time for international (2-5 days)
  if (originCountry !== destinationCountry) {
    baseDays += isExpress ? 2 : 5;
  }
  
  // Calculate estimated date
  const estimatedDate = new Date(startDate);
  estimatedDate.setDate(estimatedDate.getDate() + baseDays);
  
  return {
    estimatedDays: baseDays,
    estimatedDate,
    serviceMode,
    originCountry,
    destinationCountry,
    isExpress
  };
}

/**
 * Check if two countries are in the same region
 */
function isSameRegionCheck(country1: string, country2: string): boolean {
  // Caribbean countries
  const caribbean = ['JM', 'BB', 'TT', 'BS', 'HT', 'DO', 'CU', 'PR', 'GD', 'LC', 'VC', 'AG', 'DM', 'KN'];
  
  // North America
  const northAmerica = ['US', 'CA', 'MX'];
  
  // Europe
  const europe = ['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI'];
  
  // Asia
  const asia = ['CN', 'JP', 'KR', 'IN', 'SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'TW', 'HK'];
  
  const country1Upper = country1.toUpperCase();
  const country2Upper = country2.toUpperCase();
  
  const regions = [caribbean, northAmerica, europe, asia];
  
  for (const region of regions) {
    if (region.includes(country1Upper) && region.includes(country2Upper)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get delivery estimate with formatted output
 */
export function getFormattedDeliveryEstimate(estimate: DeliveryEstimate): string {
  const dateStr = estimate.estimatedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `${estimate.estimatedDays} business day${estimate.estimatedDays !== 1 ? 's' : ''} (Estimated: ${dateStr})`;
}

