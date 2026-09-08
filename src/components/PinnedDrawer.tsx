import React from 'react';
import {
  X,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Compass,
  MapPin,
  Calendar,
  Building,
  Users,
  Clock,
  Check,
} from 'lucide-react';
import { FlagIcon } from './FlagIcon';
import { TimeRegion } from '../types';
import {
  formatTimeInZone,
  getUTCOffsetFormatted,
  getRelativeTimeDifference,
  calculateSolarInfo,
  playUISound,
} from '../utils/timeUtils';

interface PinnedDrawerProps {
  region: TimeRegion;
  is24Hour: boolean;
  soundEnabled: boolean;
  referenceRegionId: string | null;
  onClose: () => void;
  onSetAsReference: (id: string | null) => void;
  currentTime: Date;
}

export const PinnedDrawer: React.FC<PinnedDrawerProps> = ({
  region,
  is24Hour,
  soundEnabled,
  referenceRegionId,
  onClose,
  onSetAsReference,
  currentTime,
}) => {
  const formattedTime = formatTimeInZone(region.timezone, currentTime, is24Hour);
  const utcOffset = getUTCOffsetFormatted(region.timezone, currentTime);
  const solar = calculateSolarInfo(region.lat, region.lng, region.timezone, currentTime);
  const relativeDiff = getRelativeTimeDifference(region.timezone, referenceRegionId, currentTime);
  const isReference = referenceRegionId === region.id;

  return (
    <>
      {/* Mobile Backdrop Overlay (Tap outside to close drawer on mobile) */}
      <div
        className="fixed inset-0 z-30 bg-navy-950/40 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
        onClick={() => {
          if (soundEnabled) playUISound('click');
          onClose();
        }}
      />

      <aside className="fixed inset-x-0 bottom-0 md:bottom-auto md:top-24 md:right-5 md:left-auto z-40 w-full md:w-96 md:max-w-sm glass-panel-gold rounded-t-3xl md:rounded-3xl p-4 md:p-6 pb-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))] md:pb-6 shadow-2xl max-h-[72vh] md:max-h-[calc(100vh-7.5rem)] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-200">
        {/* Mobile drag bar indicator */}
        <div
          className="w-12 h-1.5 bg-gold-500/40 rounded-full mx-auto mb-3 md:hidden cursor-pointer active:bg-gold-400 transition-colors"
          onClick={() => {
            if (soundEnabled) playUISound('click');
            onClose();
          }}
        />

        {/* Top Bar: Header & Close Button */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gold-500/20">
          <div className="flex items-center gap-3">
            <FlagIcon countryCode={region.countryCode} alt={region.country} className="w-8 h-5 rounded-xs shadow-xs shrink-0" />
            <div>
              <h2 className="text-lg md:text-xl font-serif font-extrabold tracking-wider text-slate-100 flex items-center gap-2">
                <span>{region.city}</span>
                <span className="badge-gold font-sans font-bold">
                  {utcOffset}
                </span>
              </h2>
              <p className="text-xs font-sans text-slate-400 font-medium mt-0.5">{region.country} &bull; {region.continent}</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (soundEnabled) playUISound('click');
              onClose();
            }}
            className="btn-close"
            title="Close panel (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Time Display */}
        <div className="my-4 p-4 md:p-5 rounded-2xl bg-navy-950/90 border border-gold-500/35 text-center shadow-inner relative overflow-hidden">
          <div className="text-[10px] md:text-[11px] font-sans uppercase tracking-widest text-gold-400 mb-1 flex items-center justify-center gap-1.5 font-bold">
            <Clock className="w-3.5 h-3.5 text-gold-400" />
            <span>Local Standard Time</span>
          </div>

          <div className="font-sans tabular-nums text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-baseline justify-center gap-1 my-1">
            <span>{formattedTime.hoursMinutes}</span>
            <span className="text-base md:text-lg font-bold text-gold-400">:{formattedTime.seconds}</span>
            {!is24Hour && <span className="text-xs md:text-sm font-bold text-gold-400/90 ml-1 uppercase">{formattedTime.amPm}</span>}
          </div>

          <div className="text-xs font-sans text-slate-300 font-medium mt-1">
            {formattedTime.dateStr}
          </div>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-900/90 text-xs font-sans tabular-nums border border-slate-700/60 font-semibold">
            <span className="text-slate-400">Offset:</span>
            <span
              className={`font-bold ${
                relativeDiff.isSame
                  ? 'text-slate-300'
                  : relativeDiff.isAhead
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {relativeDiff.diffText}
            </span>
          </div>
        </div>

        {/* Extra Info: Daylight Cycle, Details Grid, Action Buttons */}
        <div className="space-y-4">
          {/* Daylight & Solar Cycle Bar */}
          <div className="p-4 rounded-2xl bg-navy-900/70 border border-slate-800/90">
            <div className="flex items-center justify-between text-xs mb-2.5">
              <span className="text-slate-200 font-sans font-semibold flex items-center gap-1.5">
                {solar.isDaytime ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                Daylight Cycle
              </span>
              <span className="font-sans tabular-nums text-[11px] text-gold-400 font-bold">{solar.dayLength} daylight</span>
            </div>

            {/* Solar Progress Track */}
            <div className="relative w-full h-2.5 rounded-full bg-slate-800 overflow-hidden mb-2.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-gold-400 to-amber-600 transition-all duration-500"
                style={{ width: `${solar.dayProgressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-sans text-slate-300 font-medium">
              <div className="flex items-center gap-1.5">
                <Sunrise className="w-3.5 h-3.5 text-amber-400" />
                <span>Sunrise <strong className="font-sans tabular-nums font-bold text-slate-200">{solar.sunrise}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sunset className="w-3.5 h-3.5 text-rose-400" />
                <span>Sunset <strong className="font-sans tabular-nums font-bold text-slate-200">{solar.sunset}</strong></span>
              </div>
            </div>
          </div>

          {/* Regional Details Grid */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-navy-900/70 border border-slate-800/90">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 font-sans font-bold">
                <Building className="w-3.5 h-3.5 text-gold-400" />
                Landmark
              </div>
              <div className="font-sans font-semibold text-slate-100 truncate">{region.landmark}</div>
            </div>

            <div className="p-3 rounded-xl bg-navy-900/70 border border-slate-800/90">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 font-sans font-bold">
                <Users className="w-3.5 h-3.5 text-gold-400" />
                Population
              </div>
              <div className="font-sans font-semibold text-slate-100">{region.population || 'N/A'}</div>
            </div>

            <div className="p-3 rounded-xl bg-navy-900/70 border border-slate-800/90">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 font-sans font-bold">
                <Compass className="w-3.5 h-3.5 text-gold-400" />
                Coordinates
              </div>
              <div className="font-sans tabular-nums text-[11px] text-slate-200 font-bold">
                {region.lat.toFixed(2)}&deg;, {region.lng.toFixed(2)}&deg;
              </div>
            </div>

            <div className="p-3 rounded-xl bg-navy-900/70 border border-slate-800/90">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 font-sans font-bold">
                <Calendar className="w-3.5 h-3.5 text-gold-400" />
                Timezone ID
              </div>
              <div className="font-sans text-[10px] text-slate-300 truncate font-semibold">{region.timezone}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-1">
            <button
              onClick={() => {
                if (soundEnabled) playUISound('click');
                onSetAsReference(isReference ? null : region.id);
              }}
              className={`w-full ${
                isReference
                  ? 'btn-secondary bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'btn-secondary'
              }`}
            >
              {isReference ? <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> : null}
              <span>{isReference ? 'Reference Set' : 'Set Reference'}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
