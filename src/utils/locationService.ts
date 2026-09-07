import tzlookup from 'tz-lookup';
import { TimeRegion, Continent } from '../types';

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌐';
  }
}

export function deriveContinent(
  lat: number,
  lng: number,
  countryCode: string,
  timezone: string
): Continent {
  const code = (countryCode || '').toUpperCase();
  const tz = timezone || '';

  if (code === 'AQ' || lat < -55 || tz.startsWith('Antarctica/')) return 'Antarctica';

  const middleEastCodes = new Set([
    'AE', 'SA', 'QA', 'OM', 'KW', 'BH', 'IL', 'JO', 'LB', 'IQ', 'IR', 'YE', 'SY', 'TR', 'EG',
  ]);
  if (middleEastCodes.has(code)) return 'Middle East';

  if (tz.startsWith('America/') || tz.startsWith('Canada/') || tz.startsWith('US/')) return 'Americas';
  if (tz.startsWith('Europe/')) return 'Europe';
  if (tz.startsWith('Africa/')) return 'Africa';
  if (tz.startsWith('Australia/') || tz.startsWith('Pacific/')) return 'Oceania';

  if (tz.startsWith('Asia/')) {
    if (/Dubai|Riyadh|Qatar|Muscat|Kuwait|Bahrain|Jerusalem|Amman|Beirut|Baghdad|Tehran|Aden|Damascus|Istanbul|Cairo/.test(tz)) {
      return 'Middle East';
    }
    return 'Asia';
  }

  // Geographic bounding box fallback
  if (lat > 10 && lat < 75 && lng > -25 && lng < 45) return 'Europe';
  if (lat < 35 && lat > -35 && lng > -20 && lng < 52) return 'Africa';
  if (lng < -30 && lng > -170) return 'Americas';
  if (lat < 15 && lat > -50 && lng > 110 && lng < 180) return 'Oceania';

  return 'Asia';
}

function formatPopulation(pop?: number): string | undefined {
  if (!pop || pop <= 0) return undefined;
  if (pop >= 1_000_000) {
    return `${(pop / 1_000_000).toFixed(1)}M`;
  }
  if (pop >= 1_000) {
    return `${(pop / 1_000).toFixed(0)}K`;
  }
  return pop.toString();
}

function createRegionId(city: string, countryCode: string, lat: number, lng: number): string {
  const cleanCity = city.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const cleanCountry = (countryCode || 'loc').toLowerCase();
  const latStr = Math.abs(lat).toFixed(2).replace('.', '');
  const lngStr = Math.abs(lng).toFixed(2).replace('.', '');
  return `${cleanCity}-${cleanCountry}-${latStr}-${lngStr}`;
}

export function scoreAndSortMatches(query: string, regions: TimeRegion[]): TimeRegion[] {
  const q = query.trim().toLowerCase();
  if (!q) return regions;

  const matchesWithScore = regions
    .map((r) => {
      const city = r.city.toLowerCase();
      const country = r.country.toLowerCase();
      const tz = r.timezone.toLowerCase();
      const desc = (r.description || '').toLowerCase();

      let score = 0;

      if (city === q) score += 100;
      else if (city.startsWith(q)) score += 80;
      else if (city.includes(q)) score += 50;
      else if (country.startsWith(q)) score += 40;
      else if (country.includes(q)) score += 30;
      else if (tz.includes(q)) score += 20;
      else if (desc.includes(q)) score += 10;
      else return null;

      return { region: r, score };
    })
    .filter((item): item is { region: TimeRegion; score: number } => item !== null);

  matchesWithScore.sort((a, b) => b.score - a.score);
  return matchesWithScore.map((item) => item.region);
}

export async function searchGlobalLocations(
  query: string,
  localRegions: TimeRegion[] = []
): Promise<TimeRegion[]> {
  let q = query.trim();
  if (!q) return [];

  // Normalize common Antarctica spelling variations
  const qLower = q.toLowerCase();
  if (qLower === 'antartica' || qLower === 'antartica india' || qLower === 'antartica region') {
    q = 'Antarctica';
  }

  // Filter & score existing local regions first
  const localMatches = scoreAndSortMatches(query, localRegions);

  const apiRegions: TimeRegion[] = [];
  const seenKeys = new Set<string>();

  localMatches.forEach((r) => {
    seenKeys.add(`${r.city.toLowerCase()}-${r.countryCode.toLowerCase()}`);
    seenKeys.add(`${r.lat.toFixed(2)}-${r.lng.toFixed(2)}`);
  });

  const isAntarcticaQuery = q.toLowerCase().includes('antarct');

  // 1. Primary: Search OpenStreetMap Photon API (accurate for states, territories, cities & regions worldwide)
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=15`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        for (const f of data.features) {
          const props = f.properties || {};
          const coords = f.geometry?.coordinates;
          if (!coords || coords.length < 2) continue;

          const lng = coords[0];
          const lat = coords[1];
          let city = props.name || props.city || props.state || '';
          if (!city) continue;

          let country = props.country || props.state || '';
          let countryCode = (props.countrycode || '').toUpperCase();

          const osmKey = props.osm_key || '';
          const osmValue = props.osm_value || '';
          const type = props.type || '';

          const isAmenityOrShop = ['amenity', 'shop', 'building', 'historic', 'leisure', 'craft', 'highway'].includes(osmKey);
          const isPlaceOrBoundary = ['place', 'boundary'].includes(osmKey) || ['state', 'city', 'town', 'village', 'country', 'district', 'region', 'locality', 'island', 'continent'].includes(type) || ['state', 'city', 'town', 'village', 'country', 'administrative', 'island', 'continent'].includes(osmValue);

          // Skip commercial businesses/shops named after geographical regions when searching places
          if (isAmenityOrShop && !isPlaceOrBoundary) continue;

          // Antarctica special handling
          if (isAntarcticaQuery || city.toLowerCase().includes('antarctica') || lat < -60) {
            if (!countryCode) countryCode = 'AQ';
            if (!country) country = 'Antarctica';
            if (isAntarcticaQuery && countryCode !== 'AQ' && lat > -50) continue; // Skip non-Antarctica matches when specifically searching Antarctica
          }

          if (!country) country = 'Global';
          if (!countryCode) countryCode = 'UN';

          const dedupKeyName = `${city.toLowerCase()}-${countryCode.toLowerCase()}`;
          const dedupKeyCoord = `${lat.toFixed(2)}-${lng.toFixed(2)}`;
          if (seenKeys.has(dedupKeyName) || seenKeys.has(dedupKeyCoord)) continue;
          seenKeys.add(dedupKeyName);
          seenKeys.add(dedupKeyCoord);

          let tz = 'UTC';
          try {
            tz = tzlookup(lat, lng);
          } catch {
            tz = 'UTC';
          }
          if (countryCode === 'AQ' && tz === 'UTC') tz = 'Antarctica/McMurdo';

          const continent = deriveContinent(lat, lng, countryCode, tz);
          const flagEmoji = getFlagEmoji(countryCode);
          const id = createRegionId(city, countryCode, lat, lng);
          const adminStr = props.state || props.county || '';
          const description = [adminStr, country]
            .filter((b) => b && b.toLowerCase() !== city.toLowerCase())
            .join(', ');

          apiRegions.push({
            id,
            city,
            country,
            countryCode,
            flagEmoji,
            timezone: tz,
            lat,
            lng,
            continent,
            description: description || `${city} region`,
            landmark: `${city} Center`,
            population: formatPopulation(props.population),
            defaultVisible: false,
          });
        }
      }
    }
  } catch (e) {
    console.error('Photon search error:', e);
  }

  // 2. Fallback: Open-Meteo Geocoding API if Photon yields no results
  if (apiRegions.length === 0) {
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          q
        )}&count=15&language=en&format=json`
      );
      if (res.ok) {
        const data = await res.json();
        const omResults = data && Array.isArray(data.results) ? data.results : [];
        for (const item of omResults) {
          const city = item.name;
          if (!city || item.latitude === undefined || item.longitude === undefined) continue;

          const country = item.country || item.admin1 || 'Global';
          const countryCode = (item.country_code || '').toUpperCase();
          const lat = item.latitude;
          const lng = item.longitude;

          const dedupKeyName = `${city.toLowerCase()}-${countryCode.toLowerCase()}`;
          const dedupKeyCoord = `${lat.toFixed(2)}-${lng.toFixed(2)}`;
          if (seenKeys.has(dedupKeyName) || seenKeys.has(dedupKeyCoord)) continue;
          seenKeys.add(dedupKeyName);
          seenKeys.add(dedupKeyCoord);

          let tz = item.timezone;
          if (!tz) {
            try {
              tz = tzlookup(lat, lng);
            } catch {
              tz = 'UTC';
            }
          }

          const continent = deriveContinent(lat, lng, countryCode, tz);
          const flagEmoji = getFlagEmoji(countryCode);
          const id = createRegionId(city, countryCode, lat, lng);
          const adminStr = item.admin1 && item.admin1 !== city ? item.admin1 : '';
          const description = [adminStr, country].filter(Boolean).join(', ');

          apiRegions.push({
            id,
            city,
            country,
            countryCode,
            flagEmoji,
            timezone: tz,
            lat,
            lng,
            continent,
            description: description || `${city} region`,
            landmark: `${city} Central`,
            population: formatPopulation(item.population),
            defaultVisible: false,
          });
        }
      }
    } catch (e) {
      console.error('Open-Meteo search fallback error:', e);
    }
  }

  return scoreAndSortMatches(q, [...localMatches, ...apiRegions]);
}
