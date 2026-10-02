import React, { memo } from 'react';

export type FlipDigitSize = 'sm' | 'md' | 'lg' | 'xl';

export interface FlipDigitProps {
  currentValue: string;
  nextValue?: string;
  isFlipping?: boolean;
  size?: FlipDigitSize;
  fontFamily?: string;
  className?: string;
}

/*
  ponytail: Solari Airport mechanical 3D split-flap digit card.
  Uses 4 stacked half-panels (top static, bottom static, top flap, bottom flap)
  with exact 200% inner container alignment to achieve authentic physical flap rotation.
*/
export const FlipDigit: React.FC<FlipDigitProps> = memo(({
  currentValue,
  nextValue,
  isFlipping = false,
  size = 'md',
  fontFamily,
  className = '',
}) => {
  const displayCurrent = currentValue;
  const displayNext = nextValue !== undefined ? nextValue : currentValue;

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'w-5 h-7 text-sm rounded-[3px]';
      case 'md':
        return 'w-7 h-10 text-xl rounded-[4px]';
      case 'lg':
        return 'w-10 h-14 text-3xl rounded-[5px]';
      case 'xl':
      default:
        return 'w-14 h-20 text-5xl rounded-[6px]';
    }
  };

  const cardSizeClass = getSizeStyles();

  return (
    <div
      className={`group/flap relative inline-flex flex-col items-center justify-center bg-gradient-to-b from-neutral-900 via-slate-950 to-black text-slate-100 font-mono font-black shadow-[0_4px_12px_rgba(0,0,0,0.85)] border border-neutral-800/90 overflow-hidden select-none tracking-tight ${cardSizeClass} ${className}`}
      style={{
        perspective: '600px',
        fontFamily: fontFamily || 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      }}
    >
      {/* Dark Mechanical Housing Interior Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)] pointer-events-none z-10" />

      {/* 1. TOP STATIC PANEL (Displays top half of nextValue behind top flap) */}
      <div className="absolute inset-x-0 top-0 h-1/2 overflow-hidden bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border-b border-black/90">
        <div className="absolute inset-x-0 top-0 h-[200%] flex items-center justify-center">
          <span className="leading-none text-slate-100 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
            {displayNext}
          </span>
        </div>
        {/* Subtle top glare sheen */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
      </div>

      {/* 2. BOTTOM STATIC PANEL (Displays bottom half of currentValue) */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden bg-gradient-to-b from-neutral-950 via-neutral-900 to-black">
        <div className="absolute inset-x-0 bottom-0 h-[200%] flex items-center justify-center">
          <span className="leading-none text-slate-100 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
            {displayCurrent}
          </span>
        </div>
      </div>

      {/* 3. TOP FLAP PANEL (Displays top half of currentValue, rotates DOWN) */}
      <div
        className={`absolute inset-x-0 top-0 h-1/2 overflow-hidden bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border-b border-black/90 z-20 ${
          isFlipping ? 'animate-flip-top-half' : ''
        }`}
        style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="absolute inset-x-0 top-0 h-[200%] flex items-center justify-center">
          <span className="leading-none text-slate-100 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
            {displayCurrent}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
        {isFlipping && (
          <div className="absolute inset-0 bg-black/50 animate-flap-shadow-down pointer-events-none" />
        )}
      </div>

      {/* 4. BOTTOM FLAP PANEL (Displays bottom half of nextValue, rotates DOWN into place) */}
      <div
        className={`absolute inset-x-0 bottom-0 h-1/2 overflow-hidden bg-gradient-to-b from-neutral-950 via-neutral-900 to-black z-20 ${
          isFlipping ? 'animate-flip-bottom-half' : ''
        }`}
        style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="absolute inset-x-0 bottom-0 h-[200%] flex items-center justify-center">
          <span className="leading-none text-slate-100 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
            {displayNext}
          </span>
        </div>
        <div className="absolute inset-x-0 top-0 h-[1px] bg-white/[0.12] pointer-events-none" />
      </div>

      {/* Mechanical Split Seam Line through horizontal center */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-black/95 z-30 shadow-[0_1px_0_rgba(255,255,255,0.08)] pointer-events-none" />

      {/* Left and Right Hinge Stud Pins */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[3px] bg-black border-r border-amber-500/30 rounded-r-[1px] z-40 pointer-events-none" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[2px] h-[3px] bg-black border-l border-amber-500/30 rounded-l-[1px] z-40 pointer-events-none" />
    </div>
  );
});
