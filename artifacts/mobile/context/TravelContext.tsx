import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert, Platform } from "react-native";
import { WORLD_CITIES, ROLLUP_RADIUS_KM, type WorldCity } from "@/data/worldCities";
import { FREE_PHOTO_LIMIT, readPremiumFlag } from "@/context/PremiumContext";

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
}

interface TravelContextType {
  permissionGranted: boolean | null;
  requestPermission: () => Promise<void>;
  isLoading: boolean;
  progress: LoadingProgress;
  photos: PhotoAsset[];
  countries: CountryVisit[];
  visitedCountryNames: string[];
  refresh: () => Promise<void>;
  addMorePhotos: () => Promise<void>;
  excludePhoto: (id: string) => void;
  accessPrivileges: "all" | "limited" | "none" | null;
}

const TravelContext = createContext<TravelContextType | null>(null);

// v12: permanent cache (scan once, top up silently) + admin-region city rollup
const CACHE_KEY = "travel_data_v12";
const EXCLUDED_KEY = "excluded_photos_v1";

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

// Roll a precise GPS point UP to its parent city using a worldwide city list.
// WORLD_CITIES is sorted by population (descending), so the FIRST city found
// within ROLLUP_RADIUS_KM is the most populous nearby place i.e. the metro
// anchor. This turns neighborhoods / boroughs / suburbs / districts into their
// parent city generically from the photo's own coordinates:
//   - Camden -> London, Brooklyn -> New York, Sahinbey -> Gaziantep
// while keeping adjacent major cities separate (Yokohama sits ~28km from Tokyo,
// outside the radius, so it stays Yokohama). Returns null when nothing is close
// enough, so genuinely remote/rural spots keep their reverse-geocoded name.
const ROLLUP_DEG = ROLLUP_RADIUS_KM / 111 + 0.05; // bounding-box prefilter (deg)
function nearestMajorCity(lat: number, lon: number): string | null {
  for (const c of WORLD_CITIES) {
    const cLat = c[1];
    const cLon = c[2];
    if (Math.abs(cLat - lat) > ROLLUP_DEG || Math.abs(cLon - lon) > ROLLUP_DEG) {
      continue;
    }
    if (distKm(lat, lon, cLat, cLon) <= ROLLUP_RADIUS_KM) {
      return c[0]; // first hit = most populous within radius (list is pop-sorted)
    }
  }
  return null;
}

// Admin-region rollup: many provinces are named after their metro (İstanbul,
// Berlin, Tokyo, Luxembourg). When the reverse-geocoded region itself names a
// major city within REGION_ROLLUP_KM, every photo in that province rolls up to
// it, so outlying districts like Silivri or Esenyurt count as Istanbul even
// though they are populous enough to be cities in their own right. The
// distance guard keeps big states from swallowing far-away towns (a photo in
// upstate "New York" never matches "New York City" by name anyway, and rural
// Quebec 400km from Québec City stays local).
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

// Photos are fetched in pages so a 60k+ library never has to come back in one
// call. Free tier stops at FREE_PHOTO_LIMIT; Premium walks the whole library.
const PAGE_SIZE = 1000;
const BATCH_SIZE = 20;

// Reverse-geocode results are permanent facts about coordinates, so they are
// cached across rescans. This makes a full-library rescan cheap (the expensive
// geocoding step only runs for never-seen location buckets) and avoids
// hammering Apple's rate-limited geocoder on big libraries.
// v2: results now include the admin-region rollup.
const GEO_CACHE_KEY = "geo_cache_v2";
type GeoCacheEntry = { country?: string; city?: string; region?: string };

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

// ─── Scan pipeline helpers (shared by the full scan and the silent top-up) ───

type ProgressFn = (current: number, total: number) => void;

// Pull GPS + capture time out of assets, batch by batch. getAssetInfoAsync can
// reject or resolve to null for broken / iCloud-pending assets, so every
// lookup is individually shielded (a single bad photo must never kill a scan).
async function collectGpsPhotos(
  assets: import("expo-media-library").Asset[],
  onProgress?: ProgressFn
): Promise<PhotoAsset[]> {
  if (!MediaLibrary) return [];
  const rawPhotos: PhotoAsset[] = [];
  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    const batch = assets.slice(i, i + BATCH_SIZE);
    const infos = await Promise.all(
      batch.map((a) => MediaLibrary!.getAssetInfoAsync(a).catch(() => null))
    );
    for (const info of infos) {
      if (!info) continue;
      const lat = Number(info.location?.latitude);
      const lon = Number(info.location?.longitude);
      if (isFinite(lat) && isFinite(lon) && (lat !== 0 || lon !== 0)) {
        // Prefer localUri (file://) over uri (ph://) — Image cannot load ph:// URLs
        const displayUri = info.localUri ?? info.uri;
        rawPhotos.push({
          id: info.id,
          uri: displayUri,
          latitude: lat,
          longitude: lon,
          creationTime: captureTime(info),
        });
      }
    }
    onProgress?.(Math.min(i + batch.length, assets.length), assets.length);
  }
  return rawPhotos;
}

// Resolve country/city for every photo, mutating them in place. Coordinates
// are bucketed to ~11km and answered from the persistent geocode cache first.
async function geocodePhotos(
  rawPhotos: PhotoAsset[],
  onProgress?: ProgressFn
): Promise<void> {
  if (!Location) return;

  const locationBuckets = new Map<string, PhotoAsset[]>();
  for (const photo of rawPhotos) {
    if (typeof photo.latitude !== "number" || typeof photo.longitude !== "number") continue;
    const key = `${photo.latitude.toFixed(1)},${photo.longitude.toFixed(1)}`;
    if (!locationBuckets.has(key)) locationBuckets.set(key, []);
    locationBuckets.get(key)!.push(photo);
  }

  let geoCache: Record<string, GeoCacheEntry> = {};
  try {
    const rawCache = await AsyncStorage.getItem(GEO_CACHE_KEY);
    if (rawCache) geoCache = JSON.parse(rawCache);
  } catch {}
  const saveGeoCache = async () => {
    try {
      await AsyncStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geoCache));
    } catch {}
  };

  let geocodedCount = 0;
  let newSinceSave = 0;
  for (const [key, bucketPhotos] of locationBuckets) {
    const [lat, lon] = key.split(",").map(Number);
    const cached = geoCache[key];
    if (cached) {
      bucketPhotos.forEach((p) => {
        p.country = cached.country;
        p.city = cached.city;
        p.region = cached.region;
      });
      geocodedCount++;
      if (geocodedCount % 50 === 0) onProgress?.(geocodedCount, locationBuckets.size);
      continue;
    }
    try {
      // Race each lookup against a timeout so one hung/rate-limited
      // reverse-geocode can't stall the whole load.
      const results = (await Promise.race([
        Location.reverseGeocodeAsync({ latitude: lat, longitude: lon }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("geocode-timeout")), 6000)
        ),
      ])) as Awaited<ReturnType<typeof Location.reverseGeocodeAsync>>;
      if (results[0]) {
        const { country, city, region, subregion } = results[0];
        // City resolution, most reliable first:
        //  1. province named after its metro (İstanbul province → Istanbul)
        //  2. GPS rollup to the nearest major city
        //  3. cleaned reverse-geocoded locality
        const cityName =
          regionMajorCity(lat, lon, region) ??
          nearestMajorCity(lat, lon) ??
          resolveCity(city, subregion, region);
        bucketPhotos.forEach((p) => {
          p.country = country ?? undefined;
          p.city = cityName;
          p.region = region ?? undefined;
        });
        geoCache[key] = {
          country: country ?? undefined,
          city: cityName,
          region: region ?? undefined,
        };
        newSinceSave++;
        if (newSinceSave >= 25) {
          newSinceSave = 0;
          await saveGeoCache();
        }
      }
    } catch {}

    geocodedCount++;
    onProgress?.(geocodedCount, locationBuckets.size);
    await new Promise((r) => setTimeout(r, 30));
  }
  if (newSinceSave > 0) await saveGeoCache();
}

export function TravelProvider({ children }: { children: React.ReactNode }) {
  const [accessPrivileges, setAccessPrivileges] = useState<
    "all" | "limited" | "none" | null
  >(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    Platform.OS === "web" ? true : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<LoadingProgress>({
    current: 0,
    total: 0,
    stage: "",
  });
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    checkPermission();
    AsyncStorage.getItem(EXCLUDED_KEY)
      .then((v) => {
        if (v) setExcludedIds(JSON.parse(v));
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

  const visiblePhotos = useMemo(() => {
    if (excludedIds.length === 0) return photos;
    const ex = new Set(excludedIds);
    return photos.filter((p) => !ex.has(p.id));
  }, [photos, excludedIds]);

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

  // Silently look for photos taken since the last scan and fold them in.
  // No spinners, no alerts: the cached history is already on screen.
  const topUpNewPhotos = useCallback(
    async (existing: PhotoAsset[], since: number) => {
      if (!MediaLibrary || !Location) return;
      try {
        const premium = await readPremiumFlag();
        const assets: import("expo-media-library").Asset[] = [];
        let cursor: string | undefined;
        for (;;) {
          const page = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.photo,
            first: PAGE_SIZE,
            after: cursor,
            createdAfter: since,
            sortBy: [MediaLibrary.SortBy.creationTime],
          });
          assets.push(...page.assets);
          if (
            !page.hasNextPage ||
            !page.endCursor ||
            page.assets.length === 0 ||
            (!premium && assets.length >= FREE_PHOTO_LIMIT)
          ) {
            break;
          }
          cursor = page.endCursor;
        }
        const capped = premium ? assets : assets.slice(0, FREE_PHOTO_LIMIT);
        const now = Date.now();
        if (capped.length > 0) {
          const newPhotos = await collectGpsPhotos(capped);
          if (newPhotos.length > 0) {
            await geocodePhotos(newPhotos);
            const newIds = new Set(newPhotos.map((p) => p.id));
            const merged = [
              ...newPhotos,
              ...existing.filter((p) => !newIds.has(p.id)),
            ];
            setPhotos(merged);
            await AsyncStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ photos: merged, timestamp: now })
            );
            return;
          }
        }
        // Nothing new: just advance the scan watermark.
        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ photos: existing, timestamp: now })
        );
      } catch {}
    },
    []
  );

  const loadTravelData = useCallback(async () => {
    if (!MediaLibrary || !Location) return;

    // The library is scanned ONCE; after that the history lives on the phone.
    // On later opens we show the cached result instantly and only look for
    // photos taken since the last scan, in the background.
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { photos: cachedPhotos, timestamp } = JSON.parse(cached);
        setPhotos(cachedPhotos);
        topUpNewPhotos(cachedPhotos, timestamp ?? Date.now());
        return;
      }
    } catch {}

    setIsLoading(true);
    const scanStart = Date.now();

    try {
      setProgress({ current: 0, total: 1, stage: "Loading photo library..." });

      const premium = await readPremiumFlag();
      const limit = premium ? Number.POSITIVE_INFINITY : FREE_PHOTO_LIMIT;

      // Page through the library (newest first) instead of one giant request,
      // so premium users with 60k+ photos can be scanned safely.
      const assets: import("expo-media-library").Asset[] = [];
      let cursor: string | undefined;
      for (;;) {
        const page = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.photo,
          first: Math.min(PAGE_SIZE, limit - assets.length),
          after: cursor,
          sortBy: [MediaLibrary.SortBy.creationTime],
        });
        assets.push(...page.assets);
        setProgress({
          current: assets.length,
          total: Math.min(limit, page.totalCount ?? assets.length),
          stage: "Loading photo library...",
        });
        if (
          assets.length >= limit ||
          !page.hasNextPage ||
          !page.endCursor ||
          page.assets.length === 0
        ) {
          break;
        }
        cursor = page.endCursor;
      }

      setProgress({ current: 0, total: assets.length, stage: "Reading GPS data..." });
      const rawPhotos = await collectGpsPhotos(assets, (current, total) =>
        setProgress({ current, total, stage: "Reading GPS data..." })
      );

      setProgress({ current: 0, total: 0, stage: "Identifying locations..." });
      await geocodePhotos(rawPhotos, (current, total) =>
        setProgress({ current, total, stage: "Identifying locations..." })
      );

      setPhotos(rawPhotos);

      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ photos: rawPhotos, timestamp: scanStart })
      );

      // One-time notice after a genuinely long first scan. Later opens never
      // rescan, so this is only ever seen once per library.
      if (Date.now() - scanStart > 15000) {
        const nCountries = new Set(
          rawPhotos.map((p) => p.country).filter(Boolean)
        ).size;
        Alert.alert(
          "Travel history ready",
          `Scanned ${assets.length} photos and found trips in ${nCountries} ${
            nCountries === 1 ? "country" : "countries"
          }. Your history is saved on this phone now; new photos are added automatically.`
        );
      }
    } catch (err) {
      console.error("Error loading travel data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [topUpNewPhotos]);

  const refresh = useCallback(async () => {
    await AsyncStorage.removeItem(CACHE_KEY);
    await loadTravelData();
  }, [loadTravelData]);

  // Let the user pick more photos (limited access) or grant full access,
  // then re-scan so newly-allowed photos show up in their travel history.
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
        progress,
        photos: visiblePhotos,
        countries,
        visitedCountryNames,
        refresh,
        addMorePhotos,
        excludePhoto,
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
