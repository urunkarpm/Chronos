import { WeatherData } from '../types';

const WEATHER_CACHE = new Map<string, { data: WeatherData; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code === 85 || code === 86) return 'Snow Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Overcast';
}

export async function fetchWeatherData(lat: number, lng: number): Promise<WeatherData | null> {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = WEATHER_CACHE.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const json = await response.json();
    const current = json.current;
    if (!current) return null;

    const tempC = Math.round(current.temperature_2m);
    const tempF = Math.round((tempC * 9) / 5 + 32);
    const appC = Math.round(current.apparent_temperature ?? tempC);
    const appF = Math.round((appC * 9) / 5 + 32);

    const weatherData: WeatherData = {
      temperatureC: tempC,
      temperatureF: tempF,
      apparentTemperatureC: appC,
      apparentTemperatureF: appF,
      weatherCode: current.weather_code ?? 0,
      weatherDescription: getWeatherDescription(current.weather_code ?? 0),
      humidity: Math.round(current.relative_humidity_2m ?? 0),
      windSpeed: Math.round(current.wind_speed_10m ?? 0),
    };

    WEATHER_CACHE.set(cacheKey, { data: weatherData, timestamp: Date.now() });
    return weatherData;
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    return null;
  }
}
