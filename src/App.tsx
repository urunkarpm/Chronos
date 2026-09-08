import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Compass } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Map } from './components/Map';
import { TimeTile } from './components/TimeTile';
import { PinnedDrawer } from './components/PinnedDrawer';
import { AddCityModal } from './components/AddCityModal';
import { GLOBAL_REGIONS, INITIAL_DEFAULT_REGION_IDS } from './data/timezones';
import { TimeRegion, Continent, MapProjection, TemperatureUnit, ExchangeRatesMap } from './types';
import { playUISound } from './utils/timeUtils';
import { fetchExchangeRates } from './utils/currencyService';
import { detectUserLocationAndPreferences } from './utils/locationService';

const STORAGE_CUSTOM_REGIONS = 'chronos_custom_regions';
const STORAGE_ACTIVE_REGION_IDS = 'chronos_active_region_ids';
const STORAGE_TEMP_UNIT = 'chronos_temp_unit';
const STORAGE_HOME_CURRENCY = 'chronos_home_currency';

export function App() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [mapProjection, setMapProjection] = useState<MapProjection>('flat');

  // App preferences
  const [is24Hour, setIs24Hour] = useState<boolean>(false);
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
        if (prefs.countryCode) {
          const code = prefs.countryCode.toUpperCase();
          setUserCountryCode(code);

          // Find or add matching tile for user's country and position it first
          const targetRegion =
            allRegions.find((r) => r.countryCode.toUpperCase() === code) ||
            GLOBAL_REGIONS.find((r) => r.countryCode.toUpperCase() === code);

          if (targetRegion) {
            setAllRegions((prev) =>
              prev.some((r) => r.id === targetRegion.id) ? prev : [targetRegion, ...prev]
            );
            setActiveRegionIds((prev) => {
              const filtered = prev.filter((id) => id !== targetRegion.id);
              return [targetRegion.id, ...filtered];
            });
          }
        }
      }
    } catch (e) {
      console.error('Failed to auto detect location:', e);
    } finally {
      setIsAutoDetecting(false);
    }
  }, [allRegions]);

  // Auto-detect user location on initial app load
  useEffect(() => {
    handleAutoDetectLocation();
  }, [handleAutoDetectLocation]);



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
        if (isAddModalOpen) setIsAddModalOpen(false);
        else if (pinnedRegionId) {
          if (soundEnabled) playUISound('zoom');
          setPinnedRegionId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinnedRegionId, isAddModalOpen, soundEnabled]);

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

  return (
    <div className="fixed inset-0 w-full h-full h-[100dvh] bg-navy-950 overflow-hidden text-slate-100 font-sans overscroll-none select-none">
      {/* 100% Viewport Interactive Satellite Map Layer */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Map
          visibleRegions={allActiveRegions}
          pinnedRegionId={pinnedRegionId}
          onSelectRegion={handleSelectRegion}
          onResetMap={handleResetMap}
          is24Hour={is24Hour}
          currentTime={currentTime}
          resetTrigger={resetTrigger}
          mapProjection={mapProjection}
        />
      </div>

      {/* Floating Apple VisionOS / iOS 18 Liquid Glass Top Island */}
      <div className="fixed top-2 sm:top-4 inset-x-2 sm:inset-x-6 z-30 max-w-7xl mx-auto pointer-events-auto">
        <Navbar
          allRegions={allRegions}
          selectedContinent={selectedContinent}
          onSelectContinent={setSelectedContinent}
          is24Hour={is24Hour}
          onToggle24Hour={() => setIs24Hour((prev) => !prev)}
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
        />
      </div>

      {/* Floating Timezone Tiles Overlay - Horizontal Swipe Deck on Mobile, Responsive Grid on Desktop */}
      <div
        className={`fixed inset-x-0 bottom-[max(6px,calc(6px+env(safe-area-inset-bottom)))] sm:bottom-8 z-20 px-3 sm:px-6 transition-all duration-500 transform ${
          pinnedRegionId
            ? 'translate-y-[120%] opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100 pointer-events-auto'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          {/* Mobile Swipe Cue Banner */}
          <div className="sm:hidden flex items-center justify-between text-[11px] font-sans text-slate-400 px-1 mb-1 font-medium">
            <span>Swipe cities horizontally &rarr;</span>
            <span className="badge-gold text-[9px] py-0.5">{visibleTiles.length} Active</span>
          </div>

          <div className="flex sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5 overflow-x-auto sm:overflow-x-visible overflow-y-visible sm:overflow-y-auto max-h-none sm:max-h-[38vh] md:max-h-[36vh] pt-1.5 pb-1 px-1 sm:p-1 custom-scrollbar snap-x snap-mandatory touch-pan-x sm:touch-pan-y">
            {visibleTiles.map((region) => (
              <div key={region.id} className="shrink-0 w-[200px] xs:w-[220px] sm:w-auto snap-center">
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
