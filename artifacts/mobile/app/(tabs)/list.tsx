import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { CityVisit, CountryVisit, PhotoAsset, useTravel } from "@/context/TravelContext";
import PermissionGate from "@/components/PermissionGate";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtMonth(key: string): string {
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

// ─── Travel stats computation ────────────────────────────────────────────────

/** "YYYY-MM" → number of unique countries visited that month */
function buildMonthMap(photos: PhotoAsset[]): Map<string, number> {
  const m = new Map<string, Set<string>>();
  for (const p of photos) {
    if (!p.country) continue;
    const d = new Date(p.modificationTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!m.has(key)) m.set(key, new Set());
    m.get(key)!.add(p.country);
  }
  const result = new Map<string, number>();
  for (const [k, s] of m) result.set(k, s.size);
  return result;
}

interface Streaks {
  longest: number;
  current: number;
  total: number;
}

function calcStreaks(monthMap: Map<string, number>): Streaks {
  const sorted = Array.from(monthMap.keys()).sort();
  if (!sorted.length) return { longest: 0, current: 0, total: 0 };

  // Longest consecutive run
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const [py, pm] = sorted[i - 1].split("-").map(Number);
    const [cy, cm] = sorted[i].split("-").map(Number);
    if ((cy - py) * 12 + (cm - pm) === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak – walk back from latest travel month
  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const latest = sorted[sorted.length - 1];

  let current = 0;
  if (latest === thisMonthStr || latest === prevMonthStr) {
    current = 1;
    let [cy2, cm2] = latest.split("-").map(Number);
    while (true) {
      cm2--;
      if (cm2 === 0) { cm2 = 12; cy2--; }
      const key = `${cy2}-${String(cm2).padStart(2, "0")}`;
      if (monthMap.has(key)) current++;
      else break;
    }
  }

  return { longest, current, total: monthMap.size };
}

interface YearRow {
  year: number;
  months: { key: string; count: number }[];
}

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

// ─── Sub-components ──────────────────────────────────────────────────────────

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const CELL = 20;
const GAP = 3;

function HeatmapCell({
  count,
  monthKey,
}: {
  count: number;
  monthKey: string;
}) {
  const colors = useColors();
  let bg = colors.muted;
  if (count === 1) bg = "#92400E";
  else if (count <= 3) bg = "#B45309";
  else if (count >= 4) bg = "#F59E0B";

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isFuture = monthKey > currentMonthKey;

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

function TravelStats({ photos, countries }: { photos: PhotoAsset[]; countries: CountryVisit[] }) {
  const colors = useColors();

  const monthMap = useMemo(() => buildMonthMap(photos), [photos]);
  const streaks = useMemo(() => calcStreaks(monthMap), [monthMap]);
  const heatmap = useMemo(() => buildYearGrid(monthMap), [monthMap]);

  const totalCities = countries.reduce((a, c) => a + c.cities.length, 0);

  const stats = [
    { value: countries.length, label: "Countries", icon: "globe" as const, color: colors.accent },
    { value: totalCities, label: "Cities", icon: "business" as const, color: colors.primary },
    {
      value: streaks.current,
      label: "Streak",
      icon: "flame" as const,
      color: "#F97316",
      suffix: "mo",
    },
    {
      value: streaks.longest,
      label: "Best",
      icon: "trophy" as const,
      color: "#A78BFA",
      suffix: "mo",
    },
  ];

  return (
    <View>
      {/* ── Stat cards ── */}
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name={s.icon} size={16} color={s.color} />
            <Text style={[styles.statNum, { color: colors.foreground }]}>
              {s.value}
              {s.suffix ? (
                <Text style={[styles.statSuffix, { color: colors.mutedForeground }]}>
                  {" "}{s.suffix}
                </Text>
              ) : null}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Activity heatmap ── */}
      {monthMap.size > 0 && (
        <View style={[styles.heatSection, { backgroundColor: colors.card }]}>
          <View style={styles.heatHeader}>
            <Text style={[styles.heatTitle, { color: colors.foreground }]}>Travel Activity</Text>
            <Text style={[styles.heatSub, { color: colors.mutedForeground }]}>
              {streaks.total} travel {streaks.total === 1 ? "month" : "months"}
            </Text>
          </View>

          {/* Month header row */}
          <View style={styles.heatGrid}>
            <View style={styles.yearLabel} />
            {MONTH_LABELS.map((l, i) => (
              <Text key={i} style={[styles.monthLabel, { color: colors.mutedForeground }]}>
                {l}
              </Text>
            ))}
          </View>

          {/* Year rows */}
          {heatmap.map((row) => (
            <View key={row.year} style={styles.heatGrid}>
              <Text style={[styles.yearLabel, { color: colors.mutedForeground }]}>
                {row.year}
              </Text>
              {row.months.map((cell) => (
                <HeatmapCell key={cell.key} count={cell.count} monthKey={cell.key} />
              ))}
            </View>
          ))}

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>Less</Text>
            {["#334155", "#92400E", "#B45309", "#F59E0B"].map((c) => (
              <View key={c} style={[styles.legendDot, { backgroundColor: c }]} />
            ))}
            <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>More</Text>
          </View>

          {/* Streak callout */}
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
                  {fmtMonth(getStreakPeriod(monthMap).start)} – {fmtMonth(getStreakPeriod(monthMap).end)}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/** Find the start/end of the longest streak for the callout label */
function getStreakPeriod(monthMap: Map<string, number>): { start: string; end: string } {
  const sorted = Array.from(monthMap.keys()).sort();
  if (!sorted.length) return { start: "", end: "" };

  let best = { start: sorted[0], end: sorted[0], len: 1 };
  let runStart = sorted[0];
  let run = 1;

  for (let i = 1; i < sorted.length; i++) {
    const [py, pm] = sorted[i - 1].split("-").map(Number);
    const [cy, cm] = sorted[i].split("-").map(Number);
    if ((cy - py) * 12 + (cm - pm) === 1) {
      run++;
      if (run > best.len) best = { start: runStart, end: sorted[i], len: run };
    } else {
      runStart = sorted[i];
      run = 1;
    }
  }
  return { start: best.start, end: best.end };
}

function CityItem({ city }: { city: CityVisit }) {
  const colors = useColors();
  return (
    <View style={[styles.cityRow, { borderBottomColor: colors.border }]}>
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

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ListTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { permissionGranted, isLoading, progress, countries, photos, refresh } = useTravel();

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  if (permissionGranted === false) return <PermissionGate />;

  const sections = countries.map((c) => ({ country: c, data: c.cities, key: c.country }));

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
        renderItem={({ item }) => <CityItem city={item} />}
        renderSectionHeader={({ section }) => <CountrySectionHeader country={section.country} />}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: insets.bottom + 80 }}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <View style={[styles.listHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.listTitle, { color: colors.foreground }]}>Travel History</Text>
            </View>
            <View style={styles.statsContainer}>
              <TravelStats photos={photos} countries={countries} />
            </View>
            <View style={[styles.historyHeading, { borderBottomColor: colors.border }]}>
              <Text style={[styles.historyTitle, { color: colors.mutedForeground }]}>
                BY COUNTRY
              </Text>
            </View>
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  loadingSubtext: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyContainer: {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: 12, paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  refreshBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  refreshBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  listHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 0,
  },
  listTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },

  statsContainer: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 10,
    alignItems: "center", gap: 4,
  },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 26 },
  statSuffix: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },

  // Heatmap
  heatSection: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  heatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  heatTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  heatSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  heatGrid: {
    flexDirection: "row",
    alignItems: "center",
    gap: GAP,
  },
  yearLabel: {
    width: 36,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    paddingRight: 4,
  },
  monthLabel: {
    width: CELL,
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    letterSpacing: 0,
  },
  heatCell: {
    width: CELL,
    height: CELL,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingLeft: 36 + GAP,
  },
  legendLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  legendDot: { width: 10, height: 10, borderRadius: 2 },

  // Streak callout
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  streakFire: { fontSize: 28 },
  streakTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  streakSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },

  historyHeading: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginTop: 4,
  },
  historyTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },

  sectionHeader: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  sectionHeaderContent: { flex: 1 },
  countryName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  countryMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  countryStats: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginTop: 2,
  },
  countryStatText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statDot: { fontSize: 12 },

  cityRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 12,
    gap: 10, borderBottomWidth: 1, marginHorizontal: 16,
  },
  cityInfo: { flex: 1 },
  cityName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  cityDates: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  photoBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  photoCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
