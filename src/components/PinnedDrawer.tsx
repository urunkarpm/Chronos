import React, { useState, useEffect } from 'react';
import {
  X,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Compass,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  Users,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  Thermometer,
} from 'lucide-react';
import { FlagIcon } from './FlagIcon';
import { TimeRegion, TemperatureUnit, WeatherData, DisasterAlert } from '../types';
import {
  formatTimeInZone,
  getUTCOffsetFormatted,
  getRelativeTimeDifference,
  calculateSolarInfo,
  playUISound,
} from '../utils/timeUtils';
import { fetchWeatherData } from '../utils/weatherService';
import { fetchDisasterAlerts } from '../utils/disasterAlertService';

interface PinnedDrawerProps {
  region: TimeRegion;
  is24Hour: boolean;
  soundEnabled: boolean;
  referenceRegionId: string | null;
  onClose: () => void;
  onSetAsReference: (id: string | null) => void;
  currentTime: Date;
  tempUnit: TemperatureUnit;
  onToggleTempUnit: (unit: TemperatureUnit) => void;
}

export const PinnedDrawer: React.FC<PinnedDrawerProps> = ({
  region,
  is24Hour,
  soundEnabled,
  referenceRegionId,
  onClose,
  onSetAsReference,
  currentTime,
  tempUnit,
  onToggleTempUnit,
}) => {
  const [isExpandedMobile, setIsExpandedMobile] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);
  const [disasterAlerts, setDisasterAlerts] = useState<DisasterAlert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingWeather(true);
    setIsLoadingAlerts(true);

    fetchWeatherData(region.lat, region.lng).then((data) => {
      if (isMounted) {
        setWeather(data);
        setIsLoadingWeather(false);
      }
    });

    fetchDisasterAlerts(region.lat, region.lng).then((alerts) => {
      if (isMounted) {
        setDisasterAlerts(alerts);
        setIsLoadingAlerts(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [region.lat, region.lng]);


  const formattedTime = formatTimeInZone(region.timezone, currentTime, is24Hour);
  const utcOffset = getUTCOffsetFormatted(region.timezone, currentTime);
  const solar = calculateSolarInfo(region.lat, region.lng, region.timezone, currentTime);
  const relativeDiff = getRelativeTimeDifference(region.timezone, referenceRegionId, currentTime);
  const isReference = referenceRegionId === region.id;

  return (
    <>
      {/* Mobile Backdrop Overlay - Only active when user explicitly expands full details on mobile */}
      {isExpandedMobile && (
        <div
          className="fixed inset-0 z-30 bg-navy-950/40 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={() => {
            if (soundEnabled) playUISound('click');
            setIsExpandedMobile(false);
          }}
        />
      )}

      <aside className="fixed inset-x-2.5 bottom-2.5 md:bottom-auto md:top-24 md:right-5 md:left-auto z-40 w-[calc(100%-1.25rem)] md:w-96 md:max-w-sm glass-panel-gold rounded-2xl md:rounded-3xl p-3 md:p-6 shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-right-4">
        {/* Mobile Drag Indicator Bar */}
        <div
          className="w-10 h-1 bg-gold-500/40 rounded-full mx-auto mb-2 md:hidden cursor-pointer active:bg-gold-400 transition-colors"
          onClick={() => {
            if (soundEnabled) playUISound('toggle');
            setIsExpandedMobile(!isExpandedMobile);
          }}
        />

        {/* Top Header Row */}
        <div className="flex items-center justify-between pb-2 md:pb-3.5 border-b border-gold-500/20">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <FlagIcon countryCode={region.countryCode} alt={region.country} className="w-7 h-4.5 rounded-xs shadow-xs shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base md:text-xl font-serif font-extrabold tracking-wider text-slate-100 flex items-center gap-1.5 truncate">
                <span className="truncate">{region.city}</span>
                <span className="badge-gold font-sans font-bold text-[10px] md:text-xs shrink-0">
                  {utcOffset}
                </span>
              </h2>
              <p className="text-[11px] md:text-xs font-sans text-slate-400 font-medium truncate">{region.country} &bull; {region.continent}</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (soundEnabled) playUISound('click');
              onClose();
            }}
            className="btn-close shrink-0"
            title="Close panel (Esc)"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Main Time Display Block */}
        <div className="my-2 md:my-4 p-2.5 md:p-5 rounded-xl md:rounded-2xl bg-navy-950/90 border border-gold-500/35 text-center shadow-inner relative overflow-hidden">
          <div className="hidden md:flex text-[10px] md:text-[11px] font-sans uppercase tracking-widest text-gold-400 mb-1 items-center justify-center gap-1.5 font-bold">
            <Clock className="w-3.5 h-3.5 text-gold-400" />
            <span>Local Standard Time</span>
          </div>

          <div className="font-sans tabular-nums text-2xl md:text-4xl font-extrabold text-white tracking-tight flex items-baseline justify-center gap-1">
            <span>{formattedTime.hoursMinutes}</span>
            <span className="text-sm md:text-lg font-bold text-gold-400">:{formattedTime.seconds}</span>
            {!is24Hour && <span className="text-xs md:text-sm font-bold text-gold-400/90 ml-1 uppercase">{formattedTime.amPm}</span>}
          </div>

          <div className="flex items-center justify-center gap-2 mt-0.5 md:mt-1 text-[11px] md:text-xs font-sans">
            <span className="text-slate-300 font-medium">{formattedTime.dateStr}</span>
            <span className="text-slate-500">&bull;</span>
            <span
              className={`font-bold tabular-nums ${
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

          {/* Minimalist Weather Readout & °C / °F Toggle */}
          <div className="mt-2 pt-2 border-t border-gold-500/20 flex items-center justify-between px-1 text-[11px] font-sans">
            <div className="flex items-center gap-1.5 min-w-0">
              <Thermometer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              {isLoadingWeather ? (
                <span className="text-slate-400 text-[10px] animate-pulse">Loading temp...</span>
              ) : weather ? (
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-extrabold text-amber-300 tabular-nums text-xs">
                    {tempUnit === 'C' ? `${weather.temperatureC}°C` : `${weather.temperatureF}°F`}
                  </span>
                  <span className="text-slate-300 text-[10px] truncate">
                    &bull; {weather.weatherDescription}
                  </span>
                </div>
              ) : (
                <span className="text-slate-500 text-[10px]">Temp unavailable</span>
              )}
            </div>

            {/* °C / °F Unit Toggle Button */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-navy-900 border border-gold-500/40 text-[10px] font-bold shrink-0 ml-1">
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playUISound('click');
                  onToggleTempUnit('C');
                }}
                className={`px-1.5 py-0.5 rounded-md transition-all ${
                  tempUnit === 'C'
                    ? 'bg-gold-500 text-navy-950 font-extrabold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch unit to Celsius (°C)"
              >
                °C
              </button>
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playUISound('click');
                  onToggleTempUnit('F');
                }}
                className={`px-1.5 py-0.5 rounded-md transition-all ${
                  tempUnit === 'F'
                    ? 'bg-gold-500 text-navy-950 font-extrabold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch unit to Fahrenheit (°F)"
              >
                °F
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Action Controls */}
        <div className="flex items-center gap-2 pt-0.5 md:hidden">
          <button
            onClick={() => {
              if (soundEnabled) playUISound('click');
              onSetAsReference(isReference ? null : region.id);
            }}
            className={`flex-1 h-9 px-3 text-xs font-semibold rounded-xl ${
              isReference
                ? 'btn-secondary bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'btn-secondary'
            }`}
          >
            {isReference ? <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> : null}
            <span>{isReference ? 'Ref Set' : 'Set Ref'}</span>
          </button>

          <button
            onClick={() => {
              if (soundEnabled) playUISound('toggle');
              setIsExpandedMobile(!isExpandedMobile);
            }}
            className="btn-secondary h-9 px-3 text-xs text-slate-200 flex items-center gap-1 font-semibold shrink-0"
          >
            <span>{isExpandedMobile ? 'Less' : 'More'}</span>
            {isExpandedMobile ? <ChevronDown className="w-3.5 h-3.5 text-gold-400" /> : <ChevronUp className="w-3.5 h-3.5 text-gold-400" />}
          </button>
        </div>

        {/* Detailed Sections: Always visible on Desktop, collapsible on Mobile */}
        <div className={`${isExpandedMobile ? 'block' : 'hidden md:block'} space-y-3 mt-3 pt-3 border-t border-slate-800/80 max-h-[45vh] md:max-h-none overflow-y-auto custom-scrollbar`}>
          {/* Daylight & Solar Cycle Bar */}
          <div className="p-3.5 rounded-xl md:rounded-2xl bg-navy-900/70 border border-slate-800/90">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-200 font-sans font-semibold flex items-center gap-1.5">
                {solar.isDaytime ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                Daylight Cycle
              </span>
              <span className="font-sans tabular-nums text-[11px] text-gold-400 font-bold">{solar.dayLength} daylight</span>
            </div>

            {/* Solar Progress Track */}
            <div className="relative w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
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
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-navy-900/70 border border-slate-800/90 flex flex-col justify-between">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5 font-sans font-bold">
                {disasterAlerts.length > 0 ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                Govt Alarm
              </div>
              <div className="font-sans font-semibold text-slate-100 truncate text-[11px]">
                {isLoadingAlerts ? (
                  <span className="text-slate-400 animate-pulse text-[10px]">Checking alerts...</span>
                ) : disasterAlerts.length > 0 ? (
                  <span className="text-rose-400 font-bold truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block shrink-0" />
                    {disasterAlerts[0].event}
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium text-[10px] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                    All Clear (No Warning)
                  </span>
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-navy-900/70 border border-slate-800/90">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5 font-sans font-bold">
                <Users className="w-3.5 h-3.5 text-gold-400" />
                Population
              </div>
              <div className="font-sans font-semibold text-slate-100">{region.population || 'N/A'}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-navy-900/70 border border-slate-800/90">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5 font-sans font-bold">
                <Compass className="w-3.5 h-3.5 text-gold-400" />
                Coordinates
              </div>
              <div className="font-sans tabular-nums text-[11px] text-slate-200 font-bold">
                {region.lat.toFixed(2)}&deg;, {region.lng.toFixed(2)}&deg;
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-navy-900/70 border border-slate-800/90">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5 font-sans font-bold">
                <Calendar className="w-3.5 h-3.5 text-gold-400" />
                Timezone ID
              </div>
              <div className="font-sans text-[10px] text-slate-300 truncate font-semibold">{region.timezone}</div>
            </div>
          </div>

          {/* Action Button on Desktop */}
          <div className="pt-1 hidden md:block">
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
