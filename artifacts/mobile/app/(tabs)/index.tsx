import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const MANUAL_VISITED_KEY = "manual_visited_v1";
const LABEL_ZOOM_THRESHOLD = 4;

function formatDateRange(first: number, last: number) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
  const f = new Date(first).toLocaleDateString("en-US", opts);
  const l = new Date(last).toLocaleDateString("en-US", opts);
  return f === l ? f : `${f} – ${l}`;
}

const buildMapHTML = (labelThreshold: number) => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body,html,#map{height:100%;width:100%;background:#0F172A}
    .leaflet-container{background:#0F172A!important}

    /* Country name labels */
    .country-label{
      background:transparent!important;
      border:none!important;
      box-shadow:none!important;
      color:#F1F5F9;
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      font-size:10px;
      font-weight:700;
      text-align:center;
      text-shadow:0 1px 3px rgba(0,0,0,0.9),0 0 6px rgba(0,0,0,0.6);
      white-space:nowrap;
      pointer-events:none;
      display:none;
      letter-spacing:0.04em;
      text-transform:uppercase;
    }
    .leaflet-tooltip.country-label::before{display:none!important}
    #map.show-labels .country-label{display:block}

    #loading{
      position:absolute;top:50%;left:50%;
      transform:translate(-50%,-50%);
      color:#94A3B8;font-family:sans-serif;font-size:13px;
      z-index:999;pointer-events:none;
    }
  </style>
</head>
<body>
<div id="loading">Loading map…</div>
<div id="map"></div>
<script>
var visited={};
var layersByName={};
var geojsonLayer=null;

function sendUp(msg){
  try{
    if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(msg);}
    else{window.parent.postMessage(msg,'*');}
  }catch(e){}
}

var map=L.map('map',{zoomControl:false,attributionControl:false,minZoom:1,maxZoom:12}).setView([20,10],2);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20}).addTo(map);

// Show/hide country name labels based on zoom
map.on('zoomend',function(){
  var mapEl=document.getElementById('map');
  if(map.getZoom()>=${labelThreshold}){mapEl.classList.add('show-labels');}
  else{mapEl.classList.remove('show-labels');}
});

function getStyle(f){
  var name=f.properties.ADMIN||f.properties.name||'';
  var v=visited[name];
  return{
    fillColor:v?'#F59E0B':'#334155',
    weight:0.5,opacity:0.7,
    color:v?'#D97706':'#475569',
    fillOpacity:v?0.65:0.3
  };
}

// Scratch-reveal animation: rapid amber flicker then settle
function animateReveal(layer){
  var steps=[
    {fc:'#94A3B8',fo:0.6,c:'#94A3B8'},
    {fc:'#F59E0B',fo:0.9,c:'#F59E0B'},
    {fc:'#94A3B8',fo:0.5,c:'#94A3B8'},
    {fc:'#F59E0B',fo:0.9,c:'#F59E0B'},
    {fc:'#94A3B8',fo:0.4,c:'#94A3B8'},
    {fc:'#F59E0B',fo:1.0,c:'#F59E0B'},
    {fc:'#F59E0B',fo:0.85,c:'#D97706'},
    {fc:'#F59E0B',fo:0.65,c:'#D97706'},
  ];
  var i=0;
  var t=setInterval(function(){
    if(i>=steps.length){clearInterval(t);return;}
    layer.setStyle({fillColor:steps[i].fc,fillOpacity:steps[i].fo,color:steps[i].c,weight:1.5});
    i++;
  },90);
}

function applyVisited(){if(geojsonLayer)geojsonLayer.setStyle(getStyle);}

fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson')
  .then(function(r){return r.json();})
  .then(function(data){
    geojsonLayer=L.geoJSON(data,{
      style:getStyle,
      onEachFeature:function(f,layer){
        var name=f.properties.ADMIN||f.properties.name||'';
        if(!name)return;

        // Index layer by name for quick lookup
        layersByName[name]=layer;

        // Country name tooltip (hidden until zoom threshold)
        layer.bindTooltip(name,{
          permanent:true,
          direction:'center',
          className:'country-label',
          interactive:false,
        });
        layer.closeTooltip();

        // Tap any country
        layer.on('click',function(e){
          L.DomEvent.stopPropagation(e);
          sendUp(JSON.stringify({type:'countryTap',country:name,isVisited:!!visited[name]}));
        });
      }
    }).addTo(map);

    document.getElementById('loading').style.display='none';
    applyVisited();
    sendUp(JSON.stringify({type:'mapReady'}));
  })
  .catch(function(e){
    document.getElementById('loading').textContent='Map unavailable – check connection';
    sendUp(JSON.stringify({type:'mapError'}));
  });

function handleMsg(e){
  try{
    var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
    if(d.type==='updateCountries'){
      visited={};
      d.countries.forEach(function(c){visited[c]=true;});
      applyVisited();
    } else if(d.type==='markVisited'){
      var name=d.country;
      visited[name]=true;
      var layer=layersByName[name];
      if(layer){animateReveal(layer);}
      else{applyVisited();}
    } else if(d.type==='zoomCountry'&&geojsonLayer){
      var target=layersByName[d.country];
      if(target&&target.getBounds)map.fitBounds(target.getBounds(),{padding:[30,30]});
    }
  }catch(err){}
}

document.addEventListener('message',handleMsg);
window.addEventListener('message',handleMsg);
</script>
</body>
</html>`;

const MAP_HTML = buildMapHTML(LABEL_ZOOM_THRESHOLD);

// Renders an iframe on web (react-native-webview has no web support)
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
  }) as any;
});

export default function MapTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { permissionGranted, isLoading, progress, countries, visitedCountryNames } =
    useTravel();

  const webviewRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Photo-detected visited countries + manually marked
  const [manuallyVisited, setManuallyVisited] = useState<string[]>([]);
  const allVisited = useMemo(
    () => [...new Set([...visitedCountryNames, ...manuallyVisited])],
    [visitedCountryNames, manuallyVisited]
  );

  // Modals
  const [detailCountry, setDetailCountry] = useState<CountryVisit | null>(null);
  const [detailModal, setDetailModal] = useState(false);
  const [confirmCountry, setConfirmCountry] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [manualDetailCountry, setManualDetailCountry] = useState<string | null>(null);
  const [manualDetailModal, setManualDetailModal] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  // Load manually visited from storage
  useEffect(() => {
    AsyncStorage.getItem(MANUAL_VISITED_KEY).then((v) => {
      if (v) setManuallyVisited(JSON.parse(v));
    });
  }, []);

  // Persist manual visits
  useEffect(() => {
    AsyncStorage.setItem(MANUAL_VISITED_KEY, JSON.stringify(manuallyVisited));
  }, [manuallyVisited]);

  // Send message to Leaflet (works for both iframe and WebView)
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

  // Push visited countries whenever map ready or list changes
  useEffect(() => {
    if (!mapReady || allVisited.length === 0) return;
    const t = setTimeout(
      () => sendToMap({ type: "updateCountries", countries: allVisited }),
      200
    );
    return () => clearTimeout(t);
  }, [mapReady, allVisited, sendToMap]);

  // Listen for messages from iframe (web)
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
  });

  function handleMapMessage(msg: {
    type: string;
    country?: string;
    isVisited?: boolean;
  }) {
    if (msg.type === "mapReady") {
      setMapReady(true);
    } else if (msg.type === "mapError") {
      setMapError(true);
    } else if (msg.type === "countryTap" && msg.country) {
      const country = msg.country;
      const isVisited = allVisited.includes(country);

      if (!isVisited) {
        // Ask if they visited
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setConfirmCountry(country);
        setConfirmModal(true);
      } else {
        // Show detail — check if we have photo trip data
        const tripData = countries.find((c) => c.country === country);
        if (tripData) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setDetailCountry(tripData);
          setDetailModal(true);
        } else {
          // Manually marked, no trip data
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setManualDetailCountry(country);
          setManualDetailModal(true);
        }
      }
    }
  }

  function handleWebViewMessage(event: { nativeEvent: { data: string } }) {
    try {
      handleMapMessage(JSON.parse(event.nativeEvent.data));
    } catch {}
  }

  function handleMarkVisited(country: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setManuallyVisited((prev) => [...new Set([...prev, country])]);
    sendToMap({ type: "markVisited", country });
    setConfirmModal(false);
    setConfirmCountry(null);
  }

  function handleUnmarkVisited(country: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setManuallyVisited((prev) => prev.filter((c) => c !== country));
    setManualDetailModal(false);
    setManualDetailCountry(null);
    // Reset the country color in map
    setTimeout(() => {
      sendToMap({
        type: "updateCountries",
        countries: allVisited.filter((c) => c !== country),
      });
    }, 100);
  }

  if (permissionGranted === false) {
    return <PermissionGate />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map */}
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
          />
        )}
      </View>

      {/* Visit count badge */}
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
              {allVisited.length}
            </Text>
            <Text style={[styles.badgeLabel, { color: colors.mutedForeground }]}>
              {allVisited.length === 1 ? "country" : "countries"} visited
            </Text>
          </View>
        )}
      </View>

      {/* Hint when map is ready */}
      {mapReady && allVisited.length === 0 && !isLoading && (
        <View style={[styles.hint, { bottom: 100, backgroundColor: colors.card + "DD" }]}>
          <Ionicons name="hand-left-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Tap any country to mark as visited
          </Text>
        </View>
      )}

      {/* ──── "Did you visit?" confirmation modal ──── */}
      <Modal
        visible={confirmModal}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setConfirmModal(false)}
        >
          <Pressable
            style={[
              styles.confirmSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 },
            ]}
            onPress={() => {}}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.confirmIconWrap, { backgroundColor: colors.background }]}>
              <Ionicons name="location" size={28} color={colors.accent} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
              {confirmCountry}
            </Text>
            <Text style={[styles.confirmSub, { color: colors.mutedForeground }]}>
              Have you visited this country?
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                onPress={() => {
                  setConfirmModal(false);
                  setConfirmCountry(null);
                }}
                style={[
                  styles.confirmBtnNo,
                  { backgroundColor: colors.muted, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.confirmBtnNoText, { color: colors.mutedForeground }]}>
                  No
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmCountry && handleMarkVisited(confirmCountry)}
                style={[styles.confirmBtnYes, { backgroundColor: colors.accent }]}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={18} color={colors.accentForeground} />
                <Text style={[styles.confirmBtnYesText, { color: colors.accentForeground }]}>
                  Yes, I've been!
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ──── Manually-visited country detail modal (no trip data) ──── */}
      <Modal
        visible={manualDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setManualDetailModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setManualDetailModal(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalCountry, { color: colors.foreground }]}>
                  {manualDetailCountry}
                </Text>
                <View style={[styles.visitedBadge, { backgroundColor: colors.accent + "22" }]}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.accent} />
                  <Text style={[styles.visitedBadgeText, { color: colors.accent }]}>
                    Marked as visited
                  </Text>
                </View>
              </View>
            </View>
            <Text style={[styles.noTripText, { color: colors.mutedForeground }]}>
              No geotagged photos found for this country yet.
            </Text>
            <TouchableOpacity
              onPress={() =>
                manualDetailCountry && handleUnmarkVisited(manualDetailCountry)
              }
              style={[styles.unmarkBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.unmarkBtnText, { color: colors.mutedForeground }]}>
                Unmark as visited
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ──── Trip detail modal (photo-based visit data) ──── */}
      <Modal
        visible={detailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDetailModal(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            {detailCountry && (
              <>
                <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalCountry, { color: colors.foreground }]}>
                      {detailCountry.country}
                    </Text>
                    <Text style={[styles.modalDates, { color: colors.mutedForeground }]}>
                      {formatDateRange(detailCountry.firstDate, detailCountry.lastDate)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      sendToMap({ type: "zoomCountry", country: detailCountry.country });
                      setDetailModal(false);
                    }}
                    style={[styles.zoomBtn, { backgroundColor: colors.primary + "22" }]}
                  >
                    <Ionicons name="locate" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                    <Text style={[styles.statNum, { color: colors.accent }]}>
                      {detailCountry.photoCount}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                      photos
                    </Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                    <Text style={[styles.statNum, { color: colors.primary }]}>
                      {detailCountry.cities.length}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                      {detailCountry.cities.length === 1 ? "city" : "cities"}
                    </Text>
                  </View>
                </View>

                {detailCountry.cities.slice(0, 5).map((city) => (
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
                {detailCountry.cities.length > 5 && (
                  <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
                    +{detailCountry.cities.length - 5} more cities
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
  hint: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hintText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  // Confirm sheet
  confirmSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: "center",
  },
  confirmIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 6,
  },
  confirmSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 28,
  },
  confirmBtns: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmBtnNo: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
  },
  confirmBtnNoText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  confirmBtnYes: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmBtnYesText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  // Detail / manual-detail sheet
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
  visitedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  visitedBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  noTripText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
    lineHeight: 21,
  },
  unmarkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  unmarkBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center" },
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
