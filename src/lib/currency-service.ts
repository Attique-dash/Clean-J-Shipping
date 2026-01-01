import { Currency } from "@/models/Currency";

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  decimalPlaces: number;
  format: string;
}

export class CurrencyService {
  private static instance: CurrencyService;
  private cache: Map<string, CurrencyInfo> = new Map();
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  async getActiveCurrencies(): Promise<CurrencyInfo[]> {
    await this.updateCacheIfNeeded();
    return Array.from(this.cache.values()).filter(currency => 
      this.cache.get(currency.code)?.symbol !== undefined
    );
  }

  async getCurrencyByCode(code: string): Promise<CurrencyInfo | null> {
    await this.updateCacheIfNeeded();
    return this.cache.get(code.toUpperCase()) || null;
  }

  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    const from = await this.getCurrencyByCode(fromCurrency.toUpperCase());
    const to = await this.getCurrencyByCode(toCurrency.toUpperCase());

    if (!from || !to) {
      throw new Error(`Invalid currency: ${fromCurrency} or ${toCurrency}`);
    }

    // Convert to USD first, then to target currency
    const usdAmount = amount / from.exchangeRate;
    return usdAmount * to.exchangeRate;
  }

  formatCurrency(amount: number, currency: string): string {
    const currencyInfo = this.cache.get(currency.toUpperCase());
    if (!currencyInfo) {
      return `${currency} ${amount.toFixed(2)}`;
    }

    const formattedAmount = amount.toFixed(currencyInfo.decimalPlaces);
    
    // Apply currency format
    switch (currencyInfo.code) {
      case 'USD':
        return `$${formattedAmount}`;
      case 'JMD':
        return `J$${formattedAmount}`;
      case 'GBP':
        return `£${formattedAmount}`;
      case 'EUR':
        return `€${formattedAmount}`;
      default:
        return `${currencyInfo.symbol}${formattedAmount}`;
    }
  }

  async updateExchangeRates(): Promise<void> {
    try {
      // Fetch real-time rates from a free API (exchangerate-api.com)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }

      const data = await response.json();
      const rates = data.rates;

      // Update currencies in database
      const currencies = await Currency.find({ isActive: true });
      
      for (const currency of currencies) {
        if (currency.code === 'USD') {
          currency.exchangeRate = 1.0; // USD is base currency
        } else if (rates[currency.code]) {
          currency.exchangeRate = rates[currency.code];
        }
        currency.lastUpdated = new Date();
        await currency.save();
      }

      // Clear cache to force refresh
      this.cache.clear();
      this.lastCacheUpdate = null;
    } catch (error) {
      console.error('Failed to update exchange rates:', error);
      throw error;
    }
  }

  private async updateCacheIfNeeded(): Promise<void> {
    const now = new Date();
    
    if (
      !this.lastCacheUpdate || 
      now.getTime() - this.lastCacheUpdate.getTime() > this.CACHE_DURATION
    ) {
      const currencies = await Currency.find({ isActive: true });
      
      this.cache.clear();
      
      for (const currency of currencies) {
        this.cache.set(currency.code, {
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          exchangeRate: currency.exchangeRate,
          decimalPlaces: currency.decimalPlaces,
          format: currency.format,
        });
      }
      
      this.lastCacheUpdate = now;
    }
  }

  async initializeDefaultCurrencies(): Promise<void> {
    // Complete worldwide currencies - easily configurable
    const configurableCurrencies = [
      // Major Global Currencies
      { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 1.0, decimalPlaces: 2, format: '$1,234.56', isActive: true },
      { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 0.92, decimalPlaces: 2, format: '€1,234.56', isActive: true },
      { code: 'GBP', name: 'British Pound', symbol: '£', exchangeRate: 0.79, decimalPlaces: 2, format: '£1,234.56', isActive: true },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', exchangeRate: 149.50, decimalPlaces: 0, format: '¥1,234', isActive: true },
      
      // Americas
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', exchangeRate: 1.36, decimalPlaces: 2, format: 'C$1,234.56', isActive: true },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', exchangeRate: 1.53, decimalPlaces: 2, format: 'A$1,234.56', isActive: true },
      { code: 'MXN', name: 'Mexican Peso', symbol: '$', exchangeRate: 17.15, decimalPlaces: 2, format: '$1,234.56', isActive: true },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', exchangeRate: 4.92, decimalPlaces: 2, format: 'R$1,234.56', isActive: true },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', exchangeRate: 0.88, decimalPlaces: 2, format: 'Fr1,234.56', isActive: true },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', exchangeRate: 7.24, decimalPlaces: 2, format: '¥1,234.56', isActive: true },
      
      // Caribbean
      { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$', exchangeRate: 155.0, decimalPlaces: 2, format: 'J$1,234.56', isActive: true },
      { code: 'BBD', name: 'Barbadian Dollar', symbol: 'Bds$', exchangeRate: 2.0, decimalPlaces: 2, format: 'Bds$1,234.56', isActive: true },
      { code: 'TTD', name: 'Trinidad & Tobago Dollar', symbol: 'TT$', exchangeRate: 6.75, decimalPlaces: 2, format: 'TT$1,234.56', isActive: true },
      { code: 'XCD', name: 'Eastern Caribbean Dollar', symbol: 'EC$', exchangeRate: 2.70, decimalPlaces: 2, format: 'EC$1,234.56', isActive: true },
      { code: 'BSD', name: 'Bahamian Dollar', symbol: 'B$', exchangeRate: 1.0, decimalPlaces: 2, format: 'B$1,234.56', isActive: true },
      
      // Europe & Scandinavia
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', exchangeRate: 10.75, decimalPlaces: 2, format: 'kr1,234.56', isActive: true },
      { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', exchangeRate: 10.65, decimalPlaces: 2, format: 'kr1,234.56', isActive: true },
      { code: 'DKK', name: 'Danish Krone', symbol: 'kr', exchangeRate: 6.85, decimalPlaces: 2, format: 'kr1,234.56', isActive: true },
      { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', exchangeRate: 4.05, decimalPlaces: 2, format: '1,234.56 zł', isActive: true },
      { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', exchangeRate: 22.95, decimalPlaces: 2, format: '1,234.56 Kč', isActive: true },
      { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', exchangeRate: 355.50, decimalPlaces: 0, format: '1,234 Ft', isActive: true },
      
      // Asia & Middle East
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', exchangeRate: 83.12, decimalPlaces: 2, format: '₹1,234.56', isActive: true },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', exchangeRate: 1.34, decimalPlaces: 2, format: 'S$1,234.56', isActive: true },
      { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', exchangeRate: 7.82, decimalPlaces: 2, format: 'HK$1,234.56', isActive: true },
      { code: 'KRW', name: 'South Korean Won', symbol: '₩', exchangeRate: 1315.25, decimalPlaces: 0, format: '₩1,234', isActive: true },
      { code: 'THB', name: 'Thai Baht', symbol: '฿', exchangeRate: 35.85, decimalPlaces: 2, format: '฿1,234.56', isActive: true },
      { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', exchangeRate: 4.65, decimalPlaces: 2, format: 'RM1,234.56', isActive: true },
      { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', exchangeRate: 15425.0, decimalPlaces: 0, format: 'Rp1,234', isActive: true },
      { code: 'PHP', name: 'Philippine Peso', symbol: '₱', exchangeRate: 56.35, decimalPlaces: 2, format: '₱1,234.56', isActive: true },
      { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', exchangeRate: 3.67, decimalPlaces: 2, format: 'د.إ1,234.56', isActive: true },
      { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', exchangeRate: 3.75, decimalPlaces: 2, format: '﷼1,234.56', isActive: true },
      
      // Africa
      { code: 'ZAR', name: 'South African Rand', symbol: 'R', exchangeRate: 18.95, decimalPlaces: 2, format: 'R1,234.56', isActive: true },
      { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', exchangeRate: 30.90, decimalPlaces: 2, format: 'E£1,234.56', isActive: true },
      { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', exchangeRate: 777.50, decimalPlaces: 2, format: '₦1,234.56', isActive: true },
      { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', exchangeRate: 152.75, decimalPlaces: 2, format: 'KSh1,234.56', isActive: true },
      
      // Other Major Currencies
      { code: 'RUB', name: 'Russian Ruble', symbol: '₽', exchangeRate: 90.45, decimalPlaces: 2, format: '₽1,234.56', isActive: true },
      { code: 'TRY', name: 'Turkish Lira', symbol: '₺', exchangeRate: 28.95, decimalPlaces: 2, format: '₺1,234.56', isActive: true },
      { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', exchangeRate: 1.63, decimalPlaces: 2, format: 'NZ$1,234.56', isActive: true },
      { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', exchangeRate: 138.50, decimalPlaces: 0, format: 'kr1,234', isActive: true },
    ];

    for (const currencyData of configurableCurrencies) {
      const existing = await Currency.findOne({ code: currencyData.code });
      if (!existing) {
        await Currency.create({
          ...currencyData,
          isActive: currencyData.isActive
        });
      } else {
        // Update existing currency with new settings
        existing.name = currencyData.name;
        existing.symbol = currencyData.symbol;
        existing.decimalPlaces = currencyData.decimalPlaces;
        existing.format = currencyData.format;
        existing.isActive = currencyData.isActive;
        await existing.save();
      }
    }
  }
}

export const currencyService = CurrencyService.getInstance();
