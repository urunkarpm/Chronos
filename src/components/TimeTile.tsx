import React, { memo } from 'react';
import { Sun, Moon, MapPin, X, ArrowUpRight } from 'lucide-react';
import { TimeRegion } from '../types';
import { FlagIcon } from './FlagIcon';
import {
  formatTimeInZone,
  getUTCOffsetFormatted,
  getRelativeTimeDifference,
  calculateSolarInfo,
  playUISound,
} from '../utils/timeUtils';

interface TimeTileProps {
  region: TimeRegion;
  isPinned: boolean;
  is24Hour: boolean;
  soundEnabled: boolean;
  referenceTimezone: string | null;
  onSelect: (region: TimeRegion) => void;
  onRemove: (id: string) => void;
  currentTime: Date;
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
}) => {
  const formattedTime = formatTimeInZone(region.timezone, currentTime, is24Hour);
  const utcOffsetStr = getUTCOffsetFormatted(region.timezone, currentTime);
  const relativeDiff = getRelativeTimeDifference(region.timezone, referenceTimezone, currentTime);
  const solar = calculateSolarInfo(region.lat, region.lng, region.timezone, currentTime);

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

        {/* Main Time Readout */}
        <div className="flex items-baseline justify-between font-mono my-0.5">
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

          {/* Day / Night Indicator */}
          <div
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${
              solar.isDaytime
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-indigo-950/60 text-indigo-300 border-indigo-500/30'
            }`}
          >
            {solar.isDaytime ? (
              <Sun className="w-2.5 h-2.5 text-amber-400" />
            ) : (
              <Moon className="w-2.5 h-2.5 text-indigo-400" />
            )}
            <span>{solar.isDaytime ? 'Day' : 'Night'}</span>
          </div>
        </div>

        {/* Bottom Row: UTC Offset & Relative Time */}
        <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px] font-mono">
          <span className="badge-gold text-[9px] py-0 px-1.5">
            {utcOffsetStr}
          </span>
          <span
            className={`font-semibold ${
              relativeDiff.isSame
                ? 'text-slate-400'
                : relativeDiff.isAhead
                ? 'text-emerald-400'
                : 'text-amber-400'
            }`}
          >
            {relativeDiff.diffText}
          </span>
        </div>
      </div>

      {/* Desktop Rich Detailed Layout (sm and up) */}
      <div className="hidden sm:block">
        {/* Top Row: Flag, City, Offset Badge & Remove Button */}
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

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="badge-gold">
              {utcOffsetStr}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (soundEnabled) playUISound('click');
                onRemove(region.id);
              }}
              title="Remove tile from view"
              className="btn-close min-w-[32px] min-h-[32px] p-1 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Time Display */}
        <div className="my-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white group-hover:text-gold-300 transition-colors">
              {formattedTime.hoursMinutes}
            </span>
            {!is24Hour && (
              <span className="ml-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                {formattedTime.amPm}
              </span>
            )}
          </div>

          {/* Day/Night Indicator Icon */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${
              solar.isDaytime
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-indigo-950/60 text-indigo-300 border-indigo-500/30'
            }`}
          >
            {solar.isDaytime ? (
              <Sun className="w-3 h-3 text-amber-400" />
            ) : (
              <Moon className="w-3 h-3 text-indigo-400" />
            )}
            <span>{solar.isDaytime ? 'Day' : 'Night'}</span>
          </div>
        </div>

        {/* Bottom Info Row: Date & Relative Offset */}
        <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-mono text-[10px] text-slate-400 font-medium">{formattedTime.shortDateStr}</span>

          <div className="flex items-center gap-1 font-mono text-[10px]">
            <span
              className={`font-semibold ${
                relativeDiff.isSame
                  ? 'text-slate-400'
                  : relativeDiff.isAhead
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {relativeDiff.diffText}
            </span>
            <ArrowUpRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const TimeTile = memo(TimeTileComponent);
