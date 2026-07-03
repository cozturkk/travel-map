import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { CityVisit, CountryVisit, useTravel } from "@/context/TravelContext";
import { useHomeCity } from "@/context/HomeCityContext";
import { countryToFlag } from "@/utils/countryFlags";
import PermissionGate from "@/components/PermissionGate";

const MediaLibrary =
  Platform.OS !== "web"
    ? (require("expo-media-library") as typeof import("expo-media-library"))
    : null;

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtMonth(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "long", year: "numeric" });
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

// ─── Photo Strip ─────────────────────────────────────────────────────────────

// A single thumbnail that recovers from a missing/stale URI by re-resolving a
// fresh local file path from the photo library (handles iCloud-optimized and
// expired temp-file cases where the cached URI no longer loads). Thumbnails
// that still can't load render nothing: no empty placeholder tiles.
function Thumb({ uri, id, idx, onPress, onLongPress }: { uri: string; id?: string; idx: number; onPress: (i: number) => void; onLongPress?: () => void }) {
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
  if (failed) return null;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(idx); }}
      onLongPress={onLongPress}
      delayLongPress={350}
    >
      <Image source={{ uri: src }} style={styles.thumb} onError={handleError} />
    </TouchableOpacity>
  );
}

function PhotoStrip({
  uris,
  ids,
  onPress,
  onRemove,
}: {
  uris: string[];
  ids?: string[];
  onPress: (i: number) => void;
  onRemove?: (id: string) => void;
}) {
  if (uris.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
      {uris.map((uri, idx) => {
        const id = ids ? ids[idx] : undefined;
        return (
          <Thumb
            key={idx}
            uri={uri}
            id={id}
            idx={idx}
            onPress={onPress}
            onLongPress={id && onRemove ? () => onRemove(id) : undefined}
          />
        );
      })}
    </ScrollView>
  );
}

// ─── Trip card ───────────────────────────────────────────────────────────────

interface ChronoEntry extends CityVisit {
  country: string;
}

function TripCard({
  item,
  onPhotoPress,
  onRemovePhoto,
}: {
  item: ChronoEntry;
  onPhotoPress: (uris: string[], index: number) => void;
  onRemovePhoto?: (id: string) => void;
}) {
  const colors = useColors();
  const flag = countryToFlag(item.country);
  const n = item.photoCount;

  return (
    <View style={[styles.tripCard, { backgroundColor: colors.card }]}>
      <View style={styles.tripCardHeader}>
        <Text style={styles.tripFlag}>{flag}</Text>
        <View style={styles.tripTitleWrap}>
          <Text style={[styles.tripCity, { color: colors.foreground }]} numberOfLines={1}>
            {item.city}
          </Text>
          <Text style={[styles.tripMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.country} · {fmtMonth(item.lastDate)}
          </Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: colors.muted }]}>
          <Text style={[styles.countPillText, { color: colors.mutedForeground }]}>
            {n} {n === 1 ? "photo" : "photos"}
          </Text>
        </View>
      </View>
      <PhotoStrip
        uris={item.photoUris ?? []}
        ids={item.photoIds ?? []}
        onPress={(idx) => onPhotoPress(item.photoUris ?? [], idx)}
        onRemove={onRemovePhoto}
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
      <Text style={[styles.yearText, { color: colors.foreground }]}>{year}</Text>
      <Text style={[styles.yearMetaText, { color: colors.mutedForeground }]}>
        {nCountries} {nCountries === 1 ? "country" : "countries"} · {nCities} {nCities === 1 ? "city" : "cities"}
      </Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ListTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { permissionGranted, isLoading, progress, countries, photos, refresh, addMorePhotos, excludePhoto } = useTravel();
  const { homeCity } = useHomeCity();

  const [viewerState, setViewerState] = useState<{ uris: string[]; index: number } | null>(null);
  const openViewer = useCallback((uris: string[], index: number) => {
    setViewerState({ uris, index });
  }, []);

  const handleRemovePhoto = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Remove this photo?",
        "It will no longer count toward your trips and stats. The photo itself stays in your library.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              excludePhoto(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    },
    [excludePhoto]
  );

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
          <TripCard item={item} onPhotoPress={openViewer} onRemovePhoto={handleRemovePhoto} />
        )}
        renderSectionHeader={({ section }) => <YearHeader year={section.year} entries={section.data} />}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: insets.bottom + 140 }}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.pageHeaderWrap}>
            {/* Title + one quiet stats line */}
            <View style={styles.pageHeader}>
              <Text style={[styles.pageTitle, { color: colors.foreground }]}>Trips</Text>
              <Text style={[styles.pageStats, { color: colors.mutedForeground }]}>
                {tripCountries.length} {tripCountries.length === 1 ? "country" : "countries"} · {tripPhotos.length} photos
              </Text>
            </View>

            {/* Compact home chip */}
            {homeCountryVisit && (
              <View style={[styles.homeChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.homeChipFlag}>{countryToFlag(homeCountryVisit.country)}</Text>
                <Text style={[styles.homeChipName, { color: colors.foreground }]} numberOfLines={1}>
                  {homeCountryVisit.country}
                </Text>
                <Text style={[styles.homeChipMeta, { color: colors.mutedForeground }]}>
                  · home · {homeCountryVisit.photoCount}
                </Text>
                <Text style={[styles.homeChipNote, { color: colors.mutedForeground }]}>not counted</Text>
              </View>
            )}
          </View>
        }
      />

      {/* Floating add-photos button */}
      <TouchableOpacity
        onPress={handleAddPhotos}
        activeOpacity={0.85}
        style={[styles.fab, { bottom: insets.bottom + 84 }]}
      >
        <Ionicons name="add" size={30} color="#0F172A" />
      </TouchableOpacity>

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
  refreshBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  // Page header
  pageHeaderWrap: { paddingBottom: 6 },
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  pageTitle: { fontSize: 34, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  pageStats: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 7 },

  // Home chip
  homeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  homeChipFlag: { fontSize: 16 },
  homeChipName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  homeChipMeta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  homeChipNote: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: "auto", opacity: 0.8 },

  // Year header
  yearHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 12,
  },
  yearText: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.5, lineHeight: 34 },
  yearMetaText: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 4 },

  // Trip card
  tripCard: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  tripCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  tripFlag: { fontSize: 22, lineHeight: 28 },
  tripTitleWrap: { flex: 1 },
  tripCity: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  tripMeta: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  countPillText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  photoStrip: { paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  thumb: { width: 84, height: 84, borderRadius: 12 },

  // Floating add button
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
