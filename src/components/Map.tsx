import React, { useEffect, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { Satellite, Layers } from 'lucide-react';
import L from 'leaflet';
import { TimeRegion, MapProjection, MapTileTheme, ThemeMode } from '../types';
import { formatTimeInZone, calculateTerminatorLine, playUISound } from '../utils/timeUtils';
import { Globe } from './Globe';

interface MapProps {
  visibleRegions: TimeRegion[];
  pinnedRegionId: string | null;
  userRegionId?: string | null;
  userCountryCode?: string | null;
  onSelectRegion: (region: TimeRegion) => void;
  onResetMap: () => void;
  is24Hour: boolean;
  currentTime: Date;
  resetTrigger?: number;
  mapProjection?: MapProjection;
  mapTheme?: MapTileTheme;
  onToggleMapTheme?: (theme: MapTileTheme) => void;
  soundEnabled?: boolean;
  showSatellites?: boolean;
  onToggleSatellites?: (val: boolean) => void;
  isExploreMode?: boolean;
}

const TRANSPARENT_TILE_FALLBACK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const MAP_THEMES: Record<
  MapTileTheme,
  {
    name: string;
    base: string;
    labels: string;
    attributionBase: string;
    attributionLabels: string;
    nightFillColor: string;
    nightFillOpacity: number;
    terminatorColor: string;
  }
> = {
  satellite: {
    name: 'Satellite',
    base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attributionBase: '&copy; Esri, Maxar, Earthstar Geographics',
    attributionLabels: '&copy; Esri Boundaries & Places',
    nightFillColor: '#020617',
    nightFillOpacity: 0.55,
    terminatorColor: '#F3E5AB',
  },
  dark: {
    name: 'Midnight',
    base: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attributionBase: '&copy; Esri, HERE, Garmin, FAO, NOAA, USGS',
    attributionLabels: '&copy; Esri Dark Canvas Reference',
    nightFillColor: '#000000',
    nightFillOpacity: 0.42,
    terminatorColor: '#FBBF24',
  },
};

export const MapComponent: React.FC<MapProps> = ({
  visibleRegions,
  pinnedRegionId,
  userRegionId,
  userCountryCode,
  onSelectRegion,
  onResetMap,
  is24Hour,
  currentTime,
  resetTrigger,
  mapProjection = 'flat',
  mapTheme = 'satellite',
  onToggleMapTheme,
  soundEnabled = true,
  showSatellites,
  onToggleSatellites,
  isExploreMode = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
  const terminatorLineRef = useRef<L.Polyline | null>(null);
  const terminatorPolygonRef = useRef<L.Polygon | null>(null);

  // Default world center view
  const DEFAULT_CENTER: [number, number] = [20, 0];
  const DEFAULT_ZOOM = 2.5;

  // Initialize Map instance with keyless high-res base and labels layer
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: false,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      zoomAnimationThreshold: 10,
      inertia: true,
      inertiaDeceleration: 3000,
      minZoom: 2.2,
      maxZoom: 18,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      maxBounds: [
        [-85, -220],
        [85, 220],
      ],
      maxBoundsViscosity: 1.0,
      bounceAtZoomLimits: false,
    });

    const currentThemeConfig = MAP_THEMES[mapTheme] || MAP_THEMES.satellite;

    // High resolution Satellite or Dark Canvas base layer (Zero API key required)
    const baseImagery = L.tileLayer(currentThemeConfig.base, {
      maxZoom: 18,
      updateWhenZooming: true,
      updateWhenIdle: false,
      keepBuffer: 32,
      attribution: currentThemeConfig.attributionBase,
      className: 'gpu-accelerated',
      errorTileUrl: TRANSPARENT_TILE_FALLBACK,
    });

    // Reference Country, State & City Labels Overlay (Zero API key required)
    const placeLabels = L.tileLayer(currentThemeConfig.labels, {
      maxZoom: 18,
      updateWhenZooming: true,
      updateWhenIdle: false,
      keepBuffer: 32,
      attribution: currentThemeConfig.attributionLabels,
      className: 'gpu-accelerated',
      errorTileUrl: TRANSPARENT_TILE_FALLBACK,
    });

    baseLayerRef.current = baseImagery;
    labelsLayerRef.current = placeLabels;
    L.layerGroup([baseImagery, placeLabels]).addTo(map);

    // Create custom map pane for Day/Night solar overlay (above base tiles, below markers)
    if (!map.getPane('terminatorPane')) {
      const terminatorPane = map.createPane('terminatorPane');
      terminatorPane.style.zIndex = '425';
      terminatorPane.style.pointerEvents = 'none';
    }

    // Click on map background resets pinned state
    map.on('click', (e) => {
      const originalEv = e.originalEvent;
      if (originalEv && (originalEv.target as HTMLElement).closest('.leaflet-marker-icon')) {
        return;
      }
      onResetMap();
    });

    mapInstanceRef.current = map;

    // Direct size invalidation on next animation frame to ensure tile grid renders instantly
    const raf = requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
    });

    return () => {
      cancelAnimationFrame(raf);
      map.remove();
      mapInstanceRef.current = null;
      baseLayerRef.current = null;
      labelsLayerRef.current = null;
      markersRef.current.clear();
      terminatorLineRef.current = null;
      terminatorPolygonRef.current = null;
    };
  }, []);

  // Handle map zoom/pan when pinned region changes or resets with precise visual centering on user location
  useEffect(() => {
    if (mapProjection === 'globe') return;
    const map = mapInstanceRef.current;
    if (!map) return;

    // Small delay to allow React DOM layout shifts to complete
    const timer = setTimeout(() => {
      map.invalidateSize({ animate: false });

      const isMobile = window.innerWidth < 768;
      let targetRegion: TimeRegion | null = null;
      let targetZoom = 4.5;
      let navHeight = 60;
      let bottomDrawerHeight = 0;
      let rightDrawerWidth = 0;

      if (pinnedRegionId) {
        targetRegion = visibleRegions.find((r) => r.id === pinnedRegionId) || null;
        if (targetRegion) {
          targetZoom = isMobile ? 6 : 6.5;
          navHeight = isMobile ? 88 : 60;
          bottomDrawerHeight = isMobile ? 85 : 0;
          rightDrawerWidth = isMobile ? 0 : 384;
        }
      } else {
        // If unpinned, center map directly on user's detected location
        targetRegion =
          (userRegionId ? visibleRegions.find((r) => r.id === userRegionId) : null) ||
          (userCountryCode
            ? visibleRegions.find((r) => r.countryCode.toUpperCase() === userCountryCode.toUpperCase())
            : null) ||
          visibleRegions[0] ||
          null;

        if (targetRegion) {
          targetZoom = isMobile ? 3.2 : 4.0;
          navHeight = isMobile ? 88 : 60;
          bottomDrawerHeight = isMobile ? 85 : 120;
          rightDrawerWidth = 0;
        }
      }

      if (targetRegion) {
        const mapSize = map.getSize();
        const mapWidth = mapSize.x;
        const mapHeight = mapSize.y;

        // Target visual center point in pixels from top-left of container
        const visualCenterX = (mapWidth - rightDrawerWidth) / 2;
        const visualCenterY = navHeight + (mapHeight - navHeight - bottomDrawerHeight) / 2;

        // Container geometric center
        const geomCenterX = mapWidth / 2;
        const geomCenterY = mapHeight / 2;

        // Project target location at target zoom
        const containerPoint = map.project([targetRegion.lat, targetRegion.lng], targetZoom);

        // Calculate shifted center point in pixel space
        const shiftX = geomCenterX - visualCenterX;
        const shiftY = geomCenterY - visualCenterY;

        const newCenterPoint = L.point(containerPoint.x + shiftX, containerPoint.y + shiftY);
        const newCenterLatLng = map.unproject(newCenterPoint, targetZoom);

        // Fly smoothly to newCenterLatLng with natural cinematic easing
        map.flyTo(newCenterLatLng, targetZoom, {
          duration: 0.85,
          easeLinearity: 0.25,
          animate: true,
        });
      } else {
        map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, {
          duration: 0.85,
          easeLinearity: 0.25,
          animate: true,
        });
      }
    }, 40);

    return () => clearTimeout(timer);
  }, [pinnedRegionId, userRegionId, userCountryCode, resetTrigger, mapProjection, visibleRegions]);

  // Handle window resize to keep Leaflet map container bounds in sync
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current && mapProjection === 'flat') {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mapProjection]);

  // Dynamically swap map tile layers when mapTheme changes
  useEffect(() => {
    if (!baseLayerRef.current || !labelsLayerRef.current) return;
    const currentThemeConfig = MAP_THEMES[mapTheme] || MAP_THEMES.satellite;
    baseLayerRef.current.setUrl(currentThemeConfig.base);
    labelsLayerRef.current.setUrl(currentThemeConfig.labels);

    if (terminatorPolygonRef.current) {
      terminatorPolygonRef.current.setStyle({
        fillColor: currentThemeConfig.nightFillColor,
        fillOpacity: currentThemeConfig.nightFillOpacity,
      });
    }
    if (terminatorLineRef.current) {
      terminatorLineRef.current.setStyle({
        color: currentThemeConfig.terminatorColor,
      });
    }
  }, [mapTheme]);

  // 30-second interval key to eliminate CPU-intensive SVG path recalculations on every second
  const terminatorStepKey = Math.floor(currentTime.getTime() / 30000);

  // Live real-time solar day/night terminator curve overlay
  useEffect(() => {
    if (mapProjection === 'globe') return;
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      const { line, nightPolygon } = calculateTerminatorLine(currentTime);
      const currentThemeConfig = MAP_THEMES[mapTheme] || MAP_THEMES.satellite;

      // 1. Update/Add Night Shadow Polygon
      if (terminatorPolygonRef.current) {
        terminatorPolygonRef.current.setLatLngs(nightPolygon);
        terminatorPolygonRef.current.setStyle({
          fillColor: currentThemeConfig.nightFillColor,
          fillOpacity: currentThemeConfig.nightFillOpacity,
        });
      } else {
        const polygon = L.polygon(nightPolygon, {
          fillColor: currentThemeConfig.nightFillColor,
          fillOpacity: currentThemeConfig.nightFillOpacity,
          stroke: false,
          interactive: false,
          pane: map.getPane('terminatorPane') ? 'terminatorPane' : 'overlayPane',
        });
        polygon.addTo(map);
        terminatorPolygonRef.current = polygon;
      }

      // 2. Update/Add Glowing Solar Terminator Line
      if (terminatorLineRef.current) {
        terminatorLineRef.current.setLatLngs(line);
        terminatorLineRef.current.setStyle({
          color: currentThemeConfig.terminatorColor,
        });
      } else {
        const polyline = L.polyline(line, {
          color: currentThemeConfig.terminatorColor,
          weight: 3,
          opacity: 0.95,
          dashArray: '8, 6',
          interactive: false,
          pane: map.getPane('terminatorPane') ? 'terminatorPane' : 'overlayPane',
        });
        polyline.addTo(map);
        terminatorLineRef.current = polyline;
      }
    } catch (err) {
      console.error('Terminator render error:', err);
    }
  }, [terminatorStepKey, mapProjection, mapTheme]);

  // Render dynamic Leaflet HTML Markers for each visible region
  useEffect(() => {
    if (mapProjection === 'globe') return;
    const map = mapInstanceRef.current;
    if (!map) return;

    const isDark = document.documentElement.classList.contains('dark');
    const currentMarkers = markersRef.current;
    const activeIds = new Set(visibleRegions.map((r) => r.id));

    // Remove markers that are no longer visible
    for (const [id, marker] of currentMarkers.entries()) {
      if (!activeIds.has(id)) {
        map.removeLayer(marker);
        currentMarkers.delete(id);
      }
    }

    // Add or update markers
    visibleRegions.forEach((region) => {
      const isPinned = region.id === pinnedRegionId;
      const formattedTime = formatTimeInZone(region.timezone, currentTime, is24Hour);

      const badgeBgClass = isPinned
        ? 'bg-navy-900/95 text-gold-400 border-gold-500 shadow-md'
        : 'bg-navy-950/85 text-slate-200 border-white/10 group-hover:border-gold-400/60 shadow-md';

      const cityTextClass = isPinned ? 'text-gold-400 font-bold' : 'text-slate-100 font-semibold';
      const timeTextClass = 'text-gold-400 font-bold';
      const pinTipClass = isPinned
        ? 'bg-navy-900 border-gold-500'
        : 'bg-navy-950 border-white/10 group-hover:border-gold-400/60';

      if (currentMarkers.has(region.id)) {
        const existingMarker = currentMarkers.get(region.id)!;
        const markerEl = existingMarker.getElement();
        const timeValEl = markerEl?.querySelector('.marker-time-val');
        const badgeEl = markerEl?.querySelector('.marker-badge');
        const cityEl = markerEl?.querySelector('.marker-city-val');
        const pulseEl = markerEl?.querySelector('.marker-pulse');
        const pinTipEl = markerEl?.querySelector('.marker-tip');

        if (markerEl && timeValEl) {
          if (timeValEl.textContent !== formattedTime.hoursMinutes) {
            timeValEl.textContent = formattedTime.hoursMinutes;
          }
          const prevPinned = (existingMarker as any)._isPinned;
          if (prevPinned !== isPinned) {
            (existingMarker as any)._isPinned = isPinned;
            if (badgeEl) {
              badgeEl.className = `marker-badge relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans tabular-nums font-semibold backdrop-blur-md border ${badgeBgClass}`;
            }
            if (cityEl) {
              cityEl.className = `font-sans font-semibold tracking-wide marker-city-val ${cityTextClass}`;
            }
            if (timeValEl) {
              timeValEl.className = `text-[11px] font-bold ml-1 marker-time-val ${timeTextClass}`;
            }
            if (pulseEl) {
              pulseEl.className = 'hidden';
            }
            if (pinTipEl) {
              pinTipEl.className = `marker-tip w-2 h-2 rotate-45 -mt-1 border-r border-b ${pinTipClass}`;
            }
          }
          existingMarker.setLatLng([region.lat, region.lng]);
          return;
        }
      }

      const htmlContent = `
        <div class="group cursor-pointer relative flex flex-col items-center select-none" data-region-id="${region.id}">
          <!-- Marker Badge -->
          <div class="marker-badge relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans tabular-nums font-semibold backdrop-blur-md border ${badgeBgClass}">
            <img src="https://flagcdn.com/w40/${region.countryCode.toLowerCase()}.png" class="w-4 h-3 rounded-xs object-cover inline-block shadow-xs shrink-0" alt="${region.country}" />
            <span class="font-sans font-semibold tracking-wide marker-city-val ${cityTextClass}">${region.city}</span>
            <span class="text-[11px] font-bold ml-1 marker-time-val ${timeTextClass}">${formattedTime.hoursMinutes}</span>
          </div>

          <!-- Marker Pin Tip -->
          <div class="marker-tip w-2 h-2 rotate-45 -mt-1 border-r border-b ${pinTipClass}"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: htmlContent,
        className: 'custom-leaflet-marker',
        iconSize: [140, 42],
        iconAnchor: [70, 42],
      });

      if (currentMarkers.has(region.id)) {
        const existingMarker = currentMarkers.get(region.id)!;
        existingMarker.setIcon(customIcon);
        existingMarker.setLatLng([region.lat, region.lng]);
        (existingMarker as any)._isPinned = isPinned;
      } else {
        const marker = L.marker([region.lat, region.lng], { icon: customIcon });
        (marker as any)._isPinned = isPinned;
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectRegion(region);
        });
        marker.addTo(map);
        currentMarkers.set(region.id, marker);
      }
    });
  }, [visibleRegions, pinnedRegionId, currentTime, is24Hour, mapProjection]);

  // Invalidate Leaflet map size on projection toggle to ensure tile grid renders smoothly
  useEffect(() => {
    if (mapProjection === 'flat' && mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize({ animate: false });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [mapProjection]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-navy-950 select-none">
      {/* 2D Leaflet Flat Map Layer */}
      <motion.div
        className="absolute inset-0 w-full h-full z-0"
        initial={false}
        animate={{
          opacity: mapProjection === 'flat' ? 1 : 0,
          scale: mapProjection === 'flat' ? 1 : 1.04,
          pointerEvents: mapProjection === 'flat' ? 'auto' : 'none',
        }}
        transition={{
          duration: 0.45,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{ willChange: 'opacity, transform' }}
      >
        <div ref={mapContainerRef} className="w-full h-full" />
        {/* Ambient Glow Overlay for Flat Map */}
        <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-transparent to-navy-950/60" />

        {/* Floating Map Theme Switcher in Flat Map Mode */}
        {!isExploreMode && onToggleMapTheme && (
          <div className="absolute top-[72px] sm:top-[76px] left-3 sm:left-6 z-20 pointer-events-auto animate-in fade-in duration-300">
            <div className="flex items-center p-0.5 sm:p-1 bg-navy-950/85 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-xl">
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playUISound('click');
                  onToggleMapTheme('satellite');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  mapTheme === 'satellite'
                    ? 'bg-gold-500/25 text-gold-300 border border-gold-500/60 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Satellite Imagery View"
              >
                <Satellite className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">Satellite</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playUISound('click');
                  onToggleMapTheme('dark');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  mapTheme === 'dark'
                    ? 'bg-gold-500/25 text-gold-300 border border-gold-500/60 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Midnight Tactical Vector View"
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">Midnight</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* 3D WebGL Globe Layer */}
      <motion.div
        className="absolute inset-0 w-full h-full z-10"
        initial={false}
        animate={{
          opacity: mapProjection === 'globe' ? 1 : 0,
          scale: mapProjection === 'globe' ? 1 : 0.96,
          pointerEvents: mapProjection === 'globe' ? 'auto' : 'none',
        }}
        transition={{
          duration: 0.45,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{ willChange: 'opacity, transform' }}
      >
        <Globe
          visibleRegions={visibleRegions}
          pinnedRegionId={pinnedRegionId}
          userRegionId={userRegionId}
          onSelectRegion={onSelectRegion}
          onResetMap={onResetMap}
          is24Hour={is24Hour}
          currentTime={currentTime}
          showSatellites={showSatellites}
          onToggleSatellites={onToggleSatellites}
          isExploreMode={isExploreMode}
        />
      </motion.div>
    </div>
  );
};

export const Map = memo(MapComponent);
