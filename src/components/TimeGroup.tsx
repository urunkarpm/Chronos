import React, { memo } from 'react';
import { FlipDigit, FlipDigitSize } from './FlipDigit';

interface TimeGroupProps {
  value: string;
  prevValue?: string;
  size?: FlipDigitSize;
  label?: string;
  className?: string;
}

export const TimeGroup: React.FC<TimeGroupProps> = memo(({
  value,
  prevValue = value,
  size = 'md',
  label,
  className = '',
}) => {
  const currentDigits = (value || '00').padStart(2, '0').split('');
  const prevDigits = (prevValue || value || '00').padStart(2, '0').split('');

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className="flex items-center gap-0.5 sm:gap-1 md:gap-1.5">
        <FlipDigit
          currentValue={prevDigits[0]}
          nextValue={currentDigits[0]}
          isFlipping={prevDigits[0] !== currentDigits[0]}
          size={size}
        />
        <FlipDigit
          currentValue={prevDigits[1]}
          nextValue={currentDigits[1]}
          isFlipping={prevDigits[1] !== currentDigits[1]}
          size={size}
        />
      </div>
      {label && (
        <span className="text-[9px] sm:text-[10px] md:text-xs font-mono font-black uppercase tracking-widest text-amber-300/80 drop-shadow-sm mt-0.5">
          {label}
        </span>
      )}
    </div>
  );
});
