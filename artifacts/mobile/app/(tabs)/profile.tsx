import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  FlatList,
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
import { useHomeCity } from "@/context/HomeCityContext";
import { useTravel } from "@/context/TravelContext";
import { countryToFlag } from "@/utils/countryFlags";

interface CountryOption {
  country: string;
  photoCount: number;
}

function CountryPickerModal({
  visible,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  options: CountryOption[];
  onSelect: (opt: CountryOption) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.country.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[pickerStyles.container, { backgroundColor: colors.background }]}>
        <View style={[pickerStyles.header, { borderBottomColor: colors.border }]}>
          <Text style={[pickerStyles.title, { color: colors.foreground }]}>
            Select Home Country
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={[pickerStyles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[pickerStyles.searchInput, { color: colors.foreground }]}
            placeholder="Search country…"
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
          keyExtractor={(item) => item.country}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={pickerStyles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSelect(item);
              }}
              style={({ pressed }) => [
                pickerStyles.countryRow,
                {
                  backgroundColor: pressed ? colors.muted : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={pickerStyles.countryRowLeft}>
                <Text style={pickerStyles.flag}>{countryToFlag(item.country)}</Text>
                <Text style={[pickerStyles.countryName, { color: colors.foreground }]}>
                  {item.country}
                </Text>
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
                No countries match "{query}"
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

  const countryOptions: CountryOption[] = useMemo(
    () =>
      countries
        .map((c) => ({ country: c.country, photoCount: c.photoCount }))
        .sort((a, b) => a.country.localeCompare(b.country)),
    [countries]
  );

  async function handleSelect(opt: CountryOption) {
    setPickerVisible(false);
    await setHomeCity({ country: opt.country });
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Home country section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="home" size={18} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Home Country</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            Photos from your home country are shown separately and excluded from trip stats.
          </Text>

          {homeCity ? (
            <View style={[styles.homeDisplay, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.homeInfo}>
                <Text style={styles.homeFlag}>{countryToFlag(homeCity.country)}</Text>
                <Text style={[styles.homeName, { color: colors.foreground }]}>
                  {homeCity.country}
                </Text>
              </View>
              <View style={styles.homeActions}>
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
              style={[styles.setHomeBtn, { backgroundColor: colors.accent }]}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.accentForeground} />
              <Text style={[styles.setHomeText, { color: colors.accentForeground }]}>
                Set Home Country
              </Text>
            </TouchableOpacity>
          )}
        </View>


        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Your home country photos appear pinned at the top of your Trips tab.
            Countries visited abroad are shown in the Inspire tab to suggest new destinations.
          </Text>
        </View>
      </ScrollView>

      <CountryPickerModal
        visible={pickerVisible}
        options={countryOptions}
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
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  countryRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  flag: { fontSize: 28, lineHeight: 34 },
  countryName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
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
  homeDisplay: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  homeInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  homeFlag: { fontSize: 36, lineHeight: 42 },
  homeName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  homeActions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  setHomeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  setHomeText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  accountEmail: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  authInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  syncNote: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  signOutText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  switchText: { fontSize: 14, fontFamily: "Inter_500Medium", paddingVertical: 4 },
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
