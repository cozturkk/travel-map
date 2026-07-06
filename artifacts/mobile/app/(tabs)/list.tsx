import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
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
import ScanProgress from "@/components/ScanProgress";

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
  ids,
  initialIndex,
  onClose,
}: {
  ids: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const { width, height } = Dimensions.get("window");
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Drag up or down to dismiss, like the iOS Photos app. The horizontal
  // FlatList keeps swipe-between-photos; we only claim clearly vertical drags.
  const translateY = React.useRef(new Animated.Value(0)).current;
  const isVerticalDrag = (_: unknown, g: { dy: number; dx: number }) =>
    Math.abs(g.dy) > 14 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5;
  const panResponder = React.useRef(
    PanResponder.create({
      // Claim in the CAPTURE phase too: the horizontal FlatList otherwise
      // grabs every touch on device and the swipe-to-dismiss never fires.
      onMoveShouldSetPanResponder: isVerticalDrag,
      onMoveShouldSetPanResponderCapture: isVerticalDrag,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => translateY.setValue(g.dy),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dy) > 110 || Math.abs(g.vy) > 0.8) {
          Animated.timing(translateY, {
            toValue: g.dy >= 0 ? height : -height,
            duration: 180,
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;
  const bgOpacity = translateY.interpolate({
    inputRange: [-280, 0, 280],
    outputRange: [0.3, 1, 0.3],
    extrapolate: "clamp",
  });

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: bgOpacity }]}
      />
      <Animated.View
        style={{ flex: 1, transform: [{ translateY }] }}
        {...panResponder.panHandlers}
      >
        <View style={pvStyles.bar}>
          <TouchableOpacity onPress={onClose} hitSlop={16} style={pvStyles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={pvStyles.counter}>{currentIndex + 1} / {ids.length}</Text>
          <View style={{ width: 48 }} />
        </View>
        <FlatList
          data={ids}
          keyExtractor={(id) => id}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={(e) => {
            setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          }}
          renderItem={({ item }) => (
            // ph:// resolves through PhotoKit; for the full-size view a
            // network fetch from iCloud is acceptable (user asked for it).
            <ExpoImage
              source={{ uri: `ph://${item}` }}
              style={{ width, height: height - 140 }}
              contentFit="contain"
              transition={120}
            />
          )}
        />
      </Animated.View>
    </Modal>
  );
}

const pvStyles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16 },
  closeBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  counter: { color: "#fff", fontSize: 15, fontFamily: "Inter_500Medium" },
});

// ─── Photo Strip ─────────────────────────────────────────────────────────────

// A single thumbnail rendered straight from the asset id (ph://<id>).
// expo-image resolves ph:// through PhotoKit and serves the on-device
// preview even when the original lives in iCloud ("Optimize iPhone Storage"),
// so no full-resolution download is ever triggered for a 84px tile.
//
// Error path (rare, mostly deleted assets): one cheap getAssetInfoAsync
// WITHOUT shouldDownloadFromNetwork; if the asset is gone, report it dead
// (lazy deletion) and render nothing. No placeholder tiles.
function Thumb({ id, idx, onPress, onLongPress, onDead }: { id: string; idx: number; onPress: (i: number) => void; onLongPress?: () => void; onDead?: (id: string) => void }) {
  const [src, setSrc] = useState(`ph://${id}`);
  const [failed, setFailed] = useState(false);
  const triedRef = React.useRef(false);
  useEffect(() => { setSrc(`ph://${id}`); setFailed(false); triedRef.current = false; }, [id]);
  const handleError = useCallback(() => {
    if (!triedRef.current && MediaLibrary) {
      triedRef.current = true;
      MediaLibrary.getAssetInfoAsync(id)
        .then((info: any) => {
          const fresh = info && (info.localUri ?? info.uri);
          if (fresh && fresh !== src) { setSrc(fresh); setFailed(false); }
          else { setFailed(true); onDead?.(id); }
        })
        .catch(() => { setFailed(true); onDead?.(id); });
    } else {
      setFailed(true);
    }
  }, [id, src, onDead]);
  if (failed) return null;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(idx); }}
      onLongPress={onLongPress}
      delayLongPress={350}
    >
      <ExpoImage
        source={{ uri: src }}
        style={styles.thumb}
        contentFit="cover"
        transition={100}
        onError={handleError}
      />
    </TouchableOpacity>
  );
}

function PhotoStrip({
  ids,
  onPress,
  onRemove,
  onDead,
}: {
  ids: string[];
  onPress: (i: number) => void;
  onRemove?: (id: string) => void;
  onDead?: (id: string) => void;
}) {
  if (ids.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
      {ids.map((id, idx) => (
        <Thumb
          key={id}
          id={id}
          idx={idx}
          onPress={onPress}
          onLongPress={onRemove ? () => onRemove(id) : undefined}
          onDead={onDead}
        />
      ))}
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
  onDeadPhoto,
}: {
  item: ChronoEntry;
  onPhotoPress: (ids: string[], index: number) => void;
  onRemovePhoto?: (id: string) => void;
  onDeadPhoto?: (id: string) => void;
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
        ids={item.photoIds ?? []}
        onPress={(idx) => onPhotoPress(item.photoIds ?? [], idx)}
        onRemove={onRemovePhoto}
        onDead={onDeadPhoto}
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
  const { permissionGranted, isLoading, progress, countries, photos, refresh, addMorePhotos, excludePhoto, reportDeadAsset } = useTravel();
  const { homeCity } = useHomeCity();

  const [viewerState, setViewerState] = useState<{ ids: string[]; index: number } | null>(null);
  const openViewer = useCallback((ids: string[], index: number) => {
    setViewerState({ ids, index });
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

  // Only the home CITY is pinned out of the timeline; every other city in the
  // same country still counts as a trip.
  const homeCityVisit = useMemo(() => {
    if (!homeCity) return null;
    const country = countries.find((c) => c.country === homeCity.country);
    return country?.cities.find((ci) => ci.city === homeCity.city) ?? null;
  }, [countries, homeCity]);

  const tripPhotos = useMemo(() => {
    if (!homeCity) return photos;
    return photos.filter(
      (p) => !(p.country === homeCity.country && p.city === homeCity.city)
    );
  }, [photos, homeCity]);

  // Flatten all cities (minus home) and sort chronologically (newest first)
  const chronoEntries = useMemo<ChronoEntry[]>(() => {
    return countries
      .flatMap((c) => c.cities.map((ci) => ({ ...ci, country: c.country })))
      .filter(
        (e) => !(homeCity && e.country === homeCity.country && e.city === homeCity.city)
      )
      .sort((a, b) => b.lastDate - a.lastDate);
  }, [countries, homeCity]);

  const nTripCountries = useMemo(
    () => new Set(chronoEntries.map((e) => e.country)).size,
    [chronoEntries]
  );

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
        <Text style={[styles.loadingText, { color: colors.foreground }]}>
          Building your travel map
        </Text>
        <ScanProgress
          current={progress.current}
          total={progress.total}
          countriesFound={progress.countriesFound}
        />
        {progress.total === 0 && (
          <ActivityIndicator size="small" color={colors.primary} />
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
          <TripCard
            item={item}
            onPhotoPress={openViewer}
            onRemovePhoto={handleRemovePhoto}
            onDeadPhoto={reportDeadAsset}
          />
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
                {nTripCountries} {nTripCountries === 1 ? "country" : "countries"} · {tripPhotos.length} photos
              </Text>
            </View>

            {/* Compact home-city chip */}
            {homeCity && (
              <View style={[styles.homeChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.homeChipFlag}>{countryToFlag(homeCity.country)}</Text>
                <Text style={[styles.homeChipName, { color: colors.foreground }]} numberOfLines={1}>
                  {homeCity.city}
                </Text>
                <Text style={[styles.homeChipMeta, { color: colors.mutedForeground }]}>
                  · home{homeCityVisit ? ` · ${homeCityVisit.photoCount}` : ""}
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
          ids={viewerState.ids}
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
