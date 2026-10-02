import * as satellite from './satellitePure';
import * as THREE from 'three';
import { SatelliteDefinition, SatelliteLiveState, SatelliteOrbitalPath } from '../types/satellite';
import { SATELLITE_CATALOG } from '../data/satellites';

// Cache parsed satrec records to avoid re-parsing TLE strings
const satrecCache = new Map<string, any>();

function getSatrec(sat: SatelliteDefinition) {
  if (!satrecCache.has(sat.id)) {
    try {
      const rec = satellite.twoline2satrec(sat.line1, sat.line2);
      satrecCache.set(sat.id, rec);
    } catch (e) {
      console.error(`Failed to parse TLE for satellite ${sat.name}`, e);
      return null;
    }
  }
  return satrecCache.get(sat.id);
}

/**
 * Mathematically balanced altitude scaling for 3D Globe visualization.
 * Linear for LEO (floating cleanly above the 0.004 cloud layer);
 * smoothly scaled for MEO and GEO so they remain visible within the camera viewport.
 */
export function scaleAltitude(altKm: number): number {
  if (altKm <= 1000) {
    // LEO linear scaling: 400km -> ~0.065, 1000km -> ~0.157
    return Math.max(0.045, altKm / 6371);
  }
  // MEO & GEO: smoothly scaled so GPS is ~0.48 and GEO is ~0.78
  const normalized = (altKm - 1000) / 35000;
  return 0.157 + Math.pow(Math.min(1, Math.max(0, normalized)), 0.65) * 0.62;
}

/**
 * Propagate a satellite to calculate real-time geodetic position, velocity, and eclipse state
 */
export function getSatelliteLiveState(sat: SatelliteDefinition, date: Date): SatelliteLiveState | null {
  const satrec = getSatrec(sat);
  if (!satrec) return null;

  try {
    const pv = satellite.propagate(satrec, date);
    if (!pv || !pv.position || typeof pv.position === 'boolean' || !pv.velocity || typeof pv.velocity === 'boolean') {
      return null;
    }

    const gmst = satellite.gstime(date);
    const gd = satellite.eciToGeodetic(pv.position, gmst);

    const lat = satellite.degreesLat(gd.latitude);
    const lng = satellite.degreesLong(gd.longitude);
    const altKm = gd.height;

    // Velocity in km/s and km/h
    const vel = pv.velocity;
    const velocityKmS = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
    const velocityKmH = velocityKmS * 3600;

    // Orbital Period in minutes
    // mean motion no_kozai in rad/min; period = 2*pi / no_kozai
    const meanMotionRadMin = satrec.no_kozai || satrec.no || 0.07;
    const periodMinutes = meanMotionRadMin > 0 ? (2 * Math.PI) / meanMotionRadMin : 90;

    // Inclination in degrees
    const inclinationDeg = ((satrec.inclo || 0) * 180) / Math.PI;

    // Sunlight determination using sun position
    const julianDay = satellite.jday(date);
    const sunData = satellite.sunPos(julianDay);
    const pos = pv.position;
    const isEclipsed = typeof satellite.shadowFraction === 'function' && sunData && sunData.rsun
      ? satellite.shadowFraction(pos, sunData.rsun) < 0.1
      : false;

    return {
      definition: sat,
      lat,
      lng,
      altKm: Math.max(0, altKm),
      globeAltitude: scaleAltitude(altKm),
      velocityKmS,
      velocityKmH,
      periodMinutes,
      inclinationDeg,
      isInSunlight: !isEclipsed,
    };
  } catch (err) {
    console.error(`Propagation error for ${sat.name}`, err);
    return null;
  }
}

/**
 * Generate a physically realistic, closed 3D Keplerian orbital path ring in space.
 * Uses instantaneous state vectors (position r and velocity v) to calculate the
 * orbital plane normal (angular momentum h = r x v) and in-plane basis vectors.
 * Traces a closed 360-degree orbital ellipse/circle centered on Earth with the satellite
 * situated precisely on the path at theta = 0.
 */
export function getSatelliteOrbitalPath(
  sat: SatelliteDefinition,
  date: Date,
  pointsCount: number = 120
): SatelliteOrbitalPath | null {
  const satrec = getSatrec(sat);
  if (!satrec) return null;

  try {
    const pv = satellite.propagate(satrec, date);
    if (!pv || !pv.position || typeof pv.position === 'boolean' || !pv.velocity || typeof pv.velocity === 'boolean') {
      return null;
    }

    const r = pv.position;
    const v = pv.velocity;

    // Specific angular momentum vector h = r x v (normal to the orbital plane)
    const hx = r.y * v.z - r.z * v.y;
    const hy = r.z * v.x - r.x * v.z;
    const hz = r.x * v.y - r.y * v.x;
    const hMag = Math.hypot(hx, hy, hz);
    if (hMag === 0) return null;

    const uhx = hx / hMag;
    const uhy = hy / hMag;
    const uhz = hz / hMag;

    // Radial unit vector ur = r / |r|
    const rMag = Math.hypot(r.x, r.y, r.z);
    if (rMag === 0) return null;

    const urx = r.x / rMag;
    const ury = r.y / rMag;
    const urz = r.z / rMag;

    // In-plane tangent vector uv = uh x ur (perpendicular to ur in direction of velocity)
    const uvx = uhy * urz - uhz * ury;
    const uvy = uhz * urx - uhx * urz;
    const uvz = uhx * ury - uhy * urx;

    const gmst = satellite.gstime(date);
    const points: Array<{ lat: number; lng: number; alt: number }> = [];

    // Calculate scaled altitude for the orbit path
    const gdCurrent = satellite.eciToGeodetic(r, gmst);
    const altScaled = scaleAltitude(gdCurrent.height);

    for (let i = 0; i <= pointsCount; i++) {
      const theta = (i / pointsCount) * 2 * Math.PI;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // 3D position vector in ECI
      const pEci = {
        x: rMag * (cosT * urx + sinT * uvx),
        y: rMag * (cosT * ury + sinT * uvy),
        z: rMag * (cosT * urz + sinT * uvz),
      };

      const gd = satellite.eciToGeodetic(pEci, gmst);
      const lat = satellite.degreesLat(gd.latitude);
      const lng = satellite.degreesLong(gd.longitude);

      points.push({
        lat,
        lng,
        alt: altScaled,
      });
    }

    return {
      satelliteId: sat.id,
      color: sat.color,
      points,
    };
  } catch (err) {
    console.error(`Error calculating Keplerian orbital path for ${sat.name}`, err);
    return null;
  }
}

/**
 * Construct an authentic 3D spacecraft mesh model using Three.js primitives
 */
export function createSatellite3DModel(sat: SatelliteDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = `sat_${sat.id}`;

  const isSpaceStation = sat.type === 'space-station';
  const isGEO = sat.orbitType === 'GEO';

  // Base scale adjustment: Space stations are visibly larger
  const scale = isSpaceStation ? 1.6 : isGEO ? 1.4 : 1.1;

  // 1. Central Bus / Chassis (Gold metallic multi-layer insulation)
  const chassisGeom = isSpaceStation
    ? new THREE.CylinderGeometry(0.7 * scale, 0.7 * scale, 2.8 * scale, 12)
    : new THREE.BoxGeometry(1.0 * scale, 1.0 * scale, 1.4 * scale);

  const goldMliMaterial = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Warm gold
    metalness: 0.88,
    roughness: 0.22,
  });

  const chassis = new THREE.Mesh(chassisGeom, goldMliMaterial);
  if (isSpaceStation) {
    chassis.rotation.z = Math.PI / 2;
  }
  group.add(chassis);

  // 2. Photovoltaic Solar Arrays (Deep cobalt blue with solar reflection)
  const solarMaterial = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8, // Solar cell blue
    emissive: 0x0f172a,
    metalness: 0.65,
    roughness: 0.35,
  });

  const panelWidth = isSpaceStation ? 3.4 * scale : 2.2 * scale;
  const panelHeight = isSpaceStation ? 1.4 * scale : 0.8 * scale;
  const panelGeom = new THREE.BoxGeometry(panelWidth, 0.06 * scale, panelHeight);

  // Left solar wing
  const leftPanel = new THREE.Mesh(panelGeom, solarMaterial);
  leftPanel.position.set(-((panelWidth / 2) + 0.9 * scale), 0, 0);
  group.add(leftPanel);

  // Right solar wing
  const rightPanel = new THREE.Mesh(panelGeom, solarMaterial);
  rightPanel.position.set((panelWidth / 2) + 0.9 * scale, 0, 0);
  group.add(rightPanel);

  // 3. High-gain Communications Dish or Optical Tube
  if (sat.type === 'telescope') {
    // Optical barrel for Hubble
    const barrelGeom = new THREE.CylinderGeometry(0.6 * scale, 0.6 * scale, 2.2 * scale, 16);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const barrel = new THREE.Mesh(barrelGeom, barrelMat);
    barrel.position.set(0, 0, 1.2 * scale);
    barrel.rotation.x = Math.PI / 2;
    group.add(barrel);
  } else {
    // Parabolic dish antenna
    const dishGeom = new THREE.ConeGeometry(0.65 * scale, 0.25 * scale, 16, 1, true);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.8,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    const dish = new THREE.Mesh(dishGeom, dishMat);
    dish.position.set(0, 0.9 * scale, 0);
    dish.rotation.x = Math.PI;
    group.add(dish);
  }

  // 4. Glowing Aerospace Beacon Indicator
  const beaconGeom = new THREE.SphereGeometry(0.55 * scale, 12, 12);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(sat.color),
    transparent: true,
    opacity: 0.95,
  });
  const beacon = new THREE.Mesh(beaconGeom, beaconMat);
  group.add(beacon);

  // 5. Pulsing Halo Aura ring around craft
  const ringGeom = new THREE.RingGeometry(0.85 * scale, 1.35 * scale, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(sat.color),
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // Attach reference data for raycasting / click inspection
  (group as any).__satelliteData = sat;

  return group;
}
