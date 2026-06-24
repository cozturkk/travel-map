import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

// Works in both react-native-webview (native) and iframe (web)
const buildMapHTML = () => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body,html,#map{height:100%;width:100%;background:#0F172A}
    .leaflet-container{background:#0F172A!important}
    #loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#94A3B8;font-family:sans-serif;font-size:14px;z-index:999;pointer-events:none}
  </style>
</head>
<body>
<div id="loading">Loading map…</div>
<div id="map"></div>
<script>
var visited={};
var geojsonLayer=null;

function sendUp(msg){
  try{
    if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(msg);}
    else{window.parent.postMessage(msg,'*');}
  }catch(e){}
}

var map=L.map('map',{zoomControl:false,attributionControl:false,minZoom:1,maxZoom:12}).setView([20,10],2);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20}).addTo(map);

function getStyle(f){
  var name=f.properties.ADMIN||f.properties.name||'';
  var iso=f.properties.ISO_A2||'';
  var v=visited[name]||visited[iso];
  return{fillColor:v?'#F59E0B':'#334155',weight:0.5,opacity:0.7,color:v?'#D97706':'#475569',fillOpacity:v?0.65:0.3};
}

function applyVisited(){if(geojsonLayer)geojsonLayer.setStyle(getStyle);}

fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson')
  .then(function(r){return r.json();})
  .then(function(data){
    geojsonLayer=L.geoJSON(data,{
      style:getStyle,
      onEachFeature:function(f,layer){
        layer.on('click',function(){
          var name=f.properties.ADMIN||f.properties.name||'';
          if(visited[name]){sendUp(JSON.stringify({type:'countryTap',country:name}));}
        });
      }
    }).addTo(map);
    document.getElementById('loading').style.display='none';
    applyVisited();
    sendUp(JSON.stringify({type:'mapReady'}));
  })
  .catch(function(e){
    document.getElementById('loading').textContent='Map unavailable – check connection';
    sendUp(JSON.stringify({type:'mapError',error:String(e)}));
  });

function handleMsg(e){
  try{
    var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
    if(d.type==='updateCountries'){
      visited={};
      d.countries.forEach(function(c){visited[c]=true;});
      applyVisited();
    } else if(d.type==='zoomCountry'&&geojsonLayer){
      geojsonLayer.eachLayer(function(layer){
        var name=layer.feature&&(layer.feature.properties.ADMIN||layer.feature.properties.name||'');
        if(name===d.country&&layer.getBounds)map.fitBounds(layer.getBounds(),{padding:[30,30]});
      });
    }
  }catch(err){}
}

document.addEventListener('message',handleMsg);
window.addEventListener('message',handleMsg);
</script>
</body>
</html>`;

const MAP_HTML = buildMapHTML();

// Web-only iframe component using createElement to bypass TS restrictions
const WebIframe = React.memo(function WebIframe({
  srcDoc,
  iframeRef,
}: {
  srcDoc: string;
  iframeRef: React.MutableRefObject<any>;
}) {
  return React.createElement("iframe", {
    ref: iframeRef,
    srcDoc,
    style: {
      width: "100%",
      height: "100%",
      border: "none",
      display: "block",
      background: "#0F172A",
    },
    allow: "geolocation",
  }) as any;
});

export default function MapTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { permissionGranted, isLoading, progress, countries, visitedCountryNames } =
    useTravel();

  // Separate refs for native and web
  const webviewRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryVisit | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  // Send a message to the Leaflet map (works for both iframe and WebView)
  const sendToMap = useCallback(
    (data: object) => {
      const json = JSON.stringify(data);
      if (isWeb) {
        try {
          iframeRef.current?.contentWindow?.postMessage(json, "*");
        } catch {}
      } else {
        const escaped = JSON.stringify(json);
        webviewRef.current?.injectJavaScript(
          `(function(){handleMsg({data:${escaped}});})();true;`
        );
      }
    },
    [isWeb]
  );

  // Push visited countries whenever map is ready or country list changes
  useEffect(() => {
    if (!mapReady || visitedCountryNames.length === 0) return;
    const t = setTimeout(
      () => sendToMap({ type: "updateCountries", countries: visitedCountryNames }),
      200
    );
    return () => clearTimeout(t);
  }, [mapReady, visitedCountryNames, sendToMap]);

  // Listen for messages from the iframe (web only)
  useEffect(() => {
    if (!isWeb) return;
    const handler = (e: MessageEvent) => {
      if (!e.data) return;
      try {
        const msg = JSON.parse(e.data);
        handleMapMessage(msg);
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isWeb, countries]);

  function handleMapMessage(msg: { type: string; country?: string; error?: string }) {
    if (msg.type === "mapReady") {
      setMapReady(true);
    } else if (msg.type === "mapError") {
      setMapError(true);
    } else if (msg.type === "countryTap" && msg.country) {
      const match = countries.find((c) => c.country === msg.country);
      if (match) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedCountry(match);
        setModalVisible(true);
      }
    }
  }

  // Handle messages from native WebView
  function handleWebViewMessage(event: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      handleMapMessage(msg);
    } catch {}
  }

  function zoomToCountry(countryName: string) {
    sendToMap({ type: "zoomCountry", country: countryName });
  }

  if (permissionGranted === false) {
    return <PermissionGate />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map area */}
      <View style={styles.mapContainer}>
        {isWeb ? (
          <WebIframe srcDoc={MAP_HTML} iframeRef={iframeRef} />
        ) : (
          <WebView
            ref={webviewRef}
            originWhitelist={["*"]}
            source={{ html: MAP_HTML, baseUrl: "https://www.google.com" }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            allowsLinkOpening={false}
            onMessage={handleWebViewMessage}
            onError={() => setMapError(true)}
            renderError={() => (
              <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
                <Ionicons name="warning-outline" size={32} color={colors.mutedForeground} />
                <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                  Map failed to load
                </Text>
              </View>
            )}
          />
        )}
      </View>

      {/* Badge overlay */}
      <View style={[styles.badge, { top: topPad + 12, backgroundColor: colors.card }]}>
        {isLoading ? (
          <View style={styles.badgeInner}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
              {progress.stage}{" "}
              {progress.total > 0 ? `${progress.current}/${progress.total}` : ""}
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

      {/* Map loading overlay */}
      {!mapReady && !mapError && (
        <View style={styles.mapLoadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        </View>
      )}

      {/* Country detail modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
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
                  <View style={{ flex: 1 }}>
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
                  <View
                    key={city.key}
                    style={[styles.cityRow, { borderTopColor: colors.border }]}
                  >
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
  mapContainer: { flex: 1 },
  webview: { flex: 1 },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 15,
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
  badgeInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  badgeCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  badgeText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  badgeLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  mapLoadingOverlay: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
    opacity: 0.6,
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
  modalCountry: { fontSize: 24, fontFamily: "Inter_700Bold" },
  modalDates: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  statNum: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  cityName: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  cityDates: { fontSize: 12, fontFamily: "Inter_400Regular" },
  moreText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
  },
});
