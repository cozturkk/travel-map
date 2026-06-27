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
var ISO={"Afghanistan":"AF","Albania":"AL","Algeria":"DZ","Argentina":"AR","Armenia":"AM","Australia":"AU","Austria":"AT","Azerbaijan":"AZ","Bahrain":"BH","Bangladesh":"BD","Belgium":"BE","Bolivia":"BO","Bosnia and Herzegovina":"BA","Brazil":"BR","Bulgaria":"BG","Cambodia":"KH","Canada":"CA","Chile":"CL","China":"CN","Colombia":"CO","Croatia":"HR","Cuba":"CU","Cyprus":"CY","Czech Republic":"CZ","Denmark":"DK","Dominican Republic":"DO","Ecuador":"EC","Egypt":"EG","El Salvador":"SV","Estonia":"EE","Ethiopia":"ET","Finland":"FI","France":"FR","Georgia":"GE","Germany":"DE","Ghana":"GH","Greece":"GR","Guatemala":"GT","Honduras":"HN","Hungary":"HU","Iceland":"IS","India":"IN","Indonesia":"ID","Iran":"IR","Iraq":"IQ","Ireland":"IE","Israel":"IL","Italy":"IT","Ivory Coast":"CI","Jamaica":"JM","Japan":"JP","Jordan":"JO","Kazakhstan":"KZ","Kenya":"KE","Kuwait":"KW","Kyrgyzstan":"KG","Laos":"LA","Latvia":"LV","Lebanon":"LB","Libya":"LY","Lithuania":"LT","Luxembourg":"LU","Malaysia":"MY","Maldives":"MV","Malta":"MT","Mexico":"MX","Moldova":"MD","Mongolia":"MN","Montenegro":"ME","Morocco":"MA","Mozambique":"MZ","Myanmar":"MM","Nepal":"NP","Netherlands":"NL","New Zealand":"NZ","Nicaragua":"NI","Nigeria":"NG","North Macedonia":"MK","Norway":"NO","Oman":"OM","Pakistan":"PK","Palestine":"PS","Panama":"PA","Paraguay":"PY","Peru":"PE","Philippines":"PH","Poland":"PL","Portugal":"PT","Qatar":"QA","Romania":"RO","Russia":"RU","Saudi Arabia":"SA","Senegal":"SN","Serbia":"RS","Singapore":"SG","Slovakia":"SK","Slovenia":"SI","Somalia":"SO","South Africa":"ZA","South Korea":"KR","South Sudan":"SS","Spain":"ES","Sri Lanka":"LK","Sudan":"SD","Sweden":"SE","Switzerland":"CH","Syria":"SY","Tanzania":"TZ","Thailand":"TH","Tunisia":"TN","Turkey":"TR","Uganda":"UG","Ukraine":"UA","United Arab Emirates":"AE","United Kingdom":"GB","United States":"US","Uruguay":"UY","Uzbekistan":"UZ","Venezuela":"VE","Vietnam":"VN","Yemen":"YE","Zambia":"ZM","Zimbabwe":"ZW","Angola":"AO","Bahamas":"BS","Barbados":"BB","Belarus":"BY","Belize":"BZ","Benin":"BJ","Botswana":"BW","Brunei":"BN","Burkina Faso":"BF","Burundi":"BI","Cameroon":"CM","Cape Verde":"CV","Chad":"TD","Costa Rica":"CR","Democratic Republic of the Congo":"CD","Eritrea":"ER","Eswatini":"SZ","Fiji":"FJ","Gabon":"GA","Gambia":"GM","Guinea":"GN","Haiti":"HT","Lesotho":"LS","Liberia":"LR","Madagascar":"MG","Malawi":"MW","Mali":"ML","Mauritania":"MR","Mauritius":"MU","Monaco":"MC","Niger":"NE","Papua New Guinea":"PG","Rwanda":"RW","Seychelles":"SC","Sierra Leone":"SL","Suriname":"SR","Togo":"TG","Trinidad and Tobago":"TT","Vanuatu":"VU","Andorra":"AD","Kosovo":"XK","San Marino":"SM"};
function flag(n){var c=ISO[n];if(!c)return'';return c.split('').map(function(x){return String.fromCodePoint(0x1F1E6+x.charCodeAt(0)-65);}).join('');}

var W=1080,H=1920,GX=540,GY=470,GR=370;
var cv=document.getElementById('c'),ctx=cv.getContext('2d');
function send(m){try{window.ReactNativeWebView.postMessage(m);}catch(e){try{window.parent.postMessage(m,'*');}catch(e2){}}}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

// Background
var bg=ctx.createLinearGradient(0,0,0,H);
bg.addColorStop(0,'#0d1b2e');bg.addColorStop(1,'#091320');
ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

// Globe — clipped
ctx.save();
ctx.beginPath();ctx.arc(GX,GY,GR,0,Math.PI*2);ctx.clip();
var oc=ctx.createRadialGradient(GX-GR*0.28,GY-GR*0.28,0,GX,GY,GR);
oc.addColorStop(0,'#1f4068');oc.addColorStop(0.65,'#162a4a');oc.addColorStop(1,'#0c1d34');
ctx.fillStyle=oc;ctx.fillRect(GX-GR,GY-GR,GR*2,GR*2);

// Orthographic projection centred at 0°E 15°N
var P0=15*Math.PI/180;
function proj(la,lo){
  var p=la*Math.PI/180,l=lo*Math.PI/180;
  var cosc=Math.sin(P0)*Math.sin(p)+Math.cos(P0)*Math.cos(p)*Math.cos(l);
  if(cosc<0)return null;
  return[GX+GR*Math.cos(p)*Math.sin(l),GY-GR*(Math.cos(P0)*Math.sin(p)-Math.sin(P0)*Math.cos(p)*Math.cos(l))];
}
function blob(la,lo,rx,ry,rot){
  var pt=proj(la,lo);if(!pt)return;
  var p=la*Math.PI/180,l=lo*Math.PI/180;
  var cosc=Math.sin(P0)*Math.sin(p)+Math.cos(P0)*Math.cos(p)*Math.cos(l);
  if(cosc<0.08)return;
  var sc=0.2+cosc*0.8;
  ctx.save();ctx.translate(pt[0],pt[1]);ctx.rotate(rot||0);
  ctx.beginPath();ctx.ellipse(0,0,rx*sc,ry*sc,0,0,Math.PI*2);
  ctx.fill();ctx.restore();
}
ctx.fillStyle='#c2651a';
blob(2,20,94,132,0);       // Africa
blob(52,10,56,46,0.08);    // Europe
blob(-15,-58,60,90,0.12);  // South America
blob(72,-44,40,34,-0.08);  // Greenland
blob(50,-95,70,60,0);      // North America
blob(63,17,26,38,-0.05);   // Scandinavia
ctx.restore(); // end clip

// Globe rim glow
ctx.beginPath();ctx.arc(GX,GY,GR,0,Math.PI*2);
var rim=ctx.createRadialGradient(GX,GY,GR*0.72,GX,GY,GR);
rim.addColorStop(0,'rgba(20,80,180,0)');rim.addColorStop(0.82,'rgba(20,80,180,0.09)');rim.addColorStop(1,'rgba(50,130,255,0.52)');
ctx.fillStyle=rim;ctx.fill();
ctx.strokeStyle='rgba(70,145,255,0.38)';ctx.lineWidth=3;ctx.stroke();

// Dotted flight paths
ctx.setLineDash([7,16]);ctx.lineWidth=2.8;ctx.strokeStyle='rgba(200,100,20,0.52)';
ctx.beginPath();ctx.ellipse(GX+10,GY+22,GR*0.85,GR*0.27,0.24,0,Math.PI*2);ctx.stroke();
ctx.beginPath();ctx.ellipse(GX-12,GY-6,GR*0.78,GR*0.26,-0.26,0,Math.PI*2);ctx.stroke();
ctx.setLineDash([]);

// Airplanes on paths
ctx.font='52px serif';ctx.textAlign='center';
ctx.fillText('\u2708',GX+GR*0.60,GY+GR*0.13+18);
ctx.fillText('\u2708',GX-GR*0.54,GY-GR*0.08+18);

// Top bar
ctx.fillStyle='#1d4ed8';ctx.beginPath();ctx.arc(78,66,42,0,Math.PI*2);ctx.fill();
ctx.fillStyle='#fff';ctx.font='36px serif';ctx.textAlign='center';ctx.fillText('\u2708',78,79);
ctx.textAlign='left';ctx.fillStyle='rgba(240,248,255,0.92)';
ctx.font='bold 42px -apple-system,system-ui,Arial,sans-serif';ctx.fillText('Travel Map',136,80);

// Heading "My travels so far."
var hY=942;
ctx.textAlign='left';ctx.fillStyle='#f1f5f9';
ctx.font='bold 94px -apple-system,system-ui,Arial,sans-serif';
var htxt='My travels so far';
ctx.fillText(htxt,60,hY);
ctx.fillStyle='#3b82f6';
ctx.fillText('.',60+ctx.measureText(htxt).width,hY);

// Stat boxes
var bY=hY+58,bH=252,bGap=22;
var bW=Math.floor((W-60-60-bGap)/2);

// Left box — countries visited
ctx.fillStyle='#17355a';rr(60,bY,bW,bH,22);ctx.fill();
var cStr=String(D.countries);
var cFs=D.countries<10?178:D.countries<100?148:120;
ctx.fillStyle='#f1f5f9';ctx.font='bold '+cFs+'px -apple-system,system-ui,Arial,sans-serif';ctx.textAlign='left';
ctx.fillText(cStr,90,bY+32+Math.round(cFs*0.82));
ctx.fillStyle='rgba(180,212,255,0.72)';ctx.font='400 44px -apple-system,system-ui,Arial,sans-serif';
ctx.fillText('countries',90,bY+bH-56);
ctx.fillText('visited',90,bY+bH-10);

// Right box — % of world
var pct=Math.max(1,Math.round(D.countries/195*100));
var pStr=String(pct);
var pFs=pct<10?178:pct<100?148:120;
ctx.fillStyle='#2c1608';rr(60+bW+bGap,bY,bW,bH,22);ctx.fill();
ctx.fillStyle='#f1f5f9';ctx.font='bold '+pFs+'px -apple-system,system-ui,Arial,sans-serif';ctx.textAlign='left';
var pNumW=ctx.measureText(pStr).width;
var pBx=60+bW+bGap+90;
ctx.fillText(pStr,pBx,bY+32+Math.round(pFs*0.82));
ctx.font='bold '+Math.round(pFs*0.55)+'px -apple-system,system-ui,Arial,sans-serif';
ctx.fillText('%',pBx+pNumW+4,bY+32+Math.round(pFs*0.52));
ctx.fillStyle='rgba(255,200,140,0.72)';ctx.font='400 44px -apple-system,system-ui,Arial,sans-serif';
ctx.fillText('of the',pBx,bY+bH-56);
ctx.fillText('world',pBx,bY+bH-10);

// FLAGS COLLECTED
var fLabelY=bY+bH+78;
ctx.textAlign='left';ctx.fillStyle='rgba(160,190,230,0.55)';
ctx.font='600 36px -apple-system,system-ui,Arial,sans-serif';
ctx.fillText('FLAGS COLLECTED',60,fLabelY);

// Flag emojis — up to 10 per row, 2 rows max
var flags=D.visited.map(function(n){return flag(n);}).filter(function(f){return f!='';});
var fSize=82,fGap=10,fPerRow=Math.floor((W-120)/(fSize+fGap));
var fRowY=fLabelY+62;
ctx.font=fSize+'px serif';ctx.textAlign='left';
var maxFlags=fPerRow*2;
flags.slice(0,maxFlags).forEach(function(f,i){
  var row=Math.floor(i/fPerRow),col=i%fPerRow;
  ctx.fillText(f,60+col*(fSize+fGap),fRowY+row*(fSize+16)+fSize*0.88);
});
if(flags.length>maxFlags){
  var extraY=fRowY+(Math.ceil(Math.min(flags.length,maxFlags)/fPerRow))*(fSize+16)+16;
  ctx.fillStyle='rgba(160,190,230,0.55)';ctx.font='400 40px -apple-system,system-ui,Arial,sans-serif';
  ctx.fillText('+'+(flags.length-maxFlags)+' more',60,extraY);
}

// Footer
ctx.fillStyle='rgba(255,255,255,0.18)';ctx.fillRect(0,H-90,W,90);
ctx.fillStyle='rgba(200,220,255,0.45)';ctx.font='400 34px -apple-system,system-ui,Arial,sans-serif';ctx.textAlign='center';
ctx.fillText('made with Travel Map',W/2,H-28);

try{
  send(JSON.stringify({type:'shareCardReady',data:cv.toDataURL('image/jpeg',0.90)}));
}catch(e){
  try{send(JSON.stringify({type:'shareCardReady',data:cv.toDataURL('image/png')}));}
  catch(e2){send(JSON.stringify({type:'shareCardError',error:String(e2)}));}
}
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
            <Text style={styles.title}>Drawing your globe…</Text>
            <Text style={styles.sub}>Pinning your visited countries</Text>
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
                  <Text style={styles.shareBtnText}>
                    Share your stats
                  </Text>
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
