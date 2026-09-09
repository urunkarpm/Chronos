import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Volume2,
  VolumeX,
  Compass,
  Plus,
  Clock,
  X,
  Menu,
  Loader2,
  Globe,
  Map as MapIcon,
  Coins,
  ChevronDown,
  Locate,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { FlagIcon } from './FlagIcon';
import { Continent, TimeRegion, MapProjection } from '../types';
import { formatTimeInZone, playUISound } from '../utils/timeUtils';
import { searchGlobalLocations, scoreAndSortMatches } from '../utils/locationService';
import { MAJOR_CURRENCIES } from '../utils/currencyService';

interface NavbarProps {
  allRegions: TimeRegion[];
  selectedContinent: Continent;
  onSelectContinent: (continent: Continent) => void;
  is24Hour: boolean;
  onToggle24Hour: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  mapProjection: MapProjection;
  onToggleProjection: () => void;
  onSelectRegion: (region: TimeRegion) => void;
  onResetView: () => void;
  onOpenAddModal: () => void;
  currentTime: Date;
  pinnedRegionId: string | null;
  selectedCurrency: string;
  onSelectCurrency: (currencyCode: string) => void;
  onAutoDetectLocation?: () => void;
  isAutoDetecting?: boolean;
}


export const Navbar: React.FC<NavbarProps> = ({
  allRegions,
  selectedContinent,
  onSelectContinent,
  is24Hour,
  onToggle24Hour,
  soundEnabled,
  onToggleSound,
  mapProjection = 'flat',
  onToggleProjection,
  onSelectRegion,
  onResetView,
  onOpenAddModal,
  currentTime,
  pinnedRegionId,
  selectedCurrency,
  onSelectCurrency,
  onAutoDetectLocation,
  isAutoDetecting = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TimeRegion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const currencyDropdownRef = useRef<HTMLDivElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const continents: Continent[] = [
    'All',
    'Americas',
    'Europe',
    'Asia',
    'Middle East',
    'Africa',
    'Oceania',
    'Antarctica',
  ];

  // Live UTC time
  const utcTimeStr = formatTimeInZone('UTC', currentTime, is24Hour).timeStr;
  const localTimeStr = currentTime.toLocaleTimeString('en-US', {
    hour12: !is24Hour,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Fast global location search starting from 1st character
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Instant scored local search filter (0ms delay)
    const localMatches = scoreAndSortMatches(trimmed, allRegions);
    setSearchResults(localMatches);

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchGlobalLocations(trimmed, allRegions);
        setSearchResults(results);
      } catch (e) {
        console.error('Global search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, allRegions]);

  // Keyboard shortcut listener for '/' or 'Cmd+K' to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Close currency dropdown and search drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        currencyDropdownRef.current &&
        !currencyDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCurrencyOpen(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  return (
    <header className="relative z-30 w-full liquid-glass-header rounded-2xl sm:rounded-3xl shadow-2xl overflow-visible transition-all duration-300">
      {/* Main Top Header Bar */}
      <div className="px-3.5 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2.5 sm:gap-4 min-w-0">
        {/* Left: Brand Logo & UTC Badge */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 shrink">
          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
            onClick={() => {
              if (soundEnabled) playUISound('zoom');
              onResetView();
            }}
          >
            <div className="flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-gold-500 dark:text-gold-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif tracking-widest text-base sm:text-xl font-black text-black dark:text-slate-100 flex items-center gap-1.5 leading-none truncate">
                CHRONOS
              </h1>
            </div>
          </div>

          {/* Desktop UTC Clock Badge (Hidden on small mobile screens to prevent overflow) */}
          <div className="hidden sm:flex items-center gap-3 pl-3.5 border-l border-slate-950/20 dark:border-slate-700/60 font-sans tabular-nums text-xs shrink-0 select-none">
            <div className="flex flex-col w-[95px] sm:w-[105px] shrink-0">
              <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-slate-900 dark:text-slate-400 font-black">UTC</span>
              <span className="text-amber-900 dark:text-gold-400 font-black text-xs sm:text-sm tracking-wider truncate text-left">{utcTimeStr}</span>
            </div>
            <div className="hidden md:flex flex-col pl-3.5 border-l border-slate-950/20 dark:border-slate-800 w-[125px] sm:w-[135px] shrink-0">
              <span className="text-[9px] uppercase tracking-wider text-slate-900 dark:text-slate-400 font-black">Your Time</span>
              <span className="text-black dark:text-slate-200 font-black tracking-wider truncate text-left">{localTimeStr}</span>
            </div>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search Trigger Button */}
          <button
            onClick={() => {
              if (soundEnabled) playUISound('click');
              const nextState = !isSearchOpen;
              setIsSearchOpen(nextState);
              if (nextState) {
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }
            }}
            title="Search any location (Press '/')"
            className={`btn-secondary hidden sm:inline-flex items-center gap-1.5 ${
              isSearchOpen ? 'bg-gold-500/20 text-gold-300 border-gold-500/60 shadow-xs' : ''
            }`}
          >
            <Search className="w-3.5 h-3.5 text-gold-400 shrink-0" />
            <span>Search</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400 bg-navy-900 border border-white/10 rounded">
              /
            </kbd>
          </button>

          {/* Quick Add City Button */}
          <button
            onClick={() => {
              if (soundEnabled) playUISound('click');
              onOpenAddModal();
            }}
            title="Add region to dashboard"
            className="btn-primary"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Add Location</span>
          </button>

          {/* Segmented Flat Map / 3D Globe Projection Toggle Switch */}
          <div className="hidden sm:inline-flex items-center h-9 p-0.5 bg-navy-950/80 dark:bg-navy-950/80 border border-slate-700/60 dark:border-white/10 rounded-xl shadow-inner select-none">
            <button
              onClick={() => {
                if (mapProjection !== 'flat') {
                  if (soundEnabled) playUISound('toggle');
                  onToggleProjection();
                }
              }}
              title="Flat Map View"
              className={`h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-sans font-bold transition-all duration-200 ${
                mapProjection === 'flat'
                  ? 'bg-gold-500/20 text-gold-400 border border-gold-500/50 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <MapIcon className={`w-3.5 h-3.5 ${mapProjection === 'flat' ? 'text-gold-400' : 'text-slate-400'}`} />
              <span>Flat</span>
            </button>
            <button
              onClick={() => {
                if (mapProjection !== 'globe') {
                  if (soundEnabled) playUISound('toggle');
                  onToggleProjection();
                }
              }}
              title="3D Globe View"
              className={`h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-sans font-bold transition-all duration-200 ${
                mapProjection === 'globe'
                  ? 'bg-gold-500/20 text-gold-400 border border-gold-500/50 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${mapProjection === 'globe' ? 'text-gold-400' : 'text-slate-400'}`} />
              <span>Globe</span>
            </button>
          </div>

          {/* Desktop 12h/24h Toggle */}
          <button
            onClick={() => {
              if (soundEnabled) playUISound('toggle');
              onToggle24Hour();
            }}
            title="Toggle 12h / 24h format"
            className="btn-secondary hidden md:inline-flex tabular-nums"
          >
            <Clock className="w-3.5 h-3.5 text-gold-400 shrink-0" />
            <span>{is24Hour ? '24H' : '12H'}</span>
          </button>

          {/* Desktop Currency Selector Toggle */}
          <div className="relative hidden sm:block" ref={currencyDropdownRef}>
            <button
              onClick={() => {
                if (soundEnabled) playUISound('toggle');
                setIsCurrencyOpen(!isCurrencyOpen);
              }}
              title="Select Base Currency for Tile Exchange Rates"
              className="btn-secondary inline-flex items-center gap-1.5"
            >
              <Coins className="w-3.5 h-3.5 text-gold-400 shrink-0" />
              <span>{selectedCurrency}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {isCurrencyOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 glass-panel-gold rounded-2xl p-2 shadow-2xl z-50 border border-gold-500/30 max-h-72 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                  <span>Home Currency</span>
                  {onAutoDetectLocation && (
                    <button
                      onClick={() => {
                        if (soundEnabled) playUISound('click');
                        onAutoDetectLocation();
                        setIsCurrencyOpen(false);
                      }}
                      disabled={isAutoDetecting}
                      className="text-[10px] text-gold-400 hover:text-gold-300 flex items-center gap-1 normal-case font-bold disabled:opacity-50"
                    >
                      <Locate className={`w-3 h-3 text-gold-400 ${isAutoDetecting ? 'animate-spin' : ''}`} />
                      <span>{isAutoDetecting ? 'Detecting...' : 'Auto-detect'}</span>
                    </button>
                  )}
                </div>
                <div className="pt-1 space-y-0.5">
                  {MAJOR_CURRENCIES.map((curr) => (
                    <button
                      key={curr.code}
                      onClick={() => {
                        if (soundEnabled) playUISound('click');
                        onSelectCurrency(curr.code);
                        setIsCurrencyOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        selectedCurrency === curr.code
                          ? 'bg-gold-500/20 text-gold-300 font-extrabold border border-gold-500/40'
                          : 'text-slate-200 hover:bg-white/10 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-black text-gold-400 w-7 text-center shrink-0">{curr.symbol}</span>
                        <span className="truncate">{curr.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 font-extrabold ml-1">{curr.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Sound Toggle */}
          <button
            onClick={() => {
              if (!soundEnabled) playUISound('chime');
              onToggleSound();
            }}
            title="Toggle UI Audio Effects"
            className="btn-secondary hidden sm:inline-flex w-9 p-0"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-gold-400 shrink-0" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
          </button>

          {/* Mobile Search Button Toggle */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="btn-icon md:hidden"
            title="Search Cities"
          >
            <Search className="w-4 h-4 text-gold-400" />
          </button>

          {/* Mobile Menu / Settings Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`btn-icon md:hidden ${
              isMobileMenuOpen ? 'text-gold-400 border-gold-500/60 bg-gold-500/10' : ''
            }`}
            title="Settings & Tools"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanding Search Panel (Drops down out of Top Navbar) */}
      {isSearchOpen && (
        <div
          ref={searchContainerRef}
          className="px-3.5 sm:px-6 py-3.5 border-t border-slate-700/60 dark:border-white/10 bg-navy-950/95 backdrop-blur-xl rounded-b-2xl sm:rounded-b-3xl shadow-2xl animate-in slide-in-from-top-2 duration-200"
        >
          <div className="relative flex items-center max-w-2xl mx-auto">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search any city, village, or country worldwide... (Press 'Esc' to close)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-standard pl-10 pr-10 py-2.5 text-sm w-full font-sans border-gold-500/50 focus:border-gold-400 shadow-md"
              autoFocus
            />
            {isSearching ? (
              <Loader2 className="absolute right-3.5 w-4 h-4 text-gold-400 animate-spin" />
            ) : searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3.5 text-slate-400 hover:text-white p-1"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsSearchOpen(false)}
                className="absolute right-3.5 text-slate-400 hover:text-white p-1"
                title="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {searchQuery.trim().length > 0 && (
            <div className="max-w-2xl mx-auto mt-3 glass-panel-gold rounded-2xl overflow-hidden shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-800/60 border border-gold-500/30">
              {searchResults.length > 0 ? (
                searchResults.map((reg) => (
                  <div
                    key={reg.id}
                    onClick={() => {
                      if (soundEnabled) playUISound('click');
                      onSelectRegion(reg);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="p-3 flex items-center justify-between hover:bg-amber-500/20 dark:hover:bg-gold-500/15 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <FlagIcon countryCode={reg.countryCode} alt={reg.country} className="w-5 h-3.5 rounded-xs shadow-xs shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-black dark:text-slate-100 truncate group-hover:text-amber-900 dark:group-hover:text-gold-400 transition-colors">
                          {reg.city}
                        </div>
                        <div className="text-[10px] text-slate-900 dark:text-slate-400 font-bold truncate">
                          {reg.description || reg.country}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-sans tabular-nums shrink-0 pl-2">
                      <div className="text-xs font-black text-amber-900 dark:text-gold-400">
                        {formatTimeInZone(reg.timezone, currentTime, is24Hour).hoursMinutes}
                      </div>
                      <div className="text-[9px] text-slate-800 dark:text-slate-400 font-extrabold">{reg.timezone}</div>
                    </div>
                  </div>
                ))
              ) : isSearching ? (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2 font-sans">
                  <Loader2 className="w-4 h-4 text-gold-400 animate-spin" />
                  <span>Searching global locations...</span>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 font-sans">
                  No matching locations found for &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mobile Slide-Down Settings & Menu Sheet */}
      {isMobileMenuOpen && (
        <div className="md:hidden px-4 py-4 border-t border-gold-500/20 bg-navy-950/75 backdrop-blur-md animate-in slide-in-from-top-3 duration-200 space-y-3">
          <div className="flex items-center justify-between text-xs font-sans tabular-nums pb-2.5 border-b border-slate-800/80">
            <span className="text-slate-400 font-medium">Your Local Time</span>
            <span className="text-gold-400 font-bold inline-block min-w-[95px] text-right">{localTimeStr}</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Segmented Flat / Globe View Toggle */}
            <div className="col-span-2 flex items-center p-1 bg-navy-950/90 border border-slate-700/60 rounded-full select-none">
              <button
                onClick={() => {
                  if (mapProjection !== 'flat') {
                    if (soundEnabled) playUISound('toggle');
                    onToggleProjection();
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full text-xs font-sans font-bold transition-all duration-200 ${
                  mapProjection === 'flat'
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/50 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <MapIcon className={`w-3.5 h-3.5 ${mapProjection === 'flat' ? 'text-gold-400' : 'text-slate-400'}`} />
                <span>Flat Map</span>
              </button>
              <button
                onClick={() => {
                  if (mapProjection !== 'globe') {
                    if (soundEnabled) playUISound('toggle');
                    onToggleProjection();
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full text-xs font-sans font-bold transition-all duration-200 ${
                  mapProjection === 'globe'
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/50 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Globe className={`w-3.5 h-3.5 ${mapProjection === 'globe' ? 'text-gold-400' : 'text-slate-400'}`} />
                <span>3D Globe</span>
              </button>
            </div>

            {/* 12H/24H Button */}
            <button
              onClick={() => {
                if (soundEnabled) playUISound('toggle');
                onToggle24Hour();
              }}
              className="btn-secondary w-full"
            >
              <Clock className="w-3.5 h-3.5 text-gold-400" />
              <span>Format: {is24Hour ? '24H' : '12H'}</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => {
                if (!soundEnabled) playUISound('chime');
                onToggleSound();
              }}
              className="btn-secondary w-full"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-gold-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
              <span>Audio: {soundEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Reset View */}
            <button
              onClick={() => {
                if (soundEnabled) playUISound('zoom');
                setIsMobileMenuOpen(false);
                onResetView();
              }}
              className="btn-secondary w-full"
            >
              <Compass className="w-3.5 h-3.5 text-gold-400" />
              <span>Reset Map</span>
            </button>
          </div>

          {/* Mobile Currency Selection */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-sans text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                <Coins className="w-3.5 h-3.5 text-gold-400" /> Base Currency
              </span>
              {onAutoDetectLocation && (
                <button
                  onClick={() => {
                    if (soundEnabled) playUISound('click');
                    onAutoDetectLocation();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isAutoDetecting}
                  className="text-[10px] text-gold-400 hover:text-gold-300 flex items-center gap-1 font-medium"
                >
                  <Locate className={`w-3 h-3 ${isAutoDetecting ? 'animate-spin' : ''}`} />
                  <span>Auto-detect</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1 bg-navy-900/60 rounded-xl border border-slate-800/90">
              {MAJOR_CURRENCIES.slice(0, 15).map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => {
                    if (soundEnabled) playUISound('click');
                    onSelectCurrency(curr.code);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-mono flex items-center justify-between ${
                    selectedCurrency === curr.code
                      ? 'bg-gold-500 text-navy-950 font-bold'
                      : 'bg-navy-950/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="font-bold">{curr.code}</span>
                  <span className="opacity-80 text-[10px]">{curr.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}


    </header>
  );
};
