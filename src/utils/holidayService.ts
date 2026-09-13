import { Holiday } from '../types';

const API_BASE_URL = 'https://holiday2api.vercel.app';

export interface StateMeta {
  code: string;
  name: string;
  type: string;
}

let cachedHolidays: { [key: string]: Holiday[] } = {};
let cachedStates: StateMeta[] | null = null;

export async function fetchHolidayStates(): Promise<StateMeta[]> {
  if (cachedStates) return cachedStates;

  try {
    const res = await fetch(`${API_BASE_URL}/api/meta/states`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.states)) {
        cachedStates = data.states;
        return data.states;
      }
    }
  } catch (error) {
    console.error('Failed to fetch holiday states:', error);
  }
  return [];
}

export async function fetchUpcomingHolidays(stateCode?: string): Promise<Holiday[]> {
  const cacheKey = stateCode ? stateCode.toUpperCase() : 'ALL';
  if (cachedHolidays[cacheKey]) {
    return cachedHolidays[cacheKey];
  }

  try {
    let url = `${API_BASE_URL}/api/holidays/upcoming?limit=25`;
    if (stateCode && stateCode !== 'IN') {
      url += `&state=${encodeURIComponent(stateCode)}`;
    }

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const holidays: Holiday[] = data.map((item: any) => {
          const itemDate = new Date(item.date);
          itemDate.setHours(0, 0, 0, 0);
          
          const diffTime = itemDate.getTime() - today.getTime();
          const calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          return {
            date: item.date,
            name: item.name,
            type: item.type || 'public',
            state_code: item.state_code,
            description: item.description,
            day_of_week: item.day_of_week || itemDate.toLocaleDateString('en-US', { weekday: 'long' }),
            days_until: item.days_until !== undefined ? item.days_until : Math.max(0, calculatedDays),
          };
        });

        // Strict Deduplication by normalized date and name
        const seen = new Set<string>();
        const uniqueHolidays: Holiday[] = [];
        for (const h of holidays) {
          const normKey = `${h.date}-${h.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '')}`;
          if (!seen.has(normKey)) {
            seen.add(normKey);
            uniqueHolidays.push(h);
          }
        }

        cachedHolidays[cacheKey] = uniqueHolidays;
        return uniqueHolidays;
      }
    }
  } catch (error) {
    console.error('Failed to fetch upcoming holidays:', error);
  }

  return [];
}
