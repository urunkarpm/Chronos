import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import GlobeGL from 'globe.gl';
import * as THREE from 'three';
import { TimeRegion } from '../types';
import { WORLD_COUNTRY_LABELS } from '../data/countryLabels';
import { formatTimeInZone, getSubsolarPoint } from '../utils/timeUtils';
import { SATELLITE_CATALOG } from '../data/satellites';
import { SatelliteDefinition, SatelliteLiveState, SatelliteOrbitalPath } from '../types/satellite';
import {
  getSatelliteLiveState,
  getSatelliteOrbitalPath,
  createSatellite3DModel,
} from '../utils/satelliteService';
import { SatelliteTelemetryHUD } from './SatelliteTelemetryHUD';

interface GlobeProps {
  visibleRegions: TimeRegion[];
  pinnedRegionId: string | null;
  userRegionId?: string | null;
  onSelectRegion: (region: TimeRegion) => void;
  onResetMap: () => void;
  is24Hour: boolean;
  currentTime: Date;
  showSatellites?: boolean;
  onToggleSatellites?: (val: boolean) => void;
  isExploreMode?: boolean;
}

export const Globe: React.FC<GlobeProps> = ({
  visibleRegions,
  pinnedRegionId,
  userRegionId,
  onSelectRegion,
  onResetMap,
  is24Hour,
  currentTime,
  showSatellites: externalShowSatellites,
  onToggleSatellites,
  isExploreMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeInstanceRef = useRef<any>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsRafRef = useRef<number | null>(null);

  // Satellite visibility & tracking state (controlled from App/Navbar or persisted fallback)
  const [internalShowSatellites, setInternalShowSatellites] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('chronos_show_satellites');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const showSatellites = externalShowSatellites !== undefined ? externalShowSatellites : internalShowSatellites;

  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null>(null);
  const [selectedSatelliteState, setSelectedSatelliteState] = useState<SatelliteLiveState | null>(null);
  const [hoveredSatellite, setHoveredSatellite] = useState<SatelliteDefinition | null>(null);

  const showSatellitesRef = useRef<boolean>(showSatellites);
  showSatellitesRef.current = showSatellites;

  const selectedSatelliteIdRef = useRef<string | null>(selectedSatelliteId);
  selectedSatelliteIdRef.current = selectedSatelliteId;

  const hoveredSatelliteRef = useRef<SatelliteDefinition | null>(null);
  hoveredSatelliteRef.current = hoveredSatellite;

  const satelliteGroupRef = useRef<THREE.Group | null>(null);
  const satelliteMeshesRef = useRef<Map<string, THREE.Group>>(new Map());

  const handleToggleSatellites = useCallback((val: boolean) => {
    if (onToggleSatellites) {
      onToggleSatellites(val);
    } else {
      setInternalShowSatellites(val);
    }
    try {
      localStorage.setItem('chronos_show_satellites', String(val));
    } catch {}
    if (!val) {
      setSelectedSatelliteId(null);
      setSelectedSatelliteState(null);
    }
  }, [onToggleSatellites]);

  const handleFocusSatellite = useCallback((satState: SatelliteLiveState) => {
    const globe = globeInstanceRef.current;
    if (!globe) return;
    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = false;
    }
    const viewAlt = Math.max(0.65, satState.globeAltitude * 1.85);
    globe.pointOfView({ lat: satState.lat, lng: satState.lng, altitude: viewAlt }, 1000);
  }, []);

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

    let handlePointerMove: ((e: MouseEvent) => void) | null = null;
    let handleClick: ((e: MouseEvent) => void) | null = null;

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

      // Realistic 3D Spacecraft Group in Three.js Scene
      const satelliteGroup = new THREE.Group();
      satelliteGroup.name = 'satellite_fleet_group';
      satelliteGroup.visible = showSatellitesRef.current;
      globe.scene().add(satelliteGroup);
      satelliteGroupRef.current = satelliteGroup;

      // Instantiate authentic 3D models for all catalog satellites
      satelliteMeshesRef.current.clear();
      for (const sat of SATELLITE_CATALOG) {
        const mesh = createSatellite3DModel(sat);
        mesh.visible = true;
        satelliteMeshesRef.current.set(sat.id, mesh);
        satelliteGroup.add(mesh);
      }

      // Continuous 60/120 FPS WebGL Animation Loop
      const animateScene = () => {
        // 1. Drifting Atmospheric Clouds
        if (cloudsMeshRef.current) {
          cloudsMeshRef.current.rotation.y += 0.00035;
        }

        // 2. Real-Time Butter-Smooth Satellite Orbital Glide (60/120 FPS)
        if (showSatellitesRef.current && satelliteGroupRef.current && globeInstanceRef.current) {
          const now = new Date();
          const nowMs = now.getTime();
          const globe = globeInstanceRef.current;

          for (const sat of SATELLITE_CATALOG) {
            const mesh = satelliteMeshesRef.current.get(sat.id);
            if (!mesh) continue;

            const liveState = getSatelliteLiveState(sat, now);
            if (!liveState) continue;

            const coords = globe.getCoords ? globe.getCoords(liveState.lat, liveState.lng, liveState.globeAltitude) : null;
            if (coords) {
              mesh.position.set(coords.x, coords.y, coords.z);

              // Calculate tangent forward heading direction vector (look ahead by 2 seconds)
              const aheadDate = new Date(nowMs + 2000);
              const aheadState = getSatelliteLiveState(sat, aheadDate);
              if (aheadState) {
                const aheadCoords = globe.getCoords ? globe.getCoords(aheadState.lat, aheadState.lng, aheadState.globeAltitude) : null;
                if (aheadCoords) {
                  mesh.lookAt(aheadCoords.x, aheadCoords.y, aheadCoords.z);
                }
              }

              // Pulse the halo aura ring and highlight if selected or hovered
              const isSelected = sat.id === selectedSatelliteIdRef.current;
              const isHovered = hoveredSatelliteRef.current?.id === sat.id;

              mesh.traverse((child: any) => {
                if (child.geometry instanceof THREE.RingGeometry) {
                  const pulse = (isSelected || isHovered ? 1.35 : 1.0) * (1 + 0.12 * Math.sin(nowMs * 0.004 + sat.noradId));
                  child.scale.set(pulse, pulse, pulse);
                  if (child.material) {
                    child.material.opacity = isSelected || isHovered ? 0.95 : 0.45;
                  }
                }
              });
            }
          }
        }

        cloudsRafRef.current = requestAnimationFrame(animateScene);
      };
      animateScene();

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

      // 3D Orbital Trajectory Lines (Keplerian planar rings in space)
      globe
        .pathsData([])
        .pathPoints((d: any) => d.points)
        .pathPointLat((p: any) => p.lat)
        .pathPointLng((p: any) => p.lng)
        .pathPointAlt((p: any) => p.alt)
        .pathColor((d: any) => d.color)
        .pathStroke((d: any) => (d.satelliteId === selectedSatelliteIdRef.current ? 3.0 : 1.2))
        .pathDashLength(0.06)
        .pathDashGap(0.02)
        .pathDashAnimateTime(16000)
        .pathResolution(0.5);

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

      // Raycasting for interactive satellite inspection and hovering
      const raycaster = new THREE.Raycaster();
      raycaster.params.Line = { threshold: 2 };
      const mouse = new THREE.Vector2();

      const getIntersectedSatellite = (event: MouseEvent): SatelliteDefinition | null => {
        if (!containerRef.current || !globeInstanceRef.current || !satelliteGroupRef.current) return null;
        if (!showSatellitesRef.current) return null;

        const rect = containerRef.current.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const camera = globeInstanceRef.current.camera();
        if (!camera) return null;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(satelliteGroupRef.current.children, true);
        if (intersects.length > 0) {
          let curr: THREE.Object3D | null = intersects[0].object;
          while (curr && !(curr as any).__satelliteData && curr.parent && curr !== satelliteGroupRef.current) {
            curr = curr.parent;
          }
          if (curr && (curr as any).__satelliteData) {
            return (curr as any).__satelliteData as SatelliteDefinition;
          }
        }
        return null;
      };

      const globeContainer = containerRef.current;

        handlePointerMove = (e: MouseEvent) => {
        const sat = getIntersectedSatellite(e);
        if (sat) {
          if (containerRef.current) containerRef.current.style.cursor = 'pointer';
          setHoveredSatellite(sat);
        } else {
          if (hoveredSatelliteRef.current) {
            setHoveredSatellite(null);
            if (containerRef.current) containerRef.current.style.cursor = 'grab';
          }
        }
      };

      handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
          target &&
          (target.closest('.globe-city-badge-wrapper') ||
            target.closest('.globe-satellite-toggle') ||
            target.closest('.globe-hud-container') ||
            target.closest('.globe-satellite-tooltip'))
        ) {
          return;
        }

        const sat = getIntersectedSatellite(e);
        if (sat) {
          e.stopPropagation();
          setSelectedSatelliteId(sat.id);
          return;
        }

        onResetMap();
      };

      globeContainer.addEventListener('mousemove', handlePointerMove);
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
      if (containerRef.current) {
        if (handlePointerMove) containerRef.current.removeEventListener('mousemove', handlePointerMove);
        if (handleClick) containerRef.current.removeEventListener('click', handleClick);
      }
      if (cloudsRafRef.current) {
        cancelAnimationFrame(cloudsRafRef.current);
      }
      if (globeInstanceRef.current) {
        if (satelliteGroupRef.current) {
          try {
            globeInstanceRef.current.scene().remove(satelliteGroupRef.current);
            satelliteGroupRef.current.clear();
          } catch (e) {}
          satelliteGroupRef.current = null;
        }
        satelliteMeshesRef.current.clear();
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

  // 1. Calculate high-resolution 3D closed Keplerian orbital trajectory rings when satellites are enabled
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    if (!showSatellites) {
      globe.pathsData([]);
      if (satelliteGroupRef.current) {
        satelliteGroupRef.current.visible = false;
      }
      return;
    }

    if (satelliteGroupRef.current) {
      satelliteGroupRef.current.visible = true;
    }

    // High-resolution 360-point Keplerian closed orbits
    // Generated once per toggle to preserve uninterrupted GPU dash animation without stutter
    const now = new Date();
    const paths = SATELLITE_CATALOG.map((sat) =>
      getSatelliteOrbitalPath(sat, now, 360)
    ).filter(Boolean) as SatelliteOrbitalPath[];

    globe.pathsData(paths);
  }, [showSatellites]);

  // 2. Dynamically highlight active satellite orbital path without rebuilding geometry
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe || !showSatellites) return;

    globe.pathStroke((d: any) => (d.satelliteId === selectedSatelliteId ? 3.0 : 1.2));
  }, [selectedSatelliteId, showSatellites]);

  // 3. Keep live telemetry state updated for selected satellite HUD numbers
  useEffect(() => {
    if (!showSatellites || !selectedSatelliteId) {
      setSelectedSatelliteState(null);
      return;
    }

    const sat = SATELLITE_CATALOG.find((s) => s.id === selectedSatelliteId);
    if (!sat) return;

    const updateHud = () => {
      const state = getSatelliteLiveState(sat, new Date());
      setSelectedSatelliteState(state);
    };

    updateHud();
    const timer = setInterval(updateHud, 1000);
    return () => clearInterval(timer);
  }, [showSatellites, selectedSatelliteId]);

  return (
    <div className="relative w-full h-full bg-navy-950 overflow-hidden select-none">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing z-0" />

      {/* Futuristic Vignette Glow Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-transparent to-navy-950/70" />

      {/* Sleek Floating Hover Tag for Satellites */}
      {showSatellites && hoveredSatellite && !selectedSatelliteState && (
        <div className="globe-satellite-tooltip absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="glass-panel-gold rounded-full px-3.5 py-1.5 border border-sky-400/50 text-[11px] font-sans font-semibold text-slate-100 flex items-center gap-2 shadow-[0_0_25px_rgba(56,189,248,0.35)] backdrop-blur-md">
            <span className="text-xs">🛰️</span>
            <span className="font-bold tracking-wide" style={{ color: hoveredSatellite.color }}>
              {hoveredSatellite.name}
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              • {hoveredSatellite.orbitType} • Click to Inspect
            </span>
          </div>
        </div>
      )}

      {/* 🛰️ Satellite Fleet Toggle Control (Fallback if not controlled externally) */}
      {!onToggleSatellites && (
        <div className="globe-satellite-toggle absolute top-[72px] sm:top-[76px] left-3 sm:left-6 z-30 flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => handleToggleSatellites(!showSatellites)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all duration-200 shadow-xl active:scale-95 ${
              showSatellites
                ? 'bg-navy-950/90 border-sky-400/60 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                : 'bg-navy-950/80 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
            title={showSatellites ? 'Hide Orbital Satellites' : 'Show Orbital Satellites (ISS, GPS, Hubble)'}
          >
            <span className="text-sm">🛰️</span>
            <span className="tracking-wide">Satellites</span>
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                showSatellites ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-600'
              }`}
            />
          </button>
        </div>
      )}

      {/* Satellite Telemetry HUD Popover */}
      {showSatellites && selectedSatelliteState && (
        <div className="globe-hud-container">
          <SatelliteTelemetryHUD
            satelliteState={selectedSatelliteState}
            onClose={() => {
              setSelectedSatelliteId(null);
              setSelectedSatelliteState(null);
            }}
            onFocusSatellite={handleFocusSatellite}
            onSelectSatelliteId={(id) => setSelectedSatelliteId(id)}
          />
        </div>
      )}
    </div>
  );
};
