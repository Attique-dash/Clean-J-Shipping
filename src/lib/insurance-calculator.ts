// Insurance calculator for packages
export interface InsuranceCalculation {
  basePremium: number;
  valueBasedPremium: number;
  serviceModeMultiplier: number;
  fragileMultiplier: number;
  hazardousMultiplier: number;
  totalPremium: number;
  currency: string;
}

/**
 * Calculate insurance premium for a package
 */
export function calculateInsurance(
  declaredValue: number,
  serviceMode: 'air' | 'ocean' | 'local' = 'air',
  isFragile: boolean = false,
  isHazardous: boolean = false,
  currency: string = 'USD'
): InsuranceCalculation {
  // Base premium (minimum insurance cost)
  const basePremium = 5.00; // $5 USD base
  
  // Value-based premium (percentage of declared value)
  const valueBasedRate = 0.02; // 2% of declared value
  const valueBasedPremium = declaredValue * valueBasedRate;
  
  // Service mode multipliers
  const serviceModeMultipliers = {
    air: 1.0,      // Standard rate for air
    ocean: 0.8,    // 20% discount for ocean (slower, less risk)
    local: 0.6     // 40% discount for local (short distance)
  };
  const serviceModeMultiplier = serviceModeMultipliers[serviceMode] || 1.0;
  
  // Risk multipliers
  const fragileMultiplier = isFragile ? 1.5 : 1.0; // 50% increase for fragile items
  const hazardousMultiplier = isHazardous ? 2.0 : 1.0; // 100% increase for hazardous items
  
  // Calculate total premium
  const totalPremium = Math.max(
    basePremium,
    (valueBasedPremium * serviceModeMultiplier * fragileMultiplier * hazardousMultiplier)
  );
  
  return {
    basePremium,
    valueBasedPremium,
    serviceModeMultiplier,
    fragileMultiplier,
    hazardousMultiplier,
    totalPremium: Math.round(totalPremium * 100) / 100, // Round to 2 decimal places
    currency
  };
}

/**
 * Get insurance quote with currency conversion
 */
export async function getInsuranceQuote(
  declaredValue: number,
  declaredCurrency: string,
  targetCurrency: string,
  serviceMode: 'air' | 'ocean' | 'local' = 'air',
  isFragile: boolean = false,
  isHazardous: boolean = false
): Promise<InsuranceCalculation & { convertedPremium: number }> {
  // Convert declared value to target currency if needed
  let valueInTargetCurrency = declaredValue;
  
  if (declaredCurrency !== targetCurrency) {
    try {
      const { convertCurrency } = await import('@/lib/currency-api');
      valueInTargetCurrency = await convertCurrency(declaredValue, declaredCurrency, targetCurrency);
    } catch (error) {
      console.error('Currency conversion error:', error);
      // Use fallback conversion
    }
  }
  
  const calculation = calculateInsurance(
    valueInTargetCurrency,
    serviceMode,
    isFragile,
    isHazardous,
    targetCurrency
  );
  
  return {
    ...calculation,
    convertedPremium: calculation.totalPremium
  };
}

