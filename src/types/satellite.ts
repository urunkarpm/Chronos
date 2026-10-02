export type SatelliteType = 'space-station' | 'telescope' | 'navigation' | 'weather' | 'communication';

export type OrbitType = 'LEO' | 'MEO' | 'GEO';

export interface SatelliteDefinition {
  id: string;
  name: string;
  noradId: number;
  type: SatelliteType;
  orbitType: OrbitType;
  color: string;
  line1: string;
  line2: string;
  launchYear: number;
  country: string;
  description: string;
  crewCount?: number;
}

export interface SatelliteLiveState {
  definition: SatelliteDefinition;
  lat: number;
  lng: number;
  altKm: number;
  globeAltitude: number;
  velocityKmS: number;
  velocityKmH: number;
  periodMinutes: number;
  inclinationDeg: number;
  isInSunlight: boolean;
}

export interface SatelliteOrbitalPath {
  satelliteId: string;
  color: string;
  points: Array<{ lat: number; lng: number; alt: number }>;
}
