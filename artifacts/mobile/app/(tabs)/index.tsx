import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import { useColors } from "@/hooks/useColors";
import { CountryVisit, useTravel } from "@/context/TravelContext";
import PermissionGate from "@/components/PermissionGate";

function formatDateRange(first: number, last: number) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
  const f = new Date(first).toLocaleDateString("en-US", opts);
  const l = new Date(last).toLocaleDateString("en-US", opts);
  return f === l ? f : `${f} – ${l}`;
}

const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html, #map { height: 100%; width: 100%; background: #0F172A; }
    .leaflet-container { background: #0F172A !important; }
    .leaflet-tile-pane { opacity: 0.7; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var visited = {};
  var geojsonLayer = null;
  var map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    minZoom: 1,
    maxZoom: 12,
    worldCopyJump: false,
  }).setView([20, 10], 2);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 20,
  }).addTo(map);

  function getStyle(feature) {
    var name = feature.properties.ADMIN || feature.properties.name || '';
    var iso = feature.properties.ISO_A2 || '';
    var isVisited = visited[name] || visited[iso];
    return {
      fillColor: isVisited ? '#F59E0B' : '#334155',
      weight: 0.5,
      opacity: 0.7,
      color: isVisited ? '#D97706' : '#475569',
      fillOpacity: isVisited ? 0.65 : 0.35,
    };
  }

  fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      geojsonLayer = L.geoJSON(data, {
        style: getStyle,
        onEachFeature: function(feature, layer) {
          layer.on('click', function(e) {
            var name = feature.properties.ADMIN || feature.properties.name || '';
            var iso = feature.properties.ISO_A2 || '';
            if (visited[name] || visited[iso]) {
              var key = visited[name] ? name : iso;
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'countryTap', country: key }));
              }
            }
          });
        }
      }).addTo(map);
    })
    .catch(function(e) { console.log('Map load error:', e); });

  function handleMsg(e) {
    try {
      var d = JSON.parse(e.data);
      if (d.type === 'updateCountries') {
        visited = {};
        d.countries.forEach(function(c) { visited[c] = true; });
        if (geojsonLayer) geojsonLayer.setStyle(getStyle);
      } else if (d.type === 'zoomCountry') {
        if (!geojsonLayer) return;
        geojsonLayer.eachLayer(function(layer) {
          var name = layer.feature && (layer.feature.properties.ADMIN || layer.feature.properties.name || '');
          if (name === d.country && layer.getBounds) {
            map.fitBounds(layer.getBounds(), { padding: [30, 30] });
          }
        });
      }
    } catch(err) {}
  }
  document.addEventListener('message', handleMsg);
  window.addEventListener('message', handleMsg);
</script>
</body>
</html>
`;

export default function MapTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { permissionGranted, isLoading, progress, countries, visitedCountryNames } = useTravel();
  const webviewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryVisit | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  function sendCountriesToMap(countryNames: string[]) {
    if (!webviewRef.current) return;
    webviewRef.current.injectJavaScript(
      `(function(){ var d={type:'updateCountries',countries:${JSON.stringify(countryNames)}};handleMsg({data:JSON.stringify(d)}); })();true;`
    );
  }

  // Send countries to map whenever they change or map becomes ready
  useEffect(() => {
    if (!mapReady) return;
    if (visitedCountryNames.length === 0) return;
    const timer = setTimeout(() => sendCountriesToMap(visitedCountryNames), 300);
    return () => clearTimeout(timer);
  }, [mapReady, visitedCountryNames]);

  function handleWebViewLoad() {
    setMapReady(true);
  }

  function handleWebViewMessage(event: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "countryTap") {
        const country = countries.find(
          (c) => c.country === msg.country
        );
        if (country) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setSelectedCountry(country);
          setModalVisible(true);
        }
      }
    } catch {}
  }

  function zoomToCountry(countryName: string) {
    webviewRef.current?.injectJavaScript(
      `handleMsg({data: JSON.stringify({type:'zoomCountry', country:${JSON.stringify(countryName)}})});true;`
    );
  }

  if (permissionGranted === false) {
    return <PermissionGate />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isWeb ? (
        <View style={[styles.webFallback, { paddingTop: topPad }]}>
          <Ionicons name="map" size={48} color={colors.mutedForeground} />
          <Text style={[styles.webFallbackText, { color: colors.mutedForeground }]}>
            Interactive map available on iOS
          </Text>
        </View>
      ) : (
        <WebView
          ref={webviewRef}
          originWhitelist={["*"]}
          source={{ html: MAP_HTML }}
          style={styles.webview}
          onLoad={handleWebViewLoad}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          onLoadEnd={() => {
            if (visitedCountryNames.length > 0) {
              setTimeout(() => sendCountriesToMap(visitedCountryNames), 800);
            }
          }}
        />
      )}

      {/* Top badge */}
      <View style={[styles.badge, { top: topPad + 12, backgroundColor: colors.card }]}>
        {isLoading ? (
          <View style={styles.badgeInner}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
              {progress.stage} {progress.total > 0 ? `${progress.current}/${progress.total}` : ""}
            </Text>
          </View>
        ) : (
          <View style={styles.badgeInner}>
            <Ionicons name="globe" size={16} color={colors.accent} />
            <Text style={[styles.badgeCount, { color: colors.accent }]}>
              {countries.length}
            </Text>
            <Text style={[styles.badgeLabel, { color: colors.mutedForeground }]}>
              {countries.length === 1 ? "country" : "countries"} visited
            </Text>
          </View>
        )}
      </View>

      {/* Country Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            {selectedCountry && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalCountry, { color: colors.foreground }]}>
                      {selectedCountry.country}
                    </Text>
                    <Text style={[styles.modalDates, { color: colors.mutedForeground }]}>
                      {formatDateRange(selectedCountry.firstDate, selectedCountry.lastDate)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      zoomToCountry(selectedCountry.country);
                      setModalVisible(false);
                    }}
                    style={[styles.zoomBtn, { backgroundColor: colors.primary + "22" }]}
                  >
                    <Ionicons name="locate" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                    <Text style={[styles.statNum, { color: colors.accent }]}>
                      {selectedCountry.photoCount}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                      photos
                    </Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                    <Text style={[styles.statNum, { color: colors.primary }]}>
                      {selectedCountry.cities.length}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                      {selectedCountry.cities.length === 1 ? "city" : "cities"}
                    </Text>
                  </View>
                </View>

                {selectedCountry.cities.slice(0, 5).map((city) => (
                  <View key={city.key} style={[styles.cityRow, { borderTopColor: colors.border }]}>
                    <Ionicons name="location" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.cityName, { color: colors.foreground }]}>
                      {city.city}
                    </Text>
                    <Text style={[styles.cityDates, { color: colors.mutedForeground }]}>
                      {formatDateRange(city.firstDate, city.lastDate)}
                    </Text>
                  </View>
                ))}
                {selectedCountry.cities.length > 5 && (
                  <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
                    +{selectedCountry.cities.length - 5} more cities
                  </Text>
                )}
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  webFallbackText: {
    fontSize: 16,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  badge: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  badgeInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badgeCount: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  badgeText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  badgeLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#475569",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalCountry: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  modalDates: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  statNum: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  cityName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  cityDates: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  moreText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
  },
});
