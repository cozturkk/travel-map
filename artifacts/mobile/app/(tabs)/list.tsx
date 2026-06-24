import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { CityVisit, CountryVisit, useTravel } from "@/context/TravelContext";
import PermissionGate from "@/components/PermissionGate";

function formatDateRange(first: number, last: number) {
  const f = new Date(first);
  const l = new Date(last);
  const fMonth = f.toLocaleDateString("en-US", { month: "short" });
  const lMonth = l.toLocaleDateString("en-US", { month: "short" });
  const fYear = f.getFullYear();
  const lYear = l.getFullYear();

  if (fYear === lYear && fMonth === lMonth) {
    return `${fMonth} ${fYear}`;
  }
  if (fYear === lYear) {
    return `${fMonth} – ${lMonth} ${fYear}`;
  }
  return `${fMonth} ${fYear} – ${lMonth} ${lYear}`;
}

function CityItem({ city }: { city: CityVisit }) {
  const colors = useColors();
  return (
    <View style={[styles.cityRow, { borderBottomColor: colors.border }]}>
      <Ionicons name="location-outline" size={14} color={colors.primary} />
      <View style={styles.cityInfo}>
        <Text style={[styles.cityName, { color: colors.foreground }]}>
          {city.city}
        </Text>
        <Text style={[styles.cityDates, { color: colors.mutedForeground }]}>
          {formatDateRange(city.firstDate, city.lastDate)}
        </Text>
      </View>
      <View style={[styles.photoBadge, { backgroundColor: colors.muted }]}>
        <Ionicons name="camera" size={11} color={colors.mutedForeground} />
        <Text style={[styles.photoCount, { color: colors.mutedForeground }]}>
          {city.photoCount}
        </Text>
      </View>
    </View>
  );
}

function CountrySectionHeader({ country }: { country: CountryVisit }) {
  const colors = useColors();
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <View style={styles.sectionHeaderContent}>
        <Text style={[styles.countryName, { color: colors.foreground }]}>
          {country.country}
        </Text>
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

export default function ListTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { permissionGranted, isLoading, progress, countries, refresh } = useTravel();

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  if (permissionGranted === false) {
    return <PermissionGate />;
  }

  const sections = countries.map((c) => ({
    country: c,
    data: c.cities,
    key: c.country,
  }));

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
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No Trips Found
        </Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Photos with GPS location data will appear here as your travel history.
        </Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            refresh();
          }}
          style={[styles.refreshBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.refreshBtnText, { color: colors.primaryForeground }]}>
            Refresh
          </Text>
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
        renderSectionHeader={({ section }) => (
          <CountrySectionHeader country={section.country} />
        )}
        contentContainerStyle={{
          paddingTop: topPad + 8,
          paddingBottom: insets.bottom + 80,
        }}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={[styles.listHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.listTitle, { color: colors.foreground }]}>
              Travel History
            </Text>
            <Text style={[styles.listSubtitle, { color: colors.mutedForeground }]}>
              {countries.length} countries · {countries.reduce((acc, c) => acc + c.cities.length, 0)} cities
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  loadingSubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  refreshBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  refreshBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  listTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  listSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sectionHeaderContent: { flex: 1 },
  countryName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  countryMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  countryStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 2,
  },
  countryStatText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  statDot: {
    fontSize: 12,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    marginHorizontal: 16,
    borderRadius: 0,
  },
  cityInfo: { flex: 1 },
  cityName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  cityDates: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  photoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  photoCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
