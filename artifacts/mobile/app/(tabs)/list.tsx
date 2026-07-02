import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { CityVisit, CountryVisit, PhotoAsset, useTravel } from "@/context/TravelContext";
import { useHomeCity } from "@/context/HomeCityContext";
import { usePremium } from "@/context/PremiumContext";
import { countryToFlag } from "@/utils/countryFlags";
import PermissionGate from "@/components/PermissionGate";

const MediaLibrary =
  Platform.OS !== "web"
    ? (require("expo-media-library") as typeof import("expo-media-library"))
    : null;

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtShortDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ─── Photo Viewer ────────────────────────────────────────────────────────────

function PhotoViewer({
  uris,
  initialIndex,
  onClose,
}: {
  uris: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const { width, height } = Dimensions.get("window");
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <View style={pvStyles.bar}>
          <TouchableOpacity onPress={onClose} hitSlop={16} style={pvStyles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={pvStyles.counter}>{currentIndex + 1} / {uris.length}</Text>
          <View style={{ width: 48 }} />
        </View>
        <FlatList
          data={uris}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={(e) => {
            setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          }}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={{ width, height: height - 140 }} resizeMode="contain" />
          )}
        />
      </View>
    </Modal>
  );
}

const pvStyles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16 },
  closeBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  counter: { color: "#fff", fontSize: 15, fontFamily: "Inter_500Medium" },
});

function TripSummaryBar({ countries, photos }: { countries: CountryVisit[]; photos: PhotoAsset[] }) {
  const colors = useColors();
  const currentYear = new Date().getFullYear();
  const countriesThisYear = countries.filter(
    (c) => new Date(c.lastDate).getFullYear() >= currentYear && new Date(c.firstDate).getFullYear() <= currentYear
  ).length;
  return (
    <View style={[styles.summaryBar, { backgroundColor: colors.card }]}>
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryNum, { color: colors.foreground }]}>{countries.length}</Text>
        <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>countries</Text>
      </View>
      <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryNum, { color: colors.foreground }]}>{countriesThisYear}</Text>
        <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>countries</Text>
        <Text style={[styles.summaryYearTag, { color: colors.accent }]}>in {currentYear}</Text>
      </View>
      <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryNum, { color: colors.foreground }]}>{photos.length}</Text>
        <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>photos</Text>
      </View>
    </View>
  );
}

// ─── Photo Strip ─────────────────────────────────────────────────────────────

// A single thumbnail that recovers from a missing/stale URI by re-resolving a
// fresh local file path from the photo library (handles iCloud-optimized and
// expired temp-file cases where the cached URI no longer loads).
function Thumb({ uri, id, idx, onPress }: { uri: string; id?: string; idx: number; onPress: (i: number) => void }) {
  const [src, setSrc] = useState(uri);
  const [failed, setFailed] = useState(false);
  const triedRef = React.useRef(false);
  useEffect(() => { setSrc(uri); setFailed(false); triedRef.current = false; }, [uri]);
  const handleError = useCallback(() => {
    if (!triedRef.current && id && MediaLibrary) {
      triedRef.current = true;
      MediaLibrary.getAssetInfoAsync(id, { shouldDownloadFromNetwork: true })
        .then((info: any) => {
          const fresh = info && info.localUri;
          if (fresh && fresh !== src) { setSrc(fresh); setFailed(false); }
          else setFailed(true);
        })
        .catch(() => setFailed(true));
    } else {
      setFailed(true);
    }
  }, [id, src]);
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(idx); }}>
      {failed ? (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="image-outline" size={20} color="rgba(148,163,184,0.7)" />
        </View>
      ) : (
        <Image source={{ uri: src }} style={styles.thumb} onError={handleError} />
      )}
    </TouchableOpacity>
  );
}

function PhotoStrip({ uris, ids, onPress }: { uris: string[]; ids?: string[]; onPress: (i: number) => void }) {
  if (uris.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
      {uris.map((uri, idx) => (
        <Thumb key={idx} uri={uri} id={ids ? ids[idx] : undefined} idx={idx} onPress={onPress} />
      ))}
    </ScrollView>
  );
}

// ─── Home Country Card ────────────────────────────────────────────────────────

function HomeCountryCard({
  countryVisit,
  onPhotoPress,
}: {
  countryVisit: CountryVisit;
  onPhotoPress: (uris: string[], index: number) => void;
}) {
  const colors = useColors();
  const allUris = countryVisit.cities.flatMap((ci) => ci.photoUris ?? []);
  const allIds = countryVisit.cities.flatMap((ci) => ci.photoIds ?? []);
  return (
    <View style={[styles.homeCityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.homeCityCardHeader}>
        <View style={[styles.homeBadge, { backgroundColor: colors.accent + "22" }]}>
          <Ionicons name="home" size={13} color={colors.accent} />
          <Text style={[styles.homeBadgeText, { color: colors.accent }]}>HOME</Text>
        </View>
        <View style={styles.homeCityMeta}>
          <Text style={[styles.homeCityCardName, { color: colors.foreground }]}>
            {countryToFlag(countryVisit.country)} {countryVisit.country}
          </Text>
          <Text style={[styles.homeCityCardCountry, { color: colors.mutedForeground }]}>
            {countryVisit.cities.length} {countryVisit.cities.length === 1 ? "city" : "cities"} · {countryVisit.photoCount} photos
          </Text>
        </View>
      </View>
      <PhotoStrip
        uris={allUris}
        ids={allIds}
        onPress={(idx) => onPhotoPress(allUris, idx)}
      />
      <Text style={[styles.homeCityNote, { color: colors.mutedForeground }]}>
        Not counted in trip stats
      </Text>
    </View>
  );
}

// ─── Chrono item ─────────────────────────────────────────────────────────────

interface ChronoEntry extends CityVisit {
  country: string;
}

function ChronoCityItem({
  item,
  onPhotoPress,
}: {
  item: ChronoEntry;
  onPhotoPress: (uris: string[], index: number) => void;
}) {
  const colors = useColors();
  const flag = countryToFlag(item.country);
  const dateStr = fmtShortDate(item.lastDate);

  return (
    <View style={[styles.chronoBlock, { borderBottomColor: colors.border }]}>
      <View style={styles.chronoRow}>
        <Text style={styles.chronoFlag}>{flag}</Text>
        <View style={styles.chronoInfo}>
          <Text style={[styles.chronoLine, { color: colors.foreground }]} numberOfLines={2}>
            <Text style={styles.chronoCountry}>{item.country}</Text>
            <Text style={{ color: colors.mutedForeground }}> · </Text>
            <Text>{item.city}</Text>
            <Text style={{ color: colors.mutedForeground }}> — {dateStr}</Text>
          </Text>
        </View>
        <View style={[styles.photoBadge, { backgroundColor: colors.muted }]}>
          <Ionicons name="camera" size={11} color={colors.mutedForeground} />
          <Text style={[styles.photoCount, { color: colors.mutedForeground }]}>{item.photoCount}</Text>
        </View>
      </View>
      <PhotoStrip
        uris={item.photoUris ?? []}
        ids={item.photoIds ?? []}
        onPress={(idx) => onPhotoPress(item.photoUris ?? [], idx)}
      />
    </View>
  );
}

function YearHeader({ year, entries }: { year: string; entries: ChronoEntry[] }) {
  const colors = useColors();
  const nCountries = new Set(entries.map((e) => e.country)).size;
  const nCities = entries.length;
  return (
    <View style={[styles.yearHeader, { backgroundColor: colors.background }]}>
      <View style={styles.yearHeaderRow}>
        <View>
          <Text style={[styles.yearText, { color: colors.foreground }]}>{year}</Text>
          <View style={[styles.yearAccentBar, { backgroundColor: colors.accent }]} />
        </View>
        <View style={[styles.yearMetaChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.yearMetaText, { color: colors.mutedForeground }]}>
            {nCountries} {nCountries === 1 ? "country" : "countries"} · {nCities} {nCities === 1 ? "city" : "cities"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ListTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { permissionGranted, isLoading, progress, countries, photos, refresh, addMorePhotos, accessPrivileges } = useTravel();
  const { homeCity } = useHomeCity();
  const { isPremium } = usePremium();

  const [viewerState, setViewerState] = useState<{ uris: string[]; index: number } | null>(null);
  const openViewer = useCallback((uris: string[], index: number) => {
    setViewerState({ uris, index });
  }, []);

  const handleAddPhotos = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addMorePhotos();
  }, [addMorePhotos]);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const homeCountryVisit = useMemo(() => {
    if (!homeCity) return null;
    return countries.find((c) => c.country === homeCity.country) ?? null;
  }, [countries, homeCity]);

  const tripCountries = useMemo(() => {
    if (!homeCity) return countries;
    return countries.filter((c) => c.country !== homeCity.country);
  }, [countries, homeCity]);

  const tripPhotos = useMemo(() => {
    if (!homeCity) return photos;
    return photos.filter((p) => p.country !== homeCity.country);
  }, [photos, homeCity]);

  // Flatten all cities and sort chronologically (newest first)
  const chronoEntries = useMemo<ChronoEntry[]>(() => {
    return tripCountries
      .flatMap((c) => c.cities.map((ci) => ({ ...ci, country: c.country })))
      .sort((a, b) => b.lastDate - a.lastDate);
  }, [tripCountries]);

  // Group by year
  const sections = useMemo(() => {
    const yearMap = new Map<number, ChronoEntry[]>();
    for (const entry of chronoEntries) {
      const year = new Date(entry.lastDate).getFullYear();
      if (!yearMap.has(year)) yearMap.set(year, []);
      yearMap.get(year)!.push(entry);
    }
    return Array.from(yearMap.entries())
      .sort(([a], [b]) => b - a)
      .map(([year, data]) => ({ year: String(year), data, key: String(year) }));
  }, [chronoEntries]);

  if (permissionGranted === false) return <PermissionGate />;

  if (isLoading && countries.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          {progress.stage || "Loading..."}
        </Text>
        {progress.total > 0 && (
          <Text style={[styles.loadingSubtext, { color: colors.border }]}>
            {progress.current} / {progress.total}
          </Text>
        )}
      </View>
    );
  }

  if (!isLoading && countries.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Ionicons name="images-outline" size={52} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Trips Found</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Photos with GPS location data will appear here as your travel history.
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); refresh(); }}
            style={[styles.refreshBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginTop: 0 }]}
          >
            <Text style={[styles.refreshBtnText, { color: colors.foreground }]}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAddPhotos}
            style={[styles.refreshBtn, { backgroundColor: colors.primary, marginTop: 0 }]}
          >
            <Text style={[styles.refreshBtnText, { color: colors.primaryForeground }]}>Add Photos</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <ChronoCityItem item={item} onPhotoPress={openViewer} />
        )}
        renderSectionHeader={({ section }) => <YearHeader year={section.year} entries={section.data} />}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: insets.bottom + 80 }}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={{ paddingBottom: 4 }}>
            <TripSummaryBar countries={tripCountries} photos={tripPhotos} />

            <TouchableOpacity
              onPress={handleAddPhotos}
              activeOpacity={0.85}
              style={[styles.addPhotosBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.addPhotosText, { color: colors.foreground }]}>
                Add more photos
              </Text>
              {accessPrivileges === "limited" ? (
                <Text style={[styles.addPhotosHint, { color: colors.mutedForeground }]}>
                  you choose the photos
                </Text>
              ) : isPremium !== true ? (
                <Text style={[styles.addPhotosHint, { color: colors.mutedForeground }]}>
                  free plan · up to 500
                </Text>
              ) : null}
            </TouchableOpacity>

            {homeCountryVisit && (
              <View style={styles.homeCitySection}>
                <HomeCountryCard countryVisit={homeCountryVisit} onPhotoPress={openViewer} />
              </View>
            )}

            {sections.length > 0 && (
              <View style={styles.timelineLabel}>
                <Text style={[styles.timelineLabelText, { color: colors.mutedForeground }]}>
                  TIMELINE · {chronoEntries.length} {chronoEntries.length === 1 ? "CITY" : "CITIES"}
                </Text>
              </View>
            )}
          </View>
        }
      />

      {viewerState && (
        <PhotoViewer
          uris={viewerState.uris}
          initialIndex={viewerState.index}
          onClose={() => setViewerState(null)}
        />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  loadingSubtext: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  refreshBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  addPhotosBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginTop: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  addPhotosText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  addPhotosHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: "auto" },
  refreshBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  summaryBar: { flexDirection: "row", borderRadius: 16, marginHorizontal: 16, marginTop: 4, paddingVertical: 16 },
  summaryItem: { flex: 1, alignItems: "center", gap: 3 },
  summaryNum: { fontSize: 26, fontFamily: "Inter_700Bold", lineHeight: 30 },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.6 },
  summaryDivider: { width: 1, marginVertical: 6 },
  summaryYearTag: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 1 },

  homeCitySection: { paddingHorizontal: 16, marginTop: 12, marginBottom: 0 },
  homeCityCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  homeCityCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  homeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  homeBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  homeCityMeta: { flex: 1 },
  homeCityCardName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  homeCityCardCountry: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  homeCityNote: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  timelineLabel: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  timelineLabelText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },

  // Year header
  yearHeader: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 },
  yearHeaderRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  yearText: { fontSize: 34, fontFamily: "Inter_700Bold", letterSpacing: -0.5, lineHeight: 40 },
  yearAccentBar: { width: 38, height: 4, borderRadius: 2, marginTop: 4 },
  yearMetaChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, marginBottom: 6 },
  yearMetaText: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },

  // Chrono item
  chronoBlock: { borderBottomWidth: StyleSheet.hairlineWidth, marginHorizontal: 16, paddingVertical: 0 },
  chronoRow: { flexDirection: "row", alignItems: "flex-start", paddingTop: 12, paddingBottom: 8, gap: 10 },
  chronoFlag: { fontSize: 24, lineHeight: 30, paddingTop: 1 },
  chronoInfo: { flex: 1 },
  chronoLine: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  chronoCountry: { fontFamily: "Inter_600SemiBold" },
  photoBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginTop: 2 },
  photoCount: { fontSize: 12, fontFamily: "Inter_500Medium" },

  photoStrip: { paddingHorizontal: 4, paddingBottom: 10, gap: 6 },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  thumbFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(148,163,184,0.12)" },
});
