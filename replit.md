# Travel Map

A native iOS app that reads GPS metadata from the user's photo library to automatically build a personal travel history.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Mobile: Expo (React Native), expo-router, NativeTabs (iOS 26 liquid glass)

## Where things live

- `artifacts/mobile/` — Expo iOS app
  - `app/(tabs)/index.tsx` — World Map tab (WebView + Leaflet.js with country highlighting)
  - `app/(tabs)/list.tsx` — Travel list tab (SectionList grouped by country/city)
  - `app/(tabs)/photos.tsx` — Photo grid tab (geotagged photos)
  - `context/TravelContext.tsx` — Photo library reading, GPS geocoding, travel data state
  - `constants/colors.ts` — Dark navy/teal/amber theme

## Architecture decisions

- **Frontend-only mobile app**: Uses AsyncStorage for caching geocoded results. No backend needed.
- **expo-media-library + expo-location**: Read GPS from photos, reverse geocode to country/city names. Both guarded with `Platform.OS !== 'web'` since they have no web support.
- **WebView + Leaflet.js** for country-level world map highlighting: Leaflet fetches GeoJSON from CDN and colors visited countries amber. Communication via postMessage.
- **Geocoding bucket deduplication**: Coordinates rounded to 1 decimal place (~11km) to reduce unique geocoding calls and respect rate limits.
- **1-hour AsyncStorage cache** for geocoded travel data to avoid repeated slow processing.

## Product

Three tabs: (1) Interactive world map with amber-highlighted visited countries, visit counter badge, and country detail sheet on tap. (2) Scrollable travel list grouped by country/city with date ranges and photo counts. (3) Photo grid showing all geotagged photos with location labels and a full detail view.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `expo-media-library` and `expo-location` have **no web support** — must be conditionally required using `Platform.OS !== 'web'` and dynamic `require()`, NOT top-level imports.
- `react-native-maps` must be pinned to exactly `1.18.0` for Expo Go compatibility.
- `react-native-webview` has no web support — the Map tab shows a fallback on web.
- The Leaflet world map GeoJSON is fetched from `d2ad6b4ur7yvpq.cloudfront.net` CDN — requires internet access in Expo Go.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
