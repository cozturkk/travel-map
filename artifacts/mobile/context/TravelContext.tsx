import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";

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
  modificationTime: number;
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
}

const TravelContext = createContext<TravelContextType | null>(null);

const CACHE_KEY = "travel_data_v2";
const MAX_PHOTOS = 2000;
const BATCH_SIZE = 20;

function buildCountryTree(photos: PhotoAsset[]): CountryVisit[] {
  const countryMap = new Map<string, Map<string, PhotoAsset[]>>();

  for (const photo of photos) {
    const country = photo.country ?? "Unknown";
    const city =
      photo.city ??
      photo.region ??
      `${photo.latitude.toFixed(1)}, ${photo.longitude.toFixed(1)}`;

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
      const dates = cityPhotos.map((p) => p.modificationTime);
      const firstDate = Math.min(...dates);
      const lastDate = Math.max(...dates);
      if (firstDate < countryFirstDate) countryFirstDate = firstDate;
      if (lastDate > countryLastDate) countryLastDate = lastDate;
      countryPhotoCount += cityPhotos.length;
      if (!countryPreviewUri) countryPreviewUri = cityPhotos[0].uri;

      const sortedByTime = [...cityPhotos].sort(
        (a, b) => b.modificationTime - a.modificationTime
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

export function TravelProvider({ children }: { children: React.ReactNode }) {
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
  const [countries, setCountries] = useState<CountryVisit[]>([]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    checkPermission();
  }, []);

  async function checkPermission() {
    if (!MediaLibrary) return;
    const { status } = await MediaLibrary.getPermissionsAsync();
    if (status === "granted") {
      setPermissionGranted(true);
      loadTravelData();
    } else {
      setPermissionGranted(false);
    }
  }

  const requestPermission = useCallback(async () => {
    if (!MediaLibrary) return;
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === "granted") {
      setPermissionGranted(true);
      await loadTravelData();
    } else {
      setPermissionGranted(false);
    }
  }, []);

  const loadTravelData = useCallback(async () => {
    if (!MediaLibrary || !Location) return;
    setIsLoading(true);

    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { photos: cachedPhotos, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 3600000) {
          const built = buildCountryTree(cachedPhotos);
          setPhotos(cachedPhotos);
          setCountries(built);
          setIsLoading(false);
          return;
        }
      }
    } catch {}

    try {
      setProgress({ current: 0, total: 1, stage: "Loading photo library..." });

      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: MAX_PHOTOS,
        sortBy: [MediaLibrary.SortBy.modificationTime],
      });

      setProgress({
        current: 0,
        total: assets.length,
        stage: "Reading GPS data...",
      });

      const rawPhotos: PhotoAsset[] = [];
      for (let i = 0; i < assets.length; i += BATCH_SIZE) {
        const batch = assets.slice(i, i + BATCH_SIZE);
        const infos = await Promise.all(
          batch.map((a) => MediaLibrary.getAssetInfoAsync(a))
        );
        for (const info of infos) {
          if (info.location?.latitude && info.location?.longitude) {
            rawPhotos.push({
              id: info.id,
              uri: info.uri,
              latitude: info.location.latitude,
              longitude: info.location.longitude,
              modificationTime: info.modificationTime,
            });
          }
        }
        setProgress({
          current: i + batch.length,
          total: assets.length,
          stage: "Reading GPS data...",
        });
      }

      // Bucket unique locations (1-decimal-place ≈ 11km accuracy)
      const locationBuckets = new Map<string, PhotoAsset[]>();
      for (const photo of rawPhotos) {
        const key = `${photo.latitude.toFixed(1)},${photo.longitude.toFixed(1)}`;
        if (!locationBuckets.has(key)) locationBuckets.set(key, []);
        locationBuckets.get(key)!.push(photo);
      }

      setProgress({
        current: 0,
        total: locationBuckets.size,
        stage: "Identifying locations...",
      });

      let geocodedCount = 0;
      for (const [key, bucketPhotos] of locationBuckets) {
        const [lat, lon] = key.split(",").map(Number);
        try {
          const results = await Location.reverseGeocodeAsync(
            { latitude: lat, longitude: lon },
            { useGoogleMaps: false }
          );
          if (results[0]) {
            const { country, city, region, subregion } = results[0];
            const cityName = city ?? subregion ?? region ?? undefined;
            bucketPhotos.forEach((p) => {
              p.country = country ?? undefined;
              p.city = cityName;
              p.region = region ?? undefined;
            });
          }
        } catch {}

        geocodedCount++;
        setProgress({
          current: geocodedCount,
          total: locationBuckets.size,
          stage: "Identifying locations...",
        });
        await new Promise((r) => setTimeout(r, 30));
      }

      const processedPhotos = rawPhotos;
      const countryTree = buildCountryTree(processedPhotos);

      setPhotos(processedPhotos);
      setCountries(countryTree);

      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ photos: processedPhotos, timestamp: Date.now() })
      );
    } catch (err) {
      console.error("Error loading travel data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await AsyncStorage.removeItem(CACHE_KEY);
    await loadTravelData();
  }, [loadTravelData]);

  const visitedCountryNames = countries.map((c) => c.country);

  return (
    <TravelContext.Provider
      value={{
        permissionGranted,
        requestPermission,
        isLoading,
        progress,
        photos,
        countries,
        visitedCountryNames,
        refresh,
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
