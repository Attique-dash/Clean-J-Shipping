"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "react-toastify";
import { 
  Upload, 
  FileText, 
  DollarSign, 
  Package, 
  Plus, 
  X, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar,
  Weight,
  User,
  Plane,
  Ship,
  RefreshCw,
  File,
  ChevronDown
} from "lucide-react";
import ReactCountryFlag from "react-country-flag";

interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  decimalPlaces: number;
  format: string;
  countryCode?: string;
}

interface PackageData {
  id?: string;
  tracking_number: string;
  description?: string;
  weight?: string;
  status: string;
  current_location?: string;
  invoice_status?: string;
  invoice_uploaded_date?: string;
  shipper?: string;
  warehouse_location?: string;
  serviceMode?: 'air' | 'ocean' | 'local';
  daysInStorage?: number;
  itemValueUsd?: number;
  created_at?: string;
  received_date?: string;
  hasInvoice?: boolean;
  invoiceNumber?: string;
  price_paid?: number;
  currency?: string;
}

interface InvoiceUpload {
  tracking_number: string;
  price_paid: number;
  currency: string;
  invoice_files: File[];
  description?: string;
  item_description?: string;
  item_category?: string;
  item_quantity?: number;
  hs_code?: string;
  declared_value?: number;
  supplier_name?: string;
  supplier_address?: string;
  purchase_date?: string;
}

// Currency data for card selectors - same as EnhancedCurrencySelector
const cardCurrencies: Currency[] = [
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
  { code: "XCD", name: "Eastern Caribbean Dollar", symbol: "EC$", exchangeRate: 2.70, decimalPlaces: 2, format: "EC$1,234.56", countryCode: "LC" },
  { code: "BSD", name: "Bahamian Dollar", symbol: "B$", exchangeRate: 1.0, decimalPlaces: 2, format: "B$1,234.56", countryCode: "BS" },
  { code: "HTG", name: "Haitian Gourde", symbol: "G", exchangeRate: 132.50, decimalPlaces: 2, format: "G1,234.56", countryCode: "HT" },
  { code: "XOF", name: "West African CFA Franc", symbol: "CFA", exchangeRate: 605.25, decimalPlaces: 0, format: "CFA1,234", countryCode: "SN" },
  { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", exchangeRate: 605.25, decimalPlaces: 0, format: "FCFA1,234", countryCode: "CM" },
  
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

// Simple currency selector component for cards
function CardCurrencySelector({ 
  selectedCurrency, 
  onCurrencyChange, 
  className = "" 
}: { 
  selectedCurrency: string; 
  onCurrencyChange: (currency: string) => void; 
  className?: string; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedCurrencyData = cardCurrencies.find(c => c.code === selectedCurrency) || cardCurrencies[0];

  function getFlagForCountry(countryCode: string) {
    try {
      return (
        <ReactCountryFlag 
          countryCode={countryCode} 
          svg
          style={{
            width: '20px',
            height: '14px',
            borderRadius: '2px',
            objectFit: 'cover'
          }}
        />
      );
    } catch {
      return <div className="w-5 h-3.5 bg-gray-200 rounded-sm flex items-center justify-center text-xs">?</div>;
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent bg-white text-gray-900 hover:bg-gray-50 text-sm"
      >
        {selectedCurrencyData?.countryCode && getFlagForCountry(selectedCurrencyData.countryCode)}
        <span className="font-medium">{selectedCurrencyData?.symbol || "$"}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""} text-gray-500`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown positioned below button */}
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[200px] max-h-60 overflow-y-auto">
            <div className="py-1">
              {cardCurrencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => {
                    onCurrencyChange(currency.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                    selectedCurrency === currency.code ? "bg-blue-50 text-blue-700" : "text-gray-900"
                  }`}
                >
                  <div className="shrink-0">
                    {currency.countryCode && getFlagForCountry(currency.countryCode)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{currency.symbol}</span>
                      <div className="flex-1 truncate">
                        <div className="font-medium text-xs truncate">{currency.name}</div>
                        <div className="text-xs text-gray-500">{currency.code}</div>
                      </div>
                    </div>
                  </div>
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

export default function CustomerInvoiceUploadPage() {
  const { data: session } = useSession();
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<{[key: string]: boolean}>({});
  const { selectedCurrency, setSelectedCurrency, formatCurrency } = useCurrency();
  
  const [currentUpload, setCurrentUpload] = useState<InvoiceUpload>({
    tracking_number: "",
    price_paid: 0,
    currency: selectedCurrency || "JMD",
    invoice_files: [],
    description: "",
    item_description: "",
    item_category: "",
    item_quantity: 1,
    hs_code: "",
    declared_value: 0,
    supplier_name: "",
    supplier_address: "",
    purchase_date: new Date().toISOString().split('T')[0]
  });

  // Update currentUpload currency when global currency changes
  useEffect(() => {
    setCurrentUpload(prev => ({
      ...prev,
      currency: selectedCurrency
    }));
  }, [selectedCurrency]);

  const [isDragging, setIsDragging] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    if (session?.user) {
      loadPackages();
    } else if (session === null) {
      setLoading(false);
    }
  }, [session]);

  async function loadPackages() {
    try {
      const res = await fetch("/api/customer/packages", {
        credentials: "include",
        cache: "no-store",
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load packages");
      
      const list: PackageData[] = Array.isArray(data?.packages) ? data.packages : [];
      const receivedPackages = list.filter(pkg => 
        pkg.status === "received" || 
        pkg.status === "in_processing" ||
        pkg.status === "pending" ||
        pkg.status === "processing" ||
        pkg.status === "in_transit" ||
        pkg.status === "shipped"
      );
      setPackages(receivedPackages);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load packages");
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (trackingNumber: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type)) {
          toast.error(`Invalid file type: ${file.name}. Only PDF, JPG, PNG, and DOC files are allowed.`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File too large: ${file.name}. Maximum size is 10MB.`);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        setCurrentUpload(prev => ({
          ...prev,
          tracking_number: trackingNumber,
          invoice_files: validFiles
        }));
      }
    }
  };

  const handleDragOver = (trackingNumber: string, e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(prev => ({ ...prev, [trackingNumber]: true }));
  };

  const handleDragLeave = (trackingNumber: string, e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(prev => ({ ...prev, [trackingNumber]: false }));
  };

  const handleDrop = (trackingNumber: string, e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(prev => ({ ...prev, [trackingNumber]: false }));
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}. Only PDF, JPG, PNG, and DOC files are allowed.`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File too large: ${file.name}. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setCurrentUpload(prev => ({
        ...prev,
        tracking_number: trackingNumber,
        invoice_files: validFiles
      }));
    }
  };

  const removeFile = (index: number) => {
    setCurrentUpload(prev => ({
      ...prev,
      invoice_files: prev.invoice_files.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (trackingNumber: string) => {
    if (!currentUpload.invoice_files || currentUpload.invoice_files.length === 0) {
      toast.error("Please select at least one invoice file");
      return;
    }

    if (!currentUpload.price_paid || currentUpload.price_paid <= 0) {
      toast.error("Please enter a valid price paid");
      return;
    }

    setUploading(prev => ({ ...prev, [trackingNumber]: true }));

    try {
      const formData = new FormData();
      
      // Add files
      currentUpload.invoice_files.forEach((file, index) => {
        formData.append(`invoice_files_${index}`, file);
      });

      // Add other data
      const uploadData = {
        tracking_number: trackingNumber,
        price_paid: currentUpload.price_paid,
        currency: currentUpload.currency,
        description: currentUpload.description,
        item_description: currentUpload.item_description,
        item_category: currentUpload.item_category,
        item_quantity: currentUpload.item_quantity,
        hs_code: currentUpload.hs_code,
        declared_value: currentUpload.declared_value,
        supplier_name: currentUpload.supplier_name,
        supplier_address: currentUpload.supplier_address,
        purchase_date: currentUpload.purchase_date,
        files_count: currentUpload.invoice_files.length
      };

      formData.append('data', JSON.stringify(uploadData));

      const res = await fetch("/api/customer/invoice-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || "Failed to upload invoice");

      toast.success(`Invoice uploaded successfully for ${trackingNumber}!`);
      
      // Reset form for this package
      setCurrentUpload({
        tracking_number: "",
        price_paid: 0,
        currency: selectedCurrency,
        invoice_files: [],
        description: "",
        item_description: "",
        item_category: "",
        item_quantity: 1,
        hs_code: "",
        declared_value: 0,
        supplier_name: "",
        supplier_address: "",
        purchase_date: new Date().toISOString().split('T')[0]
      });

      // Reload packages to update status
      await loadPackages();

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload invoice");
    } finally {
      setUploading(prev => ({ ...prev, [trackingNumber]: false }));
    }
  };

  const getInvoiceStatusBadge = (pkg: PackageData) => {
    if (pkg.hasInvoice || pkg.invoice_status === 'uploaded') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Invoice Uploaded
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
        <AlertCircle className="w-3 h-3 mr-1" />
        Invoice Required
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysInStorage = (pkg: PackageData) => {
    if (pkg.daysInStorage) return pkg.daysInStorage;
    
    if (pkg.received_date) {
      const received = new Date(pkg.received_date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - received.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    return 0;
  };

  if (loading && session === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#0f4d8a] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600 mx-auto mb-6">
              <Package className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please log in to upload invoices</p>
            <a
              href="/login"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-xl hover:shadow-lg transition-all font-medium"
            >
              Sign In to Your Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.15) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative z-10 space-y-6">
          <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold leading-tight md:text-3xl">Invoice Upload</h1>
                    <p className="text-blue-100 mt-1 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {packages.length} packages available for invoice upload
                      <span className="ml-2 rounded-full bg-green-100/20 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-green-100">Ready</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => loadPackages()}
                  className="flex items-center space-x-2 px-6 py-3 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/25 transition-all duration-200 font-medium"
                >
                  <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </header>

          {packages.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">
                  <Package className="h-10 w-10 text-gray-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No packages available</h3>
                  <p className="text-sm text-gray-600">You don't have any packages that require invoice upload at the moment.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
              {packages.map((pkg) => (
                <div key={pkg.tracking_number} className="bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:border-[#0f4d8a] overflow-visible group transform hover:scale-[1.01] relative">
                  <div className="bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                          <Package className="h-6 w-6 text-white" />
                        </div>
                        {getInvoiceStatusBadge(pkg)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white mb-1">{pkg.invoiceNumber || pkg.tracking_number}</h3>
                        <p className="text-xs text-blue-100 flex items-center gap-1">
                          {pkg.serviceMode?.toLowerCase() === 'ocean' ? (
                            <><Ship className="h-3 w-3" /> {pkg.serviceMode?.toUpperCase() || 'OCEAN'}</>
                          ) : pkg.serviceMode?.toLowerCase() === 'air' ? (
                            <><Plane className="h-3 w-3" /> {pkg.serviceMode?.toUpperCase() || 'AIR'}</>
                          ) : (
                            <><Package className="h-3 w-3" /> {pkg.serviceMode?.toUpperCase() || 'LOCAL'}</>
                          )}
                          <span className="text-blue-200">•</span>
                          <span>{pkg.weight || 'N/A'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-gray-500 mb-1">Days</p>
                        <p className="font-semibold text-gray-900">{getDaysInStorage(pkg)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-gray-500 mb-1">Shipper</p>
                        <p className="font-semibold text-gray-900 truncate">{pkg.shipper || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Tracking:</span>
                        <span className="font-medium text-gray-900">{pkg.tracking_number}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Date:</span>
                        <span className="font-medium text-gray-900">{formatDate(pkg.created_at)}</span>
                      </div>
                    </div>

                    {pkg.status === "received" && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                        <div className="flex items-center gap-2 text-green-700">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs font-medium">Received at {pkg.warehouse_location || 'warehouse'}</span>
                        </div>
                      </div>
                    )}

                    {(!pkg.hasInvoice && pkg.invoice_status !== 'uploaded') && (
                      <div className="space-y-3 pt-2 border-t border-gray-100">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Price Paid</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={currentUpload.tracking_number === pkg.tracking_number ? currentUpload.price_paid : ''}
                              onChange={(e) => setCurrentUpload(prev => ({
                                ...prev,
                                tracking_number: pkg.tracking_number,
                                price_paid: parseFloat(e.target.value) || 0
                              }))}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f4d8a] focus:border-transparent text-sm"
                            />
                            <CardCurrencySelector
                              selectedCurrency={currentUpload.tracking_number === pkg.tracking_number ? currentUpload.currency : selectedCurrency}
                              onCurrencyChange={(currency) => {
                                setCurrentUpload(prev => ({
                                  ...prev,
                                  tracking_number: pkg.tracking_number,
                                  currency: currency
                                }));
                                // Also update global currency if this is the active upload
                                if (currentUpload.tracking_number === pkg.tracking_number) {
                                  setSelectedCurrency(currency);
                                }
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Files</label>
                          <div
                            className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                              isDragging[pkg.tracking_number]
                                ? 'border-[#0f4d8a] bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            onDragOver={(e) => handleDragOver(pkg.tracking_number, e)}
                            onDragLeave={(e) => handleDragLeave(pkg.tracking_number, e)}
                            onDrop={(e) => handleDrop(pkg.tracking_number, e)}
                          >
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => handleFileChange(pkg.tracking_number, e)}
                              className="hidden"
                              id={`file-upload-${pkg.tracking_number}`}
                            />
                            <label
                              htmlFor={`file-upload-${pkg.tracking_number}`}
                              className="cursor-pointer flex flex-col items-center space-y-2"
                            >
                              <Upload className="h-5 w-5 text-gray-400" />
                              <span className="text-xs text-gray-600">
                                Drag & drop or click to upload
                              </span>
                              <span className="text-xs text-gray-400">
                                PDF, JPG, PNG, DOC (max 10MB)
                              </span>
                            </label>
                          </div>
                        </div>

                        {currentUpload.tracking_number === pkg.tracking_number && currentUpload.invoice_files.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-700">Selected Files:</p>
                            {currentUpload.invoice_files.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                                <div className="flex items-center space-x-2">
                                  <File className="h-4 w-4 text-gray-500" />
                                  <span className="text-xs text-gray-700 truncate">{file.name}</span>
                                </div>
                                <button
                                  onClick={() => removeFile(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => handleSubmit(pkg.tracking_number)}
                          disabled={uploading[pkg.tracking_number] || !currentUpload.invoice_files.length || currentUpload.price_paid <= 0}
                          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-gradient-to-r from-[#0f4d8a] to-[#1e6bb8] text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {uploading[pkg.tracking_number] ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              <span>Upload Invoice</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
