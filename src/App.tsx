import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Compass } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Map } from './components/Map';
import { TimeTile } from './components/TimeTile';
import { PinnedDrawer } from './components/PinnedDrawer';
import { AddCityModal } from './components/AddCityModal';
import { GLOBAL_REGIONS, INITIAL_DEFAULT_REGION_IDS } from './data/timezones';
import { TimeRegion, Continent } from './types';
import { playUISound } from './utils/timeUtils';

const STORAGE_CUSTOM_REGIONS = 'chronos_custom_regions';
const STORAGE_ACTIVE_REGION_IDS = 'chronos_active_region_ids';

export function App() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

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

  const [pinnedRegionId, setPinnedRegionId] = useState<string | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<Continent>('All');

  // App preferences
  const [is24Hour, setIs24Hour] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [referenceRegionId, setReferenceRegionId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

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

  // Memoized active & visible regions
  const allActiveRegions = useMemo(
    () => allRegions.filter((r) => activeRegionIds.includes(r.id)),
    [allRegions, activeRegionIds]
  );

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
    <div className="relative w-full h-screen h-[100dvh] bg-navy-950 overflow-hidden text-slate-100 font-sans">
      {/* 100% Viewport Interactive Satellite Map Layer */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Map
          visibleRegions={allActiveRegions}
          pinnedRegionId={pinnedRegionId}
          onSelectRegion={handleSelectRegion}
          onResetMap={handleResetMap}
          is24Hour={is24Hour}
          currentTime={currentTime}
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
          onSelectRegion={handleSelectRegion}
          onResetView={handleResetMap}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          currentTime={currentTime}
          pinnedRegionId={pinnedRegionId}
        />
      </div>

      {/* Floating Timezone Tiles Overlay - Horizontal Swipe Deck on Mobile, Responsive Grid on Desktop */}
      <div
        className={`fixed inset-x-0 bottom-16 xs:bottom-20 sm:bottom-9 z-20 px-3 sm:px-6 transition-all duration-500 transform ${
          pinnedRegionId
            ? 'translate-y-[120%] opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100 pointer-events-auto'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          {/* Mobile Swipe Cue Banner */}
          <div className="sm:hidden flex items-center justify-between text-[11px] font-mono text-slate-400 px-1 mb-1 font-medium">
            <span>Swipe cities horizontally &rarr;</span>
            <span className="badge-gold text-[9px] py-0.5">{visibleTiles.length} Active</span>
          </div>

          <div className="flex sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5 overflow-x-auto sm:overflow-x-visible overflow-y-visible sm:overflow-y-auto max-h-none sm:max-h-[38vh] md:max-h-[36vh] py-3 px-1 sm:p-1 custom-scrollbar snap-x snap-mandatory touch-pan-x sm:touch-pan-y">
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
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Restore All Tiles Button (Appears when map is in center stage mode) */}
      {pinnedRegionId && (
        <div className="fixed bottom-20 xs:bottom-24 sm:bottom-12 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
