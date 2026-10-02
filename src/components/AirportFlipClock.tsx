import React, { memo } from 'react';
import { FlipClock } from './FlipClock';
import { FlipDigitSize } from './FlipDigit';

interface AirportFlipClockProps {
  hoursMinutes: string;
  is24Hour?: boolean;
  size?: FlipDigitSize;
  className?: string;
  showSeconds?: boolean;
  showLabels?: boolean;
}

/* 
  ponytail: Solari Airport mechanical departure-board clock wrapper.
  Renders realistic 3D split-flap digits for HH:MM (:SS) in 24-hour mode.
*/
export const AirportFlipClock: React.FC<AirportFlipClockProps> = memo(
  ({
    hoursMinutes,
    is24Hour = true,
    size = 'sm',
    className = '',
    showSeconds = false,
    showLabels = false,
  }) => {
    const parts = (hoursMinutes || '00:00').split(':');
    const h = (parts[0] || '00').padStart(2, '0');
    const m = (parts[1] || '00').padStart(2, '0');
    const s = parts.length >= 3 ? (parts[2] || '00').padStart(2, '0') : undefined;

    return (
      <div className={`inline-flex items-center gap-0.5 sm:gap-1 ${className}`}>
        <FlipClock
          hours={h}
          minutes={m}
          seconds={s}
          size={size}
          variant="inline"
          showSeconds={showSeconds || parts.length >= 3}
          showLabels={showLabels}
          is24Hour={is24Hour}
          className="bg-transparent"
        />
      </div>
    );
  }
);
