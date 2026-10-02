import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SatelliteLiveState } from '../types/satellite';
import { SATELLITE_CATALOG } from '../data/satellites';

interface SatelliteTelemetryHUDProps {
  satelliteState: SatelliteLiveState | null;
  onClose: () => void;
  onFocusSatellite: (sat: SatelliteLiveState) => void;
  onSelectSatelliteId: (id: string) => void;
}

export const SatelliteTelemetryHUD: React.FC<SatelliteTelemetryHUDProps> = ({
  satelliteState,
  onClose,
  onFocusSatellite,
  onSelectSatelliteId,
}) => {
  if (!satelliteState) return null;

  const { definition: sat, lat, lng, altKm, velocityKmH, velocityKmS, periodMinutes, inclinationDeg, isInSunlight } = satelliteState;

  // Format coordinates cleanly
  const latStr = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;

  // Next / Previous navigation
  const currentIndex = SATELLITE_CATALOG.findIndex((s) => s.id === sat.id);
  const prevSat = SATELLITE_CATALOG[(currentIndex - 1 + SATELLITE_CATALOG.length) % SATELLITE_CATALOG.length];
  const nextSat = SATELLITE_CATALOG[(currentIndex + 1) % SATELLITE_CATALOG.length];

  return (
    <AnimatePresence>
      <motion.div
        key={sat.id}
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.96 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-[120px] sm:top-[124px] left-3 sm:left-6 z-40 max-w-[calc(100vw-24px)] xs:max-w-sm sm:max-w-md w-full max-h-[calc(100vh-150px)] overflow-y-auto custom-scrollbar bg-navy-950/90 backdrop-blur-xl border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-5 text-slate-100 select-none"
      >
        {/* Subtle glowing ambient accent behind header */}
        <div
          className="absolute -top-12 -left-12 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-30"
          style={{ backgroundColor: sat.color }}
        />

        {/* Top Header */}
        <div className="relative flex items-start justify-between gap-3 mb-3.5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest uppercase rounded border"
                style={{
                  color: sat.color,
                  borderColor: `${sat.color}44`,
                  backgroundColor: `${sat.color}15`,
                }}
              >
                {sat.orbitType} ORBIT
              </span>
              <span className="text-2xs text-slate-400 font-mono">NORAD #{sat.noradId}</span>
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-50 tracking-tight flex items-center gap-2">
              <span>{sat.name}</span>
            </h3>
            <p className="text-2xs text-slate-400 mt-0.5">{sat.country}</p>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-white/10"
            title="Close Telemetry"
          >
            ✕
          </button>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-4 font-mono text-xs">
          {/* Orbital Speed */}
          <div className="bg-navy-900/60 border border-white/5 rounded-xl p-2.5">
            <div className="text-slate-400 text-2xs uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Velocity</span>
              <span className="text-[10px] text-sky-400">SGP4</span>
            </div>
            <div className="text-sm font-bold text-amber-300">
              {Math.round(velocityKmH).toLocaleString()} <span className="text-xs font-normal text-slate-300">km/h</span>
            </div>
            <div className="text-2xs text-slate-400 font-sans">
              ({velocityKmS.toFixed(2)} km/s)
            </div>
          </div>

          {/* Altitude */}
          <div className="bg-navy-900/60 border border-white/5 rounded-xl p-2.5">
            <div className="text-slate-400 text-2xs uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Altitude</span>
              <span className="text-[10px] text-emerald-400">Datum</span>
            </div>
            <div className="text-sm font-bold text-emerald-400">
              {altKm.toFixed(1)} <span className="text-xs font-normal text-slate-300">km</span>
            </div>
            <div className="text-2xs text-slate-400 font-sans">
              {altKm < 1000 ? 'Low Earth Orbit' : altKm < 30000 ? 'Medium Orbit' : 'Geostationary'}
            </div>
          </div>

          {/* Sub-satellite Point */}
          <div className="bg-navy-900/60 border border-white/5 rounded-xl p-2.5">
            <div className="text-slate-400 text-2xs uppercase tracking-wider mb-0.5">
              Coordinates
            </div>
            <div className="text-xs font-semibold text-slate-200">
              {latStr}
            </div>
            <div className="text-2xs text-slate-400">
              {lngStr}
            </div>
          </div>

          {/* Orbital Dynamics */}
          <div className="bg-navy-900/60 border border-white/5 rounded-xl p-2.5">
            <div className="text-slate-400 text-2xs uppercase tracking-wider mb-0.5">
              Period / Incl.
            </div>
            <div className="text-xs font-semibold text-slate-200">
              {periodMinutes.toFixed(1)} <span className="text-2xs font-normal text-slate-400">min</span>
            </div>
            <div className="text-2xs text-slate-400">
              {inclinationDeg.toFixed(2)}° Inclination
            </div>
          </div>
        </div>

        {/* Sunlight & Spacecraft Details */}
        <div className="flex items-center justify-between bg-navy-900/40 border border-white/5 rounded-xl px-3 py-2 mb-3.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{isInSunlight ? '☀️' : '🌑'}</span>
            <span className={isInSunlight ? 'text-amber-300 font-medium' : 'text-slate-400 font-medium'}>
              {isInSunlight ? 'Direct Sunlight' : 'Earth Shadow (Eclipse)'}
            </span>
          </div>

          {sat.crewCount && (
            <div className="flex items-center gap-1 text-slate-300 text-xs">
              <span>👨‍🚀</span>
              <span className="font-semibold text-sky-300">{sat.crewCount} Crew</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onFocusSatellite(satelliteState)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 hover:text-gold-300 border border-gold-500/40 text-xs font-semibold transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-98"
          >
            <span>🎯</span>
            <span>Track in Orbit</span>
          </button>

          {/* Quick cycle buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSelectSatelliteId(prevSat.id)}
              className="p-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-slate-400 hover:text-white border border-white/10 text-xs transition-colors"
              title={`Previous: ${prevSat.name}`}
            >
              ←
            </button>
            <button
              onClick={() => onSelectSatelliteId(nextSat.id)}
              className="p-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-slate-400 hover:text-white border border-white/10 text-xs transition-colors"
              title={`Next: ${nextSat.name}`}
            >
              →
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
