"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, ArrowLeft, Save, Loader2, ChevronDown, Hash, RefreshCw, AlertCircle, CheckCircle2, User, Weight, MapPin, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import SharedModal from "@/components/admin/SharedModal";
import AddButton from "@/components/admin/AddButton";
import { generateTrackingNumber } from "@/lib/tracking";

// Dynamic imports for country and phone components
const ReactCountryFlag = dynamic(() => import("react-country-flag"), { ssr: false });

// Import PhoneInput component with proper ref handling
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

// Country data with codes and names - comprehensive list
const countries = [
  { code: 'AF', name: 'Afghanistan', dialCode: '+93' },
  { code: 'AL', name: 'Albania', dialCode: '+355' },
  { code: 'DZ', name: 'Algeria', dialCode: '+213' },
  { code: 'AD', name: 'Andorra', dialCode: '+376' },
  { code: 'AO', name: 'Angola', dialCode: '+244' },
  { code: 'AR', name: 'Argentina', dialCode: '+54' },
  { code: 'AM', name: 'Armenia', dialCode: '+374' },
  { code: 'AU', name: 'Australia', dialCode: '+61' },
  { code: 'AT', name: 'Austria', dialCode: '+43' },
  { code: 'AZ', name: 'Azerbaijan', dialCode: '+994' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880' },
  { code: 'BY', name: 'Belarus', dialCode: '+375' },
  { code: 'BE', name: 'Belgium', dialCode: '+32' },
  { code: 'BZ', name: 'Belize', dialCode: '+501' },
  { code: 'BJ', name: 'Benin', dialCode: '+229' },
  { code: 'BT', name: 'Bhutan', dialCode: '+975' },
  { code: 'BO', name: 'Bolivia', dialCode: '+591' },
  { code: 'BA', name: 'Bosnia and Herzegovina', dialCode: '+387' },
  { code: 'BW', name: 'Botswana', dialCode: '+267' },
  { code: 'BR', name: 'Brazil', dialCode: '+55' },
  { code: 'BN', name: 'Brunei', dialCode: '+673' },
  { code: 'BG', name: 'Bulgaria', dialCode: '+359' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226' },
  { code: 'BI', name: 'Burundi', dialCode: '+257' },
  { code: 'KH', name: 'Cambodia', dialCode: '+855' },
  { code: 'CM', name: 'Cameroon', dialCode: '+237' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'CV', name: 'Cape Verde', dialCode: '+238' },
  { code: 'CF', name: 'Central African Republic', dialCode: '+236' },
  { code: 'TD', name: 'Chad', dialCode: '+235' },
  { code: 'CL', name: 'Chile', dialCode: '+56' },
  { code: 'CN', name: 'China', dialCode: '+86' },
  { code: 'CO', name: 'Colombia', dialCode: '+57' },
  { code: 'KM', name: 'Comoros', dialCode: '+269' },
  { code: 'CG', name: 'Congo', dialCode: '+242' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506' },
  { code: 'HR', name: 'Croatia', dialCode: '+385' },
  { code: 'CU', name: 'Cuba', dialCode: '+53' },
  { code: 'CY', name: 'Cyprus', dialCode: '+357' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420' },
  { code: 'DK', name: 'Denmark', dialCode: '+45' },
  { code: 'DJ', name: 'Djibouti', dialCode: '+253' },
  { code: 'DM', name: 'Dominica', dialCode: '+1' },
  { code: 'DO', name: 'Dominican Republic', dialCode: '+1' },
  { code: 'EC', name: 'Ecuador', dialCode: '+593' },
  { code: 'EG', name: 'Egypt', dialCode: '+20' },
  { code: 'SV', name: 'El Salvador', dialCode: '+503' },
  { code: 'GQ', name: 'Equatorial Guinea', dialCode: '+240' },
  { code: 'ER', name: 'Eritrea', dialCode: '+291' },
  { code: 'EE', name: 'Estonia', dialCode: '+372' },
  { code: 'ET', name: 'Ethiopia', dialCode: '+251' },
  { code: 'FJ', name: 'Fiji', dialCode: '+679' },
  { code: 'FI', name: 'Finland', dialCode: '+358' },
  { code: 'FR', name: 'France', dialCode: '+33' },
  { code: 'GA', name: 'Gabon', dialCode: '+241' },
  { code: 'GM', name: 'Gambia', dialCode: '+220' },
  { code: 'GE', name: 'Georgia', dialCode: '+995' },
  { code: 'DE', name: 'Germany', dialCode: '+49' },
  { code: 'GH', name: 'Ghana', dialCode: '+233' },
  { code: 'GR', name: 'Greece', dialCode: '+30' },
  { code: 'GD', name: 'Grenada', dialCode: '+1' },
  { code: 'GT', name: 'Guatemala', dialCode: '+502' },
  { code: 'GN', name: 'Guinea', dialCode: '+224' },
  { code: 'GW', name: 'Guinea-Bissau', dialCode: '+245' },
  { code: 'GY', name: 'Guyana', dialCode: '+592' },
  { code: 'HT', name: 'Haiti', dialCode: '+509' },
  { code: 'HN', name: 'Honduras', dialCode: '+504' },
  { code: 'HU', name: 'Hungary', dialCode: '+36' },
  { code: 'IS', name: 'Iceland', dialCode: '+354' },
  { code: 'IN', name: 'India', dialCode: '+91' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62' },
  { code: 'IR', name: 'Iran', dialCode: '+98' },
  { code: 'IQ', name: 'Iraq', dialCode: '+964' },
  { code: 'IE', name: 'Ireland', dialCode: '+353' },
  { code: 'IL', name: 'Israel', dialCode: '+972' },
  { code: 'IT', name: 'Italy', dialCode: '+39' },
  { code: 'JM', name: 'Jamaica', dialCode: '+1' },
  { code: 'JP', name: 'Japan', dialCode: '+81' },
  { code: 'JO', name: 'Jordan', dialCode: '+962' },
  { code: 'KZ', name: 'Kazakhstan', dialCode: '+7' },
  { code: 'KE', name: 'Kenya', dialCode: '+254' },
  { code: 'KI', name: 'Kiribati', dialCode: '+686' },
  { code: 'KP', name: 'North Korea', dialCode: '+850' },
  { code: 'KR', name: 'South Korea', dialCode: '+82' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965' },
  { code: 'KG', name: 'Kyrgyzstan', dialCode: '+996' },
  { code: 'LA', name: 'Laos', dialCode: '+856' },
  { code: 'LV', name: 'Latvia', dialCode: '+371' },
  { code: 'LB', name: 'Lebanon', dialCode: '+961' },
  { code: 'LS', name: 'Lesotho', dialCode: '+266' },
  { code: 'LR', name: 'Liberia', dialCode: '+231' },
  { code: 'LY', name: 'Libya', dialCode: '+218' },
  { code: 'LI', name: 'Liechtenstein', dialCode: '+423' },
  { code: 'LT', name: 'Lithuania', dialCode: '+370' },
  { code: 'LU', name: 'Luxembourg', dialCode: '+352' },
  { code: 'MG', name: 'Madagascar', dialCode: '+261' },
  { code: 'MW', name: 'Malawi', dialCode: '+265' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60' },
  { code: 'MV', name: 'Maldives', dialCode: '+960' },
  { code: 'ML', name: 'Mali', dialCode: '+223' },
  { code: 'MT', name: 'Malta', dialCode: '+356' },
  { code: 'MH', name: 'Marshall Islands', dialCode: '+692' },
  { code: 'MR', name: 'Mauritania', dialCode: '+222' },
  { code: 'MU', name: 'Mauritius', dialCode: '+230' },
  { code: 'MX', name: 'Mexico', dialCode: '+52' },
  { code: 'FM', name: 'Micronesia', dialCode: '+691' },
  { code: 'MD', name: 'Moldova', dialCode: '+373' },
  { code: 'MC', name: 'Monaco', dialCode: '+377' },
  { code: 'MN', name: 'Mongolia', dialCode: '+976' },
  { code: 'ME', name: 'Montenegro', dialCode: '+382' },
  { code: 'MA', name: 'Morocco', dialCode: '+212' },
  { code: 'MZ', name: 'Mozambique', dialCode: '+258' },
  { code: 'MM', name: 'Myanmar', dialCode: '+95' },
  { code: 'NA', name: 'Namibia', dialCode: '+264' },
  { code: 'NR', name: 'Nauru', dialCode: '+674' },
  { code: 'NP', name: 'Nepal', dialCode: '+977' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64' },
  { code: 'NI', name: 'Nicaragua', dialCode: '+505' },
  { code: 'NE', name: 'Niger', dialCode: '+227' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234' },
  { code: 'MK', name: 'North Macedonia', dialCode: '+389' },
  { code: 'NO', name: 'Norway', dialCode: '+47' },
  { code: 'OM', name: 'Oman', dialCode: '+968' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92' },
  { code: 'PW', name: 'Palau', dialCode: '+680' },
  { code: 'PA', name: 'Panama', dialCode: '+507' },
  { code: 'PG', name: 'Papua New Guinea', dialCode: '+675' },
  { code: 'PY', name: 'Paraguay', dialCode: '+595' },
  { code: 'PE', name: 'Peru', dialCode: '+51' },
  { code: 'PH', name: 'Philippines', dialCode: '+63' },
  { code: 'PL', name: 'Poland', dialCode: '+48' },
  { code: 'PT', name: 'Portugal', dialCode: '+351' },
  { code: 'QA', name: 'Qatar', dialCode: '+974' },
  { code: 'RO', name: 'Romania', dialCode: '+40' },
  { code: 'RU', name: 'Russia', dialCode: '+7' },
  { code: 'RW', name: 'Rwanda', dialCode: '+250' },
  { code: 'WS', name: 'Samoa', dialCode: '+685' },
  { code: 'SM', name: 'San Marino', dialCode: '+378' },
  { code: 'ST', name: 'Sao Tome and Principe', dialCode: '+239' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
  { code: 'SN', name: 'Senegal', dialCode: '+221' },
  { code: 'RS', name: 'Serbia', dialCode: '+381' },
  { code: 'SC', name: 'Seychelles', dialCode: '+248' },
  { code: 'SL', name: 'Sierra Leone', dialCode: '+232' },
  { code: 'SG', name: 'Singapore', dialCode: '+65' },
  { code: 'SK', name: 'Slovakia', dialCode: '+421' },
  { code: 'SI', name: 'Slovenia', dialCode: '+386' },
  { code: 'SB', name: 'Solomon Islands', dialCode: '+677' },
  { code: 'SO', name: 'Somalia', dialCode: '+252' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27' },
  { code: 'ES', name: 'Spain', dialCode: '+34' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94' },
  { code: 'SD', name: 'Sudan', dialCode: '+249' },
  { code: 'SR', name: 'Suriname', dialCode: '+597' },
  { code: 'SZ', name: 'Eswatini', dialCode: '+268' },
  { code: 'SE', name: 'Sweden', dialCode: '+46' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41' },
  { code: 'SY', name: 'Syria', dialCode: '+963' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886' },
  { code: 'TJ', name: 'Tajikistan', dialCode: '+992' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255' },
  { code: 'TH', name: 'Thailand', dialCode: '+66' },
  { code: 'TL', name: 'Timor-Leste', dialCode: '+670' },
  { code: 'TG', name: 'Togo', dialCode: '+228' },
  { code: 'TO', name: 'Tonga', dialCode: '+676' },
  { code: 'TT', name: 'Trinidad and Tobago', dialCode: '+1' },
  { code: 'TN', name: 'Tunisia', dialCode: '+216' },
  { code: 'TR', name: 'Turkey', dialCode: '+90' },
  { code: 'TM', name: 'Turkmenistan', dialCode: '+993' },
  { code: 'TV', name: 'Tuvalu', dialCode: '+688' },
  { code: 'UG', name: 'Uganda', dialCode: '+256' },
  { code: 'UA', name: 'Ukraine', dialCode: '+380' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'UY', name: 'Uruguay', dialCode: '+598' },
  { code: 'UZ', name: 'Uzbekistan', dialCode: '+998' },
  { code: 'VU', name: 'Vanuatu', dialCode: '+678' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84' },
  { code: 'YE', name: 'Yemen', dialCode: '+967' },
  { code: 'ZM', name: 'Zambia', dialCode: '+260' },
  { code: 'ZW', name: 'Zimbabwe', dialCode: '+263' }
];

interface Customer {
  _id: string;
  userCode: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function WarehouseAddPackagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;
  
  const [open, setOpen] = useState(!isEditing); // Open modal for new packages
  const [submitting, setSubmitting] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [checkingTracking, setCheckingTracking] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedUserCode, setSelectedUserCode] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  
  // Form state for detailed package information
  const [form, setForm] = useState({
    weight: "",
    shipper: "",
    description: "",
    entryDate: new Date().toISOString().slice(0, 10),
    dimensions: {
      length: "",
      width: "",
      height: "",
      unit: "cm"
    },
    recipient: {
      name: "",
      email: "",
      shippingId: "",
      phone: "",
      address: "",
      country: ""
    },
    sender: {
      name: "",
      email: "",
      phone: "",
      address: "",
      country: ""
    },
    contents: "",
    value: "",
    specialInstructions: "",
    status: "received",
    branch: ""
  });

  // Check if tracking number is unique
  async function checkTrackingNumber(tn: string): Promise<boolean> {
    if (!tn.trim()) return false;
    setCheckingTracking(true);
    try {
      const res = await fetch(`/api/warehouse/packages?q=${encodeURIComponent(tn)}`, {
        cache: "no-store",
        credentials: 'include',
      });
      const data = await res.json();
      // If package exists, tracking number is not unique
      return !(data.packages && data.packages.length > 0);
    } catch {
      return true; // Assume unique on error
    } finally {
      setCheckingTracking(false);
    }
  }

  function generateNewTrackingNumber() {
    // Generate instantly without API calls - check uniqueness only on submit
    const newTn = generateTrackingNumber("PKG", true); // Use short format: PKG-XXXXXX
    setTrackingNumber(newTn);
    setTrackingError(null);
  }

  // Load customers function
  async function loadCustomers() {
    setLoadingCustomers(true);
    try {
      const res = await fetch("/api/customers", { 
        cache: "no-store",
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to load customers:", data?.error);
        setCustomers([]);
        return;
      }
      const list = Array.isArray(data) ? data : [];
      setCustomers(list);
    } catch (err) {
      console.error("Failed to load customers:", err);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }
  
  // Load package for editing
  async function loadPackageForEdit() {
    setFetchLoading(true);
    try {
      const res = await fetch(`/api/warehouse/packages/${editId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setTrackingNumber(data.trackingNumber || "");
        setSelectedUserCode(data.userCode || "");
        setForm({
          weight: data.weight?.toString() || "",
          shipper: data.shipper || "",
          description: data.description || "",
          entryDate: data.entryDate ? new Date(data.entryDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          dimensions: {
            length: data.dimensions?.length?.toString() || data.length?.toString() || "",
            width: data.dimensions?.width?.toString() || data.width?.toString() || "",
            height: data.dimensions?.height?.toString() || data.height?.toString() || "",
            unit: data.dimensions?.unit || data.dimensionUnit || "cm"
          },
          recipient: {
            name: data.recipient?.name || data.receiverName || "",
            email: data.recipient?.email || data.receiverEmail || "",
            shippingId: data.recipient?.shippingId || "",
            phone: data.recipient?.phone || data.receiverPhone || "",
            address: data.recipient?.address || data.receiverAddress || "",
            country: data.recipient?.country || data.receiverCountry || ""
          },
          sender: {
            name: data.sender?.name || data.senderName || "",
            email: data.sender?.email || data.senderEmail || "",
            phone: data.sender?.phone || data.senderPhone || "",
            address: data.sender?.address || data.senderAddress || "",
            country: data.sender?.country || data.senderCountry || ""
          },
          contents: data.contents || data.itemDescription || "",
          value: data.value?.toString() || data.itemValue?.toString() || "",
          specialInstructions: data.specialInstructions || "",
          status: data.status || "received",
          branch: data.branch || ""
        });
      }
    } catch (error) {
      console.error('Error loading package data:', error);
      toast.error('Error loading package data');
    } finally {
      setFetchLoading(false);
    }
  }
  
  // Handle customer selection
  const selectCustomer = async (customer: Customer) => {
    try {
      // Fetch complete customer data including phone and address
      const res = await fetch(`/api/customers/${customer.userCode}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const fullCustomerData = await res.json();
        
        setForm(prev => ({
          ...prev,
          recipient: {
            ...prev.recipient,
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
            phone: fullCustomerData.phone || '',
            address: fullCustomerData.address ? 
              `${fullCustomerData.address.street || ''}${fullCustomerData.address.street ? ', ' : ''}${fullCustomerData.address.city || ''}${fullCustomerData.address.city ? ', ' : ''}${fullCustomerData.address.state || ''}${fullCustomerData.address.state ? ' ' : ''}${fullCustomerData.address.zipCode || ''}`.replace(/, $/, '').replace(/ $/, '') : 
              '',
            country: fullCustomerData.address?.country || ''
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }
  };

  // Load customers when modal opens
  useEffect(() => {
    if (open && !isEditing) {
      loadCustomers();
      generateNewTrackingNumber();
    }
  }, [open, isEditing]);
  
  // Load package data for editing
  useEffect(() => {
    if (isEditing && editId) {
      loadPackageForEdit();
    }
  }, [isEditing, editId]);

  // Handle form submission
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    
    const tn = trackingNumber.trim() || String(data.get("tracking_number") || "").trim();
    const userCode = selectedUserCode.trim() || String(data.get("user_code") || "").trim();

    if (!tn || !userCode) {
      setTrackingError(!tn ? "Tracking number is required" : "Customer code is required");
      return;
    }

    // Check if tracking number is unique
    const isUnique = await checkTrackingNumber(tn);
    if (!isUnique) {
      setTrackingError("This tracking number already exists. Please generate a new one.");
      return;
    }

    const payload: Record<string, unknown> = {
      trackingNumber: tn,
      userCode: userCode,
      weight: form.weight ? Number(form.weight) : undefined,
      shipper: form.shipper,
      description: form.description,
      entryDate: form.entryDate,
      status: form.status,
      dimensions: {
        length: form.dimensions.length ? Number(form.dimensions.length) : undefined,
        width: form.dimensions.width ? Number(form.dimensions.width) : undefined,
        height: form.dimensions.height ? Number(form.dimensions.height) : undefined,
        unit: form.dimensions.unit
      },
      recipient: {
        name: form.recipient.name,
        email: form.recipient.email,
        shippingId: form.recipient.shippingId,
        phone: form.recipient.phone,
        address: form.recipient.address,
        country: form.recipient.country
      },
      sender: {
        name: form.sender.name,
        email: form.sender.email,
        phone: form.sender.phone,
        address: form.sender.address,
        country: form.sender.country
      },
      contents: form.contents,
      value: form.value ? Number(form.value) : undefined,
      specialInstructions: form.specialInstructions,
      branch: form.branch
    };

    setSubmitting(true);
    setTrackingError(null);
    try {
      const res = await fetch("/api/warehouse/packages/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      // Handle auth errors gracefully
      if (res.status === 401) {
        setTrackingError("Session expired. Please refresh the page to re-establish your session.");
        return;
      }
      
      if (res.status === 403) {
        setTrackingError("You don't have permission to perform this action.");
        return;
      }
      
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = j.error || res.statusText;
        if (errorMsg.toLowerCase().includes("tracking") || errorMsg.toLowerCase().includes("duplicate")) {
          setTrackingError(errorMsg);
        } else {
          setTrackingError(`Create failed: ${errorMsg}`);
        }
        return;
      }
      // Success - close modal and refresh page without full reload
      setOpen(false);
      form.reset();
      setTrackingNumber("");
      setSelectedUserCode("");
      setTrackingError(null);
      toast.success("Package created successfully");
      // Use soft refresh to maintain session
      window.location.href = "/warehouse/packages";
    } finally {
      setSubmitting(false);
    }
  }

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f4d8a]" />
      </div>
    );
  }

  return (
    <>
      {isEditing ? (
        // For editing, show the full page layout
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl mb-8">
              <div className="absolute inset-0 bg-white/10" />
              <div className="relative flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                      <Package className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-widest text-blue-100">Package Management</p>
                      <h1 className="text-3xl font-bold leading-tight md:text-4xl">Edit Package</h1>
                      <p className="text-blue-100 mt-1">Update package information</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <Link
                      href="/warehouse/packages"
                      className="group flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur px-3 py-2.5 sm:px-4 font-medium text-white shadow-md ring-1 ring-white/30 transition-all hover:bg-white/30 hover:shadow-lg text-sm sm:text-base"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Back to Packages</span>
                    </Link>
                  </div>
                </div>
              </div>
            </header>

            {/* Form Section - For editing, show full form */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Edit Package Information
                </h2>
              </div>
              
              <form onSubmit={onSubmit} className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-900">Basic Information</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tracking Number *</label>
                      <input
                        type="text"
                        className="block flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="Enter tracking number"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        required
                        readOnly={isEditing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
                      <div className="relative">
                        <select
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                          value={selectedUserCode}
                          onChange={(e) => {
                            const customer = customers.find(c => c.userCode === e.target.value);
                            if (customer) {
                              setSelectedUserCode(customer.userCode);
                              selectCustomer(customer);
                            }
                          }}
                          required
                        >
                          <option value="">Select a customer...</option>
                          {customers.map(customer => (
                            <option key={customer._id} value={customer.userCode}>
                              {customer.firstName} {customer.lastName} ({customer.userCode})
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="0.0"
                        value={form.weight}
                        onChange={(e) => setForm({ ...form, weight: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Shipper</label>
                      <input
                        type="text"
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="Shipper name"
                        value={form.shipper}
                        onChange={(e) => setForm({ ...form, shipper: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Entry Date</label>
                      <input
                        type="date"
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        value={form.entryDate}
                        onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      rows={3}
                      placeholder="Package description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="received">Received</option>
                      <option value="in_processing">In Processing</option>
                      <option value="ready_to_ship">Ready to Ship</option>
                      <option value="shipped">Shipped</option>
                      <option value="in_transit">In Transit</option>
                      <option value="delivered">Delivered</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <Link
                      href="/warehouse/packages"
                      className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#0a3d6e] px-6 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Update Package
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        // For new packages, show the modal-based UI like admin portal
        <>
          <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header Section */}
              <header className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-r from-[#0f4d8a] via-[#0e447d] to-[#0d3d70] p-6 text-white shadow-2xl">
                <div className="absolute inset-0 bg-white/10" />
                <div className="relative flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                        <Package className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-widest text-blue-100">Package Management</p>
                        <h1 className="text-3xl font-bold leading-tight md:text-4xl">Warehouse Packages</h1>
                        <p className="text-blue-100 mt-1">Manage and add new packages</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <AddButton className="bg-white/15 text-white hover:bg-white/25" onClick={() => setOpen(true)} label="Add Package" />
                    </div>
                  </div>
                </div>
              </header>
            </div>
          </div>

          <SharedModal 
            open={open} 
            title="Add New Package" 
            onClose={() => {
              setOpen(false);
              setTrackingNumber("");
              setTrackingError(null);
              setSelectedUserCode("");
            }}
            footer={(
              <>
                <button 
                  type="button" 
                  onClick={() => {
                    setOpen(false);
                    setTrackingNumber("");
                    setTrackingError(null);
                    setSelectedUserCode("");
                  }} 
                  className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  form="add-pkg-form" 
                  type="submit" 
                  disabled={submitting || checkingTracking} 
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f4d8a] to-[#0e7893] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Create Package
                    </>
                  )}
                </button>
              </>
            )}
          >
            <form id="add-pkg-form" onSubmit={onSubmit} className="space-y-4">
              {/* Tracking Number */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Hash className="h-4 w-4 text-gray-500" />
                  Tracking Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input 
                    name="tracking_number" 
                    value={trackingNumber}
                    onChange={(e) => {
                      setTrackingNumber(e.target.value);
                      setTrackingError(null);
                    }}
                    required 
                    placeholder="Auto-generated tracking number"
                    className={`flex-1 rounded-xl border-2 px-4 py-3 font-medium text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20 ${
                      trackingError 
                        ? "border-red-300 focus:border-red-500" 
                        : "border-gray-200 focus:border-[#0f4d8a]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={generateNewTrackingNumber}
                    className="flex items-center gap-2 rounded-xl border-2 border-[#0f4d8a] bg-[#0f4d8a] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#0e447d]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Generate
                  </button>
                </div>
                {trackingError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <p className="text-xs text-red-700">{trackingError}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  A unique tracking number is automatically generated. Click &quot;Generate&quot; to create a new one.
                </p>
              </div>

              {/* Customer Selection */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <User className="h-4 w-4 text-gray-500" />
                  Customer <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="user_code"
                    value={selectedUserCode}
                    onChange={(e) => {
                      setSelectedUserCode(e.target.value);
                      const customer = customers.find(c => c.userCode === e.target.value);
                      if (customer) {
                        selectCustomer(customer);
                      }
                    }}
                    required
                    disabled={loadingCustomers}
                    className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-gray-900 transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20 disabled:opacity-50"
                  >
                    <option value="">Select a customer...</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c.userCode}>
                        {c.firstName} {c.lastName} ({c.userCode})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500">
                  {loadingCustomers ? "Loading customers..." : "Select a customer from the list"}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Weight */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Weight className="h-4 w-4 text-gray-500" />
                    Weight (kg)
                  </label>
                  <input 
                    name="weight" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium text-gray-900 transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
                  />
                </div>

                {/* Shipper */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Package className="h-4 w-4 text-gray-500" />
                    Shipper
                  </label>
                  <input 
                    name="shipper" 
                    placeholder="Shipper name"
                    value={form.shipper}
                    onChange={(e) => setForm({ ...form, shipper: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium text-gray-900 transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20" 
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FileText className="h-4 w-4 text-gray-500" />
                  Package Description
                </label>
                <textarea 
                  name="description" 
                  rows={3}
                  placeholder="Describe the package contents..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium text-gray-900 transition-all focus:border-[#0f4d8a] focus:outline-none focus:ring-2 focus:ring-[#0f4d8a]/20 resize-none" 
                />
              </div>

              {/* Info Box */}
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Quick Tip</p>
                    <p className="mt-1 text-xs text-blue-700">
                      Make sure the tracking number is unique. You can add dimensions and other details after creating the package.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </SharedModal>
        </>
      )}
    </>
  );
}
