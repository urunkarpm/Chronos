import { CurrencyOption, ExchangeRatesMap } from '../types';

export const MAJOR_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: 'US' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: 'EU' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: 'GB' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: 'IN' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: 'JP' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', flag: 'CA' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: 'AU' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: 'CH' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: 'CN' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', flag: 'AE' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: 'SG' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: 'KR' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: 'BR' },
  { code: 'MXN', symbol: 'MEX$', name: 'Mexican Peso', flag: 'MX' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: 'SE' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: 'NZ' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: 'ZA' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: 'TR' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', flag: 'SA' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', flag: 'EG' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: 'TH' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: 'ID' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: 'PH' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: 'HK' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: 'NO' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: 'DK' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', flag: 'PL' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', flag: 'IL' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: 'MY' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: 'VN' },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', flag: 'CL' },
  { code: 'COP', symbol: 'COP$', name: 'Colombian Peso', flag: 'CO' },
  { code: 'ARS', symbol: 'ARS$', name: 'Argentine Peso', flag: 'AR' },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', flag: 'PK' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: 'BD' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: 'NG' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', flag: 'KE' },
  { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal', flag: 'QA' },
  { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar', flag: 'KW' },
  { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', flag: 'OM' },
  { code: 'BHD', symbol: 'BHD', name: 'Bahraini Dinar', flag: 'BH' },
];

const COUNTRY_TO_CURRENCY_CODE: Record<string, string> = {
  US: 'USD',
  IN: 'INR',
  GB: 'GBP',
  JP: 'JPY',
  CA: 'CAD',
  AU: 'AUD',
  CH: 'CHF',
  CN: 'CNY',
  AE: 'AED',
  SG: 'SGD',
  KR: 'KRW',
  BR: 'BRL',
  MX: 'MXN',
  SE: 'SEK',
  NZ: 'NZD',
  ZA: 'ZAR',
  TR: 'TRY',
  SA: 'SAR',
  EG: 'EGP',
  TH: 'THB',
  ID: 'IDR',
  PH: 'PHP',
  HK: 'HKD',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  IL: 'ILS',
  MY: 'MYR',
  VN: 'VND',
  CL: 'CLP',
  CO: 'COP',
  AR: 'ARS',
  PK: 'PKR',
  BD: 'BDT',
  NG: 'NGN',
  KE: 'KES',
  QA: 'QAR',
  KW: 'KWD',
  OM: 'OMR',
  BH: 'BHD',
  // Eurozone countries
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  IE: 'EUR',
  PT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
};

export function getCurrencyForCountry(countryCode?: string): CurrencyOption {
  if (!countryCode) return { code: 'USD', symbol: '$', name: 'US Dollar', flag: 'US' };
  const code = countryCode.toUpperCase();
  const targetCurrencyCode = COUNTRY_TO_CURRENCY_CODE[code] || code;
  const match = MAJOR_CURRENCIES.find((c) => c.code === targetCurrencyCode);
  if (match) return match;

  return { code: 'USD', symbol: '$', name: 'US Dollar', flag: 'US' };
}

export function getCurrencyByCode(code: string): CurrencyOption {
  const upper = (code || 'USD').toUpperCase();
  const match = MAJOR_CURRENCIES.find((c) => c.code === upper);
  if (match) return match;
  return { code: upper, symbol: upper, name: upper };
}

// In-memory cache for exchange rates
const ratesCache: Record<string, { timestamp: number; rates: ExchangeRatesMap }> = {};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchExchangeRates(baseCurrency: string): Promise<ExchangeRatesMap> {
  const base = (baseCurrency || 'USD').toUpperCase();

  const now = Date.now();
  if (ratesCache[base] && now - ratesCache[base].timestamp < CACHE_TTL_MS) {
    return ratesCache[base].rates;
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        ratesCache[base] = { timestamp: now, rates: data.rates };
        return data.rates;
      }
    }
  } catch (e) {
    console.warn(`Primary exchange rate fetch failed for ${base}:`, e);
  }

  // Fallback API
  try {
    const fallbackRes = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json();
      if (fallbackData && fallbackData.rates) {
        ratesCache[base] = { timestamp: now, rates: fallbackData.rates };
        return fallbackData.rates;
      }
    }
  } catch (e) {
    console.error(`Fallback exchange rate fetch failed for ${base}:`, e);
  }

  return ratesCache[base]?.rates || { [base]: 1 };
}

export interface FormattedExchangeRateDetails {
  tileCode: string;
  tileCountryCode: string;
  homeCode: string;
  homeCountryCode: string;
  tileSymbol: string;
  homeSymbol: string;
  normalText: string;
  flippedText: string;
  normalRateStr: string;
  flippedRateStr: string;
  isSameCurrency: boolean;
}

export function getExchangeRateDetails(
  baseCurrencyCode: string,
  targetCountryCode: string,
  rates: ExchangeRatesMap
): FormattedExchangeRateDetails {
  const homeCurrency = getCurrencyByCode(baseCurrencyCode);
  const tileCurrency = getCurrencyForCountry(targetCountryCode);

  const homeCode = homeCurrency.code.toUpperCase();
  const tileCode = tileCurrency.code.toUpperCase();

  const homeCountryCode = homeCurrency.flag || 'US';
  const tileCountryCode = (targetCountryCode || 'US').toUpperCase();

  const homeSymbol = homeCurrency.symbol;
  const tileSymbol = tileCurrency.symbol;

  if (homeCode === tileCode) {
    return {
      tileCode,
      tileCountryCode,
      homeCode,
      homeCountryCode,
      tileSymbol,
      homeSymbol,
      normalText: `1 ${tileSymbol} = 1 ${homeSymbol}`,
      flippedText: `1 ${homeSymbol} = 1 ${tileSymbol}`,
      normalRateStr: '1.00',
      flippedRateStr: '1.00',
      isSameCurrency: true,
    };
  }

  const rate = rates[tileCode]; // rates[tileCode] is tile currency units per 1 home currency unit
  if (!rate || isNaN(rate) || rate <= 0) {
    return {
      tileCode,
      tileCountryCode,
      homeCode,
      homeCountryCode,
      tileSymbol,
      homeSymbol,
      normalText: `${tileSymbol} ${tileCode}`,
      flippedText: `${homeSymbol} ${homeCode}`,
      normalRateStr: '1.00',
      flippedRateStr: '1.00',
      isSameCurrency: false,
    };
  }

  // 1 Tile Currency in Home Currency
  const valInHome = 1 / rate;
  let normalRateStr = '';
  if (valInHome >= 100) normalRateStr = valInHome.toFixed(1);
  else if (valInHome >= 1) normalRateStr = valInHome.toFixed(2);
  else if (valInHome >= 0.01) normalRateStr = valInHome.toFixed(3);
  else normalRateStr = valInHome.toFixed(4);

  // 100 Home Currency in Tile Currency
  const valInTileFor100Home = rate * 100;
  let flippedRateStr = '';
  if (valInTileFor100Home >= 100) flippedRateStr = valInTileFor100Home.toFixed(0);
  else if (valInTileFor100Home >= 1) flippedRateStr = valInTileFor100Home.toFixed(2);
  else flippedRateStr = valInTileFor100Home.toFixed(3);

  return {
    tileCode,
    tileCountryCode,
    homeCode,
    homeCountryCode,
    tileSymbol,
    homeSymbol,
    normalText: `1 ${tileSymbol} = ${normalRateStr} ${homeSymbol}`,
    flippedText: `100 ${homeSymbol} = ${flippedRateStr} ${tileSymbol}`,
    normalRateStr,
    flippedRateStr,
    isSameCurrency: false,
  };
}

export function formatExchangeRateText(
  baseCurrencyCode: string,
  targetCountryCode: string,
  rates: ExchangeRatesMap
): string {
  return getExchangeRateDetails(baseCurrencyCode, targetCountryCode, rates).normalText;
}


