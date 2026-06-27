import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import WebView from "react-native-webview";

export interface ShareStats {
  countries: number;
  bucket: number;
  streak: number;
  best: number;
  months: number;
  visitedCountries: string[];
}

interface Props {
  visible: boolean;
  stats: ShareStats;
  onClose: () => void;
}

function buildHTML(stats: ShareStats): string {
  const data = JSON.stringify({
    countries: stats.countries,
    bucket: stats.bucket,
    streak: stats.streak,
    best: stats.best,
    months: stats.months,
    visited: stats.visitedCountries || [],
  });
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>*{margin:0;padding:0}html,body{width:1080px;height:1920px;overflow:hidden;background:#0F172A}</style>
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
</head>
<body>
<canvas id="c" width="1080" height="1920"></canvas>
<script>
var D=${data};
var W=1080,H=1920,GX=540,GY=580,GR=430;
var c=document.getElementById('c'),ctx=c.getContext('2d');
function send(m){try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(m);else window.parent.postMessage(m,'*');}catch(e){}}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function drawStats(){
  var statsY=1080;
  var ns=String(D.countries);
  var fs=ns.length<=1?260:ns.length<=2?230:200;
  var ng=ctx.createLinearGradient(0,statsY,0,statsY+fs);
  ng.addColorStop(0,'#FB923C');ng.addColorStop(1,'#EA580C');
  ctx.fillStyle=ng;ctx.font='bold '+fs+'px -apple-system,system-ui,Arial,sans-serif';
  ctx.textAlign='center';ctx.fillText(ns,W/2,statsY+fs*0.82);
  ctx.fillStyle='rgba(248,250,252,0.45)';ctx.font='400 52px -apple-system,system-ui,Arial,sans-serif';
  ctx.fillText('countries explored',W/2,statsY+fs+20);
  var bx0=54,bw=(W-bx0*2-60)/4,bh=155,by=statsY+fs+95;
  [{v:D.streak>0?D.streak+' mo':'-',l:'STREAK',c:'#F97316'},{v:D.best>0?D.best+' mo':'-',l:'BEST',c:'#A78BFA'},{v:D.months>0?String(D.months):'-',l:'MONTHS',c:'#60A5FA'},{v:String(D.bucket),l:'BUCKET',c:'#34D399'}].forEach(function(b,i){
    var bx=bx0+i*(bw+20);
    ctx.fillStyle='rgba(30,41,59,0.85)';rr(bx,by,bw,bh,18);ctx.fill();
    ctx.fillStyle=b.c;ctx.font='bold 62px -apple-system,system-ui,Arial,sans-serif';ctx.textAlign='center';
    ctx.fillText(b.v,bx+bw/2,by+100);
    ctx.fillStyle='rgba(100,116,139,0.9)';ctx.font='600 24px -apple-system,system-ui,Arial,sans-serif';
    ctx.fillText(b.l,bx+bw/2,by+140);
  });
  ctx.textAlign='left';
  if(D.visited.length>0){
    var listY=by+bh+68;
    ctx.fillStyle='rgba(100,116,139,0.75)';ctx.font='600 30px -apple-system,system-ui,Arial,sans-serif';
    ctx.fillText('VISITED',54,listY);
    var show=D.visited.slice(0,8);
    show.forEach(function(name,i){
      var col=Math.floor(i/4),row=i%4;
      var cx=54+col*(W/2-30),cy=listY+52+row*60;
      ctx.fillStyle='rgba(248,250,252,0.82)';ctx.font='400 36px -apple-system,system-ui,Arial,sans-serif';
      ctx.fillText((i===0?'🌍 ':'• ')+name,cx,cy);
    });
    if(D.visited.length>8){
      ctx.fillStyle='rgba(100,116,139,0.7)';ctx.font='400 30px -apple-system,system-ui,Arial,sans-serif';
      ctx.fillText('+ '+(D.visited.length-8)+' more countries',54,listY+52+4*60);
    }
  }
  ctx.fillStyle='rgba(96,165,250,0.18)';ctx.fillRect(0,H-90,W,90);
  ctx.fillStyle='rgba(248,250,252,0.4)';ctx.font='400 30px -apple-system,system-ui,Arial,sans-serif';
  ctx.textAlign='center';ctx.fillText('Travel Map — Track your world adventures',W/2,H-28);
}
async function main(){
  var resp=await fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson');
  var world=await resp.json();
  var proj=d3.geoOrthographic().scale(GR).translate([GX,GY]).rotate([20,-15]);
  var path=d3.geoPath(proj,ctx);
  ctx.fillStyle='#0F172A';ctx.fillRect(0,0,W,H);
  var glow=ctx.createRadialGradient(GX,GY,GR*0.3,GX,GY,GR*1.5);
  glow.addColorStop(0,'rgba(96,165,250,0.10)');glow.addColorStop(1,'rgba(96,165,250,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
  ctx.beginPath();path({type:'Sphere'});
  var ocean=ctx.createRadialGradient(GX-80,GY-80,0,GX,GY,GR);
  ocean.addColorStop(0,'#1e3f6e');ocean.addColorStop(1,'#0d1f35');
  ctx.fillStyle=ocean;ctx.fill();
  ctx.beginPath();path(d3.geoGraticule()());
  ctx.strokeStyle='rgba(96,165,250,0.13)';ctx.lineWidth=1.5;ctx.stroke();
  world.features.forEach(function(f){
    var name=(f.properties.ADMIN||f.properties.NAME||'');
    var vis=D.visited.includes(name);
    ctx.beginPath();path(f);
    ctx.fillStyle=vis?'#FB923C':'#1a3558';ctx.fill();
    ctx.strokeStyle=vis?'rgba(251,146,60,0.4)':'rgba(96,165,250,0.08)';
    ctx.lineWidth=vis?1:0.5;ctx.stroke();
  });
  ctx.beginPath();path({type:'Sphere'});
  var rim=ctx.createLinearGradient(GX-GR,GY,GX+GR,GY);
  rim.addColorStop(0,'rgba(96,165,250,0.4)');rim.addColorStop(0.5,'rgba(96,165,250,0.15)');rim.addColorStop(1,'rgba(96,165,250,0.4)');
  ctx.strokeStyle=rim;ctx.lineWidth=2.5;ctx.stroke();
  var fade=ctx.createLinearGradient(0,GY+GR*0.3,0,H);
  fade.addColorStop(0,'rgba(15,23,42,0)');fade.addColorStop(0.25,'rgba(15,23,42,0.88)');fade.addColorStop(1,'rgba(15,23,42,1)');
  ctx.fillStyle=fade;ctx.fillRect(0,GY+GR*0.3-80,W,H-(GY+GR*0.3-80));
  ctx.fillStyle='rgba(15,23,42,0.72)';ctx.fillRect(0,0,W,190);
  ctx.fillStyle='#60A5FA';ctx.font='bold 54px -apple-system,system-ui,Arial,sans-serif';
  ctx.textAlign='left';ctx.fillText('TRAVEL MAP',60,112);
  var ag=ctx.createLinearGradient(60,0,420,0);ag.addColorStop(0,'#60A5FA');ag.addColorStop(1,'rgba(96,165,250,0)');
  ctx.fillStyle=ag;ctx.fillRect(60,130,360,3);
  drawStats();
  var url;try{url=c.toDataURL('image/jpeg',0.88);}catch(e){url=c.toDataURL('image/png');}
  send(JSON.stringify({type:'shareCardReady',data:url}));
}
main().catch(function(e){send(JSON.stringify({type:'shareCardError',error:String(e)}));});
</script>
</body></html>`;
}

type Status = "generating" | "preview" | "sharing";

export default function ShareCard({ visible, stats, onClose }: Props) {
  const [status, setStatus] = useState<Status>("generating");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const fileUriRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) { setStatus("generating"); setImageUri(null); fileUriRef.current = null; }
  }, [visible]);

  const handleMessage = useCallback(async (event: { nativeEvent: { data: string } }) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "shareCardReady" && msg.data) {
        const FileSystem = await import("expo-file-system");
        const isJpeg = (msg.data as string).startsWith("data:image/jpeg");
        const ext = isJpeg ? "jpg" : "png";
        const mime = isJpeg ? "image/jpeg" : "image/png";
        const base64 = (msg.data as string).replace(/^data:image\/\w+;base64,/, "");
        const fileUri = FileSystem.default.cacheDirectory + `travel-share-card.${ext}`;
        await FileSystem.default.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.default.EncodingType.Base64,
        });
        fileUriRef.current = fileUri;
        (fileUriRef as any).mime = mime;
        setImageUri(msg.data);
        setStatus("preview");
      } else if (msg.type === "shareCardError") {
        throw new Error(msg.error);
      }
    } catch (err) {
      Alert.alert("Share failed", "Could not render the share card. Please try again.");
      onClose();
    }
  }, [onClose]);

  const handleWebViewLoad = useCallback(() => {
    timerRef.current = setTimeout(() => {
      Alert.alert("Timeout", "Card took too long to generate. Check your internet connection and try again.");
      onClose();
    }, 35000);
  }, [onClose]);

  const handleShare = useCallback(async () => {
    if (!fileUriRef.current) return;
    try {
      setStatus("sharing");
      const Sharing = await import("expo-sharing");
      const canShare = await Sharing.default.isAvailableAsync();
      if (canShare) {
        await Sharing.default.shareAsync(fileUriRef.current, {
          mimeType: (fileUriRef as any).mime ?? "image/jpeg",
          dialogTitle: "Share your travel map",
          UTI: "public.jpeg",
        });
      } else {
        Alert.alert("Saved", "Image saved to: " + fileUriRef.current);
      }
    } finally {
      onClose();
    }
  }, [onClose]);

  if (!visible) return null;

  if (Platform.OS === "web") {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Sharing not available on web</Text>
            <Text style={styles.sub}>Open the app on your iPhone to share your travel map.</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Hidden WebView renders the globe card */}
        {status === "generating" && (
          <WebView
            source={{ html: buildHTML(stats) }}
            onMessage={handleMessage}
            onLoad={handleWebViewLoad}
            javaScriptEnabled
            originWhitelist={["*"]}
            style={styles.hiddenWebView}
          />
        )}

        {status === "generating" && (
          <View style={styles.sheet}>
            <ActivityIndicator size="large" color="#60A5FA" />
            <Text style={styles.title}>Drawing your globe…</Text>
            <Text style={styles.sub}>Loading your visited countries onto the map</Text>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {(status === "preview" || status === "sharing") && imageUri && (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <View style={styles.previewActions}>
              <TouchableOpacity
                onPress={handleShare}
                style={styles.shareBtn}
                activeOpacity={0.8}
                disabled={status === "sharing"}
              >
                {status === "sharing"
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.shareBtnText}>Share to WhatsApp / Instagram</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const PREVIEW_W = 270;
const PREVIEW_H = Math.round(PREVIEW_W * (1920 / 1080));

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  hiddenWebView: {
    position: "absolute",
    width: 1080,
    height: 1920,
    opacity: 0,
    top: 0,
    left: 0,
    transform: [{ scale: 0.001 }],
    transformOrigin: "top left",
  },
  sheet: {
    backgroundColor: "#1E293B",
    borderRadius: 24,
    padding: 32,
    width: 300,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  previewContainer: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
  },
  previewImage: {
    width: PREVIEW_W,
    height: PREVIEW_H,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  previewActions: { alignItems: "center", gap: 4 },
  shareBtn: {
    backgroundColor: "#60A5FA",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    minWidth: 240,
    alignItems: "center",
    shadowColor: "#60A5FA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  shareBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#F1F5F9", textAlign: "center", marginTop: 8 },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center", lineHeight: 20 },
  cancelBtn: { marginTop: 4, paddingVertical: 10, paddingHorizontal: 24 },
  cancelText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#64748B" },
  closeBtn: { marginTop: 8, backgroundColor: "#0F172A", paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 },
  closeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#F1F5F9" },
});
