import React, { memo, useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { TimeRegion, TemperatureUnit, WeatherData, ExchangeRatesMap } from '../types';
import { FlagIcon } from './FlagIcon';
import { AnimatedWeatherIcon } from './AnimatedWeatherIcon';
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
        className={`group/rate inline-flex items-center gap-1 font-extrabold tabular-nums rounded-full transition-all duration-200 cursor-pointer active:scale-95 border select-none ${
          isMobile ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-0.5'
        } ${
          isRateFlipped
            ? 'bg-gold-500/20 text-gold-200 border-gold-500/40 shadow-2xs hover:bg-gold-500/30'
            : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 shadow-2xs hover:bg-emerald-500/30'
        }`}
      >
        {isRateFlipped ? (
          <>
            <span className="font-extrabold text-white">100</span>
            <span className="font-mono font-extrabold text-amber-300">{rateDetails.homeSymbol}</span>
            <span className="text-slate-400 font-bold">=</span>
            <span className="font-extrabold text-white">{rateDetails.flippedRateStr}</span>
            <span className="font-mono font-extrabold text-amber-300">{rateDetails.tileSymbol}</span>
          </>
        ) : (
          <>
            <span className="font-extrabold text-white">1</span>
            <span className="font-mono font-extrabold text-emerald-300">{rateDetails.tileSymbol}</span>
            <span className="text-slate-400 font-bold">=</span>
            <span className="font-extrabold text-white">{rateDetails.normalRateStr}</span>
            <span className="font-mono font-extrabold text-emerald-300">{rateDetails.homeSymbol}</span>
          </>
        )}
        <RefreshCw className="w-3 h-3 opacity-90 group-hover/rate:rotate-180 transition-transform duration-300 shrink-0" />
      </button>
    );
  };

  return (
    <div
      onClick={() => {
        if (soundEnabled) playUISound('chime');
        onSelect(region);
      }}
      className={`group relative p-3.5 sm:p-4 rounded-2xl glass-card cursor-pointer transition-all duration-300 transform sm:hover:-translate-y-1 active:scale-[0.98] ${
        isPinned
          ? 'border-2 border-gold-500 scale-[1.01] shadow-2xl'
          : 'hover:border-gold-500/60'
      }`}
    >
      <div className="flex flex-col justify-between h-full gap-2.5 sm:gap-3">
        {/* Top Header Row: Flag, City/Country, Animated Weather & Remove Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden min-w-0 pr-1">
            <FlagIcon countryCode={region.countryCode} alt={region.country} className="w-5 h-3.5 sm:w-6 sm:h-4 rounded-xs shadow-xs shrink-0" />
            <div className="truncate">
              <h3 className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-gold-400 transition-colors truncate leading-tight">
                {region.city}
              </h3>
              <p className="hidden sm:block text-[10px] text-slate-400 font-semibold truncate leading-none mt-0.5">{region.country}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {weather && (
              <div
                title={`${weather.weatherDescription} • ${tempUnit === 'C' ? `${weather.temperatureC}°C` : `${weather.temperatureF}°F`}`}
                className="inline-flex items-center justify-center transition-transform duration-300 hover:scale-110 cursor-help"
              >
                <AnimatedWeatherIcon code={weather.weatherCode} className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]" />
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (soundEnabled) playUISound('click');
                onRemove(region.id);
              }}
              title={`Remove ${region.city} from view`}
              aria-label={`Remove ${region.city} from view`}
              className="btn-close min-w-[24px] min-h-[24px] sm:min-w-[28px] sm:min-h-[28px] p-0.5 sm:p-1 text-slate-400 hover:text-rose-400 opacity-80 group-hover:opacity-100 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Time Readout & Inline UTC + Temp Indicator */}
        <div className="flex items-baseline justify-between font-sans tabular-nums">
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-gold-300 transition-colors leading-none">
              {formattedTime.hoursMinutes}
            </span>
            {!is24Hour && (
              <span className="ml-0.5 text-[9px] sm:text-[10px] font-bold text-gold-400 uppercase">
                {formattedTime.amPm}
              </span>
            )}
          </div>

          {/* Inline UTC Offset & Temperature Indicator */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="inline-flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-gold-400 font-sans tabular-nums bg-gold-500/10 px-1.5 sm:px-2 py-0.5 rounded-full border border-gold-500/30 leading-none shadow-xs">
              {utcOffsetStr}
            </span>
            {weather && (
              <span className="inline-flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-amber-300 font-sans tabular-nums bg-amber-500/10 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-500/30 leading-none shadow-xs">
                {tempUnit === 'C' ? `${weather.temperatureC}°C` : `${weather.temperatureF}°F`}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Row: Date & Interactive Exchange Rate Badge */}
        <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-white/10 text-[9px] sm:text-[10px] font-sans tabular-nums">
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold">{formattedTime.shortDateStr}</span>
          {!rateDetails.isSameCurrency && renderRateBadge(false)}
        </div>

      </div>
    </div>
  );
};

export const TimeTile = memo(TimeTileComponent);

