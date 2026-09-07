import React, { useEffect, useRef, memo } from 'react';
import L from 'leaflet';
import { TimeRegion } from '../types';
import { formatTimeInZone } from '../utils/timeUtils';

interface MapProps {
  visibleRegions: TimeRegion[];
  pinnedRegionId: string | null;
  onSelectRegion: (region: TimeRegion) => void;
  onResetMap: () => void;
  is24Hour: boolean;
  currentTime: Date;
}

export const MapComponent: React.FC<MapProps> = ({
  visibleRegions,
  pinnedRegionId,
  onSelectRegion,
  onResetMap,
  is24Hour,
  currentTime,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());

  // Default world center view
  const DEFAULT_CENTER: [number, number] = [20, 0];
  const DEFAULT_ZOOM = 2.5;

  // Initialize Map instance with Satellite Night base layer
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
      minZoom: 2,
      maxZoom: 18,
      zoomSnap: 0.1,
    });

    // Satellite Imagery Base Layer
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
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        subdomains: 'abcd',
        updateWhenZooming: false,
        updateWhenIdle: true,
        keepBuffer: 16,
        attribution: '&copy; Esri Boundaries & Places',
        className: 'gpu-accelerated',
      }
    );

    L.layerGroup([satImagery, countryLabels]).addTo(map);

    // Click on map background resets pinned state
    map.on('click', (e) => {
      const originalEv = e.originalEvent;
      if (originalEv && (originalEv.target as HTMLElement).closest('.leaflet-marker-icon')) {
        return;
      }
      onResetMap();
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle map zoom/pan when pinned region changes or resets with precise visual centering
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Small delay to allow React DOM layout shifts to complete
    const timer = setTimeout(() => {
      map.invalidateSize({ animate: false });

      if (pinnedRegionId) {
        const pinned = visibleRegions.find((r) => r.id === pinnedRegionId);
        if (pinned) {
          const isMobile = window.innerWidth < 768;
          const targetZoom = isMobile ? 6 : 6.5;

          // Accurately measure visible open screen area (accounting for navbar at top & drawer at bottom/side)
          const navHeight = isMobile ? 88 : 60;
          const bottomDrawerHeight = isMobile ? 85 : 0;
          const rightDrawerWidth = isMobile ? 0 : 384;

          const mapSize = map.getSize();
          const mapWidth = mapSize.x;
          const mapHeight = mapSize.y;

          // Target visual center point in pixels from top-left of container
          const visualCenterX = (mapWidth - rightDrawerWidth) / 2;
          const visualCenterY = navHeight + (mapHeight - navHeight - bottomDrawerHeight) / 2;

          // Container geometric center
          const geomCenterX = mapWidth / 2;
          const geomCenterY = mapHeight / 2;

          // Project pinned location at target zoom
          const containerPoint = map.project([pinned.lat, pinned.lng], targetZoom);

          // Calculate shifted center point in pixel space
          const shiftX = geomCenterX - visualCenterX;
          const shiftY = geomCenterY - visualCenterY;

          const newCenterPoint = L.point(containerPoint.x + shiftX, containerPoint.y + shiftY);
          const newCenterLatLng = map.unproject(newCenterPoint, targetZoom);

          // Fly directly to newCenterLatLng with ultra-fast 120Hz response
          map.flyTo(newCenterLatLng, targetZoom, {
            duration: 0.65,
            easeLinearity: 0.1,
            animate: true,
          });
        }
      } else {
        // Ultra-smooth 120Hz direct zoom out to default world view
        map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, {
          duration: 0.65,
          easeLinearity: 0.1,
          animate: true,
        });
      }
    }, 40);

    return () => clearTimeout(timer);
  }, [pinnedRegionId]);

  // Handle window resize to keep Leaflet map container bounds in sync
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render dynamic Leaflet HTML Markers for each visible region
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

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

      if (currentMarkers.has(region.id)) {
        const existingMarker = currentMarkers.get(region.id)!;
        const markerEl = existingMarker.getElement();
        const timeValEl = markerEl?.querySelector('.marker-time-val');
        const badgeEl = markerEl?.querySelector('.marker-badge');
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
              badgeEl.className = `marker-badge relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium backdrop-blur-md border ${
                isPinned
                  ? 'bg-navy-900/95 text-gold-400 border-gold-500 shadow-md'
                  : 'bg-navy-950/85 text-slate-200 border-white/10 group-hover:border-gold-400/60 shadow-md'
              }`;
            }
            if (pulseEl) {
              pulseEl.className = 'hidden';
            }
            if (pinTipEl) {
              pinTipEl.className = `marker-tip w-2 h-2 rotate-45 -mt-1 border-r border-b ${
                isPinned ? 'bg-navy-900 border-gold-500' : 'bg-navy-950 border-white/10 group-hover:border-gold-400/60'
              }`;
            }
          }
          existingMarker.setLatLng([region.lat, region.lng]);
          return;
        }
      }

      const htmlContent = `
        <div class="group cursor-pointer relative flex flex-col items-center select-none" data-region-id="${region.id}">
          <!-- Marker Badge -->
          <div class="marker-badge relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium backdrop-blur-md border ${
            isPinned
              ? 'bg-navy-900/95 text-gold-400 border-gold-500 shadow-md'
              : 'bg-navy-950/85 text-slate-200 border-white/10 group-hover:border-gold-400/60 shadow-md'
          }">
            <img src="https://flagcdn.com/w40/${region.countryCode.toLowerCase()}.png" class="w-4 h-3 rounded-xs object-cover inline-block shadow-xs shrink-0" alt="${region.country}" />
            <span class="font-sans font-semibold tracking-wide text-slate-100">${region.city}</span>
            <span class="text-[11px] text-gold-400 font-bold ml-1 marker-time-val">${formattedTime.hoursMinutes}</span>
          </div>

          <!-- Marker Pin Tip -->
          <div class="marker-tip w-2 h-2 rotate-45 -mt-1 border-r border-b ${
            isPinned
              ? 'bg-navy-900 border-gold-500'
              : 'bg-navy-950 border-white/10 group-hover:border-gold-400/60'
          }"></div>
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
  }, [visibleRegions, pinnedRegionId, currentTime, is24Hour]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Subtle Ambient Glow Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-transparent to-navy-950/60" />
    </div>
  );
};

export const Map = memo(MapComponent);
