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

  // Keyboard shortcut listener for '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close currency dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        currencyDropdownRef.current &&
        !currencyDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCurrencyOpen(false);
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

        {/* Center: Desktop Search Input */}
        <div className="hidden md:block relative w-80 shrink-0">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-600 dark:text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search any city or village... (Press '/')"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="input-standard pl-10 pr-9 font-sans"
            />
            {isSearching ? (
              <Loader2 className="absolute right-3 w-4 h-4 text-amber-700 dark:text-gold-400 animate-spin" />
            ) : (
              searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-3 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )
            )}
          </div>

          {/* Search Dropdown */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 glass-panel-gold rounded-2xl overflow-hidden shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-800/60 border border-gold-500/30">
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

        {/* Right: Controls & Mobile Actions */}
        <div className="flex items-center gap-2 shrink-0">
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

          {/* Flat Map / 3D Globe Projection Toggle */}
          <button
            onClick={() => {
              if (soundEnabled) playUISound('toggle');
              onToggleProjection();
            }}
            title="Switch between Flat Map & 3D Globe Projection"
            className="btn-secondary hidden sm:inline-flex w-[115px]"
          >
            {mapProjection === 'globe' ? (
              <>
                <Globe className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                <span>3D Globe</span>
              </>
            ) : (
              <>
                <MapIcon className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                <span>Flat Map</span>
              </>
            )}
          </button>

          {/* Desktop 12h/24h Toggle */}
          <button
            onClick={() => {
              if (soundEnabled) playUISound('toggle');
              onToggle24Hour();
            }}
            title="Toggle 12h / 24h format"
            className="btn-secondary hidden md:inline-flex tabular-nums w-[76px]"
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
              className="btn-secondary inline-flex items-center gap-1.5 px-2.5 min-w-[85px]"
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

      {/* Mobile Expandable Search Bar */}
      {isSearchOpen && (
        <div className="md:hidden px-4 pb-3.5 pt-1 border-t border-slate-800/60 animate-in slide-in-from-top-2 duration-200">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search any location worldwide..."
              value={searchQuery}
              autoFocus
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-standard pl-10 pr-9 border-gold-500/50"
            />
            {isSearching ? (
              <Loader2 className="absolute right-3 w-4 h-4 text-gold-400 animate-spin" />
            ) : (
              searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              )
            )}
          </div>

          {searchQuery.trim().length > 0 && (
            <div className="mt-2 glass-panel-gold rounded-2xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-800/60 border border-gold-500/30">
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
                    className="p-3 flex items-center justify-between active:bg-gold-500/20 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <FlagIcon countryCode={reg.countryCode} alt={reg.country} className="w-5 h-3.5 rounded-xs shadow-xs shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-100 truncate">{reg.city}</div>
                        <div className="text-[10px] text-slate-400 truncate">{reg.description || reg.country}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono shrink-0 pl-2">
                      <div className="text-xs font-bold text-gold-400">
                        {formatTimeInZone(reg.timezone, currentTime, is24Hour).hoursMinutes}
                      </div>
                    </div>
                  </div>
                ))
              ) : isSearching ? (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2 font-mono">
                  <Loader2 className="w-4 h-4 text-gold-400 animate-spin" />
                  <span>Searching global locations...</span>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 font-mono">
                  No matching locations found
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
            {/* Flat / Globe View Toggle */}
            <button
              onClick={() => {
                if (soundEnabled) playUISound('toggle');
                onToggleProjection();
              }}
              className="btn-secondary w-full"
            >
              {mapProjection === 'globe' ? <Globe className="w-3.5 h-3.5 text-gold-400" /> : <MapIcon className="w-3.5 h-3.5 text-gold-400" />}
              <span>{mapProjection === 'globe' ? '3D Globe' : 'Flat Map'}</span>
            </button>

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
