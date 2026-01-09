// Currency conversion API integration
interface ExchangeRateResponse {
  success: boolean;
  rates?: Record<string, number>;
  base?: string;
  date?: string;
  error?: string;
}

interface HistoricalRateResponse {
  success: boolean;
  rates?: Record<string, Record<string, number>>;
  base?: string;
  start_date?: string;
  end_date?: string;
  error?: string;
}

/**
 * Get real-time exchange rates
 */
export async function getExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
  try {
    // Using ExchangeRate-API (free tier: 1,500 requests/month)
    const apiKey = process.env.EXCHANGE_RATE_API_KEY || '';
    const apiUrl = apiKey 
      ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`
      : `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`;
    
    const response = await fetch(apiUrl, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }
    
    const data = await response.json() as ExchangeRateResponse;
    
    if (data.success === false) {
      throw new Error(data.error || 'Failed to fetch exchange rates');
    }
    
    return data.rates || {};
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Return fallback rates if API fails
    return getFallbackRates(baseCurrency);
  }
}

/**
 * Get historical exchange rates
 */
export async function getHistoricalRates(
  baseCurrency: string,
  targetCurrency: string,
  date: string // Format: YYYY-MM-DD
): Promise<number | null> {
  try {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY || '';
    
    if (apiKey) {
      // Using ExchangeRate-API with historical data
      const apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/history/${baseCurrency}/${date}`;
      const response = await fetch(apiUrl, {
        next: { revalidate: 86400 } // Cache for 24 hours
      });
      
      if (response.ok) {
        const data = await response.json() as ExchangeRateResponse;
        return data.rates?.[targetCurrency] || null;
      }
    }
    
    // Fallback: Use current rate if historical not available
    const currentRates = await getExchangeRates(baseCurrency);
    return currentRates[targetCurrency] || null;
  } catch (error) {
    console.error('Error fetching historical rates:', error);
    return null;
  }
}

/**
 * Convert amount between currencies
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  try {
    const rates = await getExchangeRates(fromCurrency);
    const rate = rates[toCurrency];
    
    if (!rate) {
      throw new Error(`Exchange rate not found for ${toCurrency}`);
    }
    
    return amount * rate;
  } catch (error) {
    console.error('Currency conversion error:', error);
    // Return fallback conversion
    return getFallbackConversion(amount, fromCurrency, toCurrency);
  }
}

/**
 * Validate currency code
 */
export function validateCurrencyCode(currency: string): boolean {
  const validCurrencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'JMD',
    'BBD', 'TTD', 'XCD', 'BSD', 'HTG', 'MXN', 'BRL', 'ARS', 'CLP', 'COP',
    'PEN', 'UYU', 'VES', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON',
    'BGN', 'HRK', 'RSD', 'SGD', 'HKD', 'KRW', 'THB', 'MYR', 'IDR', 'PHP',
    'AED', 'SAR', 'PKR', 'LKR', 'BDT', 'NPR', 'MVR', 'IQD', 'IRR', 'AFN',
    'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'LBP', 'SYP', 'ILS', 'ZAR', 'EGP',
    'NGN', 'KES', 'GHS', 'TZS', 'UGX', 'MAD', 'DZD', 'TND', 'LYD', 'RUB',
    'TRY', 'NZD', 'ISK'
  ];
  
  return validCurrencies.includes(currency.toUpperCase());
}

/**
 * Fallback rates (static, should be updated periodically)
 */
function getFallbackRates(baseCurrency: string): Record<string, number> {
  const baseRates: Record<string, number> = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.50,
    CAD: 1.36,
    AUD: 1.53,
    JMD: 155.0,
    CNY: 7.24,
    INR: 83.12,
    MXN: 17.15,
    BRL: 4.92,
  };
  
  if (baseCurrency === 'USD') {
    return baseRates;
  }
  
  // Convert to base currency
  const baseRate = baseRates[baseCurrency] || 1;
  const converted: Record<string, number> = {};
  
  for (const [currency, rate] of Object.entries(baseRates)) {
    converted[currency] = rate / baseRate;
  }
  
  return converted;
}

/**
 * Fallback conversion
 */
function getFallbackConversion(amount: number, fromCurrency: string, toCurrency: string): number {
  const rates = getFallbackRates('USD');
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  
  // Convert to USD first, then to target
  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
}

