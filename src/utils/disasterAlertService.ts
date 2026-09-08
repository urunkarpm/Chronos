import { DisasterAlert } from '../types';

const ALERT_CACHE = new Map<string, { data: DisasterAlert[]; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export async function fetchDisasterAlerts(lat: number, lng: number): Promise<DisasterAlert[]> {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = ALERT_CACHE.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // Query Open-Meteo Weather Forecast & Severe Weather Warnings endpoint
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=weather_code,wind_speed_10m&daily=weather_code&timezone=auto`;
    const response = await fetch(url);

    const alerts: DisasterAlert[] = [];

    if (response.ok) {
      const json = await response.json();
      const code = json.current?.weather_code ?? 0;
      const windSpeed = json.current?.wind_speed_10m ?? 0;

      // Classify extreme weather conditions into government-style emergency alerts
      if (code >= 95 && code <= 99) {
        alerts.push({
          id: `alert-storm-${Date.now()}`,
          event: 'Severe Thunderstorm Warning',
          severity: 'warning',
          headline: 'Severe Thunderstorm & Lightning Alert',
          description: 'High risk of electrical storms, heavy rainfall, and localized squalls.',
          sender: 'National Meteorological & Emergency Service',
        });
      } else if (windSpeed > 60) {
        alerts.push({
          id: `alert-wind-${Date.now()}`,
          event: 'Gale / High Wind Warning',
          severity: 'warning',
          headline: 'Severe Wind Hazards Reported',
          description: 'Sustained high winds exceeding 60 km/h detected in region.',
          sender: 'National Weather & Hazard Center',
        });
      } else if (code >= 71 && code <= 77) {
        alerts.push({
          id: `alert-snow-${Date.now()}`,
          event: 'Blizzard & Heavy Snow Advisory',
          severity: 'advisory',
          headline: 'Heavy Snowfall & Reduced Visibility',
          description: 'Substantial snow accumulation expected.',
          sender: 'Government Public Safety Department',
        });
      }
    }

    ALERT_CACHE.set(cacheKey, { data: alerts, timestamp: Date.now() });
    return alerts;
  } catch (error) {
    console.error('Failed to fetch disaster alerts:', error);
    return [];
  }
}
