import React, { useEffect, useRef, useMemo } from 'react';
import GlobeGL from 'globe.gl';
import * as THREE from 'three';
import { TimeRegion } from '../types';
import { WORLD_COUNTRY_LABELS } from '../data/countryLabels';
import { formatTimeInZone, getSubsolarPoint } from '../utils/timeUtils';

interface GlobeProps {
  visibleRegions: TimeRegion[];
  pinnedRegionId: string | null;
  userRegionId?: string | null;
  onSelectRegion: (region: TimeRegion) => void;
  onResetMap: () => void;
  is24Hour: boolean;
  currentTime: Date;
}

export const Globe: React.FC<GlobeProps> = ({
  visibleRegions,
  pinnedRegionId,
  userRegionId,
  onSelectRegion,
  onResetMap,
  is24Hour,
  currentTime,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeInstanceRef = useRef<any>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsRafRef = useRef<number | null>(null);

  // Identify primary hub city (user region or pinned region or first visible region)
  const homeRegion = useMemo(() => {
    if (userRegionId) {
      const found = visibleRegions.find((r) => r.id === userRegionId);
      if (found) return found;
    }
    if (pinnedRegionId) {
      const found = visibleRegions.find((r) => r.id === pinnedRegionId);
      if (found) return found;
    }
    return visibleRegions[0] || null;
  }, [userRegionId, pinnedRegionId, visibleRegions]);

  // Arcs data connecting home region to all other visible regions
  const arcsData = useMemo(() => {
    if (!homeRegion) return [];
    return visibleRegions
      .filter((r) => r.id !== homeRegion.id)
      .map((r) => {
        const isTargetPinned = r.id === pinnedRegionId;
        return {
          startLat: homeRegion.lat,
          startLng: homeRegion.lng,
          endLat: r.lat,
          endLng: r.lng,
          color: isTargetPinned
            ? ['rgba(245, 158, 11, 0.95)', 'rgba(56, 189, 248, 0.95)']
            : ['rgba(212, 175, 55, 0.65)', 'rgba(56, 189, 248, 0.35)'],
          stroke: isTargetPinned ? 1.2 : 0.6,
          dashLength: isTargetPinned ? 0.4 : 0.25,
          dashGap: 0.15,
          dashAnimateTime: isTargetPinned ? 1800 : 2500,
        };
      });
  }, [homeRegion, visibleRegions, pinnedRegionId]);

  // Rings data for pulsing radar effect
  const ringsData = useMemo(() => {
    return visibleRegions.map((r) => {
      const isPinned = r.id === pinnedRegionId;
      const isHome = homeRegion ? r.id === homeRegion.id : false;
      return {
        lat: r.lat,
        lng: r.lng,
        isPinned,
        isHome,
      };
    });
  }, [visibleRegions, pinnedRegionId, homeRegion]);

  // Minute key prevents destroying and re-mounting 3D HTML marker elements on every 1-second tick
  const minuteKey = `${currentTime.getHours()}:${currentTime.getMinutes()}-${is24Hour}`;

  // City HTML markers data
  const htmlData = useMemo(() => {
    return visibleRegions.map((r) => {
      const isPinned = r.id === pinnedRegionId;
      const isHome = homeRegion ? r.id === homeRegion.id : false;
      const timeInfo = formatTimeInZone(r.timezone, currentTime, is24Hour);
      return {
        region: r,
        id: r.id,
        lat: r.lat,
        lng: r.lng,
        city: r.city,
        countryCode: r.countryCode,
        country: r.country,
        timeStr: timeInfo.hoursMinutes,
        isPinned,
        isHome,
        altitude: isPinned ? 0.04 : 0.02,
      };
    });
  }, [visibleRegions, pinnedRegionId, homeRegion, minuteKey]);

  // Initialize Globe.gl instance
  useEffect(() => {
    if (!containerRef.current || globeInstanceRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    const GlobeFactory =
      typeof GlobeGL === 'function'
        ? GlobeGL
        : (GlobeGL as any).default || (window as any).Globe;

    if (typeof GlobeFactory !== 'function') {
      console.error('GlobeGL factory function could not be loaded');
      return;
    }

    try {
      const globe = GlobeFactory()(containerRef.current)
        .width(width)
        .height(height)
        .backgroundColor('rgba(5, 7, 14, 1)')
        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
        .atmosphereColor('#38BDF8')
        .atmosphereAltitude(0.18)
        .showAtmosphere(true)
        .showGraticules(false);

      // Create Realistic Solar & Deep-Space Lighting
      const ambientLight = new THREE.AmbientLight(0x1a2640, 0.45);
      const sunLight = new THREE.DirectionalLight(0xfffaed, 3.6);
      sunLightRef.current = sunLight;

      // Replace default camera lights with single real-time Sun light + space ambient fill
      if (typeof globe.lights === 'function') {
        globe.lights([ambientLight, sunLight]);
      }

      // Configure Night Lights & Ocean Specular Water Glint
      const textureLoader = new THREE.TextureLoader();
      const nightTexture = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-night.jpg');
      const waterTexture = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-water.png');

      if (globe.globeMaterial()) {
        const mat = globe.globeMaterial();
        mat.emissiveMap = nightTexture;
        mat.emissive = new THREE.Color(0xffd580);
        mat.emissiveIntensity = 0.65;
        mat.specularMap = waterTexture;
        mat.specular = new THREE.Color(0x38bdf8);
        mat.shininess = 28;
        mat.bumpScale = 10;
      }

      // Volumetric Drifting Clouds Layer floating above Earth's surface
      const cloudsTexture = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-clouds.png');
      const globeRadius = typeof globe.getGlobeRadius === 'function' ? globe.getGlobeRadius() : 100;
      const cloudsMesh = new THREE.Mesh(
        new THREE.SphereGeometry(globeRadius * 1.004, 75, 75),
        new THREE.MeshStandardMaterial({
          map: cloudsTexture,
          transparent: true,
          opacity: 0.82,
          blending: THREE.NormalBlending,
          roughness: 0.9,
        })
      );
      globe.scene().add(cloudsMesh);
      cloudsMeshRef.current = cloudsMesh;

      const animateClouds = () => {
        if (cloudsMeshRef.current) {
          cloudsMeshRef.current.rotation.y += 0.00035;
        }
        cloudsRafRef.current = requestAnimationFrame(animateClouds);
      };
      animateClouds();

      // Initial sun position calculation
      const initialSun = getSubsolarPoint(currentTime);
      const initialCoords = globe.getCoords ? globe.getCoords(initialSun.lat, initialSun.lng, 4) : null;
      if (initialCoords && sunLightRef.current) {
        sunLightRef.current.position.set(initialCoords.x, initialCoords.y, initialCoords.z);
      }

      // Connecting Arcs between home region and world cities
      globe
        .arcsData([])
        .arcStartLat((d: any) => d.startLat)
        .arcStartLng((d: any) => d.startLng)
        .arcEndLat((d: any) => d.endLat)
        .arcEndLng((d: any) => d.endLng)
        .arcColor((d: any) => d.color)
        .arcStroke((d: any) => d.stroke)
        .arcDashLength((d: any) => d.dashLength)
        .arcDashGap((d: any) => d.dashGap)
        .arcDashInitialGap(0)
        .arcDashAnimateTime((d: any) => d.dashAnimateTime)
        .arcAltitude((d: any) => {
          const dLat = (d.endLat - d.startLat) * (Math.PI / 180);
          const dLng = (d.endLng - d.startLng) * (Math.PI / 180);
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          return Math.min(0.35, Math.max(0.12, dist * 0.15));
        });

      // Pulsing Wave Radar Rings
      globe
        .ringsData([])
        .ringLat((d: any) => d.lat)
        .ringLng((d: any) => d.lng)
        .ringColor((d: any) => (t: number) => {
          if (d.isPinned) return `rgba(245, 158, 11, ${Math.pow(1 - t, 2)})`;
          if (d.isHome) return `rgba(56, 189, 248, ${Math.pow(1 - t, 2)})`;
          return `rgba(212, 175, 55, ${0.4 * Math.pow(1 - t, 2)})`;
        })
        .ringMaxRadius((d: any) => (d.isPinned ? 5.5 : d.isHome ? 4.5 : 2.8))
        .ringPropagationSpeed((d: any) => (d.isPinned ? 3.5 : 2.0))
        .ringRepeatPeriod((d: any) => (d.isPinned ? 850 : 1500));

      // Native WebGL Crisp Country Name Labels
      globe
        .labelsData(WORLD_COUNTRY_LABELS)
        .labelLat((d: any) => d.lat)
        .labelLng((d: any) => d.lng)
        .labelText((d: any) => d.name)
        .labelSize((d: any) => (d.size ? d.size * 0.85 : 0.65))
        .labelDotRadius(0)
        .labelColor(() => 'rgba(255, 255, 255, 0.45)')
        .labelResolution(3)
        .labelAltitude(0.009);

      // Custom Floating HTML Elements for City Badges
      globe
        .htmlElementsData([])
        .htmlLat((d: any) => d.lat)
        .htmlLng((d: any) => d.lng)
        .htmlAltitude((d: any) => d.altitude)
        .htmlElement((d: any) => {
          const el = document.createElement('div');
          el.className = 'globe-city-badge-wrapper';
          el.setAttribute('data-region-id', d.id);

          const pinnedClass = d.isPinned
            ? 'border-gold-500 bg-navy-900/95 text-gold-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-110 z-30'
            : d.isHome
            ? 'border-sky-400 bg-navy-950/90 text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.3)] z-20'
            : 'border-white/15 bg-navy-950/80 text-slate-200 hover:border-gold-400/70 hover:scale-105 z-10';

          el.innerHTML = `
            <div class="cursor-pointer group flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-sans font-semibold tracking-wide backdrop-blur-md transition-all duration-300 ${pinnedClass}">
              <img src="https://flagcdn.com/w40/${d.countryCode.toLowerCase()}.png" class="w-3.5 h-2.5 rounded-2xs object-cover shrink-0 opacity-90 group-hover:opacity-100" alt="${d.country}" />
              <span class="font-medium truncate max-w-[85px]">${d.city}</span>
              <span class="font-mono text-[11px] font-bold text-gold-400 ml-0.5">${d.timeStr}</span>
            </div>
          `;

          el.onclick = (e) => {
            e.stopPropagation();
            if (d.region) {
              onSelectRegion(d.region);
            }
          };

          return el;
        })
        .htmlTransitionDuration(300);

      // Orbit Controls Configuration
      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableZoom = true;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 140;
      controls.maxDistance = 600;

      // Default POV
      globe.pointOfView({ lat: 20, lng: 0, altitude: 2.1 });

      // Click background to reset map selection
      const globeContainer = containerRef.current;
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target && target.closest('.globe-city-badge-wrapper')) {
          return;
        }
        onResetMap();
      };
      globeContainer.addEventListener('click', handleClick);

      globeInstanceRef.current = globe;
    } catch (err) {
      console.error('Error initializing GlobeGL:', err);
    }

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
      if (cloudsRafRef.current) {
        cancelAnimationFrame(cloudsRafRef.current);
      }
      if (globeInstanceRef.current) {
        if (cloudsMeshRef.current) {
          try {
            globeInstanceRef.current.scene().remove(cloudsMeshRef.current);
            cloudsMeshRef.current.geometry.dispose();
            (cloudsMeshRef.current.material as THREE.Material).dispose();
          } catch (e) {}
          cloudsMeshRef.current = null;
        }
        globeInstanceRef.current._destructor();
        globeInstanceRef.current = null;
      }
    };
  }, []);

  // Sync real-time solar light position using Globe's 3D coordinate utility
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe || !sunLightRef.current) return;

    const { lat, lng } = getSubsolarPoint(currentTime);
    const sunCoords = globe.getCoords ? globe.getCoords(lat, lng, 4) : null;

    if (sunCoords) {
      sunLightRef.current.position.set(sunCoords.x, sunCoords.y, sunCoords.z);
    }
  }, [minuteKey]);

  // Sync Arcs, Rings & HTML Elements
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    globe.arcsData(arcsData);
    globe.ringsData(ringsData);
    globe.htmlElementsData(htmlData);

    const controls = globe.controls();

    if (pinnedRegionId) {
      const pinned = visibleRegions.find((r) => r.id === pinnedRegionId);
      if (pinned) {
        const isMobile = window.innerWidth < 768;
        const targetLng = pinned.lng;
        const targetLat = pinned.lat;
        const targetAlt = isMobile ? 0.95 : 0.7;

        if (controls) {
          controls.autoRotate = false;
        }

        globe.pointOfView({ lat: targetLat, lng: targetLng, altitude: targetAlt }, 1000);
      }
    } else {
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.45;
      }
    }
  }, [arcsData, ringsData, htmlData, pinnedRegionId, visibleRegions]);

  return (
    <div className="relative w-full h-full bg-navy-950 overflow-hidden select-none">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing z-0" />

      {/* Futuristic Vignette Glow Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-transparent to-navy-950/70" />
    </div>
  );
};
