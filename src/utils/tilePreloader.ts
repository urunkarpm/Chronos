import { TimeRegion } from '../types';

// Map to hold in-memory decoded HTMLImageElement objects
const memoryImageCache = new Map<string, HTMLImageElement>();
const requestedUrls = new Set<string>();

// Convert Latitude / Longitude + Zoom level into Web Mercator tile indices (X, Y)
export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  const wrappedX = ((x % n) + n) % n;
  const clampedY = Math.max(0, Math.min(n - 1, y));
  return { x: wrappedX, y: clampedY };
}

// Single image preloader with error fallback and memory retaining
export function preloadImage(url: string): Promise<HTMLImageElement> {
  if (memoryImageCache.has(url)) {
    return Promise.resolve(memoryImageCache.get(url)!);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      memoryImageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      // Resolve silently on error to prevent breaking batch queues
      resolve(img);
    };
    img.src = url;
  });
}

// Queue runner with controlled concurrency limit (e.g., 14 concurrent tile downloads)
async function processQueue(urls: string[], maxConcurrent = 14): Promise<void> {
  const queue = [...urls];
  const workers = Array.from({ length: Math.min(maxConcurrent, queue.length) }, async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (url && !requestedUrls.has(url)) {
        requestedUrls.add(url);
        await preloadImage(url);
      }
    }
  });
  await Promise.all(workers);
}

// Generate all Esri imagery and Carto label tile URLs for a given list of regions
export function generateRegionTileUrls(regions: TimeRegion[]): string[] {
  const urls: string[] = [];
  const zoomLevels = [2, 3, 4, 5, 6, 7];
  const subdomains = ['a', 'b', 'c', 'd'];

  // Add Globe 3D textures
  urls.push('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');
  urls.push('https://unpkg.com/three-globe/example/img/earth-topology.png');

  regions.forEach((region) => {
    // Flag icon URL
    if (region.countryCode) {
      urls.push(`https://flagcdn.com/w40/${region.countryCode.toLowerCase()}.png`);
    }

    // Map tiles for zoom levels 2 through 7
    zoomLevels.forEach((zoom) => {
      const centerTile = latLngToTile(region.lat, region.lng, zoom);
      const n = Math.pow(2, zoom);

      // Preload 3x3 tile grid around region center to cover viewport at target zoom
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const tileX = ((centerTile.x + dx) % n + n) % n;
          const tileY = centerTile.y + dy;
          if (tileY < 0 || tileY >= n) continue;

          // Esri Satellite Imagery URL
          const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`;
          urls.push(esriUrl);

          // Carto Dark Labels Overlay URL
          const sub = subdomains[(tileX + tileY) % subdomains.length];
          const cartoUrl = `https://${sub}.basemaps.cartocdn.com/dark_only_labels/${zoom}/${tileX}/${tileY}.png`;
          urls.push(cartoUrl);
        }
      }
    });
  });

  // Return unique URLs
  return Array.from(new Set(urls));
}

// Pre-download all map tiles and assets for specified regions into memory
export async function preloadRegionTiles(regions: TimeRegion[]): Promise<void> {
  const tileUrls = generateRegionTileUrls(regions);
  await processQueue(tileUrls, 14);
}

// Export cache inspector for diagnostic/status purposes
export function getPreloadedTileCount(): number {
  return memoryImageCache.size;
}
