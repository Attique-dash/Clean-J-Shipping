// Package consolidation service for FCL/LCL and consolidation
export interface ConsolidationPackage {
  trackingNumber: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  value: number;
  customerId: string;
  status: string;
}

export interface ConsolidationResult {
  consolidationId: string;
  totalPackages: number;
  totalWeight: number;
  totalVolume: number;
  totalValue: number;
  estimatedCost: number;
  estimatedDelivery: Date;
  packages: ConsolidationPackage[];
}

/**
 * Consolidate packages for FCL (Full Container Load) or LCL (Less than Container Load)
 */
export function consolidatePackages(
  packages: ConsolidationPackage[],
  serviceMode: 'air' | 'ocean' | 'local',
  consolidationType: 'fcl' | 'lcl' | 'standard' = 'standard'
): ConsolidationResult {
  // Calculate totals
  const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);
  const totalVolume = packages.reduce((sum, pkg) => {
    const volume = (pkg.dimensions.length * pkg.dimensions.width * pkg.dimensions.height) / 1000000; // Convert to m³
    return sum + volume;
  }, 0);
  const totalValue = packages.reduce((sum, pkg) => sum + pkg.value, 0);
  
  // Generate consolidation ID
  const consolidationId = `CONS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  // Calculate estimated cost based on consolidation type
  let estimatedCost = 0;
  
  if (serviceMode === 'ocean') {
    if (consolidationType === 'fcl') {
      // FCL: Fixed cost per container (20ft or 40ft)
      const containerSize = totalVolume > 33 ? '40ft' : '20ft'; // 20ft = 33m³, 40ft = 67m³
      estimatedCost = containerSize === '40ft' ? 2500 : 1500; // USD
    } else if (consolidationType === 'lcl') {
      // LCL: Cost based on volume (cubic meter)
      estimatedCost = totalVolume * 150; // $150 per m³
    }
  } else if (serviceMode === 'air') {
    // Air consolidation: Based on weight and volume (whichever is higher)
    const volumetricWeight = totalVolume * 167; // 167 kg per m³
    const chargeableWeight = Math.max(totalWeight, volumetricWeight);
    estimatedCost = chargeableWeight * 5; // $5 per kg
  } else {
    // Local consolidation: Flat rate per package
    estimatedCost = packages.length * 10; // $10 per package
  }
  
  // Estimate delivery (longer for consolidation)
  const baseDays = serviceMode === 'ocean' ? 30 : serviceMode === 'air' ? 7 : 3;
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + baseDays);
  
  return {
    consolidationId,
    totalPackages: packages.length,
    totalWeight,
    totalVolume,
    totalValue,
    estimatedCost: Math.round(estimatedCost * 100) / 100,
    estimatedDelivery,
    packages
  };
}

/**
 * Check if packages can be consolidated
 */
export function canConsolidatePackages(
  packages: ConsolidationPackage[],
  maxWeight: number = 1000, // kg
  maxVolume: number = 33 // m³ (20ft container)
): { canConsolidate: boolean; reason?: string } {
  if (packages.length < 2) {
    return { canConsolidate: false, reason: 'At least 2 packages required for consolidation' };
  }
  
  const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);
  const totalVolume = packages.reduce((sum, pkg) => {
    const volume = (pkg.dimensions.length * pkg.dimensions.width * pkg.dimensions.height) / 1000000;
    return sum + volume;
  }, 0);
  
  if (totalWeight > maxWeight) {
    return { canConsolidate: false, reason: `Total weight (${totalWeight}kg) exceeds maximum (${maxWeight}kg)` };
  }
  
  if (totalVolume > maxVolume) {
    return { canConsolidate: false, reason: `Total volume (${totalVolume.toFixed(2)}m³) exceeds maximum (${maxVolume}m³)` };
  }
  
  // Check if all packages belong to same customer (optional requirement)
  const uniqueCustomers = new Set(packages.map(pkg => pkg.customerId));
  if (uniqueCustomers.size > 1) {
    // Allow multi-customer consolidation but note it
    return { canConsolidate: true, reason: 'Multi-customer consolidation' };
  }
  
  return { canConsolidate: true };
}

/**
 * Get FCL/LCL recommendation
 */
export function getFCLOrLCLRecommendation(
  totalVolume: number,
  totalWeight: number
): 'fcl' | 'lcl' | 'standard' {
  // FCL thresholds
  const fcl20ftVolume = 33; // m³
  const fcl40ftVolume = 67; // m³
  const fcl20ftWeight = 28000; // kg
  const fcl40ftWeight = 28000; // kg
  
  if (totalVolume >= fcl20ftVolume || totalWeight >= fcl20ftWeight) {
    if (totalVolume >= fcl40ftVolume) {
      return 'fcl'; // Recommend 40ft FCL
    }
    return 'fcl'; // Recommend 20ft FCL
  }
  
  if (totalVolume > 10) {
    return 'lcl'; // Recommend LCL for medium volumes
  }
  
  return 'standard'; // Standard shipping for small volumes
}

