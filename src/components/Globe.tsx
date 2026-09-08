import React, { useEffect, useRef, useMemo } from 'react';
import GlobeGL from 'globe.gl';
import * as THREE from 'three';
import { TimeRegion } from '../types';

import { WORLD_COUNTRY_LABELS } from '../data/countryLabels';

interface GlobeProps {
  visibleRegions: TimeRegion[];
  pinnedRegionId: string | null;
  onSelectRegion: (region: TimeRegion) => void;
  onResetMap: () => void;
  is24Hour: boolean;
  currentTime: Date;
}

export const Globe: React.FC<GlobeProps> = ({
  visibleRegions,
  pinnedRegionId,
  onSelectRegion,
  onResetMap,
  is24Hour,
  currentTime,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeInstanceRef = useRef<any>(null);

  // City markers data
  const cityPoints = useMemo(() => {
    return visibleRegions.map((region) => {
      const isPinned = region.id === pinnedRegionId;

      return {
        id: region.id,
        lat: region.lat,
        lng: region.lng,
        city: region.city,
        country: region.country,
        countryCode: region.countryCode,
        isPinned,
        region,
      };
    });
  }, [visibleRegions, pinnedRegionId]);

  // Initialize Globe.gl instance with Earth satellite texture
  useEffect(() => {
    if (!containerRef.current || globeInstanceRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // Safe constructor resolution for Vite / ES module bundling
    const GlobeFactory = typeof GlobeGL === 'function'
      ? GlobeGL
      : (GlobeGL as any).default || (window as any).Globe;

    if (typeof GlobeFactory !== 'function') {
      console.error('GlobeGL factory function could not be loaded');
      return;
    }

    try {
      // Create Globe instance attached to container element
      const globe = GlobeFactory()(containerRef.current)
        .width(width)
        .height(height)
        .backgroundColor('rgba(5, 8, 17, 1)')
        // High-resolution actual satellite map imagery texture of Earth
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        // Topographic bump map for realistic 3D surface relief
        .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
        // Atmosphere glow parameters
        .atmosphereColor('#0f172a')
        .atmosphereAltitude(0.15)
        .showAtmosphere(true);

      // Set default fallback material color so sphere is immediately visible
      if (globe.globeMaterial()) {
        globe.globeMaterial().color = new THREE.Color(0x0f172a);
      }

      // Native WebGL Point Pins for Cities (Instant 0ms transition, Gold/Amber theme)
      globe.pointsData([])
        .pointsTransitionDuration(0)
        .pointLat((d: any) => d.lat)
        .pointLng((d: any) => d.lng)
        .pointColor((d: any) => (d.isPinned ? '#F59E0B' : '#D4AF37'))
        .pointRadius((d: any) => (d.isPinned ? 0.75 : 0.4))
        .pointAltitude((d: any) => (d.isPinned ? 0.03 : 0.01))
        .onPointClick((d: any) => {
          if (d && d.region) {
            onSelectRegion(d.region);
          }
        });

      // Native WebGL Crisp Country Name Labels
      globe.labelsData(WORLD_COUNTRY_LABELS)
        .labelLat((d: any) => d.lat)
        .labelLng((d: any) => d.lng)
        .labelText((d: any) => d.name)
        .labelSize((d: any) => d.size || 0.85)
        .labelDotRadius(0)
        .labelColor(() => 'rgba(248, 250, 252, 0.65)')
        .labelResolution(2)
        .labelAltitude(0.008);

      // Configure Orbit Controls
      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.6;
      controls.enableZoom = true;

      // Default 3D point of view
      globe.pointOfView({ lat: 20, lng: 0, altitude: 2.2 });

      globeInstanceRef.current = globe;
    } catch (err) {
      console.error('Error initializing GlobeGL:', err);
    }

    // Resize handler
    const handleResize = () => {
      if (containerRef.current && globeInstanceRef.current) {
        globeInstanceRef.current
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (globeInstanceRef.current) {
        globeInstanceRef.current._destructor();
        globeInstanceRef.current = null;
      }
    };
  }, []);

  // Update WebGL points and manage auto-rotation state
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    globe.pointsData(cityPoints);
    const controls = globe.controls();

    // If a region is pinned, pan 3D camera smoothly to center on its location & pause rotation
    if (pinnedRegionId) {
      const pinned = visibleRegions.find((r) => r.id === pinnedRegionId);
      if (pinned) {
        const isMobile = window.innerWidth < 768;
        const targetLng = pinned.lng;
        const targetLat = pinned.lat;
        const targetAlt = isMobile ? 0.9 : 0.65;

        if (controls) {
          controls.autoRotate = false;
        }

        globe.pointOfView({ lat: targetLat, lng: targetLng, altitude: targetAlt }, 1000);
      }
    } else {
      // When no city is selected, keep globe revolving smoothly
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.6;
      }
    }
  }, [cityPoints, pinnedRegionId, visibleRegions]);

  return (
    <div className="relative w-full h-full bg-navy-950 overflow-hidden select-none">
      {/* 3D WebGL Globe Render Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing z-0" />
    </div>
  );
};
