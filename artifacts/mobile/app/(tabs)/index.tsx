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
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
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
import WebView from "react-native-webview";
import { useColors } from "@/hooks/useColors";
import { CountryVisit, useTravel } from "@/context/TravelContext";
import { useBucketList } from "@/context/BucketListContext";
import PermissionGate from "@/components/PermissionGate";
import ShareCard, { ShareStats } from "@/components/ShareCard";
import { buildMonthMap, calcStreaks } from "@/utils/travelStats";
import { WORLD_COUNTRIES } from "@/data/worldCountries";
import { CC_JS, countryToFlag } from "@/utils/countryFlags";

const MANUAL_VISITED_KEY = "manual_visited_v1";
const TOTAL_COUNTRIES = 195;

const CONTINENT_MAP: Record<string, string> = {
  Algeria:"AF",Angola:"AF",Benin:"AF",Botswana:"AF",Cameroon:"AF",Egypt:"AF",
  Ethiopia:"AF",Ghana:"AF","Ivory Coast":"AF",Kenya:"AF",Libya:"AF",
  Madagascar:"AF",Mali:"AF",Morocco:"AF",Mozambique:"AF",Namibia:"AF",
  Nigeria:"AF",Rwanda:"AF",Senegal:"AF",Somalia:"AF","South Africa":"AF",
  Sudan:"AF",Tanzania:"AF",Tunisia:"AF",Uganda:"AF",Zambia:"AF",Zimbabwe:"AF",
  Afghanistan:"AS",Armenia:"AS",Azerbaijan:"AS",Bahrain:"AS",Bangladesh:"AS",
  Brunei:"AS",Cambodia:"AS",China:"AS",Cyprus:"AS",Georgia:"AS",India:"AS",
  Indonesia:"AS",Iran:"AS",Iraq:"AS",Israel:"AS",Japan:"AS",Jordan:"AS",
  Kazakhstan:"AS",Kuwait:"AS",Laos:"AS",Lebanon:"AS",Malaysia:"AS",
  Maldives:"AS",Mongolia:"AS",Myanmar:"AS",Nepal:"AS",Oman:"AS",Pakistan:"AS",
  Palestine:"AS",Philippines:"AS",Qatar:"AS","Saudi Arabia":"AS",
  Singapore:"AS","South Korea":"AS","Sri Lanka":"AS",Syria:"AS",Taiwan:"AS",
  Thailand:"AS",Turkey:"AS","United Arab Emirates":"AS",Uzbekistan:"AS",
  Vietnam:"AS",Yemen:"AS",
  Albania:"EU",Austria:"EU",Belarus:"EU",Belgium:"EU",
  "Bosnia and Herzegovina":"EU",Bulgaria:"EU",Croatia:"EU",
  "Czech Republic":"EU",Denmark:"EU",Estonia:"EU",Finland:"EU",France:"EU",
  Germany:"EU",Greece:"EU",Hungary:"EU",Iceland:"EU",Ireland:"EU",Italy:"EU",
  Kosovo:"EU",Latvia:"EU",Lithuania:"EU",Luxembourg:"EU",Malta:"EU",
  Moldova:"EU",Montenegro:"EU",Netherlands:"EU","North Macedonia":"EU",
  Norway:"EU",Poland:"EU",Portugal:"EU",Romania:"EU",Russia:"EU",Serbia:"EU",
  Slovakia:"EU",Slovenia:"EU",Spain:"EU",Sweden:"EU",Switzerland:"EU",
  Ukraine:"EU","United Kingdom":"EU",
  Bahamas:"NA",Canada:"NA",Cuba:"NA","Dominican Republic":"NA",
  "El Salvador":"NA",Guatemala:"NA",Honduras:"NA",Jamaica:"NA",
  Mexico:"NA",Panama:"NA","United States":"NA",
  Argentina:"SA",Bolivia:"SA",Brazil:"SA",Chile:"SA",Colombia:"SA",
  Ecuador:"SA",Paraguay:"SA",Peru:"SA",Uruguay:"SA",Venezuela:"SA",
  Australia:"OC",Fiji:"OC","New Zealand":"OC","Papua New Guinea":"OC",
};

function formatDateRange(first: number, last: number) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
  const f = new Date(first).toLocaleDateString("en-US", opts);
  const l = new Date(last).toLocaleDateString("en-US", opts);
  return f === l ? f : `${f} – ${l}`;
}

const buildGlobeHTML = (): string => `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#0F172A;overflow:hidden;touch-action:none}
canvas{display:block;touch-action:none}
#ld{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#94A3B8;font:14px -apple-system,sans-serif;pointer-events:none}
</style>
</head>
<body>
<div id="ld">Loading…</div>
<canvas id="c"></canvas>
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<script>
var CC=${CC_JS};
function cF(code){if(!code||code.length!==2)return'';return code.toUpperCase().split('').map(function(c){return String.fromCodePoint(c.charCodeAt(0)+127397)}).join('')}
function lookupFlag(name){if(!name)return'';var c=CC[name];if(c)return cF(c);var lo=name.toLowerCase(),ks=Object.keys(CC);for(var i=0;i<ks.length;i++){if(ks[i].toLowerCase()===lo)return cF(CC[ks[i]]);}var s=name.replace(/^(republic of |the |kingdom of |democratic republic of )/i,'').trim();if(CC[s])return cF(CC[s]);for(var j=0;j<ks.length;j++){var kl=ks[j].toLowerCase();if(ks[j].length>=5&&lo.indexOf(kl)!==-1)return cF(CC[ks[j]]);if(lo.length>=5&&kl.indexOf(lo)!==-1)return cF(CC[ks[j]]);}return'';}
function sendUp(m){try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(m);else window.parent.postMessage(m,'*')}catch(e){}}

var canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
var dpr=Math.min(window.devicePixelRatio||1,2);
var W=window.innerWidth,H=window.innerHeight;
canvas.width=W*dpr;canvas.height=H*dpr;
canvas.style.width=W+'px';canvas.style.height=H+'px';
ctx.scale(dpr,dpr);

var baseR=Math.min(W,H)*0.47,scaleR=baseR;
var proj=d3.geoOrthographic().scale(scaleR).translate([W/2,H/2]).clipAngle(90).precision(0.2);
var path=d3.geoPath().projection(proj).context(ctx);
var grat=d3.geoGraticule()();
var features=[],centroids={},visited={},bucketList={};
var rot=[10,-20],autoRot=true,resumeT;

function isOnFront(lng,lat){
  var p1=lat*Math.PI/180,L1=lng*Math.PI/180;
  var p2=-rot[1]*Math.PI/180,L2=-rot[0]*Math.PI/180;
  return Math.sin(p1)*Math.sin(p2)+Math.cos(p1)*Math.cos(p2)*Math.cos(L1-L2)>0.05;
}

function drawLabels(){
  var zr=scaleR/baseR;
  if(zr<1.25)return;
  var fs=Math.max(7,Math.min(10,Math.round(6*zr)));
  ctx.font=fs+'px -apple-system,BlinkMacSystemFont,sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,0.95)';ctx.shadowBlur=4;
  for(var i=0;i<features.length;i++){
    var f=features[i],n=f.properties.ADMIN||f.properties.name||'';
    var ce=centroids[n];
    if(!ce||!isOnFront(ce.lng,ce.lat))continue;
    var pt=proj([ce.lng,ce.lat]);if(!pt)continue;
    var dx=pt[0]-W/2,dy=pt[1]-H/2;
    if(dx*dx+dy*dy>scaleR*scaleR*0.92)continue;
    var label=n.length>14?n.split(' ')[0]:n;
    ctx.fillStyle=visited[n]?'rgba(255,255,255,0.95)':'rgba(210,230,255,0.82)';
    ctx.fillText(label,pt[0],pt[1]);
  }
  ctx.shadowBlur=0;
}

function draw(){
  proj.rotate(rot).scale(scaleR);
  ctx.clearRect(0,0,W,H);
  ctx.beginPath();path({type:'Sphere'});
  var g=ctx.createRadialGradient(W*0.42,H*0.38,scaleR*0.05,W/2,H/2,scaleR);
  g.addColorStop(0,'#1E3A5F');g.addColorStop(1,'#0A1628');
  ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();path(grat);
  ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=0.6;ctx.stroke();
  for(var i=0;i<features.length;i++){
    var f=features[i],n=f.properties.ADMIN||f.properties.name||'';
    ctx.beginPath();path(f);
    ctx.fillStyle=visited[n]?'rgba(251,146,60,0.9)':bucketList[n]?'rgba(96,165,250,0.65)':'rgba(48,80,130,0.72)';
    ctx.fill();
    ctx.strokeStyle='rgba(100,150,210,0.28)';ctx.lineWidth=0.5;ctx.stroke();
  }
  ctx.beginPath();path({type:'Sphere'});
  ctx.strokeStyle='rgba(96,165,250,0.18)';ctx.lineWidth=1.5;ctx.stroke();
  drawLabels();
}

function tick(){if(autoRot){rot[0]+=0.15;draw();}requestAnimationFrame(tick);}

// Mouse drag
var drag=false,lx,ly;
canvas.addEventListener('mousedown',function(e){drag=true;lx=e.offsetX;ly=e.offsetY;autoRot=false;clearTimeout(resumeT);});
canvas.addEventListener('mousemove',function(e){if(!drag)return;var s=0.4*baseR/scaleR;rot[0]+=(e.offsetX-lx)*s;rot[1]-=(e.offsetY-ly)*s;rot[1]=Math.max(-80,Math.min(80,rot[1]));lx=e.offsetX;ly=e.offsetY;draw();});
canvas.addEventListener('mouseup',function(){drag=false;resumeT=setTimeout(function(){autoRot=true;},4000);});

// Mouse wheel zoom
canvas.addEventListener('wheel',function(e){e.preventDefault();scaleR=Math.max(baseR*0.88,Math.min(baseR*4,scaleR*(e.deltaY<0?1.08:0.93)));draw();},{passive:false});

// Touch: 1-finger drag + 2-finger pinch zoom
var lt,mv,pinching=false,pinchD0=0,pinchS0=0;
function pdist(e){return Math.hypot(e.touches[1].clientX-e.touches[0].clientX,e.touches[1].clientY-e.touches[0].clientY);}
canvas.addEventListener('touchstart',function(e){
  e.preventDefault();autoRot=false;clearTimeout(resumeT);
  if(e.touches.length===2){pinching=true;pinchD0=pdist(e);pinchS0=scaleR;}
  else if(e.touches.length===1&&!pinching){lt=e.touches[0];mv=0;}
},{passive:false});
canvas.addEventListener('touchmove',function(e){
  e.preventDefault();
  if(pinching&&e.touches.length>=2){
    var d=pdist(e);if(pinchD0>0)scaleR=Math.max(baseR*0.88,Math.min(baseR*4,pinchS0*(d/pinchD0)));draw();
  } else if(!pinching&&e.touches.length===1){
    var t=e.touches[0],s=0.4*baseR/scaleR,dx=t.clientX-lt.clientX,dy=t.clientY-lt.clientY;
    rot[0]+=dx*s;rot[1]-=dy*s;rot[1]=Math.max(-80,Math.min(80,rot[1]));mv+=Math.abs(dx)+Math.abs(dy);lt=t;draw();
  }
},{passive:false});
canvas.addEventListener('touchend',function(e){
  if(e.touches.length<2){
    pinching=false;
    // Reset drag anchor so a re-pinch or continued drag doesn't jump
    if(e.touches.length===1){lt=e.touches[0];mv=0;}
  }
  if(e.touches.length===0){
    if(mv<6){var t=e.changedTouches[0],r=canvas.getBoundingClientRect();handleTap(t.clientX-r.left,t.clientY-r.top);}
    resumeT=setTimeout(function(){autoRot=true;},4000);
  }
});
canvas.addEventListener('click',function(e){handleTap(e.offsetX,e.offsetY);});

function handleTap(x,y){
  var dx=x-W/2,dy=y-H/2;
  if(dx*dx+dy*dy>scaleR*scaleR)return;
  var co=proj.invert([x,y]);if(!co)return;
  for(var i=0;i<features.length;i++){
    if(d3.geoContains(features[i],co)){
      var n=features[i].properties.ADMIN||features[i].properties.name||'';
      if(n)sendUp(JSON.stringify({type:'countryTap',country:n,isVisited:!!visited[n],inBucket:!!bucketList[n]}));
      return;
    }
  }
}

// Load countries
fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson')
  .then(function(r){return r.json();})
  .then(function(data){
    document.getElementById('ld').style.display='none';
    features=data.features;
    features.forEach(function(f){
      var n=f.properties.ADMIN||f.properties.name||'';
      if(n){try{var c=d3.geoCentroid(f);if(isFinite(c[0])&&isFinite(c[1]))centroids[n]={lng:c[0],lat:c[1]};}catch(e){}}
    });
    tick();
    sendUp(JSON.stringify({type:'mapReady'}));
  })
  .catch(function(){document.getElementById('ld').textContent='Globe unavailable';tick();sendUp(JSON.stringify({type:'mapError'}));});

function handleMsg(e){
  try{
    var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
    if(d.type==='updateCountries'){visited={};d.countries.forEach(function(c){visited[c]=true;});draw();}
    else if(d.type==='updateBucketList'){bucketList={};d.countries.forEach(function(c){bucketList[c]=true;});draw();}
    else if(d.type==='markVisited'){visited[d.country]=true;delete bucketList[d.country];draw();}
    else if(d.type==='markBucket'){bucketList[d.country]=true;draw();}
    else if(d.type==='unmarkBucket'){delete bucketList[d.country];draw();}
    else if(d.type==='zoomCountry'){
      var ce=centroids[d.country];if(!ce)return;
      var t0=Date.now(),s0=[rot[0],rot[1]],tgt=[-ce.lng,-(ce.lat*0.6)];
      autoRot=false;
      (function anim(){var p=Math.min(1,(Date.now()-t0)/900);rot[0]=s0[0]+(tgt[0]-s0[0])*p;rot[1]=s0[1]+(tgt[1]-s0[1])*p;draw();if(p<1)requestAnimationFrame(anim);})();
    }
  }catch(err){}
}
document.addEventListener('message',handleMsg);
window.addEventListener('message',handleMsg);
</script>
</body>
</html>`;

const GLOBE_HTML = buildGlobeHTML();

const WebIframe = React.memo(function WebIframe({
  srcDoc, iframeRef,
}: { srcDoc: string; iframeRef: React.MutableRefObject<any> }) {
  return React.createElement("iframe", {
    ref: iframeRef, srcDoc,
    style: { width: "100%", height: "100%", border: "none", display: "block", background: "#020C18" },
  }) as any;
});

// ─── Stat cards ──────────────────────────────────────────────────────────────

function BigStatCard({
  value, label, icon, bg,
}: { value: string | number; label: string; icon: string; bg: string }) {
  return (
    <View style={[bigCard.card, { backgroundColor: bg }]}>
      <Text style={bigCard.icon}>{icon}</Text>
      <Text style={bigCard.value}>{value}</Text>
      <Text style={bigCard.label}>{label}</Text>
    </View>
  );
}

const bigCard = StyleSheet.create({
  card: { flex: 1, borderRadius: 20, padding: 18, minHeight: 130, justifyContent: "flex-end", overflow: "hidden" },
  icon: { fontSize: 52, position: "absolute", top: 10, right: 10, opacity: 0.35 },
  value: { fontSize: 44, fontFamily: "Inter_700Bold", color: "#fff", lineHeight: 48 },
  label: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 },
});

// ─── Main ────────────────────────────────────────────────────────────────────

export default function MapTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { permissionGranted, isLoading, progress, countries, visitedCountryNames, photos } = useTravel();
  const { bucketList, addToBucket, removeFromBucket, isInBucket } = useBucketList();

  const webviewRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [manuallyVisited, setManuallyVisited] = useState<string[]>([]);
  const allVisited = useMemo(
    () => [...new Set([...visitedCountryNames, ...manuallyVisited])],
    [visitedCountryNames, manuallyVisited]
  );

  const [shareVisible, setShareVisible] = useState(false);
  const travelMonthMap = useMemo(() => buildMonthMap(photos), [photos]);
  const travelStreaks = useMemo(() => calcStreaks(travelMonthMap), [travelMonthMap]);
  const shareStats = useMemo<ShareStats>(() => {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).getTime();
    const visitedContinents = new Set(
      allVisited.map((c) => CONTINENT_MAP[c]).filter(Boolean)
    );
    const countriesThisYear = countries.filter(
      (cv) => cv.lastDate >= startOfYear
    ).length;
    const yearCounts: Record<number, number> = {};
    for (const p of photos) {
      const yr = new Date(p.creationTime).getFullYear();
      yearCounts[yr] = (yearCounts[yr] ?? 0) + 1;
    }
    const busiestYear =
      Object.keys(yearCounts).length > 0
        ? Number(Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0][0])
        : currentYear;
    return {
      countries: allVisited.length,
      continents: visitedContinents.size,
      countriesThisYear,
      busiestYear,
    };
  }, [allVisited, countries, photos]);

  const [detailCountry, setDetailCountry] = useState<CountryVisit | null>(null);
  const [detailModal, setDetailModal] = useState(false);
  const [confirmCountry, setConfirmCountry] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [manualDetailCountry, setManualDetailCountry] = useState<string | null>(null);
  const [manualDetailModal, setManualDetailModal] = useState(false);
  const [bucketActionCountry, setBucketActionCountry] = useState<string | null>(null);
  const [bucketActionModal, setBucketActionModal] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const { height: SH } = Dimensions.get("window");
  const GLOBE_H = Math.round(SH * 0.48);

  const pct = Math.round((allVisited.length / TOTAL_COUNTRIES) * 100);

  useEffect(() => {
    AsyncStorage.getItem(MANUAL_VISITED_KEY).then((v) => {
      if (v) setManuallyVisited(JSON.parse(v));
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(MANUAL_VISITED_KEY, JSON.stringify(manuallyVisited));
  }, [manuallyVisited]);

  const sendToMap = useCallback((data: object) => {
    const json = JSON.stringify(data);
    if (isWeb) {
      try { iframeRef.current?.contentWindow?.postMessage(json, "*"); } catch {}
    } else {
      const escaped = JSON.stringify(json);
      webviewRef.current?.injectJavaScript(`(function(){handleMsg({data:${escaped}});})();true;`);
    }
  }, [isWeb]);

  useEffect(() => {
    if (!mapReady || allVisited.length === 0) return;
    const t = setTimeout(() => sendToMap({ type: "updateCountries", countries: allVisited }), 200);
    return () => clearTimeout(t);
  }, [mapReady, allVisited, sendToMap]);

  useEffect(() => {
    if (!mapReady) return;
    const t = setTimeout(() => sendToMap({ type: "updateBucketList", countries: bucketList }), 250);
    return () => clearTimeout(t);
  }, [mapReady, bucketList, sendToMap]);

  useEffect(() => {
    if (!isWeb) return;
    const handler = (e: MessageEvent) => {
      if (!e.data) return;
      try { handleMapMessage(JSON.parse(e.data)); } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  });

  function handleMapMessage(msg: { type: string; country?: string; isVisited?: boolean; inBucket?: boolean }) {
    if (msg.type === "mapReady") {
      setMapReady(true);
    } else if (msg.type === "countryTap" && msg.country) {
      const country = msg.country;
      if (allVisited.includes(country)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const tripData = countries.find((c) => c.country === country);
        if (tripData) { setDetailCountry(tripData); setDetailModal(true); }
        else { setManualDetailCountry(country); setManualDetailModal(true); }
      } else if (isInBucket(country)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBucketActionCountry(country); setBucketActionModal(true);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setConfirmCountry(country); setConfirmModal(true);
      }
    }
  }

  function handleWebViewMessage(event: { nativeEvent: { data: string } }) {
    try { handleMapMessage(JSON.parse(event.nativeEvent.data)); } catch {}
  }

  function handleMarkVisited(country: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setManuallyVisited((prev) => [...new Set([...prev, country])]);
    removeFromBucket(country);
    sendToMap({ type: "markVisited", country });
    setConfirmModal(false); setConfirmCountry(null);
    setBucketActionModal(false); setBucketActionCountry(null);
  }

  function handleAddToBucket(country: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addToBucket(country);
    sendToMap({ type: "markBucket", country });
    setConfirmModal(false); setConfirmCountry(null);
  }

  function handleUnmarkVisited(country: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setManuallyVisited((prev) => prev.filter((c) => c !== country));
    setManualDetailModal(false); setManualDetailCountry(null);
    setTimeout(() => sendToMap({ type: "updateCountries", countries: allVisited.filter((c) => c !== country) }), 100);
  }

  function handleRemoveFromBucket(country: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeFromBucket(country);
    sendToMap({ type: "unmarkBucket", country });
    setBucketActionModal(false); setBucketActionCountry(null);
  }

  if (permissionGranted === false) return <PermissionGate />;

  return (
    <View style={[styles.container, { backgroundColor: "#0F172A" }]}>

      {/* ── Top bar ── sits above the globe, never overlaps it */}
      <View style={[styles.topBar, { paddingTop: topPad, backgroundColor: "#0F172A" }]}>
        <View style={styles.badgeInner}>
          <Ionicons name="globe" size={15} color={colors.accent} />
          <Text style={[styles.badgeCount, { color: colors.accent }]}>
            {isLoading ? "—" : allVisited.length}
          </Text>
          {!isLoading && bucketList.length > 0 && (
            <>
              <View style={[styles.badgeDivider, { backgroundColor: colors.border }]} />
              <Ionicons name="bookmark" size={13} color={colors.primary} />
              <Text style={[styles.badgeCount, { color: colors.primary }]}>{bucketList.length}</Text>
            </>
          )}
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSearchVisible(true); }}
            activeOpacity={0.8}
            style={styles.shareBtn}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          {!isLoading && (allVisited.length > 0 || bucketList.length > 0) && mapReady && (
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShareVisible(true); }}
              activeOpacity={0.8}
              style={styles.shareBtn}
            >
              <Ionicons name="share-outline" size={20} color={colors.foreground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Globe section ── starts right below the top bar */}
      <View style={[styles.globeSection, { height: GLOBE_H }]}>
        {isWeb ? (
          <WebIframe srcDoc={GLOBE_HTML} iframeRef={iframeRef} />
        ) : (
          <WebView
            ref={webviewRef}
            originWhitelist={["*"]}
            source={{ html: GLOBE_HTML, baseUrl: "https://www.google.com" }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            scrollEnabled={false}
            onMessage={handleWebViewMessage}
            onError={() => {}}
          />
        )}

        {/* Loading overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              {progress.stage}{progress.total > 0 ? ` ${progress.current}/${progress.total}` : ""}
            </Text>
          </View>
        )}

        {/* Tap hint */}
        {mapReady && allVisited.length === 0 && !isLoading && (
          <View style={[styles.hint, { bottom: 16, backgroundColor: colors.card + "CC" }]}>
            <Ionicons name="hand-left-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Tap any country to mark as visited
            </Text>
          </View>
        )}
      </View>

      {/* ── Stats + Flags panel ── */}
      <ScrollView
        style={[styles.panel, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.panelContent, { paddingBottom: insets.bottom + 88 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.panelTitle, { color: colors.foreground }]}>Travel Stats</Text>

        <View style={styles.bigStatRow}>
          <BigStatCard
            value={allVisited.length}
            label="countries visited"
            icon="⛰️"
            bg="#1B3A6A"
          />
          <BigStatCard
            value={`${pct}%`}
            label="of the world"
            icon="🌍"
            bg="#7C2D12"
          />
        </View>

        {allVisited.length > 0 && (
          <>
            <Text style={[styles.flagsTitle, { color: colors.foreground }]}>
              Flags collected
            </Text>
            <View style={styles.flagsGrid}>
              {allVisited.map((country) => {
                const flag = countryToFlag(country);
                return (
                  <Pressable
                    key={country}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const tripData = countries.find((c) => c.country === country);
                      if (tripData) { setDetailCountry(tripData); setDetailModal(true); }
                      else { setManualDetailCountry(country); setManualDetailModal(true); }
                    }}
                    style={({ pressed }) => [
                      styles.flagItem,
                      { backgroundColor: pressed ? colors.muted : colors.card },
                    ]}
                  >
                    <Text style={styles.flagEmoji}>{flag}</Text>
                    <Text style={[styles.flagName, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {country.split(" ")[0]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {allVisited.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Tap countries on the globe to mark them as visited
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Share Card */}
      <ShareCard
        visible={shareVisible}
        stats={shareStats}
        onClose={() => setShareVisible(false)}
      />

      {/* ── "Did you visit?" modal ── */}
      <Modal visible={confirmModal} transparent animationType="slide" onRequestClose={() => setConfirmModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmModal(false)}>
          <Pressable style={[styles.confirmSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.confirmIconWrap, { backgroundColor: colors.background }]}>
              <Ionicons name="location" size={28} color={colors.accent} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>{confirmCountry}</Text>
            <Text style={[styles.confirmSub, { color: colors.mutedForeground }]}>What would you like to do?</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                onPress={() => confirmCountry && handleAddToBucket(confirmCountry)}
                style={[styles.confirmBtnBucket, { backgroundColor: "#38BDF822", borderColor: "#38BDF844" }]}
              >
                <Ionicons name="bookmark-outline" size={17} color="#38BDF8" />
                <Text style={[styles.confirmBtnBucketText, { color: "#38BDF8" }]}>Save to Bucket List</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmCountry && handleMarkVisited(confirmCountry)}
                style={[styles.confirmBtnYes, { backgroundColor: colors.accent }]}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={17} color={colors.accentForeground} />
                <Text style={[styles.confirmBtnYesText, { color: colors.accentForeground }]}>I've been here!</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setConfirmModal(false)} style={styles.skipBtn}>
              <Text style={[styles.skipBtnText, { color: colors.mutedForeground }]}>Skip</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Bucket action sheet ── */}
      <Modal visible={bucketActionModal} transparent animationType="slide" onRequestClose={() => setBucketActionModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setBucketActionModal(false)}>
          <Pressable style={[styles.confirmSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.confirmIconWrap, { backgroundColor: "#38BDF811" }]}>
              <Ionicons name="bookmark" size={28} color="#38BDF8" />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>{bucketActionCountry}</Text>
            <Text style={[styles.confirmSub, { color: colors.mutedForeground }]}>This country is on your bucket list</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                onPress={() => bucketActionCountry && handleRemoveFromBucket(bucketActionCountry)}
                style={[styles.confirmBtnNo, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <Ionicons name="trash-outline" size={15} color={colors.mutedForeground} />
                <Text style={[styles.confirmBtnNoText, { color: colors.mutedForeground }]}>Remove</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => bucketActionCountry && handleMarkVisited(bucketActionCountry)}
                style={[styles.confirmBtnYes, { backgroundColor: colors.accent }]}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={17} color={colors.accentForeground} />
                <Text style={[styles.confirmBtnYesText, { color: colors.accentForeground }]}>I've been here!</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setBucketActionModal(false)} style={styles.skipBtn}>
              <Text style={[styles.skipBtnText, { color: colors.mutedForeground }]}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Manual detail modal ── */}
      <Modal visible={manualDetailModal} transparent animationType="slide" onRequestClose={() => setManualDetailModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setManualDetailModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalCountry, { color: colors.foreground }]}>{manualDetailCountry}</Text>
                <View style={[styles.visitedBadge, { backgroundColor: colors.accent + "22" }]}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.accent} />
                  <Text style={[styles.visitedBadgeText, { color: colors.accent }]}>Marked as visited</Text>
                </View>
              </View>
            </View>
            <Text style={[styles.noTripText, { color: colors.mutedForeground }]}>
              No geotagged photos found for this country yet.
            </Text>
            <TouchableOpacity
              onPress={() => manualDetailCountry && handleUnmarkVisited(manualDetailCountry)}
              style={[styles.unmarkBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.unmarkBtnText, { color: colors.mutedForeground }]}>Unmark as visited</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── Country search modal ── */}
      <Modal visible={searchVisible} transparent animationType="slide" onRequestClose={() => { setSearchVisible(false); setSearchQuery(""); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => { setSearchVisible(false); setSearchQuery(""); }}>
            <Pressable style={[styles.searchSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.searchTitle, { color: colors.foreground }]}>Add Country</Text>
              <View style={[styles.searchInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="search" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground }]}
                  placeholder="Search country…"
                  placeholderTextColor={colors.mutedForeground}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
              <FlatList
                data={WORLD_COUNTRIES.filter(c =>
                  searchQuery.trim().length === 0
                    ? false
                    : c.toLowerCase().includes(searchQuery.trim().toLowerCase())
                )}
                keyExtractor={item => item}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 340 }}
                ListEmptyComponent={
                  searchQuery.trim().length > 0 ? (
                    <Text style={[styles.searchEmpty, { color: colors.mutedForeground }]}>No countries found</Text>
                  ) : (
                    <Text style={[styles.searchEmpty, { color: colors.mutedForeground }]}>Start typing a country name</Text>
                  )
                }
                renderItem={({ item: country }) => {
                  const visited = allVisited.includes(country);
                  const bucketed = isInBucket(country);
                  return (
                    <View style={[styles.searchRow, { borderTopColor: colors.border }]}>
                      <Text style={[styles.searchRowName, { color: colors.foreground }]}>
                        {countryToFlag(country)} {country}
                      </Text>
                      <View style={styles.searchRowBtns}>
                        <TouchableOpacity
                          style={[styles.searchActionBtn, { backgroundColor: visited ? colors.accent + "33" : colors.background }]}
                          onPress={() => {
                            if (visited) return;
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setManuallyVisited(prev => [...new Set([...prev, country])]);
                            sendToMap({ type: "markVisited", country });
                          }}
                          activeOpacity={visited ? 1 : 0.7}
                        >
                          <Ionicons name={visited ? "checkmark-circle" : "checkmark-circle-outline"} size={16} color={visited ? colors.accent : colors.mutedForeground} />
                          <Text style={[styles.searchActionLabel, { color: visited ? colors.accent : colors.mutedForeground }]}>
                            {visited ? "Visited" : "Been here"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.searchActionBtn, { backgroundColor: bucketed ? colors.primary + "33" : colors.background }]}
                          onPress={() => {
                            if (bucketed) { removeFromBucket(country); sendToMap({ type: "unmarkBucket", country }); }
                            else { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); addToBucket(country); sendToMap({ type: "markBucket", country }); }
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name={bucketed ? "bookmark" : "bookmark-outline"} size={15} color={bucketed ? colors.primary : colors.mutedForeground} />
                          <Text style={[styles.searchActionLabel, { color: bucketed ? colors.primary : colors.mutedForeground }]}>
                            {bucketed ? "Saved" : "Bucket list"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Trip detail modal ── */}
      <Modal visible={detailModal} transparent animationType="slide" onRequestClose={() => setDetailModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDetailModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            {detailCountry && (
              <>
                <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalCountry, { color: colors.foreground }]}>
                      {countryToFlag(detailCountry.country)} {detailCountry.country}
                    </Text>
                    <Text style={[styles.modalDates, { color: colors.mutedForeground }]}>
                      {formatDateRange(detailCountry.firstDate, detailCountry.lastDate)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => { sendToMap({ type: "zoomCountry", country: detailCountry.country }); setDetailModal(false); }}
                    style={[styles.zoomBtn, { backgroundColor: colors.primary + "22" }]}
                  >
                    <Ionicons name="locate" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalStatsRow}>
                  <View style={[styles.modalStatCard, { backgroundColor: colors.background }]}>
                    <Text style={[styles.modalStatNum, { color: colors.accent }]}>{detailCountry.photoCount}</Text>
                    <Text style={[styles.modalStatLabel, { color: colors.mutedForeground }]}>photos</Text>
                  </View>
                  <View style={[styles.modalStatCard, { backgroundColor: colors.background }]}>
                    <Text style={[styles.modalStatNum, { color: colors.primary }]}>{detailCountry.cities.length}</Text>
                    <Text style={[styles.modalStatLabel, { color: colors.mutedForeground }]}>
                      {detailCountry.cities.length === 1 ? "city" : "cities"}
                    </Text>
                  </View>
                </View>
                {detailCountry.cities.slice(0, 5).map((city) => (
                  <View key={city.key} style={[styles.modalCityRow, { borderTopColor: colors.border }]}>
                    <Ionicons name="location" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.modalCityName, { color: colors.foreground }]}>{city.city}</Text>
                    <Text style={[styles.modalCityDates, { color: colors.mutedForeground }]}>
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

  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingBottom: 10,
  },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  shareBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },

  searchSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
    marginTop: "auto",
  },
  searchTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 14, marginTop: 4 },
  searchInputWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  searchEmpty: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 24 },
  searchRow: {
    flexDirection: "row", alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 12, gap: 8,
  },
  searchRowName: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  searchRowBtns: { flexDirection: "row", gap: 6 },
  searchActionBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  searchActionLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },

  globeSection: { position: "relative", overflow: "hidden" },
  webview: { flex: 1, backgroundColor: "#020C18" },
  loadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 6 },
  loadingText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  badgeInner: { flexDirection: "row", alignItems: "center", gap: 5 },
  badgeCount: { fontSize: 17, fontFamily: "Inter_700Bold" },
  badgeLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  badgeDivider: { width: 1, height: 14, marginHorizontal: 2 },
  hint: {
    position: "absolute", alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18,
  },
  hintText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  panel: { flex: 1 },
  panelContent: { padding: 20, gap: 0 },
  panelTitle: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 16 },

  bigStatRow: { flexDirection: "row", gap: 12, marginBottom: 24 },

  flagsTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 14 },
  flagsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flagItem: {
    alignItems: "center", justifyContent: "center",
    width: 60, height: 60, borderRadius: 30,
    gap: 0,
  },
  flagEmoji: { fontSize: 30 },
  flagName: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 2 },

  emptyState: { paddingTop: 20, alignItems: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  confirmSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, alignItems: "center" },
  confirmIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginTop: 12, marginBottom: 16 },
  confirmTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 6 },
  confirmSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 24 },
  confirmBtns: { flexDirection: "column", gap: 10, width: "100%" },
  confirmBtnBucket: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 16, borderWidth: 1 },
  confirmBtnBucketText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  confirmBtnYes: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 16 },
  confirmBtnYesText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  confirmBtnNo: { flex: 1, paddingVertical: 15, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5 },
  confirmBtnNoText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  skipBtn: { paddingVertical: 14, alignItems: "center", width: "100%" },
  skipBtnText: { fontSize: 15, fontFamily: "Inter_400Regular" },

  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalCountry: { fontSize: 24, fontFamily: "Inter_700Bold" },
  modalDates: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  visitedBadge: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
  visitedBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  noTripText: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 20, lineHeight: 21 },
  unmarkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5 },
  unmarkBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  zoomBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  modalStatsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  modalStatCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center" },
  modalStatNum: { fontSize: 28, fontFamily: "Inter_700Bold" },
  modalStatLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  modalCityRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, borderTopWidth: 1 },
  modalCityName: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  modalCityDates: { fontSize: 12, fontFamily: "Inter_400Regular" },
  moreText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },
});
