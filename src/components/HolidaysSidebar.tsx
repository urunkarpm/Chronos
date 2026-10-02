import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CalendarDays, ChevronDown, ChevronUp, RefreshCw, Sparkles, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Holiday } from '../types';
import { fetchUpcomingHolidays, fetchHolidayStates, StateMeta } from '../utils/holidayService';
import { playUISound } from '../utils/timeUtils';
import { HolidayWikiModal } from './HolidayWikiModal';

interface StateSelectDropdownProps {
  states: StateMeta[];
  selectedState: string;
  onChange: (code: string) => void;
  soundEnabled?: boolean;
}

function StateSelectDropdown({
  states,
  selectedState,
  onChange,
  soundEnabled = true,
}: StateSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const selectedMeta = states.find((s) => s.code === selectedState) || {
    name: selectedState,
    code: selectedState,
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          if (soundEnabled) playUISound('toggle');
          setIsOpen(!isOpen);
        }}
        className="w-full h-10 px-3.5 flex items-center justify-between text-xs font-bold bg-navy-900/90 text-slate-200 border border-slate-700/80 hover:border-gold-500/50 rounded-xl shadow-md backdrop-blur-md transition-all cursor-pointer group"
      >
        <span className="truncate pr-2">
          {selectedMeta.name} ({selectedMeta.code})
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gold-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-gold-300' : 'group-hover:translate-y-0.5'
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-1.5 max-h-48 overflow-y-auto glass-panel-gold rounded-xl p-1.5 shadow-2xl border border-gold-500/40 custom-scrollbar shrink-0"
          >
            {states.map((s) => {
              const isSelected = s.code === selectedState;
              return (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playUISound('click');
                    onChange(s.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-gold-500/25 text-gold-300 font-extrabold border border-gold-500/40 shadow-xs'
                      : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 font-extrabold shrink-0 ml-2">
                    {s.code}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface HolidaysSidebarProps {
  userCountryCode?: string | null;
  userStateCode?: string | null;
  userRegionId?: string | null;
  pinnedRegionId?: string | null;
  soundEnabled?: boolean;
}

export function HolidaysSidebar({
  userCountryCode,
  userStateCode,
  userRegionId,
  pinnedRegionId,
  soundEnabled = true,
}: HolidaysSidebarProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [states, setStates] = useState<StateMeta[]>([]);
  const [selectedState, setSelectedState] = useState<string>('IN');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedWikiHoliday, setSelectedWikiHoliday] = useState<Holiday | null>(null);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(false);

  // Auto-set selectedState to user's pinpointed state when location is detected
  useEffect(() => {
    if (userStateCode) {
      setSelectedState(userStateCode.toUpperCase());
    }
  }, [userStateCode]);

  // Load states dropdown metadata
  useEffect(() => {
    fetchHolidayStates().then((res) => {
      if (res && res.length > 0) {
        setStates(res);
      }
    });
  }, []);

  // Load holidays whenever selectedState changes
  const loadHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUpcomingHolidays(selectedState);
      const seenKeys = new Set<string>();
      const uniqueList: Holiday[] = [];
      for (const item of data) {
        const key = `${item.date}-${item.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '')}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueList.push(item);
        }
      }
      setHolidays(uniqueList);
    } catch (e) {
      console.error('Failed to load holidays:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedState]);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  const handleHolidayClick = (holiday: Holiday, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (soundEnabled) playUISound('click');
    setSelectedWikiHoliday(holiday);
    setIsMobileExpanded(false);
  };

  const nextHoliday = holidays[0] || null;

  return (
    <>
      {/* ========================================================= */}
      {/* 1. MOBILE INTERACTIVE WIDGET (< sm screens: Top Right)    */}
      {/* Sleek, minimal floating pill                              */}
      {/* ========================================================= */}
      <div className="sm:hidden pointer-events-auto mt-20 transition-all duration-300">
        {!isMobileExpanded ? (
          /* Compact Mobile Pill */
          <button
            onClick={() => {
              if (soundEnabled) playUISound('toggle');
              setIsMobileExpanded(true);
            }}
            className="flex items-center gap-2.5 glass-card border border-gold-500/35 hover:border-gold-500/60 text-slate-100 px-3.5 py-2.5 rounded-xl shadow-2xl transition-all duration-300 active:scale-95 group"
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-gold-500/15 text-gold-400 border border-gold-500/30 shrink-0">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col text-left min-w-0 justify-center">
              <span className="text-[9px] font-extrabold tracking-widest text-gold-400 uppercase leading-none">
                Holidays ({holidays.length})
              </span>
              <span className="text-xs font-bold text-slate-100 truncate max-w-[125px] xs:max-w-[155px] mt-0.5 leading-tight">
                {nextHoliday ? nextHoliday.name : 'No upcoming'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-gold-400 transition-colors shrink-0 ml-0.5" />
          </button>
        ) : (
          <>
            {/* Mobile Backdrop Overlay to safely handle outside clicks */}
            <div
              onClick={() => {
                if (soundEnabled) playUISound('click');
                setIsMobileExpanded(false);
              }}
              className="fixed inset-0 z-30 bg-navy-950/60 backdrop-blur-xs animate-in fade-in duration-200"
            />

            {/* Expanded Mobile Dropdown Card */}
            <div className="fixed inset-x-4 top-20 z-40 max-h-[60vh] flex flex-col glass-panel-gold rounded-2xl shadow-2xl p-4 text-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Mobile Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gold-500/10 text-gold-400 border border-gold-500/20">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold tracking-widest uppercase text-gold-400">
                      Upcoming Holidays
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      {holidays.length} events scheduled
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileExpanded(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Region Filter */}
              {states.length > 0 && (
                <div className="mb-3 shrink-0">
                  <StateSelectDropdown
                    states={states}
                    selectedState={selectedState}
                    onChange={setSelectedState}
                    soundEnabled={soundEnabled}
                  />
                </div>
              )}

              {/* Mobile Scrollable Cards */}
              <div className="overflow-y-auto max-h-[40vh] space-y-2.5 pr-1 custom-scrollbar">
                {loading ? (
                  <div className="p-3.5 rounded-xl glass-card border border-slate-800/80 min-h-[72px] flex items-center justify-between">
                    <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                      <div className="h-3.5 w-32 bg-slate-800/80 rounded-md" />
                      <div className="h-3 w-24 bg-slate-800/50 rounded-md" />
                    </div>
                    <div className="h-5 w-12 bg-slate-800/60 rounded-full shrink-0" />
                  </div>
                ) : holidays.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No upcoming holidays found for this location.
                  </div>
                ) : (
                  holidays.map((holiday) => {
                    const tileId = `${holiday.date}-${holiday.name}`;

                    return (
                      <div
                        key={tileId}
                        onClick={(e) => handleHolidayClick(holiday, e)}
                        className="group relative p-3.5 rounded-xl glass-card hover:border-gold-500/50 transition-all duration-300 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-100 group-hover:text-gold-300 transition-colors">
                                {holiday.name}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.2 font-semibold rounded bg-slate-800/90 text-slate-300 border border-slate-700/80">
                                {holiday.type}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                              {holiday.day_of_week}, {holiday.date}
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-[10px] font-bold text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded-full border border-gold-500/20">
                              {holiday.days_until === 0
                                ? 'Today!'
                                : `In ${holiday.days_until}d`}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">
                              <BookOpen className="w-2.5 h-2.5 text-gold-400" /> Wiki ↗
                            </span>
                          </div>
                        </div>
                        {holiday.description && (
                          <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                            {holiday.description}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. DESKTOP FLOATING RIGHT SIDEBAR (sm+ screens)            */}
      {/* Minimal, sophisticated Apple VisionOS glassmorphism style */}
      {/* ========================================================= */}
      <div
        className={`hidden sm:block pointer-events-auto mt-20 lg:mt-20 transition-transform transition-opacity duration-500 ease-out transform ${
          pinnedRegionId
            ? 'translate-x-[150%] opacity-0 pointer-events-none'
            : 'translate-x-0 opacity-100'
        }`}
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className={`w-72 lg:w-80 flex flex-col glass-card border border-slate-700/80 hover:border-gold-500/40 rounded-2xl shadow-2xl p-3.5 text-slate-100 transition-colors duration-200 overflow-hidden ${
            isCollapsed ? 'h-auto' : 'max-h-[calc(100vh-42vh-120px)] min-h-[180px]'
          }`}
        >
          {/* Header Bar - Identical in both states */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80 shrink-0 select-none">
            <div
              onClick={() => {
                if (soundEnabled) playUISound('toggle');
                setIsCollapsed(!isCollapsed);
              }}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="p-1.5 rounded-lg bg-gold-500/10 text-gold-400 border border-gold-500/20">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold tracking-widest uppercase text-gold-400 group-hover:text-gold-300 transition-colors">
                  Upcoming Holidays
                </h3>
                <span className="text-[10px] text-slate-400">
                  {isCollapsed ? `${holidays.length} events • Click to expand` : `${holidays.length} events • Click card for details`}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (soundEnabled) playUISound('toggle');
                setIsCollapsed(!isCollapsed);
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <motion.div
                animate={{ rotate: isCollapsed ? 0 : 180 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>
          </div>

          {/* Region / State Selector (Animated in when expanded) */}
          <AnimatePresence>
            {!isCollapsed && states.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0"
              >
                <StateSelectDropdown
                  states={states}
                  selectedState={selectedState}
                  onChange={setSelectedState}
                  soundEnabled={soundEnabled}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cards Area */}
          <div className={`flex-1 custom-scrollbar ${isCollapsed ? '' : 'overflow-y-auto space-y-2.5 pr-1'}`}>
            {loading ? (
              <div className="p-3.5 rounded-xl glass-card border border-slate-800/80 min-h-[72px] flex items-center justify-between">
                <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                  <div className="h-3.5 w-32 bg-slate-800/80 rounded-md" />
                  <div className="h-3 w-24 bg-slate-800/50 rounded-md" />
                </div>
                <div className="h-5 w-12 bg-slate-800/60 rounded-full shrink-0" />
              </div>
            ) : isCollapsed ? (
              /* Collapsed State: Display single next upcoming holiday */
              nextHoliday ? (
                <div
                  key={nextHoliday.date + nextHoliday.name}
                  onClick={(e) => handleHolidayClick(nextHoliday, e)}
                  title="Click for Wikipedia details"
                  className="group relative p-3.5 rounded-xl glass-card hover:border-gold-500/50 shadow-sm cursor-pointer overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-gold-300 transition-colors truncate">
                          {nextHoliday.name}
                        </h4>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 font-semibold rounded bg-slate-800/90 text-slate-300 border border-slate-700/80">
                          {nextHoliday.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {nextHoliday.day_of_week}, {nextHoliday.date}
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] font-bold text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded-full border border-gold-500/30">
                        {nextHoliday.days_until === 0
                          ? 'Today!'
                          : `In ${nextHoliday.days_until}d`}
                      </span>
                      <span className="text-[9px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">
                        <BookOpen className="w-2.5 h-2.5 text-gold-400" /> Wiki ↗
                      </span>
                    </div>
                  </div>

                  {nextHoliday.description && (
                    <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {nextHoliday.description}
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-3 text-center text-xs text-slate-400">
                  No upcoming holidays found.
                </div>
              )
            ) : (
              /* Expanded State: Display full list */
              holidays.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No upcoming holidays found for this location.
                </div>
              ) : (
                holidays.map((holiday) => {
                  const tileId = `${holiday.date}-${holiday.name}`;
                  return (
                    <div
                      key={tileId}
                      onClick={(e) => handleHolidayClick(holiday, e)}
                      title="Click to view Wikipedia info"
                      className="group relative p-3.5 rounded-xl glass-card hover:border-gold-500/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden mb-2.5 last:mb-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-100 group-hover:text-gold-300 transition-colors">
                              {holiday.name}
                            </h4>
                            <span className="text-[9px] uppercase px-1.5 py-0.2 font-semibold rounded bg-slate-800/90 text-slate-300 border border-slate-700/80">
                              {holiday.type}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                            {holiday.day_of_week}, {holiday.date}
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[10px] font-bold text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded-full border border-gold-500/30">
                            {holiday.days_until === 0
                              ? 'Today!'
                              : `In ${holiday.days_until}d`}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">
                            <BookOpen className="w-2.5 h-2.5 text-gold-400" /> Wiki ↗
                          </span>
                        </div>
                      </div>

                      {holiday.description && (
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {holiday.description}
                        </p>
                      )}
                    </div>
                  );
                })
              )
            )}
          </div>
        </motion.div>
      </div>

      {/* Wikipedia Detail Popup Modal */}
      {selectedWikiHoliday && (
        <HolidayWikiModal
          holiday={selectedWikiHoliday}
          onClose={() => setSelectedWikiHoliday(null)}
          soundEnabled={soundEnabled}
        />
      )}
    </>
  );
}

export default HolidaysSidebar;
