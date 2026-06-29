import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import TabTip from "@/components/TabTip";
import { useBucketList } from "@/context/BucketListContext";
import { useTravel } from "@/context/TravelContext";
import { WORLD_COUNTRIES } from "@/data/worldCountries";

type ListItem =
  | { kind: "header"; label: string }
  | { kind: "empty"; message: string }
  | { kind: "country"; name: string };

export default function BucketTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bucketList, addToBucket, removeFromBucket, isInBucket } = useBucketList();
  const { visitedCountryNames } = useTravel();

  const [query, setQuery] = useState("");
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const visitedSet = useMemo(() => new Set(visitedCountryNames), [visitedCountryNames]);

  // Build the flat list items
  const listData: ListItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (q.length > 0) {
      // Search mode – show matching world countries
      const matches = WORLD_COUNTRIES.filter((c) => c.toLowerCase().includes(q));
      if (matches.length === 0) {
        return [{ kind: "empty", message: "No countries found" }];
      }
      return matches.map((name) => ({ kind: "country", name }));
    }

    // Browse mode – show bucket list
    if (bucketList.length === 0) {
      return [
        {
          kind: "empty",
          message: "Search for a country above to add it to your bucket list.",
        },
      ];
    }
    const items: ListItem[] = [{ kind: "header", label: "YOUR BUCKET LIST" }];
    for (const name of bucketList) {
      items.push({ kind: "country", name });
    }
    return items;
  }, [query, bucketList]);

  function renderItem({ item }: { item: ListItem }) {
    if (item.kind === "header") {
      return (
        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionHeaderText, { color: colors.mutedForeground }]}>
            {item.label}
          </Text>
        </View>
      );
    }
    if (item.kind === "empty") {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="bookmark-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {item.message}
          </Text>
        </View>
      );
    }

    // Country row
    const inBucket = isInBucket(item.name);
    const alreadyVisited = visitedSet.has(item.name);

    return (
      <View style={[styles.countryRow, { borderBottomColor: colors.border }]}>
        <View style={styles.countryInfo}>
          <Text style={[styles.countryName, { color: colors.foreground }]}>
            {item.name}
          </Text>
          {alreadyVisited && (
            <View style={[styles.visitedPill, { backgroundColor: colors.accent + "22" }]}>
              <Ionicons name="checkmark-circle" size={11} color={colors.accent} />
              <Text style={[styles.visitedPillText, { color: colors.accent }]}>
                Visited
              </Text>
            </View>
          )}
        </View>

        {inBucket ? (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              removeFromBucket(item.name);
            }}
            style={[styles.removeBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Ionicons name="bookmark" size={15} color={colors.primary} />
            <Text style={[styles.removeBtnText, { color: colors.primary }]}>Saved</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              addToBucket(item.name);
            }}
            style={[styles.addBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}
          >
            <Ionicons name="bookmark-outline" size={15} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary }]}>Save</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Bucket List</Text>
          {bucketList.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.countBadgeText, { color: colors.primaryForeground }]}>
                {bucketList.length}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Countries you want to visit
        </Text>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search any country…"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && Platform.OS !== "ios" && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Legend */}
      <View style={[styles.legendRow, { borderBottomColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#38BDF8" }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Want to go</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Visited</Text>
        </View>
        <Text style={[styles.legendNote, { color: colors.mutedForeground }]}>
          · shown on world map
        </Text>
      </View>

      <TabTip
        id="bucket"
        icon="flag-outline"
        title="Plan where to go next"
        text="Search any country and tap it to add it to your bucket list. Your picks show up on the world map so you can see what's left to explore."
      />

      <FlatList
        data={listData}
        keyExtractor={(item, i) =>
          item.kind === "country" ? item.name : `${item.kind}-${i}`
        }
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  countBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 26,
    alignItems: "center",
  },
  countBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2, marginBottom: 14 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },

  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  legendNote: { fontSize: 12, fontFamily: "Inter_400Regular" },

  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  countryInfo: { flex: 1, gap: 4 },
  countryName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  visitedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  visitedPillText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  removeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
});
