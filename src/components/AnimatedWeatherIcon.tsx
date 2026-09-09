import React, { useState, useEffect } from 'react';
import { LottieSvg } from 'lottie-react';
import { motion } from 'framer-motion';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
  CloudFog,
} from 'lucide-react';

interface AnimatedWeatherIconProps {
  code: number;
  className?: string;
}

const LOTTIE_CACHE = new Map<string, any>();

function getLottieFilename(code: number): string {
  if (code === 0) return 'clear-day.json';
  if (code >= 1 && code <= 3) return 'partly-cloudy-day-rain.json'; // Partly shower animation as requested!
  if (code === 45 || code === 48) return 'fog.json';
  if (code >= 51 && code <= 57) return 'drizzle.json';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain.json';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow.json';
  if (code >= 95 && code <= 99) return 'thunderstorms-rain.json';
  return 'overcast.json';
}

export const AnimatedWeatherIcon: React.FC<AnimatedWeatherIconProps> = ({
  code,
  className = 'w-6 h-6',
}) => {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    const filename = getLottieFilename(code);
    const url = `https://cdn.jsdelivr.net/npm/@meteocons/lottie@3.0.0-next.10/fill/${filename}`;

    if (LOTTIE_CACHE.has(url)) {
      setAnimationData(LOTTIE_CACHE.get(url));
      return;
    }

    let isMounted = true;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          LOTTIE_CACHE.set(url, data);
          setAnimationData(data);
        }
      })
      .catch((e) => {
        console.warn('Lottie animation fetch failed, using fallback:', e);
      });

    return () => {
      isMounted = false;
    };
  }, [code]);

  if (animationData) {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
        <LottieSvg src={animationData} autoplay loop className="w-full h-full" />
      </div>
    );
  }

  // Smooth fallback while loading or if offline
  if (code === 0) {
    return (
      <div className="relative inline-flex items-center justify-center shrink-0">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 16, ease: 'linear' }}
        >
          <Sun className={`${className} text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]`} />
        </motion.div>
      </div>
    );
  }

  if (code >= 1 && code <= 3) {
    return (
      <motion.div
        animate={{ y: [-1, 1, -1] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="shrink-0"
      >
        <CloudRain className={`${className} text-blue-300 drop-shadow-xs`} />
      </motion.div>
    );
  }

  if (code === 45 || code === 48) {
    return (
      <motion.div
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="shrink-0"
      >
        <CloudFog className={`${className} text-slate-300 drop-shadow-xs`} />
      </motion.div>
    );
  }

  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return (
      <motion.div
        animate={{ y: [-1, 1, -1] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        className="shrink-0"
      >
        <CloudRain className={`${className} text-blue-400 drop-shadow-xs`} />
      </motion.div>
    );
  }

  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return (
      <motion.div
        animate={{ rotate: [-20, 20, -20] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="shrink-0"
      >
        <Snowflake className={`${className} text-cyan-200 drop-shadow-xs`} />
      </motion.div>
    );
  }

  if (code >= 95 && code <= 99) {
    return (
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        className="shrink-0"
      >
        <CloudLightning className={`${className} text-yellow-400`} />
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={{ y: [-1, 1, -1] }}
      transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
      className="shrink-0"
    >
      <Cloud className={`${className} text-slate-300 drop-shadow-xs`} />
    </motion.div>
  );
};
