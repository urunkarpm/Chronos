import React, { useEffect, useRef, memo } from 'react';
import L from 'leaflet';
import { TimeRegion, MapProjection, ThemeMode } from '../types';
import { formatTimeInZone, calculateTerminatorLine } from '../utils/timeUtils';
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
}

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

  // Initialize Map instance with Satellite Night base layer
  useEffect(() => {
    if (mapProjection === 'globe' || !mapContainerRef.current || mapInstanceRef.current) return;

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

    // Satellite Imagery Base Layer (Dark satellite earth backdrop for both themes)
    const satImagery = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        subdomains: 'abcd',
        updateWhenZooming: false,
        updateWhenIdle: true,
        keepBuffer: 16,
        attribution: '&copy; Esri, Maxar, Earthstar Geographics',
        className: 'gpu-accelerated',
      }
    );

    // Country & City Labels Overlay
    const countryLabels = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 18,
        subdomains: 'abcd',
        updateWhenZooming: false,
        updateWhenIdle: true,
        keepBuffer: 16,
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        className: 'gpu-accelerated',
      }
    );

    baseLayerRef.current = satImagery;
    labelsLayerRef.current = countryLabels;
    L.layerGroup([satImagery, countryLabels]).addTo(map);

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
  }, [mapProjection]);

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

        // Fly directly to newCenterLatLng with ultra-fast response
        map.flyTo(newCenterLatLng, targetZoom, {
          duration: 0.65,
          easeLinearity: 0.1,
          animate: true,
        });
      } else {
        map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, {
          duration: 0.65,
          easeLinearity: 0.1,
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

  // Live real-time solar day/night terminator curve overlay
  useEffect(() => {
    if (mapProjection === 'globe') return;
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      const { line, nightPolygon } = calculateTerminatorLine(currentTime);
      const isDark = document.documentElement.classList.contains('dark');

      // 1. Update/Add Night Shadow Polygon
      if (terminatorPolygonRef.current) {
        terminatorPolygonRef.current.setLatLngs(nightPolygon);
        terminatorPolygonRef.current.setStyle({
          fillColor: isDark ? '#020617' : '#0f172a',
          fillOpacity: isDark ? 0.55 : 0.22,
        });
      } else {
        const polygon = L.polygon(nightPolygon, {
          fillColor: isDark ? '#020617' : '#0f172a',
          fillOpacity: isDark ? 0.55 : 0.22,
          stroke: false,
          interactive: false,
          pane: map.getPane('terminatorPane') ? 'terminatorPane' : 'overlayPane',
        });
        polygon.addTo(map);
        terminatorPolygonRef.current = polygon;
      }

      // 2. Update/Add Glowing Gold Solar Terminator Line
      if (terminatorLineRef.current) {
        terminatorLineRef.current.setLatLngs(line);
        terminatorLineRef.current.setStyle({
          color: isDark ? '#F3E5AB' : '#d97706',
        });
      } else {
        const polyline = L.polyline(line, {
          color: isDark ? '#F3E5AB' : '#d97706',
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
  }, [currentTime, mapProjection]);

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

  if (mapProjection === 'globe') {
    return (
      <Globe
        visibleRegions={visibleRegions}
        pinnedRegionId={pinnedRegionId}
        onSelectRegion={onSelectRegion}
        onResetMap={onResetMap}
        is24Hour={is24Hour}
        currentTime={currentTime}
      />
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Subtle Ambient Glow Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-transparent to-navy-950/60" />
    </div>
  );
};

export const Map = memo(MapComponent);
