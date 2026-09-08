export interface CountryLabel {
  name: string;
  lat: number;
  lng: number;
  size?: number;
}

export const WORLD_COUNTRY_LABELS: CountryLabel[] = [
  // North America
  { name: 'CANADA', lat: 56.1304, lng: -106.3468, size: 1.1 },
  { name: 'UNITED STATES', lat: 37.0902, lng: -95.7129, size: 1.2 },
  { name: 'MEXICO', lat: 23.6345, lng: -102.5528, size: 0.95 },
  { name: 'GREENLAND', lat: 71.7069, lng: -42.6043, size: 1.0 },
  { name: 'CUBA', lat: 21.5218, lng: -77.7812, size: 0.75 },

  // South America
  { name: 'BRAZIL', lat: -14.235, lng: -51.9253, size: 1.2 },
  { name: 'ARGENTINA', lat: -38.4161, lng: -63.6167, size: 1.0 },
  { name: 'COLOMBIA', lat: 4.5709, lng: -74.2973, size: 0.85 },
  { name: 'PERU', lat: -9.19, lng: -75.0152, size: 0.85 },
  { name: 'CHILE', lat: -35.6751, lng: -71.543, size: 0.85 },
  { name: 'VENEZUELA', lat: 6.4238, lng: -66.5897, size: 0.8 },
  { name: 'BOLIVIA', lat: -16.2902, lng: -63.5887, size: 0.8 },

  // Europe
  { name: 'UNITED KINGDOM', lat: 55.3781, lng: -3.436, size: 0.8 },
  { name: 'FRANCE', lat: 46.2276, lng: 2.2137, size: 0.85 },
  { name: 'GERMANY', lat: 51.1657, lng: 10.4515, size: 0.85 },
  { name: 'SPAIN', lat: 40.4637, lng: -3.7492, size: 0.85 },
  { name: 'ITALY', lat: 41.8719, lng: 12.5674, size: 0.8 },
  { name: 'NORWAY', lat: 60.472, lng: 8.4689, size: 0.8 },
  { name: 'SWEDEN', lat: 60.1282, lng: 18.6435, size: 0.8 },
  { name: 'FINLAND', lat: 61.9241, lng: 25.7482, size: 0.8 },
  { name: 'POLAND', lat: 51.9194, lng: 19.1451, size: 0.8 },
  { name: 'UKRAINE', lat: 48.3794, lng: 31.1656, size: 0.9 },
  { name: 'TURKEY', lat: 38.9637, lng: 35.2433, size: 0.9 },
  { name: 'GREECE', lat: 39.0742, lng: 21.8243, size: 0.75 },
  { name: 'PORTUGAL', lat: 39.3999, lng: -8.2245, size: 0.75 },

  // Eurasia / Russia
  { name: 'RUSSIA', lat: 61.524, lng: 105.3188, size: 1.4 },
  { name: 'KAZAKHSTAN', lat: 48.0196, lng: 66.9237, size: 1.0 },
  { name: 'MONGOLIA', lat: 46.8625, lng: 103.8467, size: 0.95 },

  // Asia
  { name: 'INDIA', lat: 20.5937, lng: 78.9629, size: 1.25 },
  { name: 'CHINA', lat: 35.8617, lng: 104.1954, size: 1.3 },
  { name: 'JAPAN', lat: 36.2048, lng: 138.2529, size: 0.85 },
  { name: 'INDONESIA', lat: -0.7893, lng: 113.9213, size: 1.0 },
  { name: 'SOUTH KOREA', lat: 35.9078, lng: 127.7669, size: 0.75 },
  { name: 'THAILAND', lat: 15.87, lng: 100.9925, size: 0.8 },
  { name: 'VIETNAM', lat: 14.0583, lng: 108.2772, size: 0.8 },
  { name: 'PHILIPPINES', lat: 12.8797, lng: 121.774, size: 0.8 },
  { name: 'MALAYSIA', lat: 4.2105, lng: 101.9758, size: 0.75 },
  { name: 'PAKISTAN', lat: 30.3753, lng: 69.3451, size: 0.9 },
  { name: 'BANGLADESH', lat: 23.685, lng: 90.3563, size: 0.75 },
  { name: 'IRAN', lat: 32.4279, lng: 53.688, size: 0.95 },
  { name: 'SAUDI ARABIA', lat: 23.8859, lng: 45.0792, size: 1.05 },
  { name: 'UAE', lat: 23.4241, lng: 53.8478, size: 0.75 },

  // Africa
  { name: 'EGYPT', lat: 26.8206, lng: 30.8025, size: 0.95 },
  { name: 'ALGERIA', lat: 28.0339, lng: 1.6596, size: 1.05 },
  { name: 'SUDAN', lat: 12.8628, lng: 30.2176, size: 0.95 },
  { name: 'NIGERIA', lat: 9.082, lng: 8.6753, size: 0.9 },
  { name: 'SOUTH AFRICA', lat: -30.5595, lng: 22.9375, size: 1.0 },
  { name: 'KENYA', lat: -0.0236, lng: 37.9062, size: 0.8 },
  { name: 'ETHIOPIA', lat: 9.145, lng: 40.4897, size: 0.85 },
  { name: 'MOROCCO', lat: 31.7917, lng: -7.0926, size: 0.8 },
  { name: 'TANZANIA', lat: -6.369, lng: 34.8888, size: 0.85 },
  { name: 'ANGOLA', lat: -11.2027, lng: 17.8739, size: 0.9 },
  { name: 'DR CONGO', lat: -4.0383, lng: 21.7587, size: 1.0 },

  // Oceania
  { name: 'AUSTRALIA', lat: -25.2744, lng: 133.7751, size: 1.3 },
  { name: 'NEW ZEALAND', lat: -40.9006, lng: 174.886, size: 0.85 },
  { name: 'PAPUA NEW GUINEA', lat: -6.314993, lng: 143.95555, size: 0.8 },

  // Antarctica
  { name: 'ANTARCTICA', lat: -82.8628, lng: 135.0, size: 1.2 }
];
