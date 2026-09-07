# CHRONOS — Master the World's Time Zones

![React](https://img.shields.io/badge/React-18.3.1-blue?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.1.0-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-gold)

**Chronos** is a high-performance, mobile-optimized, global time zone dashboard featuring an interactive satellite world map, dynamic glassmorphic UI overlays, live 1-second precision time synchronization, solar/daylight cycle calculations, and global location search.

---

## 🌟 Key Features

- 🛰️ **Interactive High-Resolution Satellite Map**: Built on top of Leaflet.js with GPU-accelerated tile rendering, smooth 120Hz panning, and boundary-locking (`maxBoundsViscosity`) to eliminate void overflow.
- ⏱️ **Real-Time Global Clock Engine**: 1-second precision clock tick across major world capitals and custom-added regions with 12H/24H format toggles.
- 📱 **Mobile-Native Horizontal Swipe Deck**: Floating, touch-optimized swipeable time deck with safe-area spacing and dynamic viewport height (`100dvh`) locking to prevent elastic rubber-banding.
- ☀️ **Solar Cycle & Daylight Calculator**: Calculates live daylight progress, sunrise/sunset times, and day/night indicators for any latitude & longitude on Earth.
- 🔍 **Global Instant Location Search**: Instant offline & online location lookup supporting thousands of cities, countries, and villages with automatic timezone mapping (`tz-lookup`).
- 📌 **Center Stage Pinned View & Detailed Drawer**: Pin any city to focus the map and open an expanded panel displaying landmarks, population, exact coordinates, and relative time offsets.
- 🔊 **UI Soundscape**: Optional audio feedback for clicks, toggles, zoom actions, and time updates.
- 📑 **Continent Filtering**: Filter visible clocks by continent (*Americas, Europe, Asia, Middle East, Africa, Oceania, Antarctica*).

---

## 🛠️ Tech Stack

- **Frontend Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + PostCSS + Custom Glassmorphism Utilities
- **Map Engine**: [Leaflet.js](https://leafletjs.com/) with ArcGIS World Imagery Satellite Tiles
- **Timezone Resolution**: [tz-lookup](https://github.com/dfilatov/tz-lookup) & Native IANA Intl DateTimeFormat APIs
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: Tailwind Animate & Framer Motion

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` or `yarn` / `pnpm`

### Installation & Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/urunkarpm/Chronos.git

# 2. Navigate to project directory
cd Chronos

# 3. Install dependencies
npm install

# 4. Launch development server
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

---

## 📦 Build for Production

```bash
# Type check and build production bundle
npm run build

# Preview production build locally
npm run preview
```

The output files will be built into the `dist/` directory, ready for deployment on Vercel, Netlify, or GitHub Pages.

---

## 📁 Project Structure

```text
Chronos/
├── public/                # Static assets & icons
├── src/
│   ├── components/        # React components
│   │   ├── AddCityModal.tsx   # Modal for adding custom locations
│   │   ├── FlagIcon.tsx       # Flag icon generator
│   │   ├── Footer.tsx         # App footer
│   │   ├── Map.tsx            # Leaflet map layer & marker rendering
│   │   ├── Navbar.tsx         # Top glass header, search & continent filter
│   │   ├── PinnedDrawer.tsx   # Right/Bottom pinned region info drawer
│   │   └── TimeTile.tsx       # Timezone card component
│   ├── data/
│   │   └── timezones.ts       # Preset global cities & continent data
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces & types
│   ├── utils/
│   │   ├── locationService.ts # Location search & geocoding helper
│   │   └── timeUtils.ts       # Time formatting, UTC offset & solar math
│   ├── App.tsx            # Main application root
│   ├── main.tsx           # React DOM entry point
│   └── index.css          # Tailwind CSS & glassmorphism utilities
├── index.html             # HTML entry point with viewport-fit=cover
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript compiler configuration
└── vite.config.ts         # Vite bundler configuration
```

---

## 📱 Mobile Optimization Highlights

- **Dynamic Viewport (`100dvh`)**: Completely avoids browser URL bar layout shifts on iOS Safari and Android Chrome.
- **Fixed Boundary Lock**: Prevents body rubber-banding, elastic overscroll, and black background voids.
- **Safe Area Insets**: Tile deck positions respect `env(safe-area-inset-bottom)` with a clean 10px screen edge gap.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
