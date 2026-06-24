import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { PhotoAsset, useTravel } from "@/context/TravelContext";
import PermissionGate from "@/components/PermissionGate";
import { useState } from "react";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLS = 3;
const SPACING = 2;
const ITEM_SIZE = (SCREEN_WIDTH - SPACING * (COLS + 1)) / COLS;

function PhotoItem({ photo, onPress }: { photo: PhotoAsset; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.photoItem}>
      <Image
        source={{ uri: photo.uri }}
        style={[styles.photoImage, { width: ITEM_SIZE, height: ITEM_SIZE }]}
        contentFit="cover"
        transition={200}
      />
      {(photo.city || photo.country) && (
        <View style={styles.photoLabelOverlay}>
          <Text style={styles.photoLabel} numberOfLines={1}>
            {photo.city || photo.country}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function PhotoDetailModal({
  photo,
  visible,
  onClose,
}: {
  photo: PhotoAsset | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  if (!photo) return null;

  const date = new Date(photo.modificationTime).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const location = [photo.city, photo.region, photo.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.detailOverlay} onPress={onClose}>
        <View style={[styles.detailContainer, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          <Image
            source={{ uri: photo.uri }}
            style={styles.detailImage}
            contentFit="contain"
            transition={200}
          />
          <View style={[styles.detailInfo, { backgroundColor: colors.card }]}>
            {location ? (
              <View style={styles.detailRow}>
                <Ionicons name="location" size={16} color={colors.primary} />
                <Text style={[styles.detailLocation, { color: colors.foreground }]}>
                  {location}
                </Text>
              </View>
            ) : null}
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.detailDate, { color: colors.mutedForeground }]}>
                {date}
              </Text>
            </View>
            {photo.latitude !== 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="navigate-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.detailCoords, { color: colors.mutedForeground }]}>
                  {photo.latitude.toFixed(4)}°, {photo.longitude.toFixed(4)}°
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { top: insets.top + 16, backgroundColor: colors.card }]}
          >
            <Ionicons name="close" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function PhotosTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { permissionGranted, isLoading, progress, photos, refresh } = useTravel();
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoAsset | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  if (permissionGranted === false) {
    return <PermissionGate />;
  }

  // Sort photos by date descending
  const sortedPhotos = [...photos].sort(
    (a, b) => b.modificationTime - a.modificationTime
  );

  if (isLoading && photos.length === 0) {
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

  if (!isLoading && photos.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Ionicons name="images-outline" size={52} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No Geotagged Photos
        </Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Photos taken with location enabled will appear here.
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
      <FlatList
        data={sortedPhotos}
        keyExtractor={(item) => item.id}
        numColumns={COLS}
        renderItem={({ item }) => (
          <PhotoItem
            photo={item}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPhoto(item);
              setDetailVisible(true);
            }}
          />
        )}
        contentContainerStyle={{
          paddingTop: topPad + 8,
          paddingBottom: insets.bottom + 80,
          paddingHorizontal: SPACING,
          gap: SPACING,
        }}
        columnWrapperStyle={{ gap: SPACING }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        scrollEnabled={sortedPhotos.length > 0}
        ListHeaderComponent={
          <View style={[styles.listHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.listTitle, { color: colors.foreground }]}>
              Travel Photos
            </Text>
            <Text style={[styles.listSubtitle, { color: colors.mutedForeground }]}>
              {sortedPhotos.length} geotagged photos
            </Text>
          </View>
        }
      />

      <PhotoDetailModal
        photo={selectedPhoto}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
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
    marginHorizontal: -SPACING,
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
  photoItem: {
    position: "relative",
  },
  photoImage: {
    backgroundColor: "#1E293B",
  },
  photoLabelOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  photoLabel: {
    color: "#F1F5F9",
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
  },
  detailContainer: {
    flex: 1,
    justifyContent: "center",
  },
  detailImage: {
    flex: 1,
    marginHorizontal: 0,
  },
  detailInfo: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailLocation: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  detailDate: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  detailCoords: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
