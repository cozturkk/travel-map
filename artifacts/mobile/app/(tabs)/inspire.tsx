import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
} from "react-native-reanimated";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  { id: "short", label: "Short haul", sublabel: "< 3 hours" },
  { id: "medium", label: "Medium haul", sublabel: "3–6 hours" },
  { id: "long", label: "Long haul", sublabel: "6h+" },
  { id: "any", label: "Any", sublabel: "Surprise me" },
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
}: {
  dest: Destination;
  index: number;
}) {
  const colors = useColors();
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
              {dest.distanceTag === "short" ? "< 3h" : dest.distanceTag === "medium" ? "3–6h" : "6h+"}
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
  const [results, setResults] = useState<Destination[] | null>(null);
  const [loading, setLoading] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = insets.bottom + 80;

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
      const recs = getRecommendations(
        { styles: selectedStyles, month: selectedMonth, distance: selectedDistance },
        visitedCountryNames
      );
      setResults(recs);
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

            {/* Distance */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                How far do you want to fly?
              </Text>
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
                5 destinations for you
              </Text>
              <Text style={[styles.resultsSub, { color: colors.mutedForeground }]}>
                {MONTHS[selectedMonth - 1]} · {selectedStyles.map((s) => STYLE_OPTIONS.find((o) => o.id === s)?.label).join(", ")}
              </Text>
            </View>

            <View style={{ paddingHorizontal: 20, gap: 16 }}>
              {results.map((dest, i) => (
                <DestinationCard key={dest.id} dest={dest} index={i} />
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
