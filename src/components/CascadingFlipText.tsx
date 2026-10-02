import React, { memo } from 'react';

interface CascadingFlipTextProps {
  text: string;
  className?: string;
}

/*
  ponytail: Site title component styled with elegant Cinzel serif font.
*/
export const CascadingFlipText: React.FC<CascadingFlipTextProps> = memo(({ text, className = '' }) => {
  return (
    <span className={`inline-block font-serif font-black tracking-widest text-amber-300 dark:text-gold-300 ${className}`}>
      {text}
    </span>
  );
});
