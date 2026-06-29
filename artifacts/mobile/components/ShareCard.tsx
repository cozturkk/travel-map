import * as Sharing from "expo-sharing";

// expo-file-system v19: the main export re-exports legacy stubs that THROW.
// The real legacy API lives at the /legacy subpath.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LegacyFS = require("expo-file-system/legacy") as {
  cacheDirectory: string | null;
  documentDirectory: string | null;
  EncodingType: { Base64: "base64" };
  writeAsStringAsync: (
    uri: string,
    contents: string,
    options: { encoding: string }
  ) => Promise<void>;
};
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
  cities: number;
  continents: number;
  countriesThisYear: number;
  citiesThisYear: number;
  travelingSince: number;
}

interface Props {
  visible: boolean;
  stats: ShareStats;
  onClose: () => void;
}

function buildHTML(stats: ShareStats): string {
  const year = new Date().getFullYear();
  const pct = Math.max(1, Math.round((stats.countries / 195) * 100));
  const since = stats.travelingSince > 0 ? String(stats.travelingSince) : '—';
  const data = JSON.stringify({
    n: stats.countries,
    ci: stats.cities,
    co: stats.continents,
    cy: stats.countriesThisYear,
    ic: stats.citiesThisYear,
    ts: since,
    pct,
    yr: year,
  });
  const LOGO_B64 = `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`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>*{margin:0;padding:0}html,body{width:1080px;height:1920px;overflow:hidden}#c{display:block;width:1080px;height:1920px}</style>
<meta name="viewport" content="width=1080,initial-scale=1,maximum-scale=1,user-scalable=no">
</head><body>
<img id="applogo" src="data:image/png;base64,${LOGO_B64}" style="display:none" crossorigin="anonymous">
<canvas id="c" width="1080" height="1920"></canvas>
<script>
(function(){
var D=${data};
var W=1080,H=1920,P=72;
var cv=document.getElementById('c'),ctx=cv.getContext('2d');
function send(m){try{window.ReactNativeWebView.postMessage(m);}catch(e){try{window.parent.postMessage(m,'*');}catch(e2){}}}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

function draw(){
  // Background
  var bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#141B3C');
  bg.addColorStop(0.42,'#3A2A6B');
  bg.addColorStop(0.72,'#8E3B6E');
  bg.addColorStop(1,'#C9663C');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  var glow=ctx.createRadialGradient(W/2,330,0,W/2,330,900);
  glow.addColorStop(0,'rgba(255,196,140,0.18)');
  glow.addColorStop(1,'rgba(255,196,140,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);

  // Branding
  var logoEl=document.getElementById('applogo');
  if(logoEl&&logoEl.complete&&logoEl.naturalWidth>0){
    ctx.save();
    ctx.beginPath();ctx.arc(P+44,128,44,0,Math.PI*2);ctx.clip();
    ctx.drawImage(logoEl,P,84,88,88);
    ctx.restore();
  }
  ctx.fillStyle='rgba(228,242,255,0.92)';
  ctx.font='bold 50px -apple-system,system-ui,sans-serif';
  ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText('Travel Map',P+106,128);

  // Hero number — total countries
  ctx.textBaseline='alphabetic';
  ctx.fillStyle='#FFFFFF';
  ctx.font='800 240px -apple-system,system-ui,sans-serif';
  ctx.textAlign='center';
  ctx.fillText(String(D.n),W/2,500);
  ctx.fillStyle='rgba(148,163,184,0.70)';
  ctx.font='500 60px -apple-system,system-ui,sans-serif';
  ctx.fillText('countries explored',W/2,576);
  // "so far" + amber period
  ctx.textAlign='left';
  var sf='so far';
  var sfW=ctx.measureText(sf).width;
  var dotW=ctx.measureText('.').width;
  var sfX=(W-sfW-dotW)/2;
  ctx.fillStyle='rgba(148,163,184,0.70)';
  ctx.fillText(sf,sfX,648);
  ctx.fillStyle='#F59E0B';
  ctx.fillText('.',sfX+sfW,648);

  // Box drawing helpers
  function shell(x,y,w,h,fill,stroke){
    rr(x,y,w,h,30);ctx.fillStyle=fill;ctx.fill();
    ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();
  }
  function statBox(x,y,w,h,val,label,accent){
    shell(x,y,w,h,'rgba(255,255,255,0.045)','rgba(255,255,255,0.09)');
    ctx.textAlign='center';
    ctx.textBaseline='alphabetic';
    ctx.fillStyle=accent||'#F8FAFC';
    ctx.font='800 92px -apple-system,system-ui,sans-serif';
    ctx.fillText(val,x+w/2,y+h*0.55);
    ctx.fillStyle='rgba(148,163,184,0.72)';
    ctx.font='500 38px -apple-system,system-ui,sans-serif';
    ctx.fillText(label,x+w/2,y+h-44);
  }

  // THIS YEAR highlight box
  var tyX=P, tyY=700, tyW=W-2*P, tyH=260;
  shell(tyX,tyY,tyW,tyH,'rgba(245,158,11,0.10)','rgba(245,158,11,0.34)');
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
  ctx.fillStyle='#F59E0B';
  ctx.font='700 34px -apple-system,system-ui,sans-serif';
  ctx.fillText('THIS YEAR \u00B7 '+String(D.yr),tyX+44,tyY+66);
  // vertical divider
  ctx.strokeStyle='rgba(245,158,11,0.22)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(tyX+tyW/2,tyY+96);ctx.lineTo(tyX+tyW/2,tyY+tyH-44);ctx.stroke();
  // two columns: countries / cities this year
  ctx.textAlign='center';
  var cL=tyX+tyW*0.27, cR=tyX+tyW*0.73, vY=tyY+tyH*0.66;
  ctx.fillStyle='#FFFFFF';ctx.font='800 84px -apple-system,system-ui,sans-serif';
  ctx.fillText(String(D.cy),cL,vY);
  ctx.fillText(String(D.ic),cR,vY);
  ctx.fillStyle='rgba(148,163,184,0.78)';ctx.font='500 36px -apple-system,system-ui,sans-serif';
  ctx.fillText('countries',cL,tyY+tyH-40);
  ctx.fillText('cities',cR,tyY+tyH-40);

  // 2x2 grid
  var gap=30;
  var bw=(W-2*P-gap)/2, bh=288;
  var r1=1010, r2=r1+bh+gap;
  var xL=P, xR=P+bw+gap;
  statBox(xL,r1,bw,bh,String(D.ci),'cities explored',null);
  statBox(xR,r1,bw,bh,String(D.co)+'/7','continents',null);
  statBox(xL,r2,bw,bh,String(D.pct)+'%','of the world',null);
  statBox(xR,r2,bw,bh,String(D.ts),'exploring since',null);

  // Footer
  ctx.fillStyle='rgba(255,255,255,0.04)';
  ctx.fillRect(0,H-110,W,110);
  ctx.fillStyle='rgba(148,163,184,0.30)';
  ctx.font='400 36px -apple-system,system-ui,sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('made with Travel Map',W/2,H-55);

  try{send(JSON.stringify({type:'shareCardReady',data:cv.toDataURL('image/jpeg',0.93)}));}
  catch(e){try{send(JSON.stringify({type:'shareCardReady',data:cv.toDataURL('image/png')}));}
  catch(e2){send(JSON.stringify({type:'shareCardError',error:String(e2)}));}}
}

var lEl=document.getElementById('applogo');
if(lEl&&lEl.complete){draw();}else if(lEl){lEl.onload=draw;lEl.onerror=draw;}else{draw();}
})();
</script></body></html>`;
}

type Status = "generating" | "preview" | "sharing";

export default function ShareCard({ visible, stats, onClose }: Props) {
  const [status, setStatus] = useState<Status>("generating");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const fileUriRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setStatus("generating");
      setImageUri(null);
      fileUriRef.current = null;
    }
  }, [visible]);

  const handleMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      try {
        const msg = JSON.parse(event.nativeEvent.data) as {
          type: string;
          data?: string;
          error?: string;
        };

        if (msg.type === "shareCardReady" && msg.data) {
          const isJpeg = msg.data.startsWith("data:image/jpeg");
          const ext = isJpeg ? "jpg" : "png";
          const base64 = msg.data.replace(/^data:image\/\w+;base64,/, "");
          const cacheDir = LegacyFS.cacheDirectory ?? LegacyFS.documentDirectory ?? "";
          const fileUri = cacheDir + `travel-share.${ext}`;
          await LegacyFS.writeAsStringAsync(fileUri, base64, {
            encoding: LegacyFS.EncodingType.Base64,
          });
          fileUriRef.current = fileUri;
          setImageUri(msg.data);
          setStatus("preview");
        } else if (msg.type === "shareCardError") {
          throw new Error(msg.error ?? "Unknown error");
        }
      } catch (err) {
        console.error("[ShareCard] handleMessage error:", err);
        Alert.alert(
          "Share failed",
          `Could not create the share card: ${err instanceof Error ? err.message : String(err)}`
        );
        onClose();
      }
    },
    [onClose]
  );

  const handleWebViewLoad = useCallback(() => {
    timerRef.current = setTimeout(() => {
      Alert.alert("Timeout", "Took too long to generate. Please try again.");
      onClose();
    }, 30000);
  }, [onClose]);

  const handleShare = useCallback(async () => {
    if (!fileUriRef.current) return;
    try {
      setStatus("sharing");
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUriRef.current, {
          mimeType: "image/jpeg",
          dialogTitle: "Share your travel map",
          UTI: "public.jpeg",
        });
      } else {
        Alert.alert("Saved", "Image saved to cache. Open Files to find it.");
      }
    } catch (err) {
      console.error("[ShareCard] share error:", err);
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
            <Text style={styles.sub}>Open the app on your iPhone to share.</Text>
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
            <Text style={styles.title}>Creating your card…</Text>
            <Text style={styles.sub}>Building your travel stats…</Text>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {(status === "preview" || status === "sharing") && imageUri && (
          <View style={styles.previewWrap}>
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
                {status === "sharing" ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.shareBtnText}>Share your stats</Text>
                )}
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

const PREVIEW_W = 260;
const PREVIEW_H = Math.round(PREVIEW_W * (1920 / 1080));

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
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
  previewWrap: { alignItems: "center", gap: 16, paddingHorizontal: 16 },
  previewImage: {
    width: PREVIEW_W,
    height: PREVIEW_H,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  previewActions: { alignItems: "center", gap: 4 },
  shareBtn: {
    backgroundColor: "#60A5FA",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    minWidth: 240,
    alignItems: "center",
    shadowColor: "#60A5FA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  shareBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
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
  cancelBtn: { marginTop: 4, paddingVertical: 10, paddingHorizontal: 24 },
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
