import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo, useState } from "react";
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
import PermissionGate from "@/components/PermissionGate";
import { buildMonthMap, calcStreaks, getStreakPeriod } from "@/utils/travelStats";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatDateRange(first: number, last: number) {
  const f = new Date(first);
  const l = new Date(last);
  const fMonth = f.toLocaleDateString("en-US", { month: "short" });
  const lMonth = l.toLocaleDateString("en-US", { month: "short" });
  const fYear = f.getFullYear();
  const lYear = l.getFullYear();
  if (fYear === lYear && fMonth === lMonth) return `${fMonth} ${fYear}`;
  if (fYear === lYear) return `${fMonth} – ${lMonth} ${fYear}`;
  return `${fMonth} ${fYear} – ${lMonth} ${lYear}`;
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
          <Text style={pvStyles.counter}>
            {currentIndex + 1} / {uris.length}
          </Text>
          <View style={{ width: 48 }} />
        </View>

        <FlatList
          data={uris}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(idx);
          }}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={{ width, height: height - 140 }}
              resizeMode="contain"
            />
          )}
        />
      </View>
    </Modal>
  );
}

const pvStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});

// ─── Heatmap ────────────────────────────────────────────────────────────────

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const CELL = 20;
const GAP = 3;

function HeatmapCell({ count, monthKey }: { count: number; monthKey: string }) {
  const colors = useColors();
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isFuture = monthKey > currentMonthKey;
  let bg = colors.muted;
  if (!isFuture) {
    if (count === 1) bg = "#92400E";
    else if (count <= 3) bg = "#B45309";
    else if (count >= 4) bg = "#F59E0B";
  }
  return (
    <View
      style={[
        styles.heatCell,
        { backgroundColor: isFuture ? "transparent" : bg, borderRadius: 4 },
        isFuture && { borderWidth: 1, borderColor: colors.border },
      ]}
    />
  );
}

interface YearRow { year: number; months: { key: string; count: number }[] }

function buildYearGrid(monthMap: Map<string, number>): YearRow[] {
  const currentYear = new Date().getFullYear();
  const keys = Array.from(monthMap.keys()).sort();
  const firstYear = keys.length ? parseInt(keys[0].split("-")[0]) : currentYear;
  const startYear = Math.max(firstYear, currentYear - 4);
  const rows: YearRow[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const key = `${y}-${String(m).padStart(2, "0")}`;
      return { key, count: monthMap.get(key) ?? 0 };
    });
    rows.push({ year: y, months });
  }
  return rows;
}

function TravelStats({
  countries,
  photos,
}: {
  countries: CountryVisit[];
  photos: PhotoAsset[];
}) {
  const colors = useColors();

  const monthMap = useMemo(() => buildMonthMap(photos), [photos]);
  const streaks = useMemo(() => calcStreaks(monthMap), [monthMap]);
  const heatmap = useMemo(() => buildYearGrid(monthMap), [monthMap]);

  const totalCities = countries.reduce((a, c) => a + c.cities.length, 0);
  const stats = [
    { value: countries.length, label: "Countries", icon: "globe" as const, color: colors.accent },
    { value: totalCities, label: "Cities", icon: "business" as const, color: colors.primary },
    { value: streaks.current, label: "Streak", icon: "flame" as const, color: "#F97316", suffix: "mo" },
    { value: streaks.longest, label: "Best", icon: "trophy" as const, color: "#A78BFA", suffix: "mo" },
  ];

  return (
    <View>
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name={s.icon} size={16} color={s.color} />
            <Text style={[styles.statNum, { color: colors.foreground }]}>
              {s.value}
              {s.suffix && (
                <Text style={[styles.statSuffix, { color: colors.mutedForeground }]}> {s.suffix}</Text>
              )}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {monthMap.size > 0 && (
        <View style={[styles.heatSection, { backgroundColor: colors.card }]}>
          <View style={styles.heatHeader}>
            <Text style={[styles.heatTitle, { color: colors.foreground }]}>Travel Activity</Text>
            <Text style={[styles.heatSub, { color: colors.mutedForeground }]}>
              {streaks.total} travel {streaks.total === 1 ? "month" : "months"}
            </Text>
          </View>

          <View style={styles.heatGrid}>
            <View style={styles.yearLabel} />
            {MONTH_LABELS.map((l, i) => (
              <Text key={i} style={[styles.monthLabel, { color: colors.mutedForeground }]}>{l}</Text>
            ))}
          </View>

          {heatmap.map((row) => (
            <View key={row.year} style={styles.heatGrid}>
              <Text style={[styles.yearLabel, { color: colors.mutedForeground }]}>{row.year}</Text>
              {row.months.map((cell) => (
                <HeatmapCell key={cell.key} count={cell.count} monthKey={cell.key} />
              ))}
            </View>
          ))}

          <View style={styles.legend}>
            <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>Less</Text>
            {["#334155", "#92400E", "#B45309", "#F59E0B"].map((c) => (
              <View key={c} style={[styles.legendDot, { backgroundColor: c }]} />
            ))}
            <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>More</Text>
          </View>

          {streaks.current > 1 && (
            <View style={[styles.streakBadge, { backgroundColor: colors.background }]}>
              <Text style={styles.streakFire}>🔥</Text>
              <View>
                <Text style={[styles.streakTitle, { color: colors.foreground }]}>
                  {streaks.current}-month streak!
                </Text>
                <Text style={[styles.streakSub, { color: colors.mutedForeground }]}>
                  You've traveled {streaks.current} months in a row
                </Text>
              </View>
            </View>
          )}

          {streaks.current <= 1 && streaks.longest > 1 && (
            <View style={[styles.streakBadge, { backgroundColor: colors.background }]}>
              <Text style={styles.streakFire}>⚡</Text>
              <View>
                <Text style={[styles.streakTitle, { color: colors.foreground }]}>
                  Best streak: {streaks.longest} months
                </Text>
                <Text style={[styles.streakSub, { color: colors.mutedForeground }]}>
                  {fmtMonthKey(getStreakPeriod(monthMap).start)} –{" "}
                  {fmtMonthKey(getStreakPeriod(monthMap).end)}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PhotoStrip({
  uris,
  onPress,
}: {
  uris: string[];
  onPress: (index: number) => void;
}) {
  if (uris.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.photoStrip}
    >
      {uris.map((uri, idx) => (
        <TouchableOpacity
          key={idx}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress(idx);
          }}
        >
          <Image source={{ uri }} style={styles.thumb} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function CityItem({
  city,
  onPhotoPress,
}: {
  city: CityVisit;
  onPhotoPress: (uris: string[], index: number) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.cityBlock, { borderBottomColor: colors.border }]}>
      <View style={styles.cityRow}>
        <Ionicons name="location-outline" size={14} color={colors.primary} />
        <View style={styles.cityInfo}>
          <Text style={[styles.cityName, { color: colors.foreground }]}>{city.city}</Text>
          <Text style={[styles.cityDates, { color: colors.mutedForeground }]}>
            {formatDateRange(city.firstDate, city.lastDate)}
          </Text>
        </View>
        <View style={[styles.photoBadge, { backgroundColor: colors.muted }]}>
          <Ionicons name="camera" size={11} color={colors.mutedForeground} />
          <Text style={[styles.photoCount, { color: colors.mutedForeground }]}>{city.photoCount}</Text>
        </View>
      </View>
      <PhotoStrip
        uris={city.photoUris ?? []}
        onPress={(idx) => onPhotoPress(city.photoUris ?? [], idx)}
      />
    </View>
  );
}

function CountrySectionHeader({ country }: { country: CountryVisit }) {
  const colors = useColors();
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <View style={styles.sectionHeaderContent}>
        <Text style={[styles.countryName, { color: colors.foreground }]}>{country.country}</Text>
        <Text style={[styles.countryMeta, { color: colors.mutedForeground }]}>
          {formatDateRange(country.firstDate, country.lastDate)}
        </Text>
      </View>
      <View style={[styles.countryStats, { backgroundColor: colors.muted }]}>
        <Text style={[styles.countryStatText, { color: colors.accent }]}>
          {country.cities.length} {country.cities.length === 1 ? "city" : "cities"}
        </Text>
        <Text style={[styles.statDot, { color: colors.border }]}>·</Text>
        <Text style={[styles.countryStatText, { color: colors.mutedForeground }]}>
          {country.photoCount} photos
        </Text>
      </View>
    </View>
  );
}

// ─── Home City Card ───────────────────────────────────────────────────────────

function HomeCityCard({
  cityVisit,
  onPhotoPress,
}: {
  cityVisit: CityVisit;
  onPhotoPress: (uris: string[], index: number) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.homeCityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.homeCityCardHeader}>
        <View style={[styles.homeBadge, { backgroundColor: colors.accent + "22" }]}>
          <Ionicons name="home" size={13} color={colors.accent} />
          <Text style={[styles.homeBadgeText, { color: colors.accent }]}>HOME</Text>
        </View>
        <View style={styles.homeCityMeta}>
          <Text style={[styles.homeCityCardName, { color: colors.foreground }]}>
            {cityVisit.city}
          </Text>
          <Text style={[styles.homeCityCardCountry, { color: colors.mutedForeground }]}>
            {cityVisit.country} · {cityVisit.photoCount} photos
          </Text>
        </View>
      </View>
      <PhotoStrip
        uris={cityVisit.photoUris ?? []}
        onPress={(idx) => onPhotoPress(cityVisit.photoUris ?? [], idx)}
      />
      <Text style={[styles.homeCityNote, { color: colors.mutedForeground }]}>
        Not counted in trip stats
      </Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ListTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { permissionGranted, isLoading, progress, countries, photos, refresh } = useTravel();
  const { homeCity } = useHomeCity();

  const [viewerState, setViewerState] = useState<{ uris: string[]; index: number } | null>(null);

  const openViewer = useCallback((uris: string[], index: number) => {
    setViewerState({ uris, index });
  }, []);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  // Separate home city from trip countries
  const homeCityVisit = useMemo(() => {
    if (!homeCity) return null;
    const country = countries.find((c) => c.country === homeCity.country);
    return country?.cities.find((ci) => ci.city === homeCity.city) ?? null;
  }, [countries, homeCity]);

  const tripCountries = useMemo(() => {
    if (!homeCity) return countries;
    return countries
      .map((c) => {
        if (c.country !== homeCity.country) return c;
        const filteredCities = c.cities.filter((ci) => ci.city !== homeCity.city);
        if (filteredCities.length === 0) return null;
        return {
          ...c,
          cities: filteredCities,
          photoCount: filteredCities.reduce((a, ci) => a + ci.photoCount, 0),
        } as CountryVisit;
      })
      .filter((c): c is CountryVisit => c !== null);
  }, [countries, homeCity]);

  const tripPhotos = useMemo(() => {
    if (!homeCity) return photos;
    return photos.filter(
      (p) => !(p.city === homeCity.city && p.country === homeCity.country)
    );
  }, [photos, homeCity]);

  if (permissionGranted === false) return <PermissionGate />;

  const sections = tripCountries.map((c) => ({ country: c, data: c.cities, key: c.country }));

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
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); refresh(); }}
          style={[styles.refreshBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.refreshBtnText, { color: colors.primaryForeground }]}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <CityItem city={item} onPhotoPress={openViewer} />}
        renderSectionHeader={({ section }) => (
          <CountrySectionHeader country={section.country} />
        )}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: insets.bottom + 80 }}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: colors.foreground }]}>Travel History</Text>
            </View>

            {/* Home city pinned card */}
            {homeCityVisit && (
              <View style={styles.homeCitySection}>
                <HomeCityCard cityVisit={homeCityVisit} onPhotoPress={openViewer} />
              </View>
            )}

            <View style={styles.statsContainer}>
              <TravelStats countries={tripCountries} photos={tripPhotos} />
            </View>

            {sections.length > 0 && (
              <View style={[styles.historyHeading, { borderBottomColor: colors.border }]}>
                <Text style={[styles.historyTitle, { color: colors.mutedForeground }]}>BY COUNTRY</Text>
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
  refreshBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  listHeader: { paddingHorizontal: 20, paddingBottom: 14 },
  listTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },

  homeCitySection: { paddingHorizontal: 16, marginBottom: 4 },
  homeCityCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  homeCityCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  homeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  homeBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  homeCityMeta: { flex: 1 },
  homeCityCardName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  homeCityCardCountry: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  homeCityNote: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  statsContainer: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 10, alignItems: "center", gap: 4 },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 26 },
  statSuffix: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  heatSection: { borderRadius: 16, padding: 16, gap: 8 },
  heatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 },
  heatTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  heatSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  heatGrid: { flexDirection: "row", alignItems: "center", gap: GAP },
  yearLabel: { width: 36, fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", paddingRight: 4 },
  monthLabel: { width: CELL, fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center" },
  heatCell: { width: CELL, height: CELL },
  legend: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, paddingLeft: 36 + GAP },
  legendLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, padding: 12, marginTop: 4 },
  streakFire: { fontSize: 28 },
  streakTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  streakSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },

  historyHeading: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8, borderBottomWidth: 1, marginTop: 4 },
  historyTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },

  sectionHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  sectionHeaderContent: { flex: 1 },
  countryName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  countryMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  countryStats: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginTop: 2 },
  countryStatText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statDot: { fontSize: 12 },

  cityBlock: { borderBottomWidth: 1, marginHorizontal: 16 },
  cityRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingTop: 12, paddingBottom: 8, gap: 10 },
  cityInfo: { flex: 1 },
  cityName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  cityDates: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  photoBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  photoCount: { fontSize: 12, fontFamily: "Inter_500Medium" },

  photoStrip: { paddingHorizontal: 4, paddingBottom: 10, gap: 6 },
  thumb: { width: 64, height: 64, borderRadius: 8 },
});
