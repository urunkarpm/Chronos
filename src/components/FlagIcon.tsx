import React, { useState } from 'react';

interface FlagIconProps {
  countryCode: string;
  className?: string;
  alt?: string;
}

export const FlagIcon: React.FC<FlagIconProps> = ({
  countryCode,
  className = 'w-5 h-3.5 rounded-xs object-cover inline-block shadow-xs',
  alt = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const code = (countryCode || 'un').toLowerCase();

  if (hasError || !countryCode || countryCode === 'UN') {
    return <span className={`inline-flex items-center justify-center text-xs ${className}`}>🌐</span>;
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      alt={alt || countryCode}
      className={`${className} shrink-0 select-none`}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
};
