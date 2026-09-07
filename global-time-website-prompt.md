# Global Time Zone Dashboard - Antigravity CLI Prompt

## Project Overview
Build a sophisticated, classy web application that displays current time across multiple global regions with an interactive world map background. The application combines a high-quality world map with timezone tiles that users can click to zoom into specific locations.

---

## Design & Aesthetic Requirements

### Visual Style
- **Overall Tone**: Classy, sophisticated, premium feel
- **Color Palette**: Deep, muted tones (dark navy, charcoal, slate) with accent colors (metallic gold, soft white, or subtle blue highlights)
- **Typography**: Elegant, modern sans-serif (e.g., Inter, Outfit, or similar high-quality fonts)
- **Spacing & Hierarchy**: Generous whitespace, clear visual hierarchy, subtle shadows and layering effects
- **Borders & Details**: Minimal, refined borders; consider glass-morphism or subtle gradients for sophistication

### Background Map
- **Quality**: Extremely high-quality world map (consider using a premium map library like Mapbox, Leaflet with premium tiles, or similar)
- **Map Style**: Dark mode or muted color scheme that complements the overall aesthetic
- **Performance**: Ensure smooth zooming and panning without performance degradation
- **Coverage**: Full world coverage with clear political boundaries and major geographical features

---

## Core Features

### 1. Time Zone Tiles
- **Display**: Multiple tiles floating over the map showing current time in major global regions
- **Tile Content**:
  - Region/City name
  - Current time in HH:MM:SS format (24-hour or 12-hour toggle, user preference)
  - Optional: Timezone abbreviation (UTC±X)
  - Optional: Day/date indicator
- **Tile Design**:
  - Clean, rounded corners
  - Semi-transparent or solid background (premium appearance)
  - Readable contrast against map background
  - Subtle hover effects (scale, shadow, or opacity change)
- **Default Regions** (customizable list):
  - London (UTC+0)
  - New York (UTC-5)
  - Tokyo (UTC+9)
  - Sydney (UTC+10)
  - Dubai (UTC+4)
  - São Paulo (UTC-3)
  - Singapore (UTC+8)
  - Mumbai (UTC+5:30)

### 2. Interactive Tile Behavior
- **On Tile Click**:
  - Tile animates to the top-right corner of the page
  - Retains its styling and updates to show extended location information
  - Map automatically zooms/pans to center on that region's coordinates
  - Zoom level: Appropriate to show the country/major region (~4-6 zoom level)
  - Smooth animation/transition (300-500ms)
- **Tile Expansion** (when pinned to top-right):
  - Shows additional info: Full timezone name, UTC offset, nearest major city
  - Optional: Sunrise/sunset times, current weather icon placeholder
  - Slightly larger than tile in default state
  - Close button (X) or click elsewhere to return

### 3. Map Interaction & Navigation
- **Pan & Zoom**: Users can manually pan and zoom on the map
- **Reset/Return**:
  - Clicking on the map (outside of UI elements) returns to default state
  - Alternatively, clicking a "Reset" or "Back" button
  - Animation: Smooth zoom-out and pan back to world view
  - Pinned tile returns to its default position in the overlay
- **Smooth Transitions**: All map movements should be fluid (Mapbox easing or similar)

---

## Technical Specifications

### Data & APIs
- **Time Data**: Use JavaScript native Date API or a lightweight timezone library (e.g., `date-fns-tz`, `luxon`, or similar)
- **Coordinates**: Store lat/lng for each region to enable map zoom/pan
- **Timezone Database**: Use a reliable, up-to-date timezone database (IANA TZDB or equivalent)

### Map Library
- **Recommended**: Mapbox GL JS, Leaflet.js with high-quality tile provider, or equivalent
- **Tiles**: Use premium or high-quality tile sets (avoid pixelated/low-res maps)
- **Performance**: Implement efficient rendering; ensure no lag during zoom/pan

### State Management
- **Track**: Currently pinned tile (if any), map center, zoom level
- **Updates**: Real-time clock updates (refresh time display every second)
- **Reset Logic**: Clear pinned state and restore default map view

### Responsiveness
- **Desktop**: Optimized for wide screens; tiles laid out naturally
- **Tablet**: Adjust tile layout and sizing appropriately
- **Mobile**: Stack tiles vertically or use carousel; ensure map interactions remain smooth
- **Map Zoom**: Responsive zoom defaults for different viewport sizes

---

## User Interaction Flow

1. **Initial Load**:
   - Page displays world map with timezone tiles scattered over major regions
   - Clock ticking in real-time
   - All regions visible in one glance

2. **User Clicks Tile**:
   - Tile animates to top-right corner
   - Map smoothly zooms into that region
   - Other tiles fade slightly or remain visible but de-emphasized

3. **User Clicks Map or Reset**:
   - Pinned tile animates back to original position
   - Map smoothly returns to world view
   - All regions re-emphasized

4. **Continuous Updates**:
   - Time updates every second without jarring UI changes
   - Smooth, non-blocking updates

---

## Code Structure (High-Level)

```
- Main App Component
  ├── Map Container (Mapbox/Leaflet wrapper)
  ├── Tiles Container
  │   ├── Individual Tile Components
  │   └── Pinned Tile (conditional, top-right)
  ├── State Management (pinned tile, map state)
  ├── Event Handlers (click tile, click map, reset)
  └── Clock/Time Update Logic (real-time updates)
```

---

## Accessibility & Polish
- **Alt Text**: Map and tiles should have semantic meaning
- **Keyboard Navigation**: Support keyboard shortcuts (Esc to close pinned tile)
- **Focus States**: Clear focus indicators for tiles and buttons
- **Loading States**: Smooth fade-in or skeleton loaders while map/data initializes
- **Error Handling**: Graceful fallback if timezone data fails to load

---

## Nice-to-Have Enhancements (Optional for Fine-Tuning)
- Toggle between 12-hour and 24-hour time formats
- Search functionality to jump to any region
- Add/remove custom regions to watch
- Sunrise/sunset or solar times for each region
- Weather widget integration per region
- Theme toggle (dark/light mode, if applicable)
- Timezone offset calculator between two regions
- Animations on page load (tiles fade in, map draws in)

---

## Success Criteria
✓ High-quality, sophisticated visual design  
✓ Smooth, responsive interactions (no lag)  
✓ Accurate real-time time display  
✓ Seamless map zoom/pan animations  
✓ Intuitive tile-to-map linking  
✓ Classy, premium feel throughout  
✓ Works smoothly on desktop, tablet, and mobile  
✓ Performance optimized (fast load, smooth 60fps interactions)
