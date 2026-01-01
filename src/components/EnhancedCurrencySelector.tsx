"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown } from "lucide-react";
import ReactCountryFlag from "react-country-flag";

interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  decimalPlaces: number;
  format: string;
  countryCode?: string; // For flag display
}

interface EnhancedCurrencySelectorProps {
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  className?: string;
}

export default function EnhancedCurrencySelector({
  selectedCurrency,
  onCurrencyChange,
  className = "",
}: EnhancedCurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update dropdown position when it opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 240; // Reduced width for smaller dropdown
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

  // Enhanced fallback currencies with country codes for flags
  const fallbackCurrencies: Currency[] = [
    // Major Global Currencies with country codes
    { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 1.0, decimalPlaces: 2, format: "$1,234.56", countryCode: "US" },
    { code: "EUR", name: "Euro", symbol: "€", exchangeRate: 0.92, decimalPlaces: 2, format: "€1,234.56", countryCode: "EU" },
    { code: "GBP", name: "British Pound", symbol: "£", exchangeRate: 0.79, decimalPlaces: 2, format: "£1,234.56", countryCode: "GB" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥", exchangeRate: 149.50, decimalPlaces: 0, format: "¥1,234", countryCode: "JP" },
    
    // Americas
    { code: "CAD", name: "Canadian Dollar", symbol: "C$", exchangeRate: 1.36, decimalPlaces: 2, format: "C$1,234.56", countryCode: "CA" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$", exchangeRate: 1.53, decimalPlaces: 2, format: "A$1,234.56", countryCode: "AU" },
    { code: "MXN", name: "Mexican Peso", symbol: "$", exchangeRate: 17.15, decimalPlaces: 2, format: "$1,234.56", countryCode: "MX" },
    { code: "BRL", name: "Brazilian Real", symbol: "R$", exchangeRate: 4.92, decimalPlaces: 2, format: "R$1,234.56", countryCode: "BR" },
    { code: "CHF", name: "Swiss Franc", symbol: "Fr", exchangeRate: 0.88, decimalPlaces: 2, format: "Fr1,234.56", countryCode: "CH" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥", exchangeRate: 7.24, decimalPlaces: 2, format: "¥1,234.56", countryCode: "CN" },
    { code: "ARS", name: "Argentine Peso", symbol: "$", exchangeRate: 367.50, decimalPlaces: 2, format: "$1,234.56", countryCode: "AR" },
    { code: "CLP", name: "Chilean Peso", symbol: "$", exchangeRate: 925.75, decimalPlaces: 0, format: "$1,234", countryCode: "CL" },
    { code: "COP", name: "Colombian Peso", symbol: "$", exchangeRate: 3875.0, decimalPlaces: 0, format: "$1,234", countryCode: "CO" },
    { code: "PEN", name: "Peruvian Sol", symbol: "S/", exchangeRate: 3.75, decimalPlaces: 2, format: "S/1,234.56", countryCode: "PE" },
    { code: "UYU", name: "Uruguayan Peso", symbol: "$", exchangeRate: 38.75, decimalPlaces: 2, format: "$U1,234.56", countryCode: "UY" },
    { code: "VES", name: "Venezuelan Bolívar", symbol: "Bs", exchangeRate: 3595000.0, decimalPlaces: 0, format: "Bs1,234", countryCode: "VE" },
    
    // Caribbean
    { code: "JMD", name: "Jamaican Dollar", symbol: "J$", exchangeRate: 155.0, decimalPlaces: 2, format: "J$1,234.56", countryCode: "JM" },
    { code: "BBD", name: "Barbadian Dollar", symbol: "Bds$", exchangeRate: 2.0, decimalPlaces: 2, format: "Bds$1,234.56", countryCode: "BB" },
    { code: "TTD", name: "Trinidad & Tobago Dollar", symbol: "TT$", exchangeRate: 6.75, decimalPlaces: 2, format: "TT$1,234.56", countryCode: "TT" },
    { code: "XCD", name: "Eastern Caribbean Dollar", symbol: "EC$", exchangeRate: 2.70, decimalPlaces: 2, format: "EC$1,234.56", countryCode: "LC" }, // Using St. Lucia flag
    { code: "BSD", name: "Bahamian Dollar", symbol: "B$", exchangeRate: 1.0, decimalPlaces: 2, format: "B$1,234.56", countryCode: "BS" },
    { code: "HTG", name: "Haitian Gourde", symbol: "G", exchangeRate: 132.50, decimalPlaces: 2, format: "G1,234.56", countryCode: "HT" },
    { code: "XOF", name: "West African CFA Franc", symbol: "CFA", exchangeRate: 605.25, decimalPlaces: 0, format: "CFA1,234", countryCode: "SN" }, // Using Senegal flag
    { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", exchangeRate: 605.25, decimalPlaces: 0, format: "FCFA1,234", countryCode: "CM" }, // Using Cameroon flag
    
    // Europe & Scandinavia
    { code: "SEK", name: "Swedish Krona", symbol: "kr", exchangeRate: 10.75, decimalPlaces: 2, format: "kr1,234.56", countryCode: "SE" },
    { code: "NOK", name: "Norwegian Krone", symbol: "kr", exchangeRate: 10.65, decimalPlaces: 2, format: "kr1,234.56", countryCode: "NO" },
    { code: "DKK", name: "Danish Krone", symbol: "kr", exchangeRate: 6.85, decimalPlaces: 2, format: "kr1,234.56", countryCode: "DK" },
    { code: "PLN", name: "Polish Złoty", symbol: "zł", exchangeRate: 4.05, decimalPlaces: 2, format: "1,234.56 zł", countryCode: "PL" },
    { code: "CZK", name: "Czech Koruna", symbol: "Kč", exchangeRate: 22.95, decimalPlaces: 2, format: "1,234.56 Kč", countryCode: "CZ" },
    { code: "HUF", name: "Hungarian Forint", symbol: "Ft", exchangeRate: 355.50, decimalPlaces: 0, format: "1,234 Ft", countryCode: "HU" },
    { code: "RON", name: "Romanian Leu", symbol: "lei", exchangeRate: 4.65, decimalPlaces: 2, format: "1,234.56 lei", countryCode: "RO" },
    { code: "BGN", name: "Bulgarian Lev", symbol: "лв", exchangeRate: 1.82, decimalPlaces: 2, format: "1,234.56 лв", countryCode: "BG" },
    { code: "HRK", name: "Croatian Kuna", symbol: "kn", exchangeRate: 7.15, decimalPlaces: 2, format: "1,234.56 kn", countryCode: "HR" },
    { code: "RSD", name: "Serbian Dinar", symbol: "дин", exchangeRate: 107.50, decimalPlaces: 2, format: "1,234.56 дин", countryCode: "RS" },
    
    // Asia & Middle East
    { code: "INR", name: "Indian Rupee", symbol: "₹", exchangeRate: 83.12, decimalPlaces: 2, format: "₹1,234.56", countryCode: "IN" },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$", exchangeRate: 1.34, decimalPlaces: 2, format: "S$1,234.56", countryCode: "SG" },
    { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", exchangeRate: 7.82, decimalPlaces: 2, format: "HK$1,234.56", countryCode: "HK" },
    { code: "KRW", name: "South Korean Won", symbol: "₩", exchangeRate: 1315.25, decimalPlaces: 0, format: "₩1,234", countryCode: "KR" },
    { code: "THB", name: "Thai Baht", symbol: "฿", exchangeRate: 35.85, decimalPlaces: 2, format: "฿1,234.56", countryCode: "TH" },
    { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", exchangeRate: 4.65, decimalPlaces: 2, format: "RM1,234.56", countryCode: "MY" },
    { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", exchangeRate: 15425.0, decimalPlaces: 0, format: "Rp1,234", countryCode: "ID" },
    { code: "PHP", name: "Philippine Peso", symbol: "₱", exchangeRate: 56.35, decimalPlaces: 2, format: "₱1,234.56", countryCode: "PH" },
    { code: "AED", name: "UAE Dirham", symbol: "د.إ", exchangeRate: 3.67, decimalPlaces: 2, format: "د.إ1,234.56", countryCode: "AE" },
    { code: "SAR", name: "Saudi Riyal", symbol: "﷼", exchangeRate: 3.75, decimalPlaces: 2, format: "﷼1,234.56", countryCode: "SA" },
    { code: "PKR", name: "Pakistani Rupee", symbol: "₨", exchangeRate: 278.50, decimalPlaces: 2, format: "₨1,234.56", countryCode: "PK" },
    { code: "LKR", name: "Sri Lankan Rupee", symbol: "රු", exchangeRate: 325.75, decimalPlaces: 2, format: "රු1,234.56", countryCode: "LK" },
    { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", exchangeRate: 109.50, decimalPlaces: 2, format: "৳1,234.56", countryCode: "BD" },
    { code: "NPR", name: "Nepalese Rupee", symbol: "रू", exchangeRate: 132.85, decimalPlaces: 2, format: "रू1,234.56", countryCode: "NP" },
    { code: "MVR", name: "Maldivian Rufiyaa", symbol: "Rf", exchangeRate: 15.45, decimalPlaces: 2, format: "Rf1,234.56", countryCode: "MV" },
    { code: "IQD", name: "Iraqi Dinar", symbol: "ع.د", exchangeRate: 1308.50, decimalPlaces: 3, format: "ع.د1,234.567", countryCode: "IQ" },
    { code: "IRR", name: "Iranian Rial", symbol: "﷼", exchangeRate: 42050.0, decimalPlaces: 0, format: "﷼1,234", countryCode: "IR" },
    { code: "AFN", name: "Afghan Afghani", symbol: "؋", exchangeRate: 71.25, decimalPlaces: 2, format: "؋1,234.56", countryCode: "AF" },
    { code: "QAR", name: "Qatari Riyal", symbol: "﷼", exchangeRate: 3.64, decimalPlaces: 2, format: "﷼1,234.56", countryCode: "QA" },
    { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", exchangeRate: 0.31, decimalPlaces: 3, format: "د.ك1,234.567", countryCode: "KW" },
    { code: "BHD", name: "Bahraini Dinar", symbol: "د.ب", exchangeRate: 0.38, decimalPlaces: 3, format: "د.ب1,234.567", countryCode: "BH" },
    { code: "OMR", name: "Omani Rial", symbol: "ر.ع", exchangeRate: 0.39, decimalPlaces: 3, format: "ر.ع1,234.567", countryCode: "OM" },
    { code: "JOD", name: "Jordanian Dinar", symbol: "د.ا", exchangeRate: 0.71, decimalPlaces: 3, format: "د.ا1,234.567", countryCode: "JO" },
    { code: "LBP", name: "Lebanese Pound", symbol: "ل.ل", exchangeRate: 89500.0, decimalPlaces: 0, format: "ل.ل1,234", countryCode: "LB" },
    { code: "SYP", name: "Syrian Pound", symbol: "£S", exchangeRate: 12500.0, decimalPlaces: 0, format: "£S1,234", countryCode: "SY" },
    { code: "ILS", name: "Israeli New Shekel", symbol: "₪", exchangeRate: 3.65, decimalPlaces: 2, format: "₪1,234.56", countryCode: "IL" },
    
    // Africa
    { code: "ZAR", name: "South African Rand", symbol: "R", exchangeRate: 18.95, decimalPlaces: 2, format: "R1,234.56", countryCode: "ZA" },
    { code: "EGP", name: "Egyptian Pound", symbol: "E£", exchangeRate: 30.90, decimalPlaces: 2, format: "E£1,234.56", countryCode: "EG" },
    { code: "NGN", name: "Nigerian Naira", symbol: "₦", exchangeRate: 777.50, decimalPlaces: 2, format: "₦1,234.56", countryCode: "NG" },
    { code: "KES", name: "Kenyan Shilling", symbol: "KSh", exchangeRate: 152.75, decimalPlaces: 2, format: "KSh1,234.56", countryCode: "KE" },
    { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", exchangeRate: 12.15, decimalPlaces: 2, format: "GH₵1,234.56", countryCode: "GH" },
    { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", exchangeRate: 2475.0, decimalPlaces: 0, format: "TSh1,234", countryCode: "TZ" },
    { code: "UGX", name: "Ugandan Shilling", symbol: "USh", exchangeRate: 3725.0, decimalPlaces: 0, format: "USh1,234", countryCode: "UG" },
    { code: "MAD", name: "Moroccan Dirham", symbol: "د.م", exchangeRate: 9.85, decimalPlaces: 2, format: "د.م1,234.56", countryCode: "MA" },
    { code: "DZD", name: "Algerian Dinar", symbol: "د.ج", exchangeRate: 135.25, decimalPlaces: 2, format: "د.ج1,234.56", countryCode: "DZ" },
    { code: "TND", name: "Tunisian Dinar", symbol: "د.ت", exchangeRate: 3.10, decimalPlaces: 3, format: "د.ت1,234.567", countryCode: "TN" },
    { code: "LYD", name: "Libyan Dinar", symbol: "د.ل", exchangeRate: 4.85, decimalPlaces: 3, format: "د.ل1,234.567", countryCode: "LY" },
    
    // Other Major Currencies
    { code: "RUB", name: "Russian Ruble", symbol: "₽", exchangeRate: 90.45, decimalPlaces: 2, format: "₽1,234.56", countryCode: "RU" },
    { code: "TRY", name: "Turkish Lira", symbol: "₺", exchangeRate: 28.95, decimalPlaces: 2, format: "₺1,234.56", countryCode: "TR" },
    { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", exchangeRate: 1.63, decimalPlaces: 2, format: "NZ$1,234.56", countryCode: "NZ" },
    { code: "ISK", name: "Icelandic Króna", symbol: "kr", exchangeRate: 138.50, decimalPlaces: 0, format: "kr1,234", countryCode: "IS" },
  ];

  // Always use fallback currencies to show all worldwide currencies
  const displayCurrencies = fallbackCurrencies;
  
  const selectedDisplayCurrency = displayCurrencies.find(c => c.code === selectedCurrency) || displayCurrencies[0];

  // Get flag component for country
  function getFlagForCountry(countryCode: string) {
    try {
      return (
        <ReactCountryFlag 
          countryCode={countryCode} 
          svg
          style={{
            width: '24px',
            height: '16px',
            borderRadius: '2px',
            objectFit: 'cover'
          }}
        />
      );
    } catch {
      // Fallback for countries not in the library
      return <div className="w-6 h-4 bg-gray-200 rounded-sm flex items-center justify-center text-xs">?</div>;
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-all shadow-sm text-sm ${
          className.includes('bg-white/10') 
            ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
            : 'bg-white border-gray-300 hover:bg-gray-50'
        }`}
      >
        {selectedDisplayCurrency?.countryCode && getFlagForCountry(selectedDisplayCurrency.countryCode)}
        <span className={`font-medium ${className.includes('bg-white/10') ? 'text-white' : 'text-gray-900'}`}>
          {selectedDisplayCurrency?.symbol || "$"}
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""} ${changing ? "animate-spin" : ""} ${className.includes('bg-white/10') ? 'text-white' : 'text-gray-500'}`} />
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
            className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[240px] max-h-80 overflow-y-auto"
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
                    setTimeout(() => setChanging(false), 500);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                    selectedCurrency === currency.code ? "bg-blue-50 text-blue-700" : "text-gray-900"
                  }`}
                >
                  {/* Flag */}
                  <div className="shrink-0">
                    {currency.countryCode && getFlagForCountry(currency.countryCode)}
                  </div>
                  
                  {/* Currency Info - More compact layout */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{currency.symbol}</span>
                      <div className="flex-1 truncate">
                        <div className="font-medium text-xs truncate">{currency.name}</div>
                        <div className="text-xs text-gray-500">{currency.code}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Selection Indicator */}
                  {selectedCurrency === currency.code && (
                    <div className="ml-auto shrink-0">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
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
