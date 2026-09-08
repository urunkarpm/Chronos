export interface CountryInfo {
  dialingCode: string;
  capital: string;
}

export const COUNTRY_METADATA: Record<string, CountryInfo> = {
  US: { dialingCode: '+1', capital: 'Washington, D.C.' },
  GB: { dialingCode: '+44', capital: 'London' },
  IN: { dialingCode: '+91', capital: 'New Delhi' },
  JP: { dialingCode: '+81', capital: 'Tokyo' },
  AU: { dialingCode: '+61', capital: 'Canberra' },
  CA: { dialingCode: '+1', capital: 'Ottawa' },
  DE: { dialingCode: '+49', capital: 'Berlin' },
  FR: { dialingCode: '+33', capital: 'Paris' },
  IT: { dialingCode: '+39', capital: 'Rome' },
  ES: { dialingCode: '+34', capital: 'Madrid' },
  BR: { dialingCode: '+55', capital: 'Brasília' },
  MX: { dialingCode: '+52', capital: 'Mexico City' },
  CN: { dialingCode: '+86', capital: 'Beijing' },
  KR: { dialingCode: '+82', capital: 'Seoul' },
  RU: { dialingCode: '+7', capital: 'Moscow' },
  ZA: { dialingCode: '+27', capital: 'Pretoria' },
  EG: { dialingCode: '+20', capital: 'Cairo' },
  AE: { dialingCode: '+971', capital: 'Abu Dhabi' },
  SG: { dialingCode: '+65', capital: 'Singapore' },
  NZ: { dialingCode: '+64', capital: 'Wellington' },
  AR: { dialingCode: '+54', capital: 'Buenos Aires' },
  CL: { dialingCode: '+56', capital: 'Santiago' },
  CO: { dialingCode: '+57', capital: 'Bogotá' },
  PE: { dialingCode: '+51', capital: 'Lima' },
  VE: { dialingCode: '+58', capital: 'Caracas' },
  TH: { dialingCode: '+66', capital: 'Bangkok' },
  ID: { dialingCode: '+62', capital: 'Jakarta' },
  PH: { dialingCode: '+63', capital: 'Manila' },
  MY: { dialingCode: '+60', capital: 'Kuala Lumpur' },
  VN: { dialingCode: '+84', capital: 'Hanoi' },
  PK: { dialingCode: '+92', capital: 'Islamabad' },
  BD: { dialingCode: '+880', capital: 'Dhaka' },
  NG: { dialingCode: '+234', capital: 'Abuja' },
  KE: { dialingCode: '+254', capital: 'Nairobi' },
  QA: { dialingCode: '+974', capital: 'Doha' },
  KW: { dialingCode: '+965', capital: 'Kuwait City' },
  OM: { dialingCode: '+968', capital: 'Muscat' },
  BH: { dialingCode: '+973', capital: 'Manama' },
  IL: { dialingCode: '+972', capital: 'Jerusalem' },
  SA: { dialingCode: '+966', capital: 'Riyadh' },
  TR: { dialingCode: '+90', capital: 'Ankara' },
  GR: { dialingCode: '+30', capital: 'Athens' },
  PT: { dialingCode: '+351', capital: 'Lisbon' },
  IE: { dialingCode: '+353', capital: 'Dublin' },
  NL: { dialingCode: '+31', capital: 'Amsterdam' },
  BE: { dialingCode: '+32', capital: 'Brussels' },
  CH: { dialingCode: '+41', capital: 'Bern' },
  AT: { dialingCode: '+43', capital: 'Vienna' },
  SE: { dialingCode: '+46', capital: 'Stockholm' },
  NO: { dialingCode: '+47', capital: 'Oslo' },
  FI: { dialingCode: '+358', capital: 'Helsinki' },
  DK: { dialingCode: '+45', capital: 'Copenhagen' },
  PL: { dialingCode: '+48', capital: 'Warsaw' },
  CZ: { dialingCode: '+420', capital: 'Prague' },
  HU: { dialingCode: '+36', capital: 'Budapest' },
  RO: { dialingCode: '+40', capital: 'Bucharest' },
  UA: { dialingCode: '+380', capital: 'Kyiv' },
  IS: { dialingCode: '+354', capital: 'Reykjavík' },
  MA: { dialingCode: '+212', capital: 'Rabat' },
  TZ: { dialingCode: '+255', capital: 'Dodoma' },
  ET: { dialingCode: '+251', capital: 'Addis Ababa' },
  DZ: { dialingCode: '+213', capital: 'Algiers' },
  SD: { dialingCode: '+249', capital: 'Khartoum' },
  AO: { dialingCode: '+244', capital: 'Luanda' },
  CD: { dialingCode: '+243', capital: 'Kinshasa' },
  PG: { dialingCode: '+675', capital: 'Port Moresby' },
  NP: { dialingCode: '+977', capital: 'Kathmandu' },
  LK: { dialingCode: '+94', capital: 'Sri Jayawardenepura Kotte' },
};

export function getCountryDialingCode(countryCode: string): string {
  if (!countryCode) return 'N/A';
  const code = countryCode.toUpperCase();
  return COUNTRY_METADATA[code]?.dialingCode || 'N/A';
}

export function getCountryCapital(countryCode: string): string {
  if (!countryCode) return 'N/A';
  const code = countryCode.toUpperCase();
  return COUNTRY_METADATA[code]?.capital || 'N/A';
}
