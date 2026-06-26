import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
}

interface Props {
  visible: boolean;
  stats: ShareStats;
  onClose: () => void;
}

function buildHTML(stats: ShareStats): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>*{margin:0;padding:0}html,body{background:#0F172A;overflow:hidden;width:1080px;height:1080px}</style>
</head>
<body>
<canvas id="c" width="1080" height="1080"></canvas>
<script>
(function(){
var D=${JSON.stringify(stats)};
var c=document.getElementById('c');
var ctx=c.getContext('2d');
var W=1080,H=1080,P=80;

function rr(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}
function grd(x0,y0,x1,y1,stops){
  var g=ctx.createLinearGradient(x0,y0,x1,y1);
  stops.forEach(function(s){g.addColorStop(s[0],s[1]);});
  return g;
}
function send(msg){
  try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(msg);
  else window.parent.postMessage(msg,'*');}catch(e){}
}

// Background
ctx.fillStyle=grd(0,0,W,H,[[0,'#0F172A'],[0.5,'#162035'],[1,'#0F172A']]);
ctx.fillRect(0,0,W,H);

// Soft glow circles
ctx.fillStyle='rgba(245,158,11,0.07)';
ctx.beginPath();ctx.arc(W+60,60,400,0,Math.PI*2);ctx.fill();
ctx.fillStyle='rgba(20,184,166,0.06)';
ctx.beginPath();ctx.arc(-60,H+60,400,0,Math.PI*2);ctx.fill();

// Accent bar
ctx.fillStyle=grd(P,0,P+300,0,[[0,'#14B8A6'],[1,'#F59E0B']]);
rr(P,86,300,9,4);ctx.fill();

// Brand
ctx.fillStyle='#94A3B8';
ctx.font='bold 38px -apple-system,system-ui,Arial,sans-serif';
ctx.textAlign='left';
ctx.fillText('TRAVEL MAP',P,150);

// Decorative dots
['#F59E0B99','#14B8A699','#38BDF899'].forEach(function(col,i){
  ctx.fillStyle=col;
  ctx.beginPath();ctx.arc(W-P-i*48,124,22-i*5,0,Math.PI*2);ctx.fill();
});

// Main country number
var ns=String(D.countries);
var fs=ns.length<=1?380:ns.length<=2?320:ns.length<=3?260:210;
ctx.fillStyle=grd(P,190,P,490,[[0,'#FBBF24'],[1,'#D97706']]);
ctx.font='bold '+fs+'px -apple-system,system-ui,Arial,sans-serif';
ctx.fillText(ns,P,460);

// Label
ctx.fillStyle='#64748B';
ctx.font='400 44px -apple-system,system-ui,Arial,sans-serif';
ctx.fillText('countries explored',P,522);

// Divider
ctx.strokeStyle=grd(P,0,W-P,0,[[0,'rgba(30,41,59,0)'],[0.3,'#14B8A6'],[0.7,'#F59E0B'],[1,'rgba(30,41,59,0)']]);
ctx.lineWidth=1.5;
ctx.beginPath();ctx.moveTo(P,568);ctx.lineTo(W-P,568);ctx.stroke();

// Stat boxes
var sw=(W-P*2-30)/4,sh=175,sy=596;
[
  {v:D.streak>0?D.streak+' mo':'-',l:'STREAK',c:'#F97316'},
  {v:D.best>0?D.best+' mo':'-',l:'BEST',c:'#A78BFA'},
  {v:D.months>0?String(D.months):'-',l:'MONTHS',c:'#14B8A6'},
  {v:String(D.bucket),l:'BUCKET LIST',c:'#38BDF8'},
].forEach(function(s,i){
  var sx=P+i*(sw+10);
  ctx.fillStyle='#1E293B';
  rr(sx,sy,sw,sh,18);ctx.fill();
  ctx.fillStyle=s.c;
  ctx.font='bold 60px -apple-system,system-ui,Arial,sans-serif';
  ctx.textAlign='center';
  ctx.fillText(s.v,sx+sw/2,sy+92);
  ctx.fillStyle='#64748B';
  ctx.font='600 24px -apple-system,system-ui,Arial,sans-serif';
  ctx.fillText(s.l,sx+sw/2,sy+136);
  ctx.textAlign='left';
});

// Decorative horizontal world-grid lines
[808,830,852].forEach(function(y,i){
  ctx.strokeStyle='rgba(30,41,59,'+(0.8-i*0.25)+')';
  ctx.lineWidth=1;
  ctx.setLineDash([6,8]);
  ctx.beginPath();ctx.moveTo(P,y);ctx.lineTo(W-P,y);ctx.stroke();
});
ctx.setLineDash([]);

// Footer gradient
ctx.fillStyle=grd(0,0,W,0,[[0,'#0D9488'],[1,'#D97706']]);
ctx.fillRect(0,H-130,W,130);

ctx.fillStyle='rgba(0,0,0,0.45)';
ctx.font='bold 42px -apple-system,system-ui,Arial,sans-serif';
ctx.textAlign='center';
ctx.fillText('Track your world adventures',W/2,H-76);
ctx.font='400 30px -apple-system,system-ui,Arial,sans-serif';
ctx.fillStyle='rgba(0,0,0,0.3)';
ctx.fillText('Travel Map App',W/2,H-34);

// Export
try{
  var url=c.toDataURL('image/png');
  send(JSON.stringify({type:'shareCardReady',data:url}));
}catch(e){
  send(JSON.stringify({type:'shareCardError',error:String(e)}));
}
})();
</script>
</body>
</html>`;
}

export default function ShareCard({ visible, stats, onClose }: Props) {
  const [status, setStatus] = useState<"generating" | "saving" | "done">("generating");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === "shareCardReady" && msg.data) {
          setStatus("saving");
          const FileSystem = await import("expo-file-system");
          const Sharing = await import("expo-sharing");

          const base64 = (msg.data as string).replace(/^data:image\/png;base64,/, "");
          const fileUri = FileSystem.default.cacheDirectory + "travel-share-card.png";

          await FileSystem.default.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.default.EncodingType.Base64,
          });

          const canShare = await Sharing.default.isAvailableAsync();
          if (canShare) {
            await Sharing.default.shareAsync(fileUri, {
              mimeType: "image/png",
              dialogTitle: "Share your travel map",
            });
          } else {
            Alert.alert("Saved", "Share card saved to cache: " + fileUri);
          }
          setStatus("done");
          onClose();
        } else if (msg.type === "shareCardError") {
          throw new Error(msg.error);
        }
      } catch (err) {
        Alert.alert("Share failed", "Could not create share card. Please try again.");
        onClose();
      }
    },
    [onClose]
  );

  const handleWebViewLoad = useCallback(() => {
    // Timeout fallback – give up after 20 seconds
    timerRef.current = setTimeout(() => {
      Alert.alert("Timeout", "Share card took too long. Please try again.");
      onClose();
    }, 20000);
  }, [onClose]);

  if (!visible) return null;

  // Web fallback – just close since file system sharing isn't available
  if (Platform.OS === "web") {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Share not available on web</Text>
            <Text style={styles.sub}>Open the app in Expo Go on your iPhone to share.</Text>
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
        {/* Hidden WebView renders the canvas card */}
        <WebView
          source={{ html: buildHTML(stats) }}
          onMessage={handleMessage}
          onLoad={handleWebViewLoad}
          javaScriptEnabled
          style={styles.hiddenWebView}
          originWhitelist={["*"]}
        />

        {/* Loading card shown to user */}
        <View style={styles.sheet}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.title}>
            {status === "saving" ? "Opening share sheet…" : "Creating your card…"}
          </Text>
          <Text style={styles.sub}>Designing a beautiful travel summary</Text>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  hiddenWebView: {
    position: "absolute",
    width: 1080,
    height: 1080,
    opacity: 0,
    // Positioned off-screen so it renders but isn't visible
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
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#F1F5F9",
    textAlign: "center",
    marginTop: 8,
  },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  cancelBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 24 },
  cancelText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#64748B" },
  closeBtn: {
    marginTop: 8,
    backgroundColor: "#0F172A",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  closeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#F1F5F9" },
});
