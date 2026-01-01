"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface CurrencyContextType {
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  convertAmount: (amount: number, fromCurrency: string) => Promise<number>;
  formatCurrency: (amount: number, currency?: string) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrencyState] = useState("USD");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved currency from localStorage
    const savedCurrency = localStorage.getItem("selectedCurrency");
    if (savedCurrency) {
      setSelectedCurrencyState(savedCurrency);
    }
    setIsLoading(false);
  }, []);

  const setSelectedCurrency = (currency: string) => {
    setSelectedCurrencyState(currency);
    localStorage.setItem("selectedCurrency", currency);
  };

  const convertAmount = async (amount: number, fromCurrency: string): Promise<number> => {
    if (fromCurrency === selectedCurrency) {
      return amount;
    }

    // Use client-side conversion with fallback rates to avoid API calls
    try {
      // Comprehensive exchange rates for all worldwide currencies
      const exchangeRates: Record<string, number> = {
        // Major Global Currencies
        'USD': 1.0,
        'EUR': 0.92,
        'GBP': 0.79,
        'JPY': 149.50,
        
        // Americas
        'CAD': 1.36,
        'AUD': 1.53,
        'MXN': 17.15,
        'BRL': 4.92,
        'CHF': 0.88,
        'CNY': 7.24,
        'ARS': 367.50,
        'CLP': 925.75,
        'COP': 3875.0,
        'PEN': 3.75,
        'UYU': 38.75,
        'VES': 3595000.0,
        
        // Caribbean
        'JMD': 155.0,
        'BBD': 2.0,
        'TTD': 6.75,
        'XCD': 2.70,
        'BSD': 1.0,
        'HTG': 132.50,
        'XOF': 605.25,
        'XAF': 605.25,
        
        // Europe & Scandinavia
        'SEK': 10.75,
        'NOK': 10.65,
        'DKK': 6.85,
        'PLN': 4.05,
        'CZK': 22.95,
        'HUF': 355.50,
        'RON': 4.65,
        'BGN': 1.82,
        'HRK': 7.15,
        'RSD': 107.50,
        
        // Asia & Middle East
        'INR': 83.12,
        'SGD': 1.34,
        'HKD': 7.82,
        'KRW': 1315.25,
        'THB': 35.85,
        'MYR': 4.65,
        'IDR': 15425.0,
        'PHP': 56.35,
        'AED': 3.67,
        'SAR': 3.75,
        'PKR': 278.50,  // Pakistan Rupee
        'LKR': 325.75,
        'BDT': 109.50,
        'NPR': 132.85,
        'MVR': 15.45,
        'IQD': 1308.50,
        'IRR': 42050.0,
        'AFN': 71.25,
        'QAR': 3.64,
        'KWD': 0.31,
        'BHD': 0.38,
        'OMR': 0.39,
        'JOD': 0.71,
        'LBP': 89500.0,
        'SYP': 12500.0,
        'ILS': 3.65,
        
        // Africa
        'ZAR': 18.95,
        'EGP': 30.90,
        'NGN': 777.50,
        'KES': 152.75,
        'GHS': 12.15,
        'TZS': 2475.0,
        'UGX': 3725.0,
        'MAD': 9.85,
        'DZD': 135.25,
        'TND': 3.10,
        'LYD': 4.85,
        
        // Other Major Currencies
        'RUB': 90.45,
        'TRY': 28.95,
        'NZD': 1.63,
        'ISK': 138.50,
      };

      const fromRate = exchangeRates[fromCurrency.toUpperCase()] || 1.0;
      const toRate = exchangeRates[selectedCurrency.toUpperCase()] || 1.0;
      
      // Convert to USD first, then to target currency
      const usdAmount = amount / fromRate;
      return usdAmount * toRate;
    } catch (error) {
      console.error("Failed to convert currency:", error);
      return amount; // Fallback to original amount
    }
  };

  const formatCurrency = (amount: number, currency?: string): string => {
    const currencyToUse = currency || selectedCurrency;
    
    // Simple formatting - in a real app, you'd use proper locale formatting
    const symbols: Record<string, string> = {
      USD: "$",
      JMD: "J$",
      GBP: "£",
      EUR: "€",
    };

    const symbol = symbols[currencyToUse] || currencyToUse;
    return `${symbol}${amount.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        selectedCurrency,
        setSelectedCurrency,
        convertAmount,
        formatCurrency,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
