import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Platform } from "react-native";
import { WORLD_CITIES, ROLLUP_RADIUS_KM, type WorldCity } from "@/data/worldCities";
import { countryAt } from "@/utils/countryLookup";
import { announceNewTrips } from "@/utils/milestones";

// Only import native-only modules on native platforms
const MediaLibrary =
  Platform.OS !== "web"
    ? (require("expo-media-library") as typeof import("expo-media-library"))
    : null;
const Location =
  Platform.OS !== "web"
    ? (require("expo-location") as typeof import("expo-location"))
    : null;

export interface PhotoAsset {
  id: string;
  // ph:// asset uri. NEVER a localUri/file:// path: those go stale between
  // sessions; thumbnails resolve ph:// through PhotoKit at render time.
  uri: string;
  latitude: number;
  longitude: number;
  creationTime: number;
  country?: string;
  city?: string;
  region?: string;
}

export interface CityVisit {
  key: string;
  city: string;
  region: string;
  country: string;
  photoCount: number;
  firstDate: number;
  lastDate: number;
  previewUri: string;
  photoUris: string[];
  previewId: string;
  photoIds: string[];
}

export interface CountryVisit {
  country: string;
  photoCount: number;
  firstDate: number;
  lastDate: number;
  cities: CityVisit[];
  previewUri: string;
}

interface LoadingProgress {
  current: number;
  total: number;
  stage: string;
  countriesFound: number;
}

interface TravelContextType {
  permissionGranted: boolean | null;
  requestPermission: () => Promise<void>;
  isLoading: boolean;
  // True only during the very first full scan (no cached history yet):
  // drives the one-time "Building your travel map" experience.
  initialScanning: boolean;
  progress: LoadingProgress;
  photos: PhotoAsset[];
  countries: CountryVisit[];
  visitedCountryNames: string[];
  refresh: () => Promise<void>;
  addMorePhotos: () => Promise<void>;
  excludePhoto: (id: string) => void;
  reportDeadAsset: (id: string) => void;
  accessPrivileges: "all" | "limited" | "none" | null;
}

const TravelContext = createContext<TravelContextType | null>(null);

// Results cache: just the processed photos. v14: ph:// uris + streamed scan.
const CACHE_KEY = "travel_data_v14";
// Scan bookkeeping, separate from results: watermark + processed count.
const SCAN_STATE_KEY = "scan_state_v1";
// Photos the user long-pressed out of their trips.
const EXCLUDED_KEY = "excluded_photos_v1";
// Assets that no longer resolve (deleted from the library); dropped lazily
// at render time instead of rescanning for deletions.
const DEAD_ASSETS_KEY = "dead_assets_v1";

interface ScanState {
  lastScanTimestamp: number;
  processedCount: number;
}

// Lookup: well-known sub-city localities → parent city name.
// Covers London boroughs, NYC boroughs, Tokyo special wards, Paris arrondissements.
const BOROUGH_TO_CITY: Record<string, string> = {
  // London (32 boroughs + City of London)
  hackney: "London", southwark: "London", westminster: "London",
  "city of westminster": "London", islington: "London", camden: "London",
  "tower hamlets": "London", lambeth: "London", wandsworth: "London",
  "hammersmith and fulham": "London", "kensington and chelsea": "London",
  lewisham: "London", greenwich: "London", newham: "London",
  haringey: "London", barnet: "London", brent: "London",
  ealing: "London", hounslow: "London", "richmond upon thames": "London",
  "kingston upon thames": "London", merton: "London", croydon: "London",
  sutton: "London", bromley: "London", bexley: "London",
  havering: "London", "barking and dagenham": "London", redbridge: "London",
  "waltham forest": "London", enfield: "London", harrow: "London",
  hillingdon: "London", "city of london": "London",
  // New York City boroughs
  brooklyn: "New York City", manhattan: "New York City",
  queens: "New York City", bronx: "New York City", "the bronx": "New York City",
  "staten island": "New York City",
  // Tokyo special wards (ku)
  shinjuku: "Tokyo", shibuya: "Tokyo", minato: "Tokyo",
  chiyoda: "Tokyo", chuo: "Tokyo", taito: "Tokyo",
  sumida: "Tokyo", koto: "Tokyo", shinagawa: "Tokyo",
  meguro: "Tokyo", setagaya: "Tokyo", suginami: "Tokyo",
  toshima: "Tokyo", kita: "Tokyo", arakawa: "Tokyo",
  itabashi: "Tokyo", nerima: "Tokyo", adachi: "Tokyo",
  katsushika: "Tokyo", edogawa: "Tokyo", ota: "Tokyo",
  nakano: "Tokyo", bunkyo: "Tokyo",
};

// Haversine great-circle distance in km.
function distKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Roll a precise GPS point UP to the city a traveller would actually name,
// using a worldwide population-ranked city list and a dominance rule:
//
//  1. "local"  = the most populous city within ROLLUP_RADIUS_KM (25km).
//     This alone turns neighborhoods / boroughs / suburbs into their metro
//     (Camden -> London, Brooklyn -> New York, Sahinbey -> Gaziantep).
//  2. "metro"  = the most populous 1M+ city whose own catchment covers the
//     point. A metro's catchment scales with its size (popK/200, clamped to
//     30-80km): Istanbul (14.8M) reaches ~74km, London (7.6M) ~38km.
//  3. The metro replaces the local answer only when it DOMINATES it, i.e. is
//     at least 10x more populous. So Esenyurt (211k) and Silivri (53k) roll
//     up to Istanbul, but Yokohama (3.6M) is never swallowed by Tokyo (8.3M),
//     and Reading (318k, 60km out) stays outside London's 38km reach.
//
// Works purely from coordinates, so it does not depend on how the reverse
// geocoder happens to label towns or provinces. Returns null when nothing is
// close, so genuinely remote spots keep their reverse-geocoded name.
const METRO_MIN_POP_K = 1000;
const METRO_MAX_RADIUS_KM = 80;
const METRO_DOMINANCE = 10;
function metroCatchmentKm(popK: number): number {
  return Math.min(METRO_MAX_RADIUS_KM, Math.max(30, popK / 200));
}
function nearestMajorCity(lat: number, lon: number): string | null {
  // Bounding-box prefilter sized for the widest catchment; the longitude
  // window widens with latitude (a degree of longitude shrinks toward poles).
  const latWin = METRO_MAX_RADIUS_KM / 111 + 0.05;
  const lonWin =
    METRO_MAX_RADIUS_KM /
      (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180))) +
    0.05;
  let local: WorldCity | null = null;
  let metro: WorldCity | null = null;
  for (const c of WORLD_CITIES) {
    if (Math.abs(c[1] - lat) > latWin || Math.abs(c[2] - lon) > lonWin) continue;
    const d = distKm(lat, lon, c[1], c[2]);
    // list is pop-sorted, so the first hit in each slot is the most populous
    if (!local && d <= ROLLUP_RADIUS_KM) local = c;
    if (!metro && c[3] >= METRO_MIN_POP_K && d <= metroCatchmentKm(c[3])) metro = c;
    if (local && metro) break;
  }
  if (metro && (!local || metro[3] >= METRO_DOMINANCE * local[3])) return metro[0];
  return local ? local[0] : null;
}

// Admin-region rollup: many provinces are named after their metro (İstanbul,
// Berlin, Tokyo, Luxembourg). When the reverse-geocoded region itself names a
// major city within REGION_ROLLUP_KM, photos in that province roll up to it.
const REGION_ROLLUP_KM = 100;
function normalizeName(s: string): string {
  // NFD + strip combining marks folds İ→I, é→e etc. so "İstanbul" == "Istanbul"
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
const CITY_BY_NORM = new Map<string, WorldCity>();
for (const c of WORLD_CITIES) {
  const k = normalizeName(c[0]);
  if (!CITY_BY_NORM.has(k)) CITY_BY_NORM.set(k, c);
}
function regionMajorCity(
  lat: number,
  lon: number,
  region: string | null | undefined
): string | null {
  if (!region) return null;
  const hit = CITY_BY_NORM.get(normalizeName(region));
  if (hit && distKm(lat, lon, hit[1], hit[2]) <= REGION_ROLLUP_KM) return hit[0];
  return null;
}

function resolveCity(
  city: string | null | undefined,
  subregion: string | null | undefined,
  region: string | null | undefined
): string | undefined {
  // 1. Borough/ward lookup table (case-insensitive)
  if (city) {
    const key = city.toLowerCase().trim();
    if (BOROUGH_TO_CITY[key]) return BOROUGH_TO_CITY[key];
    // Paris arrondissements: "1er Arrondissement de Paris", "Paris 11e", etc.
    if (/arrondissement/i.test(city) || /^paris\s+\d/i.test(city)) return "Paris";
    // Tokyo wards: ends in "-ku" or " ku"
    if (/[\s-]?ku$/i.test(city) && region?.toLowerCase().includes("tokyo")) return "Tokyo";
  }

  // 2. Clean admin suffixes from subregion
  const cleanSub = subregion?.trim()
    .replace(/\s+(Authority|Metropolitan\s+Area|Metropolitan\s+County|Council|Municipality|Prefecture-Metropolis|Prefecture|County)$/i, "")
    .trim() ?? null;

  // 3. "Greater X" → X  (e.g. "Greater London" → "London")
  const greaterMatch = cleanSub?.match(/^Greater\s+(\w[\w\s]*)$/i);
  if (greaterMatch) return greaterMatch[1].trim();

  // 4. "City/County/Borough of X" → X  (e.g. "City of Glasgow")
  const adminOfMatch = cleanSub?.match(
    /^(?:City|County|Royal Borough|London Borough|Metropolitan Borough|District|Province|State)\s+of\s+(.+)$/i
  );
  if (adminOfMatch) return adminOfMatch[1].trim();

  // 5. Default: locality → fall back to cleaned subregion or region
  return city ?? cleanSub ?? region ?? undefined;
}

// Library pages: small enough to stream results batch by batch, big enough to
// keep the number of round trips low on 60k+ libraries.
const PAGE_SIZE = 500;
// Concurrent getAssetInfoAsync lookups per inner batch.
const BATCH_SIZE = 20;

// Reverse-geocode results are permanent facts about coordinates, so they are
// cached forever, keyed by a ~1km grid cell (2 decimal places). The cache is
// intentionally SEPARATE from the results cache and survives travel_data
// version bumps, so a rebuild is near-instant.
const GEOCODE_CACHE_KEY = "geocode_cache_v1";
type GeoCacheEntry = { country?: string; city?: string; region?: string };
type GeoCache = Record<string, GeoCacheEntry>;

function geoKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

// Parse the TRUE capture time of a photo.
// iOS MediaLibrary `creationTime` is often the date the asset was *added* to the
// library (e.g. saved from Messages, AirDrop, WhatsApp) — not when the shot was
// taken. The EXIF `DateTimeOriginal` tag is the camera's recorded capture time
// and is the source of truth. Fall back to creationTime when EXIF is missing.
function exifToTs(v: unknown): number {
  if (typeof v !== "string") return NaN;
  // EXIF format: "YYYY:MM:DD HH:MM:SS" (sometimes with a "T" separator)
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(v.trim());
  if (!m) return NaN;
  const [, Y, Mo, D, H, Mi, S] = m;
  return new Date(+Y, +Mo - 1, +D, +H, +Mi, +S).getTime();
}

function captureTime(info: any): number {
  const ex = info?.exif ?? {};
  const nested = ex["{Exif}"] ?? {};
  const candidate =
    ex.DateTimeOriginal ??
    ex.DateTimeDigitized ??
    nested.DateTimeOriginal ??
    nested.DateTimeDigitized;
  const t = exifToTs(candidate);
  if (isFinite(t) && t > 0) return t;
  // Fallbacks: creationTime, then modificationTime
  if (typeof info?.creationTime === "number" && info.creationTime > 0) return info.creationTime;
  if (typeof info?.modificationTime === "number" && info.modificationTime > 0) return info.modificationTime;
  return Date.now();
}

function buildCountryTree(photos: PhotoAsset[]): CountryVisit[] {
  const countryMap = new Map<string, Map<string, PhotoAsset[]>>();

  for (const photo of photos) {
    const country = photo.country ?? "Unknown";
    const city =
      photo.city ??
      photo.region ??
      (typeof photo.latitude === "number" && typeof photo.longitude === "number"
        ? `${photo.latitude.toFixed(1)}, ${photo.longitude.toFixed(1)}`
        : "Unknown location");

    if (!countryMap.has(country)) countryMap.set(country, new Map());
    const cityMap = countryMap.get(country)!;
    if (!cityMap.has(city)) cityMap.set(city, []);
    cityMap.get(city)!.push(photo);
  }

  const result: CountryVisit[] = [];

  for (const [country, cityMap] of countryMap) {
    const cities: CityVisit[] = [];
    let countryFirstDate = Infinity;
    let countryLastDate = -Infinity;
    let countryPhotoCount = 0;
    let countryPreviewUri = "";

    for (const [city, cityPhotos] of cityMap) {
      const dates = cityPhotos.map((p) => p.creationTime);
      const firstDate = Math.min(...dates);
      const lastDate = Math.max(...dates);
      if (firstDate < countryFirstDate) countryFirstDate = firstDate;
      if (lastDate > countryLastDate) countryLastDate = lastDate;
      countryPhotoCount += cityPhotos.length;
      if (!countryPreviewUri) countryPreviewUri = cityPhotos[0].uri;

      const sortedByTime = [...cityPhotos].sort(
        (a, b) => b.creationTime - a.creationTime
      );
      cities.push({
        key: `${country}|${city}`,
        city,
        region: cityPhotos[0].region ?? "",
        country,
        photoCount: cityPhotos.length,
        firstDate,
        lastDate,
        previewUri: sortedByTime[0].uri,
        photoUris: sortedByTime.slice(0, 10).map((p) => p.uri),
        previewId: sortedByTime[0].id,
        photoIds: sortedByTime.slice(0, 10).map((p) => p.id),
      });
    }

    cities.sort((a, b) => b.lastDate - a.lastDate);

    result.push({
      country,
      photoCount: countryPhotoCount,
      firstDate: countryFirstDate,
      lastDate: countryLastDate,
      cities,
      previewUri: countryPreviewUri,
    });
  }

  result.sort((a, b) => b.lastDate - a.lastDate);
  return result;
}

// ─── Scan pipeline helpers (shared by the first scan and the delta scan) ────

// Pull GPS + capture time out of one page of assets. getAssetInfoAsync can
// reject or resolve to null for broken / iCloud-pending assets, so every
// lookup is individually shielded (a single bad photo must never kill a scan).
async function collectGpsPhotos(
  assets: import("expo-media-library").Asset[]
): Promise<PhotoAsset[]> {
  if (!MediaLibrary) return [];
  const rawPhotos: PhotoAsset[] = [];
  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    const batch = assets.slice(i, i + BATCH_SIZE);
    const infos = await Promise.all(
      batch.map((a) =>
        MediaLibrary!.getAssetInfoAsync(a)
          .then((info) => ({ info, asset: a }))
          .catch(() => null)
      )
    );
    for (const entry of infos) {
      if (!entry || !entry.info) continue;
      const { info, asset } = entry;
      const lat = Number(info.location?.latitude);
      const lon = Number(info.location?.longitude);
      if (isFinite(lat) && isFinite(lon) && (lat !== 0 || lon !== 0)) {
        rawPhotos.push({
          id: asset.id,
          // ph:// uri straight from the asset; resolved via PhotoKit at render
          uri: asset.uri,
          latitude: lat,
          longitude: lon,
          creationTime: captureTime(info),
        });
      }
    }
  }
  return rawPhotos;
}

async function loadGeoCache(): Promise<GeoCache> {
  try {
    const raw = await AsyncStorage.getItem(GEOCODE_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

async function saveGeoCache(cache: GeoCache): Promise<void> {
  try {
    await AsyncStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// Resolve country/city for a batch of photos, mutating them in place.
// Coordinates are clustered to a ~1km grid (2dp); each unique cell is
// resolved ONCE, in this order:
//   1. permanent cache hit: free.
//   2. fully offline: metro rollup for the city + bundled borders for the
//      country. Covers the huge majority of photos (metro areas) with zero
//      network calls, and the result is deterministic, so it is cached.
//   3. reverse geocode (6s timeout race) for rural / ambiguous cells; cached
//      on success. On failure the cell still gets the best offline answer for
//      this run, but is NOT cached, so the next scan retries the geocoder.
async function geocodePhotos(rawPhotos: PhotoAsset[], geoCache: GeoCache): Promise<void> {
  const clusters = new Map<string, PhotoAsset[]>();
  for (const photo of rawPhotos) {
    if (typeof photo.latitude !== "number" || typeof photo.longitude !== "number") continue;
    const key = geoKey(photo.latitude, photo.longitude);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(photo);
  }

  let newSinceSave = 0;
  for (const [key, clusterPhotos] of clusters) {
    const [lat, lon] = key.split(",").map(Number);

    const apply = (e: GeoCacheEntry) => {
      clusterPhotos.forEach((p) => {
        p.country = e.country;
        p.city = e.city;
        p.region = e.region;
      });
    };

    const cached = geoCache[key];
    if (cached) {
      apply(cached);
      continue;
    }

    // Offline fast path: metro city + point-in-country, no network at all.
    const offlineCity = nearestMajorCity(lat, lon);
    const offlineCountry = countryAt(lat, lon);
    if (offlineCity && offlineCountry) {
      const entry: GeoCacheEntry = { country: offlineCountry, city: offlineCity };
      apply(entry);
      geoCache[key] = entry;
      if (++newSinceSave >= 25) {
        newSinceSave = 0;
        await saveGeoCache(geoCache);
      }
      continue;
    }

    // Network path for rural / border / coastal cells.
    if (!Location) continue;
    try {
      const results = (await Promise.race([
        Location.reverseGeocodeAsync({ latitude: lat, longitude: lon }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("geocode-timeout")), 6000)
        ),
      ])) as Awaited<ReturnType<typeof Location.reverseGeocodeAsync>>;
      if (results[0]) {
        const { country, city, region, subregion } = results[0];
        const cityName =
          regionMajorCity(lat, lon, region) ??
          offlineCity ??
          resolveCity(city, subregion, region);
        const entry: GeoCacheEntry = {
          country: country ?? offlineCountry ?? undefined,
          city: cityName,
          region: region ?? undefined,
        };
        apply(entry);
        geoCache[key] = entry;
        if (++newSinceSave >= 25) {
          newSinceSave = 0;
          await saveGeoCache(geoCache);
        }
      } else {
        apply({ country: offlineCountry ?? undefined, city: offlineCity ?? undefined });
      }
      // Gentle pacing for Apple's rate-limited geocoder.
      await new Promise((r) => setTimeout(r, 30));
    } catch {
      // Best offline answer for this run; not cached so a later scan retries.
      apply({ country: offlineCountry ?? undefined, city: offlineCity ?? undefined });
    }
  }
  if (newSinceSave > 0) await saveGeoCache(geoCache);
}

export function TravelProvider({ children }: { children: React.ReactNode }) {
  const [accessPrivileges, setAccessPrivileges] = useState<
    "all" | "limited" | "none" | null
  >(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    Platform.OS === "web" ? true : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [initialScanning, setInitialScanning] = useState(false);
  const [progress, setProgress] = useState<LoadingProgress>({
    current: 0,
    total: 0,
    stage: "",
    countriesFound: 0,
  });
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [deadIds, setDeadIds] = useState<string[]>([]);
  const scanningRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    checkPermission();
    AsyncStorage.getItem(EXCLUDED_KEY)
      .then((v) => {
        if (v) setExcludedIds(JSON.parse(v));
      })
      .catch(() => {});
    AsyncStorage.getItem(DEAD_ASSETS_KEY)
      .then((v) => {
        if (v) setDeadIds(JSON.parse(v));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Photos the user removed from their trips (long-press on a thumbnail).
  const excludePhoto = useCallback((id: string) => {
    setExcludedIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      AsyncStorage.setItem(EXCLUDED_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Lazy deletion handling: assets that fail to resolve at render time were
  // deleted from the library; drop them here instead of rescanning.
  const reportDeadAsset = useCallback((id: string) => {
    setDeadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      AsyncStorage.setItem(DEAD_ASSETS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const visiblePhotos = useMemo(() => {
    if (excludedIds.length === 0 && deadIds.length === 0) return photos;
    const drop = new Set([...excludedIds, ...deadIds]);
    return photos.filter((p) => !drop.has(p.id));
  }, [photos, excludedIds, deadIds]);

  const countries = useMemo(() => buildCountryTree(visiblePhotos), [visiblePhotos]);

  async function checkPermission() {
    if (!MediaLibrary) return;
    const perm = await MediaLibrary.getPermissionsAsync();
    const { status } = perm;
    setAccessPrivileges((perm.accessPrivileges as any) ?? null);
    if (status === "granted") {
      setPermissionGranted(true);
      loadTravelData();
    } else {
      setPermissionGranted(false);
    }
  }

  const requestPermission = useCallback(async () => {
    if (!MediaLibrary) return;
    const perm = await MediaLibrary.requestPermissionsAsync();
    const { status } = perm;
    setAccessPrivileges((perm.accessPrivileges as any) ?? null);
    if (status === "granted") {
      setPermissionGranted(true);
      await loadTravelData();
    } else {
      setPermissionGranted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistResults = useCallback(
    async (allPhotos: PhotoAsset[], state: ScanState) => {
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ photos: allPhotos }));
        await AsyncStorage.setItem(SCAN_STATE_KEY, JSON.stringify(state));
      } catch {}
    },
    []
  );

  // Streamed full scan: page through the library newest-first, process each
  // page completely (GPS + geocode) and publish it to the UI immediately.
  // The map filling in IS the loading experience.
  //
  // `seed` carries the partial results of an interrupted earlier scan so a
  // resume shows them instantly and skips re-reading those assets.
  const runFullScan = useCallback(async (seed: PhotoAsset[] = []) => {
    if (!MediaLibrary || !Location || scanningRef.current) return;
    scanningRef.current = true;
    setIsLoading(true);
    setInitialScanning(true);
    const scanStart = Date.now();

    try {
      setProgress({ current: 0, total: 0, stage: "Looking at your photo library...", countriesFound: 0 });

      const geoCache = await loadGeoCache();
      const seenIds = new Set(seed.map((p) => p.id));
      const accumulated: PhotoAsset[] = [...seed];
      const countriesSoFar = new Set<string>();
      for (const p of seed) if (p.country) countriesSoFar.add(p.country);
      let processed = 0;
      let newestTs = 0;
      let cursor: string | undefined;
      let pagesSinceCheckpoint = 0;

      for (;;) {
        const page = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.photo,
          first: PAGE_SIZE,
          after: cursor,
          sortBy: [MediaLibrary.SortBy.creationTime],
        });

        for (const a of page.assets) {
          if (a.creationTime > newestTs) newestTs = a.creationTime;
        }

        const fresh = page.assets.filter((a) => !seenIds.has(a.id));
        const gpsPhotos = await collectGpsPhotos(fresh);
        await geocodePhotos(gpsPhotos, geoCache);
        for (const p of gpsPhotos) {
          accumulated.push(p);
          seenIds.add(p.id);
          if (p.country) countriesSoFar.add(p.country);
        }
        processed += page.assets.length;

        // Publish this batch: map, trips and stats update live.
        setPhotos([...accumulated]);
        setProgress({
          current: processed,
          total: page.totalCount ?? processed,
          stage: "Scanning photos...",
          countriesFound: countriesSoFar.size,
        });

        // Checkpoint results every few pages so a killed/interrupted scan
        // resumes instead of restarting. scan_state is written ONLY at the
        // very end: its absence next to a cache is the "resume needed" flag.
        if (++pagesSinceCheckpoint >= 4) {
          pagesSinceCheckpoint = 0;
          try {
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ photos: accumulated }));
          } catch {}
        }

        if (!page.hasNextPage || !page.endCursor || page.assets.length === 0) break;
        cursor = page.endCursor;
      }

      await persistResults(accumulated, {
        lastScanTimestamp: newestTs || scanStart,
        processedCount: processed,
      });

      // One-time notice after a genuinely long first scan; later opens only
      // delta-scan and never show this.
      if (Date.now() - scanStart > 15000) {
        Alert.alert(
          "Travel history ready",
          `Scanned ${processed} photos and found trips in ${countriesSoFar.size} ${
            countriesSoFar.size === 1 ? "country" : "countries"
          }. Your history is saved on this phone now; new photos are added automatically.`
        );
      }
    } catch (err) {
      console.error("Error loading travel data:", err);
    } finally {
      scanningRef.current = false;
      setIsLoading(false);
      setInitialScanning(false);
    }
  }, [persistResults]);

  // Delta scan: only assets created since the last scan watermark. Silent —
  // no spinner; new visits just appear.
  //
  // NOTE: this is the seam for future "new trip detected" notifications:
  // `merged` minus `existing` here is exactly the set of newly found visits.
  const runDeltaScan = useCallback(
    async (existing: PhotoAsset[], state: ScanState) => {
      if (!MediaLibrary || !Location || scanningRef.current) return;
      scanningRef.current = true;
      try {
        const geoCache = await loadGeoCache();
        const newPhotos: PhotoAsset[] = [];
        let processed = 0;
        let newestTs = state.lastScanTimestamp;
        let cursor: string | undefined;

        for (;;) {
          const page = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.photo,
            first: PAGE_SIZE,
            after: cursor,
            createdAfter: state.lastScanTimestamp,
            sortBy: [MediaLibrary.SortBy.creationTime],
          });
          for (const a of page.assets) {
            if (a.creationTime > newestTs) newestTs = a.creationTime;
          }
          const gpsPhotos = await collectGpsPhotos(page.assets);
          await geocodePhotos(gpsPhotos, geoCache);
          newPhotos.push(...gpsPhotos);
          processed += page.assets.length;
          if (!page.hasNextPage || !page.endCursor || page.assets.length === 0) break;
          cursor = page.endCursor;
        }

        const nextState: ScanState = {
          lastScanTimestamp: newestTs,
          processedCount: state.processedCount + processed,
        };
        if (newPhotos.length > 0) {
          const newIds = new Set(newPhotos.map((p) => p.id));
          const merged = [...newPhotos, ...existing.filter((p) => !newIds.has(p.id))];
          setPhotos(merged);
          await persistResults(merged, nextState);
          // New trips found by the delta scan: local notification with
          // milestone flavor (Nth country, first in years, % of world).
          try {
            announceNewTrips(buildCountryTree(existing), buildCountryTree(merged));
          } catch {}
        } else if (processed > 0 || newestTs !== state.lastScanTimestamp) {
          await persistResults(existing, nextState);
        }
      } catch {
      } finally {
        scanningRef.current = false;
      }
    },
    [persistResults]
  );

  const loadTravelData = useCallback(async () => {
    if (!MediaLibrary || !Location) return;

    // Prior scan exists: show it instantly, then delta-scan in the background.
    try {
      const [cached, stateRaw] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY),
        AsyncStorage.getItem(SCAN_STATE_KEY),
      ]);
      if (cached) {
        const { photos: cachedPhotos } = JSON.parse(cached) as { photos: PhotoAsset[] };
        setPhotos(cachedPhotos);
        if (stateRaw) {
          runDeltaScan(cachedPhotos, JSON.parse(stateRaw) as ScanState);
        } else {
          // Cache without scan state = an earlier first scan was interrupted
          // before completing. Resume it, seeded with what we already have.
          runFullScan(cachedPhotos);
        }
        return;
      }
    } catch {}

    // First run: streamed full scan with the one-time progress experience.
    await runFullScan();
  }, [runFullScan, runDeltaScan]);

  const refresh = useCallback(async () => {
    await AsyncStorage.removeItem(CACHE_KEY);
    await AsyncStorage.removeItem(SCAN_STATE_KEY);
    await runFullScan();
  }, [runFullScan]);

  // Let the user pick more photos (limited access) or grant full access,
  // then re-scan so newly-allowed photos show up in their travel history.
  // (The geocode cache makes this rescan cheap.)
  const addMorePhotos = useCallback(async () => {
    if (!MediaLibrary) return;
    const perm = await MediaLibrary.getPermissionsAsync();
    if (perm.status !== "granted") {
      const req = await MediaLibrary.requestPermissionsAsync();
      setAccessPrivileges((req.accessPrivileges as any) ?? null);
      if (req.status === "granted") setPermissionGranted(true);
    } else if (
      perm.accessPrivileges === "limited" &&
      MediaLibrary.presentPermissionsPickerAsync
    ) {
      await MediaLibrary.presentPermissionsPickerAsync();
      const after = await MediaLibrary.getPermissionsAsync();
      setAccessPrivileges((after.accessPrivileges as any) ?? null);
    }
    await refresh();
  }, [refresh]);

  const visitedCountryNames = countries.map((c) => c.country);

  return (
    <TravelContext.Provider
      value={{
        permissionGranted,
        requestPermission,
        isLoading,
        initialScanning,
        progress,
        photos: visiblePhotos,
        countries,
        visitedCountryNames,
        refresh,
        addMorePhotos,
        excludePhoto,
        reportDeadAsset,
        accessPrivileges,
      }}
    >
      {children}
    </TravelContext.Provider>
  );
}

export function useTravel() {
  const ctx = useContext(TravelContext);
  if (!ctx) throw new Error("useTravel must be used within TravelProvider");
  return ctx;
}
