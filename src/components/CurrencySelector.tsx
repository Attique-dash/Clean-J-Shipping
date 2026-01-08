"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronDown } from "lucide-react";

interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  decimalPlaces: number;
  format: string;
}

interface CurrencySelectorProps {
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  className?: string;
}

export default function CurrencySelector({
  selectedCurrency,
  onCurrencyChange,
  className = "",
}: CurrencySelectorProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const loadCurrencies = useCallback(async () => {
    try {
      console.log("Loading currencies...");
      const res = await fetch("/api/currencies");
      console.log("Currency API response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("Currency API response data:", data);
        setCurrencies(data.currencies || []);
        console.log("Currencies loaded:", data.currencies?.length || 0);
        
        // If no currencies exist, try to initialize them
        if (!data.currencies || data.currencies.length === 0) {
          console.log("No currencies found, initializing...");
          await initializeCurrencies();
        }
      } else {
        const errorData = await res.json();
        console.error("Currency API error:", errorData);
      }
    } catch (error) {
      console.error("Failed to load currencies:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies]);

  // Update dropdown position when it opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 220;
      const margin = 8;
      
      // Calculate position, ensuring dropdown doesn't go off screen
      let left = rect.right + window.scrollX - dropdownWidth;
      if (left < 0) {
        left = margin; // Keep minimum margin from left edge
      }
      
      // Ensure it doesn't go off the right edge
      const screenWidth = window.innerWidth;
      if (left + dropdownWidth > screenWidth) {
        left = screenWidth - dropdownWidth - margin;
      }
      
      setDropdownPosition({
        top: rect.bottom + window.scrollY + margin,
        left: left,
        width: dropdownWidth
      });
    }
  }, [isOpen]);

  async function initializeCurrencies() {
    try {
      const initRes = await fetch("/api/init", { method: "POST" });
      if (initRes.ok) {
        const initData = await initRes.json();
        console.log("Currencies initialized:", initData);
        setCurrencies(initData.currencies || []);
      }
    } catch (error) {
      console.error("Failed to initialize currencies:", error);
    }
  }

  // Fallback currencies if API fails - Complete worldwide currencies
  const fallbackCurrencies: Currency[] = [
    // Major Global Currencies
    { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 1.0, decimalPlaces: 2, format: "$1,234.56" },
    { code: "EUR", name: "Euro", symbol: "€", exchangeRate: 0.92, decimalPlaces: 2, format: "€1,234.56" },
    { code: "GBP", name: "British Pound", symbol: "£", exchangeRate: 0.79, decimalPlaces: 2, format: "£1,234.56" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥", exchangeRate: 149.50, decimalPlaces: 0, format: "¥1,234" },
    
    // Americas
    { code: "CAD", name: "Canadian Dollar", symbol: "C$", exchangeRate: 1.36, decimalPlaces: 2, format: "C$1,234.56" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$", exchangeRate: 1.53, decimalPlaces: 2, format: "A$1,234.56" },
    { code: "MXN", name: "Mexican Peso", symbol: "$", exchangeRate: 17.15, decimalPlaces: 2, format: "$1,234.56" },
    { code: "BRL", name: "Brazilian Real", symbol: "R$", exchangeRate: 4.92, decimalPlaces: 2, format: "R$1,234.56" },
    { code: "CHF", name: "Swiss Franc", symbol: "Fr", exchangeRate: 0.88, decimalPlaces: 2, format: "Fr1,234.56" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥", exchangeRate: 7.24, decimalPlaces: 2, format: "¥1,234.56" },
    
    // Caribbean
    { code: "JMD", name: "Jamaican Dollar", symbol: "J$", exchangeRate: 155.0, decimalPlaces: 2, format: "J$1,234.56" },
    { code: "BBD", name: "Barbadian Dollar", symbol: "Bds$", exchangeRate: 2.0, decimalPlaces: 2, format: "Bds$1,234.56" },
    { code: "TTD", name: "Trinidad & Tobago Dollar", symbol: "TT$", exchangeRate: 6.75, decimalPlaces: 2, format: "TT$1,234.56" },
    { code: "XCD", name: "Eastern Caribbean Dollar", symbol: "EC$", exchangeRate: 2.70, decimalPlaces: 2, format: "EC$1,234.56" },
    { code: "BSD", name: "Bahamian Dollar", symbol: "B$", exchangeRate: 1.0, decimalPlaces: 2, format: "B$1,234.56" },
    
    // Europe & Scandinavia
    { code: "SEK", name: "Swedish Krona", symbol: "kr", exchangeRate: 10.75, decimalPlaces: 2, format: "kr1,234.56" },
    { code: "NOK", name: "Norwegian Krone", symbol: "kr", exchangeRate: 10.65, decimalPlaces: 2, format: "kr1,234.56" },
    { code: "DKK", name: "Danish Krone", symbol: "kr", exchangeRate: 6.85, decimalPlaces: 2, format: "kr1,234.56" },
    { code: "PLN", name: "Polish Złoty", symbol: "zł", exchangeRate: 4.05, decimalPlaces: 2, format: "1,234.56 zł" },
    { code: "CZK", name: "Czech Koruna", symbol: "Kč", exchangeRate: 22.95, decimalPlaces: 2, format: "1,234.56 Kč" },
    { code: "HUF", name: "Hungarian Forint", symbol: "Ft", exchangeRate: 355.50, decimalPlaces: 0, format: "1,234 Ft" },
    
    // Asia & Middle East
    { code: "INR", name: "Indian Rupee", symbol: "₹", exchangeRate: 83.12, decimalPlaces: 2, format: "₹1,234.56" },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$", exchangeRate: 1.34, decimalPlaces: 2, format: "S$1,234.56" },
    { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", exchangeRate: 7.82, decimalPlaces: 2, format: "HK$1,234.56" },
    { code: "KRW", name: "South Korean Won", symbol: "₩", exchangeRate: 1315.25, decimalPlaces: 0, format: "₩1,234" },
    { code: "THB", name: "Thai Baht", symbol: "฿", exchangeRate: 35.85, decimalPlaces: 2, format: "฿1,234.56" },
    { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", exchangeRate: 4.65, decimalPlaces: 2, format: "RM1,234.56" },
    { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", exchangeRate: 15425.0, decimalPlaces: 0, format: "Rp1,234" },
    { code: "PHP", name: "Philippine Peso", symbol: "₱", exchangeRate: 56.35, decimalPlaces: 2, format: "₱1,234.56" },
    { code: "AED", name: "UAE Dirham", symbol: "د.إ", exchangeRate: 3.67, decimalPlaces: 2, format: "د.إ1,234.56" },
    { code: "SAR", name: "Saudi Riyal", symbol: "﷼", exchangeRate: 3.75, decimalPlaces: 2, format: "﷼1,234.56" },
    
    // Africa
    { code: "ZAR", name: "South African Rand", symbol: "R", exchangeRate: 18.95, decimalPlaces: 2, format: "R1,234.56" },
    { code: "EGP", name: "Egyptian Pound", symbol: "E£", exchangeRate: 30.90, decimalPlaces: 2, format: "E£1,234.56" },
    { code: "NGN", name: "Nigerian Naira", symbol: "₦", exchangeRate: 777.50, decimalPlaces: 2, format: "₦1,234.56" },
    { code: "KES", name: "Kenyan Shilling", symbol: "KSh", exchangeRate: 152.75, decimalPlaces: 2, format: "KSh1,234.56" },
    
    // Other Major Currencies
    { code: "RUB", name: "Russian Ruble", symbol: "₽", exchangeRate: 90.45, decimalPlaces: 2, format: "₽1,234.56" },
    { code: "TRY", name: "Turkish Lira", symbol: "₺", exchangeRate: 28.95, decimalPlaces: 2, format: "₺1,234.56" },
    { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", exchangeRate: 1.63, decimalPlaces: 2, format: "NZ$1,234.56" },
    { code: "ISK", name: "Icelandic Króna", symbol: "kr", exchangeRate: 138.50, decimalPlaces: 0, format: "kr1,234" },
  ];

  const displayCurrencies = currencies.length > 0 ? currencies : fallbackCurrencies;
  const selectedDisplayCurrency = displayCurrencies.find(c => c.code === selectedCurrency) || displayCurrencies[0];

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg h-10 w-32 ${className}`} />
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all shadow-sm ${
          className.includes('bg-white/10') 
            ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
            : 'bg-white border-gray-300 hover:bg-gray-50'
        }`}
      >
        <span className={`font-medium ${className.includes('bg-white/10') ? 'text-white' : 'text-gray-900'}`}>
          {selectedDisplayCurrency?.symbol || "$"} {selectedDisplayCurrency?.name || selectedCurrency}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""} ${changing ? "animate-spin" : ""} ${className.includes('bg-white/10') ? 'text-white' : 'text-gray-500'}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown with fixed positioning */}
          <div 
            className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[220px] max-h-96 overflow-y-auto"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`
            }}
          >
            <div className="py-1">
              {displayCurrencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => {
                    setChanging(true);
                    onCurrencyChange(currency.code);
                    setIsOpen(false);
                    setTimeout(() => setChanging(false), 500); // Reset after a short delay
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedCurrency === currency.code ? "bg-blue-50 text-blue-700" : "text-gray-900"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center min-w-12">
                    <span className="font-bold text-lg">{currency.symbol}</span>
                    <span className="text-xs font-mono text-gray-500">{currency.code}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{currency.name}</div>
                    <div className="text-xs text-gray-500">{currency.code} - {currency.symbol}</div>
                  </div>
                  {selectedCurrency === currency.code && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
