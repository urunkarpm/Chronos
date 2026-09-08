import { SolarInfo, TimeRegion } from '../types';

// Lightweight cache for Intl.DateTimeFormat instances to prevent GC churn
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getCachedFormatter(key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', options);
    formatterCache.set(key, fmt);
  }
  return fmt;
}

/**
 * Format time string for a given timezone
 */
export function formatTimeInZone(
  timezone: string,
  date: Date = new Date(),
  is24Hour: boolean = false
): {
  timeStr: string;
  hoursMinutes: string;
  seconds: string;
  amPm: string;
  dateStr: string;
  shortDateStr: string;
  dayOfWeek: string;
  hourNumeric: number;
} {
  try {
    const timeKey = `${timezone}-time-${is24Hour ? '24' : '12'}`;
    const formatter = getCachedFormatter(timeKey, {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: !is24Hour,
    });
    const parts = formatter.formatToParts(date);
    
    let hour = '';
    let minute = '';
    let second = '';
    let dayPeriod = '';

    for (const part of parts) {
      if (part.type === 'hour') hour = part.value;
      if (part.type === 'minute') minute = part.value;
      if (part.type === 'second') second = part.value;
      if (part.type === 'dayPeriod') dayPeriod = part.value.toUpperCase();
    }

    const hourNumericKey = `${timezone}-hournum`;
    const hourFormatter = getCachedFormatter(hourNumericKey, {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const hourNumeric = parseInt(hourFormatter.format(date), 10) % 24;

    const fullDateKey = `${timezone}-fulldate`;
    const dateStr = getCachedFormatter(fullDateKey, {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);

    const shortDateKey = `${timezone}-shortdate`;
    const shortDateStr = getCachedFormatter(shortDateKey, {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
    }).format(date);

    const dayOptionsKey = `${timezone}-day`;
    const dayOfWeek = getCachedFormatter(dayOptionsKey, {
      timeZone: timezone,
      weekday: 'short',
    }).format(date);

    const hoursMinutes = `${hour}:${minute}`;
    const timeStr = is24Hour ? `${hour}:${minute}:${second}` : `${hour}:${minute}:${second} ${dayPeriod}`;

    return {
      timeStr,
      hoursMinutes,
      seconds: second,
      amPm: is24Hour ? '' : dayPeriod,
      dateStr,
      shortDateStr,
      dayOfWeek,
      hourNumeric,
    };
  } catch (err) {
    // Fallback if timezone fails
    const timeStr = date.toLocaleTimeString('en-US', { hour12: !is24Hour });
    return {
      timeStr,
      hoursMinutes: timeStr.slice(0, 5),
      seconds: '00',
      amPm: '',
      dateStr: date.toLocaleDateString(),
      shortDateStr: date.toLocaleDateString(),
      dayOfWeek: 'Today',
      hourNumeric: date.getHours(),
    };
  }
}

/**
 * Get formatted UTC offset for a given timezone (e.g. UTC+05:30, UTC-05:00)
 */
export function getUTCOffsetFormatted(timezone: string, date: Date = new Date()): string {
  try {
    const formatter = getCachedFormatter(`${timezone}-offset`, {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart) {
      // Formats like GMT+5:30 or GMT-5 -> standardize to UTC+05:30
      let value = tzPart.value.replace('GMT', 'UTC');
      if (value === 'UTC') return 'UTC+00:00';
      return value;
    }
  } catch (e) {
    // ignore
  }
  return 'UTC';
}

/**
 * Get UTC offset in minutes for comparison math
 */
export function getUTCOffsetMinutes(timezone: string, date: Date = new Date()): number {
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
  } catch (e) {
    return 0;
  }
}

/**
 * Calculate relative time difference text between target timezone and user local / reference timezone
 */
export function getRelativeTimeDifference(
  targetTimezone: string,
  referenceTimezone?: string | null,
  date: Date = new Date()
): { diffText: string; isAhead: boolean; isSame: boolean } {
  const targetOffset = getUTCOffsetMinutes(targetTimezone, date);
  const refOffset = referenceTimezone
    ? getUTCOffsetMinutes(referenceTimezone, date)
    : -date.getTimezoneOffset(); // Local browser timezone offset in minutes

  const diffMinutes = targetOffset - refOffset;
  if (diffMinutes === 0) {
    return { diffText: 'Same time', isAhead: false, isSame: true };
  }

  const hours = Math.abs(diffMinutes) / 60;
  const hoursStr = Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
  
  if (diffMinutes > 0) {
    return { diffText: `+${hoursStr} ahead`, isAhead: true, isSame: false };
  } else {
    return { diffText: `-${hoursStr} behind`, isAhead: false, isSame: false };
  }
}

/**
 * Calculate Sunrise / Sunset estimation based on lat/lng and current date
 */
export function calculateSolarInfo(lat: number, lng: number, timezone: string, date: Date = new Date()): SolarInfo {
  const now = date;
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Solar declination (degrees)
  const declination = 23.45 * Math.sin((((284 + dayOfYear) * 360) / 365) * (Math.PI / 180));

  // Hour angle (degrees)
  const latRad = lat * (Math.PI / 180);
  const decRad = declination * (Math.PI / 180);
  
  let cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);
  cosHourAngle = Math.min(1, Math.max(-1, cosHourAngle));
  
  const hourAngle = Math.acos(cosHourAngle) * (180 / Math.PI);
  const dayLengthHours = (2 * hourAngle) / 15;

  // Approximate Solar Noon UTC
  const solarNoonUTC = 12 - lng / 15;
  const sunriseUTC = solarNoonUTC - dayLengthHours / 2;
  const sunsetUTC = solarNoonUTC + dayLengthHours / 2;

  // Convert UTC hours to Local time in target timezone
  const offsetMinutes = getUTCOffsetMinutes(timezone, date);
  const offsetHours = offsetMinutes / 60;

  const sunriseLocal = (sunriseUTC + offsetHours + 24) % 24;
  const sunsetLocal = (sunsetUTC + offsetHours + 24) % 24;

  const formatHourFloat = (hFloat: number) => {
    const h = Math.floor(hFloat);
    const m = Math.floor((hFloat - h) * 60);
    const dateObj = new Date();
    dateObj.setHours(h, m, 0);
    return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const timeFormatted = formatTimeInZone(timezone, date, true);
  const currentHourFloat = timeFormatted.hourNumeric + parseInt(timeFormatted.seconds) / 3600;

  let isDaytime = false;
  if (sunriseLocal < sunsetLocal) {
    isDaytime = currentHourFloat >= sunriseLocal && currentHourFloat <= sunsetLocal;
  } else {
    // Polar or extreme wrap around
    isDaytime = currentHourFloat >= sunriseLocal || currentHourFloat <= sunsetLocal;
  }

  let dayProgressPercent = 50;
  if (isDaytime) {
    const totalDaySecs = Math.max(1, (sunsetLocal - sunriseLocal) * 3600);
    const currentSecs = (currentHourFloat - sunriseLocal) * 3600;
    dayProgressPercent = Math.min(100, Math.max(0, (currentSecs / totalDaySecs) * 100));
  } else {
    dayProgressPercent = 0;
  }

  const dayLengthFormatted = `${Math.floor(dayLengthHours)}h ${Math.round((dayLengthHours % 1) * 60)}m`;

  return {
    sunrise: formatHourFloat(sunriseLocal),
    sunset: formatHourFloat(sunsetLocal),
    dayLength: dayLengthFormatted,
    isDaytime,
    dayProgressPercent,
  };
}

/**
 * Calculate the exact coordinates of the solar day/night terminator line
 * for a given UTC Date, returning an array of [lat, lng] points across the globe.
 */
export function calculateTerminatorLine(date: Date = new Date()): {
  line: [number, number][];
  nightPolygon: [number, number][];
} {
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  // Exact solar declination angle (in radians)
  const declinationDeg = 23.44 * Math.sin(((2 * Math.PI) / 365.25) * (dayOfYear - 81));
  const declinationRad = (declinationDeg * Math.PI) / 180;
  const tanDeclination = Math.tan(declinationRad);

  // Subsolar longitude (Greenwich Meridian relative)
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const subsolarLngDeg = (12 - utcHours) * 15;

  const lineCoords: [number, number][] = [];

  // Extended longitude range from -360° to +360° for seamless tile coverage on mobile & desktop
  for (let lng = -360; lng <= 360; lng += 2) {
    const diffRad = ((lng - subsolarLngDeg) * Math.PI) / 180;
    const tanLat = -Math.cos(diffRad) / tanDeclination;
    let lat = (Math.atan(tanLat) * 180) / Math.PI;

    lat = Math.max(-85, Math.min(85, lat));
    lineCoords.push([lat, lng]);
  }

  // Build a valid night hemisphere polygon across extended longitude bounds
  const isNorthernSummer = declinationRad >= 0;
  const polarLat = isNorthernSummer ? -85 : 85;
  const nightPolygon: [number, number][] = [
    ...lineCoords,
    [polarLat, 360],
    [polarLat, -360],
  ];

  return { line: lineCoords, nightPolygon };
}

/**
 * Web Audio API Audio Synthesizer for subtle classy UI feedback
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playUISound(type: 'click' | 'zoom' | 'chime' | 'hover' | 'toggle') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'zoom') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'chime') {
      // Golden glass chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.3);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'hover') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.015, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'toggle') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(800, now + 0.05);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (e) {
    // Audio context may be blocked before gesture
  }
}
