import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Check, Loader2 } from 'lucide-react';
import { FlagIcon } from './FlagIcon';
import { TimeRegion, Continent } from '../types';
import { formatTimeInZone, playUISound } from '../utils/timeUtils';
import { searchGlobalLocations, scoreAndSortMatches } from '../utils/locationService';

interface AddCityModalProps {
  allRegions: TimeRegion[];
  activeRegionIds: string[];
  onAddRegion: (regionOrId: TimeRegion | string) => void;
  onClose: () => void;
  soundEnabled: boolean;
  currentTime: Date;
}

export const AddCityModal: React.FC<AddCityModalProps> = ({
  allRegions,
  activeRegionIds,
  onAddRegion,
  onClose,
  soundEnabled,
  currentTime,
}) => {
  const [query, setQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState<Continent>('All');
  const [searchResults, setSearchResults] = useState<TimeRegion[]>(allRegions);
  const [isSearching, setIsSearching] = useState(false);

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

  // Fast global location search starting from 1st character
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(allRegions);
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
        console.error('AddCityModal search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [query, allRegions]);

  const filteredRegions = searchResults.filter((r) => {
    return selectedContinent === 'All' || r.continent === selectedContinent;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-navy-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-panel-gold rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden border border-gold-500/30 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-gold-500/20">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-serif tracking-wide">
              Add Timezone Regions
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Search any location globally — cities, towns, villages &amp; districts worldwide.
            </p>
          </div>
          <button
            onClick={() => {
              if (soundEnabled) playUISound('click');
              onClose();
            }}
            className="btn-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="my-5 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search any location e.g. Pune, Lonavala, Cupertino..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-standard pl-10 pr-9"
            />
            {isSearching ? (
              <Loader2 className="absolute right-3 top-3 w-4 h-4 text-gold-400 animate-spin" />
            ) : (
              query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
            {continents.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedContinent(c)}
                className={`pill-filter ${
                  selectedContinent === c ? 'pill-filter-active' : 'pill-filter-inactive'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Region List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 divide-y divide-slate-800/60 custom-scrollbar">
          {filteredRegions.length > 0 ? (
            filteredRegions.map((reg) => {
              const isActive = activeRegionIds.includes(reg.id);
              const timeFormatted = formatTimeInZone(reg.timezone, currentTime, false);
              return (
                <div
                  key={reg.id}
                  className="pt-3.5 pb-2 flex items-center justify-between gap-3 p-3 rounded-2xl hover:bg-gold-500/10 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FlagIcon countryCode={reg.countryCode} alt={reg.country} className="w-6 h-4 rounded-xs shadow-xs shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-100 truncate">{reg.city}</div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {reg.description || reg.country} &bull; <span className="text-gold-400 font-medium">{reg.continent}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right font-sans tabular-nums">
                      <div className="text-xs font-bold text-gold-400">{timeFormatted.hoursMinutes}</div>
                      <div className="text-[10px] text-slate-400">{reg.timezone}</div>
                    </div>

                    <button
                      onClick={() => {
                        if (soundEnabled) playUISound('click');
                        onAddRegion(reg);
                      }}
                      disabled={isActive}
                      className={isActive ? 'badge-emerald px-3 py-1.5' : 'btn-primary py-1.5 px-3'}
                    >
                      {isActive ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          ) : isSearching ? (
            <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2 font-sans">
              <Loader2 className="w-5 h-5 text-gold-400 animate-spin" />
              <span>Searching locations worldwide...</span>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 font-sans">
              No matching locations found for &quot;{query}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
