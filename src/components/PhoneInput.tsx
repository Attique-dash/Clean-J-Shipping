import { useState } from 'react';
import { countries, getCountryByCode } from '@/utils/countries';

interface PhoneInputProps {
  value: string;
  countryCode: string;
  onPhoneChange: (phone: string) => void;
  onCountryChange: (countryCode: string) => void;
  className?: string;
}

export default function PhoneInput({ 
  value, 
  countryCode, 
  onPhoneChange, 
  onCountryChange, 
  className = "" 
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCountry = getCountryByCode(countryCode);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value.replace(/[^\d]/g, ''); // Only allow digits
    onPhoneChange(phone);
  };

  const handleCountrySelect = (code: string) => {
    onCountryChange(code);
    setIsOpen(false);
  };

  return (
    <div className={`flex ${className}`}>
      {/* Country Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {selectedCountry?.flag && (
            <span className="text-lg">{selectedCountry.flag}</span>
          )}
          <span className="text-sm font-medium">{selectedCountry?.phoneCode}</span>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 z-10 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2">
              <input
                type="text"
                placeholder="Search country..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {countries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country.code)}
                  className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <span className="text-lg">{country.flag}</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{country.name}</div>
                    <div className="text-xs text-gray-500">{country.phoneCode}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phone Number Input */}
      <input
        type="tel"
        value={value}
        onChange={handlePhoneChange}
        placeholder="Phone number"
        className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}
