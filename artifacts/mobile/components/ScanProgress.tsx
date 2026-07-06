import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

// The wait-softener for photo scans: a little plane flying along a dashed
// route above a big live counter ("1,300 / 20,000") and the running country
// tally. Used on the Map first-run overlay and the Trips loading screen.
export default function ScanProgress({
  current,
  total,
  countriesFound,
  label,
}: {
  current: number;
  total: number;
  countriesFound: number;
  label?: string;
}) {
  const colors = useColors();
  const fly = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(fly, {
        toValue: 1,
        duration: 2400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [fly]);

  const TRACK_W = 190;
  const translateX = fly.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, TRACK_W - 16],
  });
  const translateY = fly.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -7, 0],
  });
  const opacity = fly.interpolate({
    inputRange: [0, 0.08, 0.92, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View style={styles.wrap}>
      <View style={[styles.track, { width: TRACK_W }]}>
        <View style={[styles.route, { borderColor: colors.border }]} />
        <Animated.View
          style={[styles.plane, { transform: [{ translateX }, { translateY }], opacity }]}
        >
          <Ionicons name="airplane" size={20} color={colors.accent} />
        </Animated.View>
      </View>
      {total > 0 && (
        <Text style={[styles.count, { color: colors.foreground }]}>
          {current.toLocaleString()}
          <Text style={[styles.countTotal, { color: colors.mutedForeground }]}>
            {" / "}{total.toLocaleString()}{label ? ` ${label}` : " photos"}
          </Text>
        </Text>
      )}
      {countriesFound > 0 && (
        <Text style={[styles.countries, { color: colors.accent }]}>
          {countriesFound} {countriesFound === 1 ? "country" : "countries"} found so far
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 4 },
  track: { height: 26, justifyContent: "center" },
  route: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 16,
    borderBottomWidth: 1.5,
    borderStyle: "dashed",
    opacity: 0.8,
  },
  plane: { position: "absolute", left: 0 },
  count: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  countTotal: { fontSize: 14, fontFamily: "Inter_500Medium" },
  countries: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
