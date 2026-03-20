// src/lib/currency-service.ts
// Standardized currency service for consistent calculations across the entire application

export interface CurrencyRate {
  code: string;
  name: string;
  symbol: string;
  rate: number; // Rate relative to USD (base currency)
  decimalPlaces: number;
}

export interface ConversionResult {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  formatted: string;
}

// Standardized exchange rates (USD as base currency)
// These should be updated periodically from a reliable API
export const CURRENCY_RATES: Record<string, CurrencyRate> = {
  // Base currency
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    rate: 1.0,
    decimalPlaces: 2,
  },
  
  // Caribbean currencies
  JMD: {
    code: 'JMD',
    name: 'Jamaican Dollar',
    symbol: 'J$',
    rate: 155.0, // 1 USD = 155 JMD
    decimalPlaces: 2,
  },
  BBD: {
    code: 'BBD',
    name: 'Barbadian Dollar',
    symbol: 'Bds$',
    rate: 2.0,
    decimalPlaces: 2,
  },
  TTD: {
    code: 'TTD',
    name: 'Trinidad & Tobago Dollar',
    symbol: 'TT$',
    rate: 6.75,
    decimalPlaces: 2,
  },
  XCD: {
    code: 'XCD',
    name: 'East Caribbean Dollar',
    symbol: 'EC$',
    rate: 2.70,
    decimalPlaces: 2,
  },
  
  // Major currencies
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    rate: 0.92,
    decimalPlaces: 2,
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    rate: 0.79,
    decimalPlaces: 2,
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    rate: 1.36,
    decimalPlaces: 2,
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    rate: 1.53,
    decimalPlaces: 2,
  },
};

export class CurrencyService {
  /**
   * Convert amount from one currency to another
   * @param amount Amount to convert
   * @param fromCurrency Source currency code
   * @param toCurrency Target currency code
   * @returns Conversion result with rate information
   */
  static convert(amount: number, fromCurrency: string, toCurrency: string): ConversionResult {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    // Get currency rates
    const fromRate = CURRENCY_RATES[fromCurrency.toUpperCase()];
    const toRate = CURRENCY_RATES[toCurrency.toUpperCase()];
    
    if (!fromRate) {
      throw new Error(`Unsupported source currency: ${fromCurrency}`);
    }
    
    if (!toRate) {
      throw new Error(`Unsupported target currency: ${toCurrency}`);
    }

    // Convert to USD (base) first, then to target currency
    const usdAmount = amount / fromRate.rate;
    const convertedAmount = usdAmount * toRate.rate;
    
    return {
      amount: convertedAmount,
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      rate: toRate.rate / fromRate.rate,
      formatted: this.format(convertedAmount, toCurrency.toUpperCase()),
    };
  }

  /**
   * Convert amount to a specific currency (from USD)
   * @param amount Amount in USD
   * @param toCurrency Target currency code
   * @returns Converted amount
   */
  static fromUSD(amount: number, toCurrency: string): number {
    return this.convert(amount, 'USD', toCurrency).amount;
  }

  /**
   * Convert amount from a specific currency to USD
   * @param amount Amount in source currency
   * @param fromCurrency Source currency code
   * @returns Amount in USD
   */
  static toUSD(amount: number, fromCurrency: string): number {
    return this.convert(amount, fromCurrency, 'USD').amount;
  }

  /**
   * Format currency amount with symbol
   * @param amount Amount to format
   * @param currency Currency code
   * @returns Formatted string
   */
  static format(amount: number, currency: string): string {
    const currencyInfo = CURRENCY_RATES[currency.toUpperCase()];
    if (!currencyInfo) {
      return `${currency} ${amount.toFixed(2)}`;
    }
    
    const formattedAmount = amount.toFixed(currencyInfo.decimalPlaces);
    return `${currencyInfo.symbol}${formattedAmount}`;
  }

  /**
   * Get currency information
   * @param currency Currency code
   * @returns Currency information
   */
  static getCurrencyInfo(currency: string): CurrencyRate | null {
    return CURRENCY_RATES[currency.toUpperCase()] || null;
  }

  /**
   * Get all available currencies
   * @returns Array of currency information
   */
  static getAllCurrencies(): CurrencyRate[] {
    return Object.values(CURRENCY_RATES);
  }

  /**
   * Validate currency code
   * @param currency Currency code to validate
   * @returns True if currency is supported
   */
  static isSupported(currency: string): boolean {
    return currency.toUpperCase() in CURRENCY_RATES;
  }

  /**
   * Calculate shipping cost in JMD (business logic)
   * @param weightLbs Weight in pounds
   * @returns Shipping cost in JMD
   */
  static calculateShippingCostJMD(weightLbs: number): number {
    if (weightLbs <= 0) return 0;
    const first = 700; // J$7.00 for first pound
    const additional = Math.max(0, Math.ceil(weightLbs) - 1) * 350; // J$3.50 per additional pound
    return first + additional;
  }

  /**
   * Calculate storage fee in JMD (business logic)
   * @param daysInStorage Number of days in storage
   * @returns Storage fee in JMD
   */
  static calculateStorageFeeJMD(daysInStorage: number): number {
    if (daysInStorage <= 7) return 0;
    return (daysInStorage - 7) * 50; // J$50 per day after 7 days
  }

  /**
   * Calculate customs duty in JMD (business logic)
   * @param itemValueUSD Item value in USD
   * @returns Customs duty in JMD
   */
  static calculateCustomsDutyJMD(itemValueUSD: number): number {
    // 15% customs duty on items over $100 USD
    if (itemValueUSD <= 100) return 0;
    const itemValueJMD = this.fromUSD(itemValueUSD, 'JMD');
    return itemValueJMD * 0.15;
  }

  /**
   * Calculate total package cost in JMD
   * @param itemValueUSD Item value in USD
   * @param weightKg Weight in kilograms
   * @returns Total cost in JMD
   */
  static calculateTotalPackageCostJMD(itemValueUSD: number, weightKg: number): {
    itemValueJMD: number;
    shippingCostJMD: number;
    customsDutyJMD: number;
    totalJMD: number;
    totalUSD: number;
  } {
    // Convert item value to JMD
    const itemValueJMD = this.fromUSD(itemValueUSD, 'JMD');
    
    // Calculate weight in lbs
    const weightLbs = weightKg * 2.20462;
    
    // Calculate costs
    const shippingCostJMD = this.calculateShippingCostJMD(weightLbs);
    const customsDutyJMD = this.calculateCustomsDutyJMD(itemValueUSD);
    const totalJMD = itemValueJMD + shippingCostJMD + customsDutyJMD;
    const totalUSD = this.toUSD(totalJMD, 'JMD');
    
    return {
      itemValueJMD,
      shippingCostJMD,
      customsDutyJMD,
      totalJMD,
      totalUSD,
    };
  }

  /**
   * Calculate total package cost in specified currency
   * @param itemValueUSD Item value in USD
   * @param weightKg Weight in kilograms
   * @param targetCurrency Target currency code
   * @returns Total cost breakdown
   */
  static calculateTotalPackageCost(
    itemValueUSD: number, 
    weightKg: number, 
    targetCurrency: string = 'JMD'
  ) {
    const jmdBreakdown = this.calculateTotalPackageCostJMD(itemValueUSD, weightKg);
    const totalInTargetCurrency = this.convert(jmdBreakdown.totalJMD, 'JMD', targetCurrency);
    
    return {
      ...jmdBreakdown,
      targetCurrency,
      totalInTargetCurrency: totalInTargetCurrency.amount,
      formattedTotal: totalInTargetCurrency.formatted,
    };
  }
}

export const currencyService = new CurrencyService();
