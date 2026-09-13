import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Calendar, CalendarDays, BookOpen, Loader2, Info } from 'lucide-react';
import { Holiday } from '../types';
import { fetchWikiSummary, WikiSummary } from '../utils/wikiService';
import { playUISound } from '../utils/timeUtils';

interface HolidayWikiModalProps {
  holiday: Holiday | null;
  onClose: () => void;
  soundEnabled?: boolean;
}

export function HolidayWikiModal({
  holiday,
  onClose,
  soundEnabled = true,
}: HolidayWikiModalProps) {
  const [wikiData, setWikiData] = useState<WikiSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    if (!holiday) return;

    let isMounted = true;
    setLoading(true);
    setWikiData(null);
    setImgError(false);

    if (soundEnabled) playUISound('zoom');

    fetchWikiSummary(holiday.name).then((data) => {
      if (isMounted) {
        setWikiData(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [holiday, soundEnabled]);

  // Esc key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (soundEnabled) playUISound('click');
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, soundEnabled]);

  if (!holiday) return null;

  return (
    <div
      onClick={() => {
        if (soundEnabled) playUISound('click');
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pt-16 sm:pt-24 pb-4 sm:pb-6 bg-navy-950/80 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto"
    >
      {/* Modal Dialog Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] glass-panel-gold rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-800/80 bg-navy-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-gold-500/10 text-gold-400 border border-gold-500/20">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 tracking-wide">
                {holiday.name}
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                Wikipedia Holiday Insight
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (soundEnabled) playUISound('click');
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Quick Date Metadata Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-navy-950/50 border border-slate-800/90 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Calendar className="w-4 h-4 text-gold-400" />
              <span>
                {holiday.day_of_week}, {holiday.date}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {holiday.type}
              </span>
              <span className="text-[10px] font-bold text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded-full border border-gold-500/30">
                {holiday.days_until === 0 ? 'Today!' : `In ${holiday.days_until} days`}
              </span>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
              <span className="text-xs font-medium">Fetching details from Wikipedia...</span>
            </div>
          ) : (
            <>
              {/* Wikipedia Image Preview (if available and valid) */}
              {wikiData?.thumbnail && !imgError && (
                <div className="relative w-full max-h-48 py-2 px-2 rounded-xl overflow-hidden border border-slate-800 bg-navy-950/90 flex items-center justify-center shadow-inner group">
                  {/* Ambient blurred backdrop fill */}
                  <img
                    src={wikiData.thumbnail}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-25 scale-110 pointer-events-none"
                  />
                  {/* Crisp centered foreground image */}
                  <img
                    src={wikiData.thumbnail}
                    alt={wikiData.title || holiday.name}
                    onError={() => setImgError(true)}
                    className="relative max-h-40 w-auto max-w-full object-contain rounded-lg shadow-xl group-hover:scale-[1.02] transition-transform duration-300 z-10"
                  />
                </div>
              )}

              {/* Wikipedia Extract & Description */}
              {wikiData && wikiData.extract ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-gold-400 text-xs font-bold uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Wikipedia Summary</span>
                  </div>
                  {wikiData.description && (
                    <p className="text-xs font-semibold text-slate-300 italic">
                      {wikiData.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-300 leading-relaxed bg-navy-950/30 p-3.5 rounded-xl border border-slate-800/60">
                    {wikiData.extract}
                  </p>
                </div>
              ) : (
                /* Fallback if no Wikipedia article extract found */
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-300 text-xs font-bold uppercase tracking-wider">
                    <Info className="w-3.5 h-3.5 text-gold-400" />
                    <span>Holiday Information</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-navy-950/30 p-3.5 rounded-xl border border-slate-800/60">
                    {holiday.description ||
                      `${holiday.name} is an upcoming ${holiday.type} holiday observed on ${holiday.date} (${holiday.day_of_week}).`}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-t border-slate-800/80 bg-navy-950/80 shrink-0">
          <span className="text-[10px] text-slate-500">
            Source: English Wikipedia
          </span>

          <a
            href={
              wikiData?.pageUrl ||
              `https://en.wikipedia.org/wiki/${encodeURIComponent(holiday.name)}`
            }
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => soundEnabled && playUISound('click')}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg hover:scale-105 transition-transform"
          >
            <span>Read on Wikipedia</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default HolidayWikiModal;
