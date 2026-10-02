import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Compass, Maximize2, Minimize2, Globe as GlobeIcon, Map as MapIcon } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Map } from './components/Map';
import { TimeTile } from './components/TimeTile';
import { PinnedDrawer } from './components/PinnedDrawer';
import { AddCityModal } from './components/AddCityModal';
import { HolidaysSidebar } from './components/HolidaysSidebar';
import { FlipClock } from './components/FlipClock';
import { GLOBAL_REGIONS, INITIAL_DEFAULT_REGION_IDS } from './data/timezones';
import { TimeRegion, Continent, MapProjection, MapTileTheme, TemperatureUnit, ExchangeRatesMap, ThemeMode } from './types';
import { playUISound } from './utils/timeUtils';
import { fetchExchangeRates } from './utils/currencyService';
import { detectUserLocationAndPreferences } from './utils/locationService';
import { preloadRegionTiles } from './utils/tilePreloader';

const STORAGE_CUSTOM_REGIONS = 'chronos_custom_regions';
const STORAGE_ACTIVE_REGION_IDS = 'chronos_active_region_ids';
const STORAGE_TEMP_UNIT = 'chronos_temp_unit';
const STORAGE_HOME_CURRENCY = 'chronos_home_currency';
const STORAGE_MAP_THEME = 'chronos_map_theme';
const STORAGE_SHOW_SATELLITES = 'chronos_show_satellites';

export function App() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [mapProjection, setMapProjection] = useState<MapProjection>('flat');
  const [mapTheme, setMapTheme] = useState<MapTileTheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MAP_THEME);
      if (saved === 'satellite' || saved === 'dark') return saved;
    } catch (e) {}
    return 'satellite';
  });

  // App preferences (Default to 24H mode)
  const [is24Hour] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [referenceRegionId, setReferenceRegionId] = useState<string | null>(null);
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TEMP_UNIT);
      if (saved === 'C' || saved === 'F') return saved;
    } catch (e) {}
    return 'C';
  });

  const [homeCurrency, setHomeCurrency] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HOME_CURRENCY);
      if (saved) return saved;
    } catch (e) {}
    return 'USD';
  });

  const [exchangeRates, setExchangeRates] = useState<ExchangeRatesMap>({});
  const [isAutoDetecting, setIsAutoDetecting] = useState<boolean>(false);
  const [userCountryCode, setUserCountryCode] = useState<string | null>(null);
  const [userStateCode, setUserStateCode] = useState<string | null>(null);
  const [userRegionId, setUserRegionId] = useState<string | null>(null);

  // Satellite Fleet & Fullscreen Zen Explore Mode
  const [showSatellites, setShowSatellites] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SHOW_SATELLITES);
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true; // Active by default in Globe view
  });
  const [isExploreMode, setIsExploreMode] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TEMP_UNIT, tempUnit);
    } catch (e) {}
  }, [tempUnit]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HOME_CURRENCY, homeCurrency);
    } catch (e) {}
  }, [homeCurrency]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MAP_THEME, mapTheme);
    } catch (e) {}
  }, [mapTheme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SHOW_SATELLITES, JSON.stringify(showSatellites));
    } catch (e) {}
  }, [showSatellites]);

  // Enforce dark mode permanently
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
  }, []);

  // Fetch exchange rates whenever homeCurrency changes
  useEffect(() => {
    let isMounted = true;
    fetchExchangeRates(homeCurrency).then((rates) => {
      if (isMounted) setExchangeRates(rates);
    });
    return () => {
      isMounted = false;
    };
  }, [homeCurrency]);

  // All known regions (default GLOBAL_REGIONS + custom added locations)
  const [allRegions, setAllRegions] = useState<TimeRegion[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_REGIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const defaultIds = new Set(GLOBAL_REGIONS.map((r) => r.id));
          const customOnly = parsed.filter((r: TimeRegion) => r && r.id && !defaultIds.has(r.id));
          return [...GLOBAL_REGIONS, ...customOnly];
        }
      }
    } catch (e) {
      console.error('Failed to parse saved custom regions:', e);
    }
    return GLOBAL_REGIONS;
  });

  // Currently active pinned/visible region IDs on map deck
  const [activeRegionIds, setActiveRegionIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_REGION_IDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse active region IDs:', e);
    }
    return INITIAL_DEFAULT_REGION_IDS;
  });

  // Handler for auto-detecting user location & preferred currency/temp unit
  const handleAutoDetectLocation = useCallback(async () => {
    setIsAutoDetecting(true);
    try {
      const prefs = await detectUserLocationAndPreferences();
      if (prefs) {
        if (prefs.currencyCode) {
          setHomeCurrency(prefs.currencyCode);
        }
        if (prefs.tempUnit) {
          setTempUnit(prefs.tempUnit);
        }
        if (prefs.stateCode) {
          setUserStateCode(prefs.stateCode);
        }
        if (prefs.countryCode) {
          const code = prefs.countryCode.toUpperCase();
          setUserCountryCode(code);

          // Find or add matching tile for user's country and position it first
          setAllRegions((prev) => {
            const targetRegion =
              prev.find((r) => r.countryCode.toUpperCase() === code) ||
              GLOBAL_REGIONS.find((r) => r.countryCode.toUpperCase() === code);

            if (targetRegion) {
              setUserRegionId(targetRegion.id);
              setActiveRegionIds((activePrev) => {
                const filtered = activePrev.filter((id) => id !== targetRegion.id);
                return [targetRegion.id, ...filtered];
              });
              return prev.some((r) => r.id === targetRegion.id) ? prev : [targetRegion, ...prev];
            }
            return prev;
          });
        }
      }
    } catch (e) {
      console.error('Failed to auto detect location:', e);
    } finally {
      setIsAutoDetecting(false);
    }
  }, []);

  // Auto-detect user location on initial app load
  useEffect(() => {
    handleAutoDetectLocation();
  }, [handleAutoDetectLocation]);

  // Pre-download and cache all map tiles in memory for smooth fly-to animations
  useEffect(() => {
    preloadRegionTiles(allRegions);
  }, [allRegions]);



  const [pinnedRegionId, setPinnedRegionId] = useState<string | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<Continent>('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  // Real-time 1-second clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut listener for Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isExploreMode) {
          if (soundEnabled) playUISound('click');
          setIsExploreMode(false);
        } else if (isAddModalOpen) {
          setIsAddModalOpen(false);
        } else if (pinnedRegionId) {
          if (soundEnabled) playUISound('zoom');
          setPinnedRegionId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExploreMode, pinnedRegionId, isAddModalOpen, soundEnabled]);

  // Persist custom regions to localStorage whenever allRegions changes
  useEffect(() => {
    try {
      const defaultIds = new Set(GLOBAL_REGIONS.map((r) => r.id));
      const customOnly = allRegions.filter((r) => !defaultIds.has(r.id));
      localStorage.setItem(STORAGE_CUSTOM_REGIONS, JSON.stringify(customOnly));
    } catch (e) {
      console.error('Failed to save custom regions:', e);
    }
  }, [allRegions]);

  // Persist active region IDs to localStorage whenever activeRegionIds changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_REGION_IDS, JSON.stringify(activeRegionIds));
    } catch (e) {
      console.error('Failed to save active region IDs:', e);
    }
  }, [activeRegionIds]);

  // Memoized active & visible regions (User's location tile placed FIRST)
  const allActiveRegions = useMemo(() => {
    const active = allRegions.filter((r) => activeRegionIds.includes(r.id));
    active.sort((a, b) => activeRegionIds.indexOf(a.id) - activeRegionIds.indexOf(b.id));

    if (!userCountryCode) return active;

    const userTiles = active.filter(
      (r) => r.countryCode.toUpperCase() === userCountryCode.toUpperCase()
    );
    const otherTiles = active.filter(
      (r) => r.countryCode.toUpperCase() !== userCountryCode.toUpperCase()
    );

    return [...userTiles, ...otherTiles];
  }, [allRegions, activeRegionIds, userCountryCode]);


  const visibleTiles = useMemo(
    () =>
      selectedContinent === 'All'
        ? allActiveRegions
        : allActiveRegions.filter((r) => r.continent === selectedContinent),
    [allActiveRegions, selectedContinent]
  );

  const pinnedRegion = useMemo(
    () => allRegions.find((r) => r.id === pinnedRegionId) || null,
    [allRegions, pinnedRegionId]
  );

  // Handlers
  const handleSelectRegion = useCallback((region: TimeRegion) => {
    setAllRegions((prev) => (prev.some((r) => r.id === region.id) ? prev : [...prev, region]));
    setActiveRegionIds((prev) => (prev.includes(region.id) ? prev : [...prev, region.id]));
    setPinnedRegionId(region.id);
    setSelectedContinent('All');
  }, []);

  const handleResetMap = useCallback(() => {
    setPinnedRegionId(null);
    setSelectedContinent('All');
    setResetTrigger((prev) => prev + 1);
  }, []);

  const handleAddRegion = useCallback((regionOrId: TimeRegion | string) => {
    if (typeof regionOrId === 'string') {
      setActiveRegionIds((prev) => (prev.includes(regionOrId) ? prev : [...prev, regionOrId]));
      setPinnedRegionId(regionOrId);
    } else {
      setAllRegions((prev) => (prev.some((r) => r.id === regionOrId.id) ? prev : [...prev, regionOrId]));
      setActiveRegionIds((prev) => (prev.includes(regionOrId.id) ? prev : [...prev, regionOrId.id]));
      setPinnedRegionId(regionOrId.id);
    }
    setSelectedContinent('All');
  }, []);

  const handleRemoveRegion = useCallback((id: string) => {
    setActiveRegionIds((prev) => prev.filter((rId) => rId !== id));
    setPinnedRegionId((prev) => (prev === id ? null : prev));
  }, []);

  const handleToggleSatellites = useCallback((val?: boolean) => {
    setShowSatellites((prev) => (typeof val === 'boolean' ? val : !prev));
  }, []);

  const handleToggleExploreMode = useCallback(() => {
    setIsExploreMode((prev) => !prev);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full h-[100dvh] bg-navy-950 text-slate-100 font-sans overscroll-none select-none transition-colors duration-300">
      {/* 100% Viewport Interactive Satellite Map Layer */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Map
          visibleRegions={allActiveRegions}
          pinnedRegionId={pinnedRegionId}
          userRegionId={userRegionId}
          userCountryCode={userCountryCode}
          onSelectRegion={handleSelectRegion}
          onResetMap={handleResetMap}
          is24Hour={is24Hour}
          currentTime={currentTime}
          resetTrigger={resetTrigger}
          mapProjection={mapProjection}
          mapTheme={mapTheme}
          onToggleMapTheme={setMapTheme}
          soundEnabled={soundEnabled}
          showSatellites={showSatellites}
          onToggleSatellites={handleToggleSatellites}
          isExploreMode={isExploreMode}
        />
      </div>

      {/* Floating Apple VisionOS / iOS 18 Liquid Glass Top Island */}
      <div
        className={`fixed top-2 sm:top-4 inset-x-2 sm:inset-x-6 z-30 max-w-7xl mx-auto transition-all duration-500 transform ${
          isExploreMode
            ? '-translate-y-[150%] opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100 pointer-events-auto'
        }`}
      >
        <Navbar
          allRegions={allRegions}
          selectedContinent={selectedContinent}
          onSelectContinent={setSelectedContinent}
          is24Hour={is24Hour}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
          mapProjection={mapProjection}
          onToggleProjection={() => setMapProjection((prev) => (prev === 'flat' ? 'globe' : 'flat'))}
          onSelectRegion={handleSelectRegion}
          onResetView={handleResetMap}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          currentTime={currentTime}
          pinnedRegionId={pinnedRegionId}
          selectedCurrency={homeCurrency}
          onSelectCurrency={setHomeCurrency}
          onAutoDetectLocation={handleAutoDetectLocation}
          isAutoDetecting={isAutoDetecting}
          showSatellites={showSatellites}
          onToggleSatellites={handleToggleSatellites}
          isExploreMode={isExploreMode}
          onToggleExploreMode={handleToggleExploreMode}
        />
      </div>

      {/* Floating Zen / Explore Mode HUD Bar */}
      {isExploreMode && (
        <div className="fixed top-4 inset-x-3 sm:inset-x-6 z-40 max-w-xl mx-auto pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="glass-panel-gold rounded-full px-3 sm:px-4 py-2 border border-gold-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500"></span>
              </span>
              <span className="font-serif font-black tracking-wider text-gold-300 text-[11px] sm:text-xs uppercase hidden xs:inline">
                Explore Mode
              </span>

              {/* Projection Switcher */}
              <div className="flex items-center bg-navy-950/80 p-0.5 rounded-full border border-slate-700/60 ml-1">
                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playUISound('toggle');
                    setMapProjection('flat');
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
                    mapProjection === 'flat'
                      ? 'bg-gold-500 text-navy-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MapIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Flat</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playUISound('toggle');
                    setMapProjection('globe');
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
                    mapProjection === 'globe'
                      ? 'bg-gold-500 text-navy-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <GlobeIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Globe</span>
                </button>
              </div>

              {/* Satellites Toggle (When Globe is active) */}
              {mapProjection === 'globe' && (
                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playUISound('toggle');
                    handleToggleSatellites();
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1.5 border ${
                    showSatellites
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                      : 'bg-navy-950/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
                  }`}
                  title="Toggle Satellites fleet and Keplerian orbits"
                >
                  <span>🛰️</span>
                  <span className="hidden sm:inline">Satellites</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      showSatellites ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-600'
                    }`}
                  />
                </button>
              )}

              {/* Map Theme Toggle (When Flat Map is active) */}
              {mapProjection === 'flat' && (
                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playUISound('toggle');
                    setMapTheme((prev) => (prev === 'satellite' ? 'dark' : 'satellite'));
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-navy-950/80 text-slate-300 hover:text-gold-300 border border-slate-700/60 transition-all flex items-center gap-1"
                >
                  <span>{mapTheme === 'satellite' ? '🛰️ Imagery' : '🌑 Midnight'}</span>
                </button>
              )}
            </div>

            {/* Exit Explore Mode Button */}
            <button
              type="button"
              onClick={() => {
                if (soundEnabled) playUISound('click');
                setIsExploreMode(false);
              }}
              className="px-3 py-1 rounded-full bg-gold-500/20 hover:bg-gold-500 text-gold-300 hover:text-navy-950 font-bold border border-gold-500/40 transition-all flex items-center gap-1.5 shrink-0"
              title="Exit Explore Mode (or press Esc)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Exit <kbd className="hidden sm:inline text-[9px] opacity-75 font-mono">Esc</kbd></span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Timezone Tiles Overlay - Horizontal Swipe Deck on Mobile, Responsive Grid on Desktop */}
      <div
        className={`fixed inset-x-0 bottom-[max(6px,calc(6px+env(safe-area-inset-bottom)))] sm:bottom-8 z-20 px-3 sm:px-6 transition-all duration-500 transform ${
          pinnedRegionId || isExploreMode
            ? 'translate-y-[130%] opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100 pointer-events-auto'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          {/* Mobile Swipe Cue Banner */}
          <div className="sm:hidden flex items-center justify-between text-[11px] font-sans text-slate-400 px-1 mb-1 font-medium">
            <span>Swipe cities horizontally &rarr;</span>
            <span className="badge-gold text-[9px] py-0.5">{visibleTiles.length} Active</span>
          </div>

          <div className="flex sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5 items-stretch overflow-x-auto sm:overflow-x-visible overflow-y-visible sm:overflow-y-auto max-h-none sm:max-h-[38vh] md:max-h-[36vh] pt-1.5 pb-1 px-1 sm:p-1 custom-scrollbar snap-x snap-mandatory touch-pan-x sm:touch-pan-y">
            {visibleTiles.map((region) => (
              <div key={region.id} className="shrink-0 w-[200px] xs:w-[220px] sm:w-auto snap-center flex flex-col justify-stretch">
                <TimeTile
                  region={region}
                  isPinned={region.id === pinnedRegionId}
                  is24Hour={is24Hour}
                  soundEnabled={soundEnabled}
                  referenceTimezone={
                    referenceRegionId
                      ? allRegions.find((r) => r.id === referenceRegionId)?.timezone || null
                      : null
                  }
                  onSelect={handleSelectRegion}
                  onRemove={handleRemoveRegion}
                  currentTime={currentTime}
                  tempUnit={tempUnit}
                  baseCurrencyCode={homeCurrency}
                  rates={exchangeRates}
                />
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Restore All Tiles Button (Appears when map is in center stage mode) */}
      {pinnedRegionId && (
        <div className="hidden sm:block fixed bottom-[max(16px,calc(16px+env(safe-area-inset-bottom)))] sm:bottom-10 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => {
              if (soundEnabled) playUISound('zoom');
              handleResetMap();
            }}
            className="btn-primary px-6 py-3 rounded-full text-xs font-bold shadow-2xl hover:scale-105 group border border-gold-400/60"
          >
            <Compass className="w-4 h-4 text-navy-950 group-hover:rotate-45 transition-transform duration-300" />
            <span>Restore All Tiles & World Map View</span>
          </button>
        </div>
      )}

      {/* Top-Right Pinned Region Details Drawer */}
      {pinnedRegion && (
        <PinnedDrawer
          region={pinnedRegion}
          is24Hour={is24Hour}
          soundEnabled={soundEnabled}
          referenceRegionId={referenceRegionId}
          onClose={() => setPinnedRegionId(null)}
          onSetAsReference={setReferenceRegionId}
          currentTime={currentTime}
          tempUnit={tempUnit}
          onToggleTempUnit={setTempUnit}
        />
      )}

      {/* Floating Holidays Sidebar Container - Inline with Top Nav and end of last tile in max-w-7xl */}
      <div
        className={`fixed top-2 sm:top-4 inset-x-2 sm:inset-x-6 z-20 max-w-7xl mx-auto flex justify-end transition-all duration-500 transform ${
          pinnedRegionId || isExploreMode
            ? 'translate-x-[150%] opacity-0 pointer-events-none'
            : 'translate-x-0 opacity-100 pointer-events-none'
        }`}
      >
        <HolidaysSidebar
          userCountryCode={userCountryCode}
          userStateCode={userStateCode}
          userRegionId={userRegionId}
          pinnedRegionId={pinnedRegionId}
          soundEnabled={soundEnabled}
        />
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <AddCityModal
          allRegions={allRegions}
          activeRegionIds={activeRegionIds}
          onAddRegion={handleAddRegion}
          onClose={() => setIsAddModalOpen(false)}
          soundEnabled={soundEnabled}
          currentTime={currentTime}
        />
      )}
    </div>
  );
}

export default App;
