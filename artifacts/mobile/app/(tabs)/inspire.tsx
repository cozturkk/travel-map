import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
} from "react-native-reanimated";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTravel } from "@/context/TravelContext";
import {
  Destination,
  DistancePref,
  TravelStyle,
  getRecommendations,
  haversineKm,
} from "@/data/destinations";
import { useState } from "react";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const STYLE_OPTIONS: { id: TravelStyle; label: string; icon: string }[] = [
  { id: "beach", label: "Beach", icon: "sunny" },
  { id: "adventure", label: "Adventure", icon: "trending-up" },
  { id: "culture", label: "Culture", icon: "library" },
  { id: "ski", label: "Ski", icon: "snow" },
  { id: "city", label: "City", icon: "business" },
  { id: "nature", label: "Nature", icon: "leaf" },
  { id: "food", label: "Food", icon: "restaurant" },
];

const DISTANCE_OPTIONS: { id: DistancePref; label: string; sublabel: string }[] = [
  { id: "short", label: "Short haul", sublabel: "1–2 hr flight" },
  { id: "medium", label: "Medium haul", sublabel: "3–4 hr flight" },
  { id: "long", label: "Long haul", sublabel: "4+ hr flight" },
  { id: "any", label: "Any", sublabel: "Surprise me" },
];

interface DepartureCity {
  name: string;
  lat: number;
  lon: number;
}

const DEPARTURE_CITIES: DepartureCity[] = [
  { name: "Abu Dhabi", lat: 24.47, lon: 54.37 },
  { name: "Addis Ababa", lat: 9.03, lon: 38.74 },
  { name: "Amsterdam", lat: 52.37, lon: 4.90 },
  { name: "Athens", lat: 37.98, lon: 23.73 },
  { name: "Atlanta", lat: 33.75, lon: -84.39 },
  { name: "Auckland", lat: -36.87, lon: 174.77 },
  { name: "Bali", lat: -8.34, lon: 115.09 },
  { name: "Bangkok", lat: 13.76, lon: 100.50 },
  { name: "Barcelona", lat: 41.39, lon: 2.17 },
  { name: "Beijing", lat: 39.91, lon: 116.39 },
  { name: "Berlin", lat: 52.52, lon: 13.40 },
  { name: "Bogotá", lat: 4.71, lon: -74.07 },
  { name: "Brussels", lat: 50.85, lon: 4.35 },
  { name: "Buenos Aires", lat: -34.60, lon: -58.38 },
  { name: "Cairo", lat: 30.06, lon: 31.25 },
  { name: "Cape Town", lat: -33.93, lon: 18.42 },
  { name: "Casablanca", lat: 33.59, lon: -7.62 },
  { name: "Chicago", lat: 41.88, lon: -87.63 },
  { name: "Copenhagen", lat: 55.68, lon: 12.57 },
  { name: "Dallas", lat: 32.78, lon: -96.80 },
  { name: "Delhi", lat: 28.71, lon: 77.10 },
  { name: "Doha", lat: 25.29, lon: 51.53 },
  { name: "Dubai", lat: 25.20, lon: 55.27 },
  { name: "Dublin", lat: 53.33, lon: -6.25 },
  { name: "Frankfurt", lat: 50.11, lon: 8.68 },
  { name: "Geneva", lat: 46.20, lon: 6.15 },
  { name: "Hong Kong", lat: 22.32, lon: 114.17 },
  { name: "Houston", lat: 29.76, lon: -95.37 },
  { name: "Istanbul", lat: 41.01, lon: 28.95 },
  { name: "Jakarta", lat: -6.21, lon: 106.85 },
  { name: "Johannesburg", lat: -26.20, lon: 28.04 },
  { name: "Kuala Lumpur", lat: 3.14, lon: 101.69 },
  { name: "Lagos", lat: 6.52, lon: 3.38 },
  { name: "Lima", lat: -12.05, lon: -77.04 },
  { name: "Lisbon", lat: 38.72, lon: -9.14 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "Los Angeles", lat: 34.05, lon: -118.24 },
  { name: "Madrid", lat: 40.42, lon: -3.70 },
  { name: "Melbourne", lat: -37.81, lon: 144.96 },
  { name: "Mexico City", lat: 19.43, lon: -99.13 },
  { name: "Miami", lat: 25.77, lon: -80.19 },
  { name: "Milan", lat: 45.46, lon: 9.19 },
  { name: "Montréal", lat: 45.51, lon: -73.55 },
  { name: "Moscow", lat: 55.75, lon: 37.62 },
  { name: "Mumbai", lat: 19.08, lon: 72.88 },
  { name: "Munich", lat: 48.14, lon: 11.58 },
  { name: "Nairobi", lat: -1.29, lon: 36.82 },
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "Oslo", lat: 59.91, lon: 10.75 },
  { name: "Osaka", lat: 34.69, lon: 135.50 },
  { name: "Paris", lat: 48.86, lon: 2.35 },
  { name: "Prague", lat: 50.07, lon: 14.43 },
  { name: "Rome", lat: 41.90, lon: 12.49 },
  { name: "Santiago", lat: -33.46, lon: -70.65 },
  { name: "São Paulo", lat: -23.55, lon: -46.63 },
  { name: "Seoul", lat: 37.57, lon: 126.98 },
  { name: "Shanghai", lat: 31.23, lon: 121.47 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
  { name: "Stockholm", lat: 59.33, lon: 18.07 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
  { name: "Taipei", lat: 25.03, lon: 121.56 },
  { name: "Tel Aviv", lat: 32.09, lon: 34.78 },
  { name: "Tokyo", lat: 35.69, lon: 139.69 },
  { name: "Toronto", lat: 43.65, lon: -79.38 },
  { name: "Vancouver", lat: 49.25, lon: -123.12 },
  { name: "Vienna", lat: 48.21, lon: 16.37 },
  { name: "Warsaw", lat: 52.23, lon: 21.01 },
  { name: "Zurich", lat: 47.38, lon: 8.54 },
];

function StyleChip({
  option,
  selected,
  onPress,
}: {
  option: (typeof STYLE_OPTIONS)[0];
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.styleChip,
        {
          backgroundColor: selected ? colors.accent : colors.card,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}
    >
      <Ionicons
        name={option.icon as keyof typeof Ionicons.glyphMap}
        size={16}
        color={selected ? colors.accentForeground : colors.mutedForeground}
      />
      <Text
        style={[
          styles.styleChipText,
          {
            color: selected ? colors.accentForeground : colors.foreground,
          },
        ]}
      >
        {option.label}
      </Text>
    </Pressable>
  );
}

function DestinationCard({
  dest,
  index,
  fromKm,
}: {
  dest: Destination;
  index: number;
  fromKm?: number;
}) {
  const colors = useColors();

  function fmtDistance(km: number) {
    const hrs = Math.round(km / 800);
    if (hrs <= 1) return "~1h flight";
    return `~${hrs}h flight`;
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 120).springify()}
      style={[styles.destCard, { backgroundColor: dest.cardGradient[1] }]}
    >
      <View
        style={[
          styles.destCardAccent,
          { backgroundColor: dest.cardGradient[0] },
        ]}
      />
      <View style={styles.destCardContent}>
        <View>
          <Text style={styles.destNumber}>0{index + 1}</Text>
          <Text style={styles.destName}>{dest.name}</Text>
          <Text style={styles.destCountry}>
            {dest.country} · {dest.region}
          </Text>
        </View>
        <Text style={styles.destTagline}>{dest.tagline}</Text>

        <View style={styles.highlightsList}>
          {dest.highlights.map((h, i) => (
            <View key={i} style={styles.highlightRow}>
              <View style={[styles.highlightDot, { backgroundColor: colors.accent }]} />
              <Text style={styles.highlightText}>{h}</Text>
            </View>
          ))}
        </View>

        <View style={styles.destMeta}>
          <View style={[styles.metaTag, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.metaTagText}>
              Best:{" "}
              {dest.bestMonths
                .slice(0, 4)
                .map((m) => MONTHS[m - 1])
                .join(", ")}
              {dest.bestMonths.length > 4 ? "…" : ""}
            </Text>
          </View>
          <View style={[styles.metaTag, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <Ionicons name="airplane-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.metaTagText}>
              {fromKm != null
                ? fmtDistance(fromKm)
                : dest.distanceTag === "short" ? "1–2 hr flight" : dest.distanceTag === "medium" ? "3–4 hr flight" : "4+ hr flight"}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function InspireTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { visitedCountryNames } = useTravel();

  const [selectedStyles, setSelectedStyles] = useState<TravelStyle[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedDistance, setSelectedDistance] = useState<DistancePref>("any");
  const [selectedCityIdx, setSelectedCityIdx] = useState<number | null>(null);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [results, setResults] = useState<Destination[] | null>(null);
  const [resultDistances, setResultDistances] = useState<(number | undefined)[]>([]);
  const [loading, setLoading] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = insets.bottom + 80;

  const selectedCity = selectedCityIdx !== null ? DEPARTURE_CITIES[selectedCityIdx] : null;

  function toggleStyle(style: TravelStyle) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  }

  function generate() {
    if (selectedStyles.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setResults(null);
    setTimeout(() => {
      const startCoords: [number, number] | null = selectedCity
        ? [selectedCity.lat, selectedCity.lon]
        : null;
      const recs = getRecommendations(
        { styles: selectedStyles, month: selectedMonth, distance: selectedDistance, startCoords },
        visitedCountryNames
      );
      const distances = startCoords
        ? recs.map((d) => Math.round(haversineKm(startCoords[0], startCoords[1], d.lat, d.lon)))
        : recs.map(() => undefined);
      setResults(recs);
      setResultDistances(distances);
      setLoading(false);
    }, 800);
  }

  function reset() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setResults(null);
  }

  const canGenerate = selectedStyles.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 8,
          paddingBottom: bottomPad,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Inspire
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Find your next adventure
          </Text>
        </View>


        {!results && !loading && (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            {/* Travel style */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                What kind of trip?
              </Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                Pick one or more styles
              </Text>
              <View style={styles.chipGrid}>
                {STYLE_OPTIONS.map((opt) => (
                  <StyleChip
                    key={opt.id}
                    option={opt}
                    selected={selectedStyles.includes(opt.id)}
                    onPress={() => toggleStyle(opt.id)}
                  />
                ))}
              </View>
            </View>

            {/* Month */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                When are you traveling?
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.monthRow}
              >
                {MONTHS.map((m, i) => {
                  const monthNum = i + 1;
                  const selected = selectedMonth === monthNum;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedMonth(monthNum);
                      }}
                      style={[
                        styles.monthChip,
                        {
                          backgroundColor: selected ? colors.primary : colors.card,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthText,
                          { color: selected ? colors.primaryForeground : colors.mutedForeground },
                        ]}
                      >
                        {m}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Departure city */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Where are you flying from?
              </Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                Optional - enables precise distance filtering
              </Text>
              <TouchableOpacity
                onPress={() => setCityPickerVisible(true)}
                activeOpacity={0.7}
                style={[styles.cityDropdown, { backgroundColor: colors.card, borderColor: selectedCity ? colors.primary : colors.border }]}
              >
                <Ionicons
                  name="airplane-outline"
                  size={16}
                  color={selectedCity ? colors.primary : colors.mutedForeground}
                />
                <Text style={[styles.cityDropdownText, { color: selectedCity ? colors.foreground : colors.mutedForeground }]}>
                  {selectedCity ? selectedCity.name : "Anywhere"}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
              </TouchableOpacity>
            </View>

            {/* Distance */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                How far do you want to fly?
              </Text>
              {selectedCity && (
                <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                  Distances from {selectedCity.name}
                </Text>
              )}
              <View style={styles.distanceGrid}>
                {DISTANCE_OPTIONS.map((opt) => {
                  const selected = selectedDistance === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedDistance(opt.id);
                      }}
                      style={[
                        styles.distanceCard,
                        {
                          backgroundColor: selected ? colors.primary + "22" : colors.card,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.distanceLabel,
                          { color: selected ? colors.primary : colors.foreground },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={[
                          styles.distanceSub,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {opt.sublabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Generate button */}
            <TouchableOpacity
              onPress={generate}
              disabled={!canGenerate}
              activeOpacity={0.8}
              style={[
                styles.generateBtn,
                {
                  backgroundColor: canGenerate ? colors.accent : colors.muted,
                  marginHorizontal: 20,
                },
              ]}
            >
              <Ionicons
                name="sparkles"
                size={20}
                color={canGenerate ? colors.accentForeground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.generateBtnText,
                  {
                    color: canGenerate
                      ? colors.accentForeground
                      : colors.mutedForeground,
                  },
                ]}
              >
                Find My Next Trip
              </Text>
            </TouchableOpacity>
            {!canGenerate && (
              <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                Pick at least one travel style
              </Text>
            )}
          </Animated.View>
        )}

        {loading && (
          <Animated.View entering={FadeIn} style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Finding your perfect destinations…
            </Text>
          </Animated.View>
        )}

        {results && !loading && (
          <Animated.View entering={FadeIn}>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, { color: colors.foreground }]}>
                {results.length} {results.length === 1 ? "destination" : "destinations"} for you
              </Text>
              <Text style={[styles.resultsSub, { color: colors.mutedForeground }]}>
                {MONTHS[selectedMonth - 1]} · {selectedStyles.map((s) => STYLE_OPTIONS.find((o) => o.id === s)?.label).join(", ")}
                {selectedCity ? ` · from ${selectedCity.name}` : ""}
              </Text>
            </View>

            {results.length === 0 && (
              <View style={styles.emptyResults}>
                <Ionicons name="compass-outline" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyResultsTitle, { color: colors.foreground }]}>
                  No matches this time
                </Text>
                <Text style={[styles.emptyResultsText, { color: colors.mutedForeground }]}>
                  Try widening the distance or adding another travel style.
                </Text>
              </View>
            )}

            <View style={{ paddingHorizontal: 20, gap: 16 }}>
              {results.map((dest, i) => (
                <DestinationCard
                  key={dest.id}
                  dest={dest}
                  index={i}
                  fromKm={resultDistances[i]}
                />
              ))}
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={reset}
                style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Ionicons name="options" size={18} color={colors.foreground} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>
                  Change Filters
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={generate}
                style={[styles.actionBtn, { backgroundColor: colors.accent + "22", borderColor: colors.accent }]}
              >
                <Ionicons name="refresh" size={18} color={colors.accent} />
                <Text style={[styles.actionBtnText, { color: colors.accent }]}>
                  Shuffle
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* City picker modal */}
      <Modal
        visible={cityPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCityPickerVisible(false)}
      >
        <Pressable style={styles.cityModalOverlay} onPress={() => { setCityPickerVisible(false); setCitySearch(""); }}>
          <Pressable
            style={[styles.cityModalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}
            onPress={() => {}}
          >
            <View style={[styles.cityModalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.cityModalTitle, { color: colors.foreground }]}>Flying from</Text>
            <View style={[styles.citySearchWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.mutedForeground} />
              <TextInput
                value={citySearch}
                onChangeText={setCitySearch}
                placeholder="Search city…"
                placeholderTextColor={colors.mutedForeground}
                autoCorrect={false}
                style={[styles.citySearchInput, { color: colors.foreground }]}
              />
              {citySearch.length > 0 && (
                <TouchableOpacity onPress={() => setCitySearch("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.cityModalList} keyboardShouldPersistTaps="handled">
              {citySearch.trim().length === 0 && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCityIdx(null);
                    setCitySearch("");
                    setCityPickerVisible(false);
                  }}
                  style={[styles.cityModalRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.cityModalRowText, { color: selectedCityIdx === null ? colors.primary : colors.foreground }]}>
                    Anywhere
                  </Text>
                  {selectedCityIdx === null && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
              {DEPARTURE_CITIES.map((city, idx) => ({ city, idx }))
                .filter(({ city }) =>
                  city.name.toLowerCase().includes(citySearch.trim().toLowerCase())
                )
                .map(({ city, idx }) => (
                  <TouchableOpacity
                    key={city.name}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCityIdx(idx);
                      setCitySearch("");
                      setCityPickerVisible(false);
                    }}
                    style={[styles.cityModalRow, { borderBottomColor: colors.border }]}
                  >
                    <Text style={[styles.cityModalRowText, { color: selectedCityIdx === idx ? colors.primary : colors.foreground }]}>
                      {city.name}
                    </Text>
                    {selectedCityIdx === idx && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              {DEPARTURE_CITIES.filter((c) =>
                c.name.toLowerCase().includes(citySearch.trim().toLowerCase())
              ).length === 0 && (
                <Text style={[styles.cityModalEmpty, { color: colors.mutedForeground }]}>
                  No cities match "{citySearch.trim()}"
                </Text>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  sectionSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  styleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  styleChipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  monthRow: {
    gap: 8,
    paddingVertical: 4,
    marginTop: 12,
  },
  monthChip: {
    width: 52,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  monthText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  cityDropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  cityDropdownText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  cityModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  cityModalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    maxHeight: "70%",
  },
  cityModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  cityModalTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  cityModalList: {
    flexGrow: 0,
    maxHeight: 420,
  },
  citySearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  citySearchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  cityModalEmpty: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 28,
  },
  cityModalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cityModalRowText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  distanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  distanceCard: {
    width: "47%",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  distanceLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  distanceSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
    marginTop: 28,
  },
  generateBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  hintText: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 10,
  },
  loadingContainer: {
    paddingTop: 80,
    alignItems: "center",
    gap: 20,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  emptyResults: { alignItems: "center", paddingHorizontal: 32, paddingVertical: 28, gap: 8 },
  emptyResultsTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptyResultsText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  resultsTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  resultsSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  destCard: {
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  destCardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 4,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  destCardContent: {
    padding: 20,
    paddingLeft: 24,
    gap: 12,
  },
  destNumber: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  destName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  destCountry: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginTop: 1,
  },
  destTagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 21,
  },
  highlightsList: {
    gap: 6,
  },
  highlightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  highlightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  highlightText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    flex: 1,
    lineHeight: 19,
  },
  destMeta: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  metaTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  metaTagText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  actionBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
