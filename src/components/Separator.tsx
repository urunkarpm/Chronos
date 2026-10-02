import React, { memo } from 'react';
import { FlipDigitSize } from './FlipDigit';

interface SeparatorProps {
  size?: FlipDigitSize;
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = memo(({
  size = 'md',
  className = '',
}) => {
  const getDotStyles = () => {
    switch (size) {
      case 'sm':
        return 'w-1 h-1 gap-1 px-0.5';
      case 'md':
        return 'w-1.5 h-1.5 gap-1.5 px-0.5 sm:px-1';
      case 'lg':
        return 'w-2 h-2 gap-2 px-1 sm:px-1.5';
      case 'xl':
      default:
        return 'w-2 sm:w-2.5 md:w-3.5 h-2 sm:h-2.5 md:h-3.5 gap-2 sm:gap-2.5 md:gap-3.5 px-0.5 sm:px-1.5 md:px-2';
    }
  };

  const dotClasses = getDotStyles();

  return (
    <div className={`flex flex-col items-center justify-center select-none ${dotClasses} ${className}`}>
      <span className="rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse" />
      <span className="rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse" />
    </div>
  );
});
