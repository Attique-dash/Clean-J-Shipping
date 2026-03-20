"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CurrencyService } from "@/lib/currency-service";

interface CurrencyContextType {
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  convertAmount: (amount: number, fromCurrency: string) => Promise<number>;
  formatCurrency: (amount: number, currency?: string) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrencyState] = useState("JMD"); // Default to JMD for Jamaica
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved currency from localStorage, default to JMD
    const savedCurrency = localStorage.getItem("selectedCurrency");
    if (savedCurrency && CurrencyService.isSupported(savedCurrency)) {
      setSelectedCurrencyState(savedCurrency);
    } else {
      setSelectedCurrencyState("JMD");
      localStorage.setItem("selectedCurrency", "JMD");
    }
    setIsLoading(false);
  }, []);

  const setSelectedCurrency = (currency: string) => {
    if (CurrencyService.isSupported(currency)) {
      setSelectedCurrencyState(currency);
      localStorage.setItem("selectedCurrency", currency);
    }
  };

  const convertAmount = async (amount: number, fromCurrency: string): Promise<number> => {
    if (fromCurrency === selectedCurrency) {
      return amount;
    }

    try {
      const result = CurrencyService.convert(amount, fromCurrency, selectedCurrency);
      return result.amount;
    } catch (error) {
      console.error("Failed to convert currency:", error);
      return amount; // Fallback to original amount
    }
  };

  const formatCurrency = (amount: number, currency?: string): string => {
    const currencyToUse = currency || selectedCurrency;
    return CurrencyService.format(amount, currencyToUse);
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
