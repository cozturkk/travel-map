import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTravel } from "@/context/TravelContext";

export default function PermissionGate() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { requestPermission } = useTravel();

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topPad },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="images" size={42} color={colors.accent} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>
        Access Your Photos
      </Text>
      <Text style={[styles.description, { color: colors.mutedForeground }]}>
        Travel Map reads GPS metadata from your photos to automatically build
        your personal travel history. No photos leave your device.
      </Text>
      <Text style={[styles.tierNote, { color: colors.mutedForeground }]}>
        Choose “Allow Full Access” so every trip is found automatically.
        A big library takes a few minutes the first time; you can keep using
        the app and you'll get a notice when it's done.
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          requestPermission();
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="lock-open-outline" size={18} color={colors.primaryForeground} />
        <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
          Allow Photo Access
        </Text>
      </TouchableOpacity>
      <Text style={[styles.disclaimer, { color: colors.border }]}>
        Only GPS coordinates are processed · Photos stay on device
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 16,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
  tierNote: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 19,
    opacity: 0.9,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
});
