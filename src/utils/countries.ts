import { getName } from 'country-list';

export interface Country {
  code: string;
  name: string;
  phoneCode: string;
  flag: string;
}

// Country phone codes mapping
const countryPhoneCodes: Record<string, string> = {
  'US': '+1',
  'GB': '+44',
  'CA': '+1',
  'AU': '+61',
  'DE': '+49',
  'FR': '+33',
  'IT': '+39',
  'ES': '+34',
  'NL': '+31',
  'BE': '+32',
  'CH': '+41',
  'AT': '+43',
  'SE': '+46',
  'NO': '+47',
  'DK': '+45',
  'FI': '+358',
  'IE': '+353',
  'PT': '+351',
  'GR': '+30',
  'CZ': '+420',
  'PL': '+48',
  'HU': '+36',
  'RO': '+40',
  'BG': '+359',
  'HR': '+385',
  'SI': '+386',
  'SK': '+421',
  'EE': '+372',
  'LV': '+371',
  'LT': '+370',
  'RU': '+7',
  'UA': '+380',
  'BY': '+375',
  'MD': '+373',
  'TR': '+90',
  'IL': '+972',
  'JO': '+962',
  'SA': '+966',
  'AE': '+971',
  'QA': '+974',
  'KW': '+965',
  'BH': '+973',
  'OM': '+968',
  'EG': '+20',
  'ZA': '+27',
  'NG': '+234',
  'KE': '+254',
  'TZ': '+255',
  'UG': '+256',
  'GH': '+233',
  'CI': '+225',
  'SN': '+221',
  'ML': '+223',
  'BF': '+226',
  'NE': '+227',
  'TD': '+235',
  'CM': '+237',
  'GA': '+241',
  'CG': '+242',
  'CD': '+243',
  'AO': '+244',
  'MW': '+265',
  'ZM': '+260',
  'ZW': '+263',
  'BW': '+267',
  'SZ': '+268',
  'LS': '+266',
  'MZ': '+258',
  'IN': '+91',
  'PK': '+92',
  'BD': '+880',
  'LK': '+94',
  'NP': '+977',
  'BT': '+975',
  'MV': '+960',
  'MM': '+95',
  'TH': '+66',
  'VN': '+84',
  'KH': '+855',
  'LA': '+856',
  'PH': '+63',
  'MY': '+60',
  'SG': '+65',
  'ID': '+62',
  'BN': '+673',
  'TW': '+886',
  'HK': '+852',
  'MO': '+853',
  'KR': '+82',
  'JP': '+81',
  'CN': '+86',
  'MX': '+52',
  'AR': '+54',
  'BR': '+55',
  'CL': '+56',
  'CO': '+57',
  'PE': '+51',
  'VE': '+58',
  'EC': '+593',
  'BO': '+591',
  'PY': '+595',
  'UY': '+598',
  'GY': '+592',
  'SR': '+597',
  'GF': '+594',
  'CR': '+506',
  'PA': '+507',
  'GT': '+502',
  'SV': '+503',
  'HN': '+504',
  'NI': '+505',
  'CU': '+53',
  'JM': '+1876',
  'DO': '+1809',
  'HT': '+509',
  'PR': '+1787',
  'TT': '+1868',
  'BB': '+1246',
  'GD': '+1473',
  'LC': '+1758',
  'VC': '+1784',
  'AG': '+1268',
  'DM': '+1767',
  'BS': '+1242',
  'BZ': '+501',
  'NZ': '+64',
  'FJ': '+679',
  'PG': '+675',
  'SB': '+677',
  'VU': '+678',
  'NC': '+687',
  'PF': '+689',
  'WS': '+685',
  'KI': '+686',
  'TV': '+688',
  'NU': '+683',
  'TO': '+676',
  'PW': '+680',
  'FM': '+691',
  'MH': '+692',
  'MP': '+1670',
  'GU': '+1671',
  'VI': '+1340',
  'KY': '+1345',
  'BM': '+1441',
  'AI': '+1264',
  'MS': '+1664',
  'TC': '+1649',
  'VG': '+1284',
  'AS': '+1684',
};

// Generate country list with phone codes and flags
export const countries: Country[] = Object.keys(countryPhoneCodes)
  .map(code => ({
    code,
    name: getName(code) || code,
    phoneCode: countryPhoneCodes[code],
    flag: getFlagEmoji(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Helper function to get flag emoji from country code
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Get country by code
export function getCountryByCode(code: string): Country | undefined {
  return countries.find(country => country.code === code);
}

// Get country by phone code
export function getCountryByPhoneCode(phoneCode: string): Country | undefined {
  return countries.find(country => country.phoneCode === phoneCode);
}

// Parse phone number to extract country code and number
export function parsePhoneNumber(phone: string): { countryCode?: string; phoneNumber: string } {
  // Remove all non-digit characters except + at the beginning
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Find country code by matching the longest possible prefix
  let matchedCountry: Country | undefined;
  let remainingNumber = cleanPhone;
  
  // Sort countries by phone code length (longest first) to match the most specific code
  const sortedCountries = [...countries].sort((a, b) => b.phoneCode.length - a.phoneCode.length);
  
  for (const country of sortedCountries) {
    if (cleanPhone.startsWith(country.phoneCode)) {
      matchedCountry = country;
      remainingNumber = cleanPhone.substring(country.phoneCode.length);
      break;
    }
  }
  
  return {
    countryCode: matchedCountry?.code,
    phoneNumber: remainingNumber,
  };
}

// Format phone number with country code
export function formatPhoneNumber(countryCode: string, phoneNumber: string): string {
  const country = getCountryByCode(countryCode);
  if (!country) return phoneNumber;
  
  return `${country.phoneCode}${phoneNumber}`;
}
