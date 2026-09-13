import React from 'react';

interface ChronosLogoMarkProps {
  className?: string;
}

export const ChronosLogoMark: React.FC<ChronosLogoMarkProps> = ({
  className = 'w-7 h-7 text-gold-400',
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Gold Metallic Gradient */}
      <defs>
        <linearGradient id="chronosGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5D061" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#AA820A" />
        </linearGradient>
      </defs>

      {/* Outer Hourglass Frame */}
      <polygon
        points="22,18 78,18 50,50 78,82 22,82 50,50"
        stroke="url(#chronosGoldGrad)"
        strokeWidth="3.5"
        strokeLinejoin="round"
        fill="none"
      />

      {/* "C" Monogram Circle Arc */}
      <path
        d="M 50 25 A 25 25 0 1 0 50 75"
        stroke="url(#chronosGoldGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* "H" Monogram Bar & Right Pillar */}
      <path
        d="M 68 32 L 68 68 M 50 50 L 68 50"
        stroke="url(#chronosGoldGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Center Pivot & Clock Hands */}
      <circle cx="50" cy="50" r="3.5" fill="url(#chronosGoldGrad)" />
      <path
        d="M 50 50 L 37 37 M 50 50 L 63 39"
        stroke="url(#chronosGoldGrad)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default ChronosLogoMark;
