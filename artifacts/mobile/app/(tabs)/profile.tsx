import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useHomeCity } from "@/context/HomeCityContext";
import { useTravel } from "@/context/TravelContext";

interface CityOption {
  city: string;
  country: string;
  photoCount: number;
}

function CityPickerModal({
  visible,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  options: CityOption[];
  onSelect: (opt: CityOption) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        o.city.toLowerCase().includes(q) ||
        o.country.toLowerCase().includes(q)
    );
  }, [options, query]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[pickerStyles.container, { backgroundColor: colors.background }]}>
        <View style={[pickerStyles.header, { borderBottomColor: colors.border }]}>
          <Text style={[pickerStyles.title, { color: colors.foreground }]}>
            Select Home City
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={[pickerStyles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[pickerStyles.searchInput, { color: colors.foreground }]}
            placeholder="Search city or country…"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.country}|${item.city}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={pickerStyles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSelect(item);
              }}
              style={({ pressed }) => [
                pickerStyles.cityRow,
                {
                  backgroundColor: pressed ? colors.muted : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={pickerStyles.cityRowLeft}>
                <Ionicons name="home-outline" size={18} color={colors.accent} />
                <View>
                  <Text style={[pickerStyles.cityName, { color: colors.foreground }]}>
                    {item.city}
                  </Text>
                  <Text style={[pickerStyles.cityCountry, { color: colors.mutedForeground }]}>
                    {item.country}
                  </Text>
                </View>
              </View>
              <View style={[pickerStyles.photoBadge, { backgroundColor: colors.muted }]}>
                <Ionicons name="camera-outline" size={11} color={colors.mutedForeground} />
                <Text style={[pickerStyles.photoCount, { color: colors.mutedForeground }]}>
                  {item.photoCount}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={pickerStyles.emptyState}>
              <Ionicons name="search-outline" size={32} color={colors.mutedForeground} />
              <Text style={[pickerStyles.emptyText, { color: colors.mutedForeground }]}>
                No cities match "{query}"
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

export default function ProfileTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { homeCity, setHomeCity } = useHomeCity();
  const { countries } = useTravel();
  const [pickerVisible, setPickerVisible] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const cityOptions: CityOption[] = useMemo(
    () =>
      countries.flatMap((c) =>
        c.cities.map((ci) => ({
          city: ci.city,
          country: c.country,
          photoCount: ci.photoCount,
        }))
      ),
    [countries]
  );

  async function handleSelect(opt: CityOption) {
    setPickerVisible(false);
    await setHomeCity({ country: opt.country, city: opt.city });
  }

  async function handleClear() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setHomeCity(null);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Your travel preferences
        </Text>
      </View>

      <View style={styles.content}>
        {/* Home city section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="home" size={18} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Home City</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            Photos from your home city are shown separately and excluded from trip stats.
          </Text>

          {homeCity ? (
            <View style={[styles.homeCityDisplay, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.homeCityInfo}>
                <Text style={[styles.homeCityName, { color: colors.foreground }]}>
                  {homeCity.city}
                </Text>
                <Text style={[styles.homeCityCountry, { color: colors.mutedForeground }]}>
                  {homeCity.country}
                </Text>
              </View>
              <View style={styles.homeCityActions}>
                <TouchableOpacity
                  onPress={() => setPickerVisible(true)}
                  style={[styles.actionBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}
                >
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClear}
                  style={[styles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                >
                  <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPickerVisible(true);
              }}
              style={[styles.setHomeCityBtn, { backgroundColor: colors.accent }]}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.accentForeground} />
              <Text style={[styles.setHomeCityText, { color: colors.accentForeground }]}>
                Set Home City
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Your home city photos appear pinned at the top of your Trips tab.
            Countries visited are shown in the Inspire tab to suggest new destinations.
          </Text>
        </View>
      </View>

      <CityPickerModal
        visible={pickerVisible}
        options={cityOptions}
        onSelect={handleSelect}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 40 },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cityRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  cityName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cityCountry: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  photoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  photoCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 32, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: 2 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  sectionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  homeCityDisplay: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  homeCityInfo: { gap: 2 },
  homeCityName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  homeCityCountry: { fontSize: 14, fontFamily: "Inter_400Regular" },
  homeCityActions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  setHomeCityBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  setHomeCityText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
});
