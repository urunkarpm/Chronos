export type Continent = 'All' | 'Americas' | 'Europe' | 'Asia' | 'Africa' | 'Oceania' | 'Middle East' | 'Antarctica';

export type MapTileTheme = 'satellite';
export type MapProjection = 'flat' | 'globe';

export interface TimeRegion {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  flagEmoji: string;
  timezone: string;
  lat: number;
  lng: number;
  continent: Continent;
  description: string;
  landmark: string;
  population?: string;
  utcOffsetMinutes?: number;
  defaultVisible?: boolean;
}

export interface SolarInfo {
  sunrise: string;
  sunset: string;
  dayLength: string;
  isDaytime: boolean;
  dayProgressPercent: number; // 0 to 100
}

export interface AppPreferences {
  timeFormat: '12h' | '24h';
  soundEnabled: boolean;
  mapTheme: MapTileTheme;
  selectedContinent: Continent;
  showTerminator: boolean;
  referenceRegionId: string | null;
}
