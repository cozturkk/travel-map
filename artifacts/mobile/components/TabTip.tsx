import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const KEY_PREFIX = "tabtip_dismissed_";

interface Props {
  /** Stable id for this tip, e.g. "map". Controls the dismissed flag. */
  id: string;
  title: string;
  text: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * A small, friendly "how to use this tab" card. Shows once per tab until the
 * user taps the X, after which it stays dismissed (persisted via AsyncStorage).
 */
export default function TabTip({ id, title, text, icon = "bulb-outline" }: Props) {
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const storageKey = KEY_PREFIX + id;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey).then((v) => {
      if (active && v !== "1") {
        setVisible(true);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }).start();
      }
    });
    return () => {
      active = false;
    };
  }, [storageKey, opacity]);

  function dismiss() {
    AsyncStorage.setItem(storageKey, "1").catch(() => {});
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity,
          backgroundColor: colors.accent + "1A",
          borderColor: colors.accent + "55",
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.accent + "26" }]}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.text, { color: colors.mutedForeground }]}>{text}</Text>
      </View>
      <TouchableOpacity onPress={dismiss} hitSlop={10} style={styles.close}>
        <Ionicons name="close" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 2 },
  text: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  close: { padding: 2 },
});
