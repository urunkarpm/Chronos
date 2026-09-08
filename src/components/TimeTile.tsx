import React, { memo, useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { TimeRegion, TemperatureUnit, WeatherData, ExchangeRatesMap } from '../types';
import { FlagIcon } from './FlagIcon';
import {
  formatTimeInZone,
  getUTCOffsetFormatted,
  playUISound,
} from '../utils/timeUtils';
import { fetchWeatherData } from '../utils/weatherService';
import { getExchangeRateDetails } from '../utils/currencyService';

interface TimeTileProps {
  region: TimeRegion;
  isPinned: boolean;
  is24Hour: boolean;
  soundEnabled: boolean;
  referenceTimezone: string | null;
  onSelect: (region: TimeRegion) => void;
  onRemove: (id: string) => void;
  currentTime: Date;
  tempUnit?: TemperatureUnit;
  baseCurrencyCode?: string;
  rates?: ExchangeRatesMap;
}

const TimeTileComponent: React.FC<TimeTileProps> = ({
  region,
  isPinned,
  is24Hour,
  soundEnabled,
  referenceTimezone,
  onSelect,
  onRemove,
  currentTime,
  tempUnit = 'C',
  baseCurrencyCode = 'USD',
  rates = {},
}) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isRateFlipped, setIsRateFlipped] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchWeatherData(region.lat, region.lng).then((data) => {
      if (isMounted) setWeather(data);
    });
    return () => {
      isMounted = false;
    };
  }, [region.lat, region.lng]);

  const formattedTime = formatTimeInZone(region.timezone, currentTime, is24Hour);
  const utcOffsetStr = getUTCOffsetFormatted(region.timezone, currentTime);
  const rateDetails = getExchangeRateDetails(baseCurrencyCode, region.countryCode, rates);

  const renderRateBadge = (isMobile: boolean = false) => {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (soundEnabled) playUISound('toggle');
          setIsRateFlipped(!isRateFlipped);
        }}
        title="Click to flip currency conversion mode"
        className={`group/rate inline-flex items-center gap-1 font-semibold tabular-nums rounded-full transition-all duration-200 cursor-pointer active:scale-95 border select-none ${
          isMobile ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
        } ${
          isRateFlipped
            ? 'bg-gold-500/15 text-gold-300 border-gold-500/40 hover:bg-gold-500/25'
            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
        }`}
      >
        {isRateFlipped ? (
          <>
            <span className="font-bold">100</span>
            <FlagIcon countryCode={rateDetails.homeCountryCode} className="w-3.5 h-2.5 rounded-2xs shrink-0 shadow-2xs" />
            <span>=</span>
            <span className="font-bold">{rateDetails.flippedRateStr}</span>
            <FlagIcon countryCode={rateDetails.tileCountryCode} className="w-3.5 h-2.5 rounded-2xs shrink-0 shadow-2xs" />
          </>
        ) : (
          <>
            <span className="font-bold">1</span>
            <FlagIcon countryCode={rateDetails.tileCountryCode} className="w-3.5 h-2.5 rounded-2xs shrink-0 shadow-2xs" />
            <span>=</span>
            <span className="font-bold">{rateDetails.normalRateStr}</span>
            <FlagIcon countryCode={rateDetails.homeCountryCode} className="w-3.5 h-2.5 rounded-2xs shrink-0 shadow-2xs" />
          </>
        )}
        <RefreshCw className="w-2.5 h-2.5 opacity-60 group-hover/rate:rotate-180 transition-transform duration-300 ml-0.5 shrink-0" />
      </button>
    );
  };

  return (
    <div
      onClick={() => {
        if (soundEnabled) playUISound('chime');
        onSelect(region);
      }}
      className={`group relative p-2.5 sm:p-4 rounded-2xl glass-card cursor-pointer transition-all duration-300 transform sm:hover:-translate-y-1 active:scale-[0.98] ${
        isPinned
          ? 'border-2 border-gold-500 bg-navy-900/90 scale-[1.01]'
          : 'hover:border-gold-500/50'
      }`}
    >
      {/* Mobile-Optimized Card Layout (< sm) */}
      <div className="flex sm:hidden flex-col justify-between h-full gap-1.5">
        {/* Top Row: Flag, City Name & Remove Button */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
            <FlagIcon countryCode={region.countryCode} alt={region.country} className="w-4.5 h-3 rounded-xs shadow-xs shrink-0" />
            <h3 className="font-semibold text-xs text-slate-100 group-hover:text-gold-400 transition-colors truncate leading-tight">
              {region.city}
            </h3>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (soundEnabled) playUISound('click');
              onRemove(region.id);
            }}
            title="Remove tile from view"
            className="btn-close min-w-[24px] min-h-[24px] p-0.5 text-slate-400 hover:text-rose-400 -mr-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Main Time Readout & Inline UTC + Temp Pill */}
        <div className="flex items-baseline justify-between font-sans tabular-nums my-0.5">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-gold-300 transition-colors leading-none">
              {formattedTime.hoursMinutes}
            </span>
            {!is24Hour && (
              <span className="ml-0.5 text-[9px] font-bold text-gold-400 uppercase">
                {formattedTime.amPm}
              </span>
            )}
          </div>

          {/* Inline UTC Offset & Temperature Indicator */}
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center justify-center text-[9px] font-bold text-gold-400 font-sans tabular-nums bg-gold-500/10 px-1.5 py-0.5 rounded-full border border-gold-500/30 leading-none">
              {utcOffsetStr}
            </span>
            {weather && (
              <span className="inline-flex items-center justify-center text-[9px] font-bold text-amber-300 font-sans tabular-nums bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/30 leading-none">
                {tempUnit === 'C' ? `${weather.temperatureC}°C` : `${weather.temperatureF}°F`}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Row: Date & Interactive Dual-Flag Exchange Rate Badge */}
        <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px] font-sans tabular-nums">
          <span className="text-[9px] text-slate-400 font-semibold">{formattedTime.shortDateStr}</span>
          {renderRateBadge(true)}
        </div>

      </div>

      {/* Desktop Rich Detailed Layout (sm and up) */}
      <div className="hidden sm:block">
        {/* Top Row: Flag, City & Remove Button */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <FlagIcon countryCode={region.countryCode} alt={region.country} className="w-6 h-4 rounded-xs shadow-xs transition-transform group-hover:scale-110 duration-300 shrink-0" />
            <div className="truncate">
              <h3 className="font-semibold text-sm text-slate-100 group-hover:text-gold-400 transition-colors truncate leading-snug">
                {region.city}
              </h3>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{region.country}</p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (soundEnabled) playUISound('click');
              onRemove(region.id);
            }}
            title="Remove tile from view"
            className="btn-close min-w-[32px] min-h-[32px] p-1 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Main Time Display & Inline UTC Offset + Temp Pill */}
        <div className="my-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1 font-sans tabular-nums">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white group-hover:text-gold-300 transition-colors">
              {formattedTime.hoursMinutes}
            </span>
            {!is24Hour && (
              <span className="ml-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                {formattedTime.amPm}
              </span>
            )}
          </div>

          {/* UTC Offset Badge Inline with Temperature Indicator */}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center text-[10px] font-bold text-gold-400 font-sans tabular-nums bg-gold-500/10 px-2 py-0.5 rounded-full border border-gold-500/30 leading-none">
              {utcOffsetStr}
            </span>
            {weather && (
              <span className="inline-flex items-center justify-center text-[10px] font-bold text-amber-300 font-sans tabular-nums bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 leading-none">
                {tempUnit === 'C' ? `${weather.temperatureC}°C` : `${weather.temperatureF}°F`}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Info Row: Date & Interactive Dual-Flag Exchange Rate Badge */}
        <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-sans tabular-nums">
          <span className="text-[10px] text-slate-400 font-semibold">{formattedTime.shortDateStr}</span>
          {renderRateBadge(false)}
        </div>

      </div>
    </div>
  );
};

export const TimeTile = memo(TimeTileComponent);

