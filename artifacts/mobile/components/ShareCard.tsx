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
    visited: (stats.visitedCountries || []).slice(0, 60),
  });
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>*{margin:0;padding:0}html,body{width:1080px;height:1920px;overflow:hidden}</style>
</head><body>
<canvas id="c" width="1080" height="1920"></canvas>
<script>
(function(){
var D=${data};
var ISO={"Afghanistan":"AF","Albania":"AL","Algeria":"DZ","Argentina":"AR","Armenia":"AM","Australia":"AU","Austria":"AT","Azerbaijan":"AZ","Bahrain":"BH","Bangladesh":"BD","Belgium":"BE","Bolivia":"BO","Bosnia and Herzegovina":"BA","Brazil":"BR","Bulgaria":"BG","Cambodia":"KH","Canada":"CA","Chile":"CL","China":"CN","Colombia":"CO","Croatia":"HR","Cuba":"CU","Cyprus":"CY","Czech Republic":"CZ","Denmark":"DK","Dominican Republic":"DO","Ecuador":"EC","Egypt":"EG","El Salvador":"SV","Estonia":"EE","Ethiopia":"ET","Finland":"FI","France":"FR","Georgia":"GE","Germany":"DE","Ghana":"GH","Greece":"GR","Guatemala":"GT","Honduras":"HN","Hungary":"HU","Iceland":"IS","India":"IN","Indonesia":"ID","Iran":"IR","Iraq":"IQ","Ireland":"IE","Israel":"IL","Italy":"IT","Ivory Coast":"CI","Jamaica":"JM","Japan":"JP","Jordan":"JO","Kazakhstan":"KZ","Kenya":"KE","Kuwait":"KW","Laos":"LA","Latvia":"LV","Lebanon":"LB","Libya":"LY","Lithuania":"LT","Luxembourg":"LU","Malaysia":"MY","Maldives":"MV","Malta":"MT","Mexico":"MX","Moldova":"MD","Mongolia":"MN","Montenegro":"ME","Morocco":"MA","Mozambique":"MZ","Myanmar":"MM","Nepal":"NP","Netherlands":"NL","New Zealand":"NZ","Nigeria":"NG","North Macedonia":"MK","Norway":"NO","Oman":"OM","Pakistan":"PK","Palestine":"PS","Panama":"PA","Paraguay":"PY","Peru":"PE","Philippines":"PH","Poland":"PL","Portugal":"PT","Qatar":"QA","Romania":"RO","Russia":"RU","Saudi Arabia":"SA","Senegal":"SN","Serbia":"RS","Singapore":"SG","Slovakia":"SK","Slovenia":"SI","Somalia":"SO","South Africa":"ZA","South Korea":"KR","Spain":"ES","Sri Lanka":"LK","Sudan":"SD","Sweden":"SE","Switzerland":"CH","Syria":"SY","Tanzania":"TZ","Thailand":"TH","Tunisia":"TN","Turkey":"TR","Uganda":"UG","Ukraine":"UA","United Arab Emirates":"AE","United Kingdom":"GB","United States":"US","Uruguay":"UY","Uzbekistan":"UZ","Venezuela":"VE","Vietnam":"VN","Yemen":"YE","Zambia":"ZM","Zimbabwe":"ZW","Angola":"AO","Bahamas":"BS","Belarus":"BY","Benin":"BJ","Botswana":"BW","Brunei":"BN","Burkina Faso":"BF","Burundi":"BI","Cameroon":"CM","Cape Verde":"CV","Chad":"TD","Costa Rica":"CR","Democratic Republic of the Congo":"CD","Eritrea":"ER","Eswatini":"SZ","Fiji":"FJ","Gabon":"GA","Gambia":"GM","Guinea":"GN","Haiti":"HT","Lesotho":"LS","Liberia":"LR","Madagascar":"MG","Malawi":"MW","Mali":"ML","Mauritania":"MR","Mauritius":"MU","Monaco":"MC","Niger":"NE","Papua New Guinea":"PG","Rwanda":"RW","Seychelles":"SC","Sierra Leone":"SL","Suriname":"SR","Togo":"TG","Trinidad and Tobago":"TT","Andorra":"AD","Kosovo":"XK","San Marino":"SM"};
function flag(n){var c=ISO[n];if(!c)return'';return c.split('').map(function(x){return String.fromCodePoint(0x1F1E6+x.charCodeAt(0)-65);}).join('');}

var W=1080,H=1920,GX=540,GY=478,GR=388;
var cv=document.getElementById('c'),ctx=cv.getContext('2d');
function send(m){try{window.ReactNativeWebView.postMessage(m);}catch(e){try{window.parent.postMessage(m,'*');}catch(e2){}}}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

// Smooth organic blob using bezier-approximated ellipse
function organic(cx,cy,rx,ry,rot){
  ctx.save();ctx.translate(cx,cy);ctx.rotate(rot||0);
  var k=0.5522;
  ctx.beginPath();
  ctx.moveTo(0,-ry);
  ctx.bezierCurveTo(rx*k,-ry, rx,-ry*k, rx,0);
  ctx.bezierCurveTo(rx,ry*k, rx*k,ry, 0,ry);
  ctx.bezierCurveTo(-rx*k,ry, -rx,ry*k, -rx,0);
  ctx.bezierCurveTo(-rx,-ry*k, -rx*k,-ry, 0,-ry);
  ctx.closePath();ctx.fill();ctx.restore();
}

// Canvas-drawn airplane silhouette
function plane(x,y,rot,sz){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);
  ctx.fillStyle='rgba(238,188,72,0.96)';
  // body
  ctx.beginPath();ctx.moveTo(0,-sz);ctx.lineTo(sz*0.20,sz*0.38);ctx.lineTo(0,sz*0.16);ctx.lineTo(-sz*0.20,sz*0.38);ctx.closePath();ctx.fill();
  // wings
  ctx.beginPath();ctx.moveTo(-sz*0.74,-sz*0.06);ctx.lineTo(sz*0.74,-sz*0.06);ctx.lineTo(sz*0.20,sz*0.30);ctx.lineTo(-sz*0.20,sz*0.30);ctx.closePath();ctx.fill();
  // tail
  ctx.beginPath();ctx.moveTo(-sz*0.34,sz*0.33);ctx.lineTo(sz*0.34,sz*0.33);ctx.lineTo(sz*0.18,sz*0.54);ctx.lineTo(-sz*0.18,sz*0.54);ctx.closePath();ctx.fill();
  ctx.restore();
}

// ── Background ──────────────────────────────────────────────────────────────
var bg=ctx.createLinearGradient(0,0,0,H);
bg.addColorStop(0,'#0c1a2c');bg.addColorStop(0.45,'#0a1624');bg.addColorStop(1,'#07101c');
ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

// Subtle radial glow behind globe
var glow=ctx.createRadialGradient(GX,GY,GR*0.3,GX,GY,GR*1.5);
glow.addColorStop(0,'rgba(25,75,170,0.12)');glow.addColorStop(1,'rgba(25,75,170,0)');
ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);

// ── Globe — ocean clipped ────────────────────────────────────────────────────
ctx.save();
ctx.beginPath();ctx.arc(GX,GY,GR,0,Math.PI*2);ctx.clip();
var oc=ctx.createRadialGradient(GX-GR*0.30,GY-GR*0.28,0, GX,GY,GR);
oc.addColorStop(0,'#1e4272');oc.addColorStop(0.50,'#142e58');oc.addColorStop(1,'#0a1c38');
ctx.fillStyle=oc;ctx.fillRect(GX-GR,GY-GR,GR*2,GR*2);

// Continent blobs — positions are pixel offsets relative to globe centre
// Expressed as multiples of GR so they scale with globe size
ctx.fillStyle='#c96318';
organic(GX+0.07*GR, GY+0.07*GR,  0.245*GR, 0.345*GR,  0.04);  // Africa
organic(GX-0.04*GR, GY-0.29*GR,  0.162*GR, 0.132*GR, -0.08);  // Europe
organic(GX-0.44*GR, GY+0.20*GR,  0.140*GR, 0.260*GR,  0.14);  // S. America
organic(GX-0.31*GR, GY-0.50*GR,  0.110*GR, 0.090*GR, -0.18);  // Greenland
organic(GX-0.60*GR, GY-0.10*GR,  0.100*GR, 0.140*GR,  0.10);  // N. America (edge)
organic(GX+0.31*GR, GY-0.08*GR,  0.085*GR, 0.125*GR,  0.16);  // Arabian Peninsula
organic(GX+0.07*GR, GY-0.46*GR,  0.072*GR, 0.128*GR, -0.04);  // Scandinavia
ctx.restore(); // end ocean clip

// Rim glow (drawn after clip so it covers the globe edge)
ctx.beginPath();ctx.arc(GX,GY,GR,0,Math.PI*2);
var rim=ctx.createRadialGradient(GX,GY,GR*0.74, GX,GY,GR);
rim.addColorStop(0,'rgba(18,72,200,0)');rim.addColorStop(1,'rgba(42,122,255,0.50)');
ctx.fillStyle=rim;ctx.fill();
ctx.strokeStyle='rgba(62,138,255,0.52)';ctx.lineWidth=3.2;ctx.stroke();

// ── Orbital flight paths (dashed ellipses, outside globe clip) ───────────────
ctx.save();
ctx.setLineDash([10,19]);ctx.lineWidth=3.4;ctx.strokeStyle='rgba(212,106,18,0.74)';
ctx.beginPath();ctx.ellipse(GX+6,GY+20, GR*0.88,GR*0.284, 0.20, 0,Math.PI*2);ctx.stroke();
ctx.restore();
ctx.save();
ctx.setLineDash([10,19]);ctx.lineWidth=3.4;ctx.strokeStyle='rgba(212,106,18,0.60)';
ctx.beginPath();ctx.ellipse(GX-8,GY-8,  GR*0.80,GR*0.268,-0.22, 0,Math.PI*2);ctx.stroke();
ctx.restore();

// ── Airplanes on orbital paths ───────────────────────────────────────────────
plane(GX+GR*0.62, GY+GR*0.16, -0.32, 32);
plane(GX-GR*0.56, GY-GR*0.10,  2.60, 32);

// ── Top bar ──────────────────────────────────────────────────────────────────
ctx.fillStyle='#1a46bb';ctx.beginPath();ctx.arc(72,62,40,0,Math.PI*2);ctx.fill();
plane(72,62, 0, 16);
ctx.fillStyle='rgba(228,242,255,0.92)';
ctx.font='bold 42px -apple-system,system-ui,Arial,sans-serif';ctx.textAlign='left';
ctx.fillText('Travel Map',128,76);

// ── Heading ───────────────────────────────────────────────────────────────────
var hY=960;
ctx.textAlign='left';ctx.fillStyle='#f1f5f9';
ctx.font='bold 98px -apple-system,system-ui,Arial,sans-serif';
var htxt='My travels so far';
ctx.fillText(htxt,60,hY);
ctx.fillStyle='#4a9cff';
ctx.fillText('.',60+ctx.measureText(htxt).width,hY);

// ── Stat boxes ────────────────────────────────────────────────────────────────
var bY=hY+64, bH=272, bGap=22, bW=Math.floor((W-120-bGap)/2);

// Left box — countries visited
ctx.fillStyle='#162e50';rr(60,bY,bW,bH,24);ctx.fill();
var cStr=String(D.countries);
var cFs=cStr.length<2?168:cStr.length<3?140:115;
var cBase=bY+22+Math.round(cFs*0.74);
ctx.fillStyle='#f1f5f9';ctx.font='bold '+cFs+'px -apple-system,system-ui,Arial,sans-serif';ctx.textAlign='left';
ctx.fillText(cStr,88,cBase);
ctx.fillStyle='rgba(152,204,255,0.70)';ctx.font='400 43px -apple-system,system-ui,Arial,sans-serif';
ctx.fillText('countries',88,bY+bH-56);
ctx.fillText('visited',88,bY+bH-10);

// Right box — % of world
var pct=Math.max(1,Math.round(D.countries/195*100));
var pStr=String(pct);
var pFs=pStr.length<2?168:pStr.length<3?140:115;
var pBase=bY+22+Math.round(pFs*0.74);
var rBx=60+bW+bGap;
ctx.fillStyle='#2b1507';rr(rBx,bY,bW,bH,24);ctx.fill();
var pNumW;
ctx.fillStyle='#f1f5f9';ctx.font='bold '+pFs+'px -apple-system,system-ui,Arial,sans-serif';ctx.textAlign='left';
pNumW=ctx.measureText(pStr).width;
ctx.fillText(pStr,rBx+28,pBase);
// % as superscript (smaller, raised)
ctx.font='bold '+Math.round(pFs*0.50)+'px -apple-system,system-ui,Arial,sans-serif';
ctx.fillText('%',rBx+28+pNumW+8, bY+22+Math.round(pFs*0.40));
ctx.fillStyle='rgba(255,193,112,0.70)';ctx.font='400 43px -apple-system,system-ui,Arial,sans-serif';
ctx.fillText('of the',rBx+28,bY+bH-56);
ctx.fillText('world',rBx+28,bY+bH-10);

// ── FLAGS COLLECTED ───────────────────────────────────────────────────────────
var flY=bY+bH+82;
ctx.textAlign='left';ctx.fillStyle='rgba(132,174,224,0.52)';
ctx.font='600 34px -apple-system,system-ui,Arial,sans-serif';
ctx.fillText('FLAGS COLLECTED',60,flY);

var flags=D.visited.map(function(n){return flag(n);}).filter(function(f){return f!='';});
var fSz=76,fStep=90,fPerRow=Math.floor((W-120)/fStep);
ctx.font=fSz+'px serif';ctx.textAlign='left';
var maxF=fPerRow*2;
flags.slice(0,maxF).forEach(function(f,i){
  var row=Math.floor(i/fPerRow),col=i%fPerRow;
  ctx.fillText(f, 60+col*fStep, flY+56+row*96+fSz);
});
if(flags.length>maxF){
  ctx.fillStyle='rgba(132,174,224,0.52)';ctx.font='400 38px -apple-system,system-ui,Arial,sans-serif';
  ctx.fillText('+'+(flags.length-maxF)+' more',60, flY+56+2*96+fSz+10);
}

// ── Footer ────────────────────────────────────────────────────────────────────
ctx.fillStyle='rgba(255,255,255,0.07)';ctx.fillRect(0,H-84,W,84);
ctx.fillStyle='rgba(172,208,255,0.36)';ctx.font='400 34px -apple-system,system-ui,Arial,sans-serif';ctx.textAlign='center';
ctx.fillText('made with Travel Map',W/2,H-24);

try{send(JSON.stringify({type:'shareCardReady',data:cv.toDataURL('image/jpeg',0.92)}));}
catch(e){try{send(JSON.stringify({type:'shareCardReady',data:cv.toDataURL('image/png')}));}catch(e2){send(JSON.stringify({type:'shareCardError',error:String(e2)}));}}
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
    }, 25000);
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
            <Text style={styles.sub}>Drawing globe and collecting your flags</Text>
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
