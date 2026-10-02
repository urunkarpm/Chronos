import React, { memo, useState, useEffect } from 'react';
import { TimeGroup } from './TimeGroup';
import { Separator } from './Separator';
import { FlipDigitSize } from './FlipDigit';

export interface FlipClockProps {
  hours?: string;
  minutes?: string;
  seconds?: string;
  currentTime?: Date;
  timezone?: string;
  is24Hour?: boolean;
  showSeconds?: boolean;
  showLabels?: boolean;
  size?: FlipDigitSize;
  variant?: 'boxed' | 'inline';
  className?: string;
}

/*
  ponytail: Solari Airport Split-Flap Clock Container.
  Maintains exact per-digit flip diffing, ensuring only changed digits flip mechanically.
*/
export const FlipClock: React.FC<FlipClockProps> = memo(({
  hours: propHours,
  minutes: propMinutes,
  seconds: propSeconds,
  currentTime,
  timezone,
  is24Hour = false,
  showSeconds = true,
  showLabels = false,
  size = 'xl',
  variant,
  className = '',
}) => {
  const getCurrentTimeParts = () => {
    if (propHours !== undefined && propMinutes !== undefined) {
      return {
        h: propHours.padStart(2, '0'),
        m: propMinutes.padStart(2, '0'),
        s: (propSeconds || '00').padStart(2, '0'),
      };
    }

    const date = currentTime || new Date();
    let hNum = date.getHours();

    if (timezone) {
      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          hour12: !is24Hour,
        }).formatToParts(date);

        let h = '00', m = '00', s = '00';
        for (const p of parts) {
          if (p.type === 'hour') h = p.value.padStart(2, '0');
          if (p.type === 'minute') m = p.value.padStart(2, '0');
          if (p.type === 'second') s = p.value.padStart(2, '0');
        }
        return { h, m, s };
      } catch (e) {}
    }

    if (!is24Hour) {
      hNum = hNum % 12 || 12;
    }
    const h = hNum.toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return { h, m, s };
  };

  const activeParts = getCurrentTimeParts();
  const [prevParts, setPrevParts] = useState(activeParts);

  useEffect(() => {
    if (
      activeParts.h !== prevParts.h ||
      activeParts.m !== prevParts.m ||
      activeParts.s !== prevParts.s
    ) {
      const timer = setTimeout(() => {
        setPrevParts(activeParts);
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [activeParts.h, activeParts.m, activeParts.s, prevParts]);

  const isInline = variant === 'inline' || size === 'sm' || className.includes('bg-transparent');

  const containerClass = isInline
    ? `inline-flex items-center justify-center max-w-full ${className}`
    : `inline-flex items-center justify-center bg-neutral-950/95 p-2.5 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl md:rounded-3xl border border-amber-500/30 shadow-[0_16px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(212,175,55,0.12)] backdrop-blur-xl max-w-full overflow-hidden ${className}`;

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-0.5 sm:gap-1.5 md:gap-2.5 max-w-full">
        {/* Hours Group */}
        <TimeGroup
          value={activeParts.h}
          prevValue={prevParts.h}
          size={size}
          label={showLabels ? 'Hours' : undefined}
        />

        {/* Separator */}
        <Separator size={size} />

        {/* Minutes Group */}
        <TimeGroup
          value={activeParts.m}
          prevValue={prevParts.m}
          size={size}
          label={showLabels ? 'Minutes' : undefined}
        />

        {/* Seconds Group */}
        {showSeconds && (
          <>
            <Separator size={size} />
            <TimeGroup
              value={activeParts.s}
              prevValue={prevParts.s}
              size={size}
              label={showLabels ? 'Seconds' : undefined}
            />
          </>
        )}
      </div>
    </div>
  );
});
