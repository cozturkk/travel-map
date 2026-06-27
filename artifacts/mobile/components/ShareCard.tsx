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

// Compact centroid table [lat, lon] — no network needed
const CENTROIDS_JS = `var C={
"Afghanistan":[33,65],"Albania":[41,20],"Algeria":[28,3],"Andorra":[42.5,1.5],"Angola":[-12,18],
"Antigua and Barbuda":[17,-61.8],"Argentina":[-34,-64],"Armenia":[40,45],"Australia":[-27,133],"Austria":[47,14],
"Azerbaijan":[40.5,47.5],"Bahamas":[24,-76],"Bahrain":[26,50.5],"Bangladesh":[24,90],"Barbados":[13,-59.5],
"Belarus":[53,28],"Belgium":[50.8,4],"Belize":[17,-88.8],"Benin":[9.3,2.3],"Bhutan":[27.5,90.5],
"Bolivia":[-17,-65],"Bosnia and Herzegovina":[44,17],"Botswana":[-22,24],"Brazil":[-10,-53],"Brunei":[4.5,114.7],
"Bulgaria":[43,25],"Burkina Faso":[12,-2],"Burundi":[-3.5,30],"Cambodia":[13,105],"Cameroon":[6,12],
"Canada":[60,-95],"Cape Verde":[16,-24],"Central African Republic":[7,21],"Chad":[15,19],"Chile":[-30,-71],
"China":[35,105],"Colombia":[4,-72],"Comoros":[-11.6,43.3],"Costa Rica":[10,-84],"Croatia":[45,16],
"Cuba":[22,-79],"Cyprus":[35,33],"Czech Republic":[50,15.5],"Democratic Republic of the Congo":[-4,24],
"Denmark":[56,10],"Djibouti":[11.5,43],"Dominica":[15.4,-61.4],"Dominican Republic":[19,-70.7],"East Timor":[-8.8,125.7],
"Ecuador":[-2,-77.5],"Egypt":[27,30],"El Salvador":[13.8,-88.9],"Equatorial Guinea":[2,10],"Eritrea":[15,39],
"Estonia":[59,26],"Eswatini":[-26.5,31.5],"Ethiopia":[8,38],"Fiji":[-18,178],"Finland":[64,26],
"France":[46,2],"Gabon":[-1,11.5],"Gambia":[13.5,-15.5],"Georgia":[42,43.5],"Germany":[51,9],
"Ghana":[8,-2],"Greece":[39,22],"Grenada":[12.1,-61.7],"Guatemala":[15.5,-90.3],"Guinea":[11,-10.5],
"Guinea-Bissau":[12,-15],"Guyana":[5,-59],"Haiti":[19,-72.4],"Honduras":[15,-87],"Hungary":[47,19],
"Iceland":[65,-18],"India":[20,77],"Indonesia":[-5,120],"Iran":[32,53],"Iraq":[33,44],
"Ireland":[53,-8],"Israel":[31.5,35],"Italy":[42.8,12.8],"Ivory Coast":[7.5,-5.5],"Jamaica":[18,-77.5],
"Japan":[36,138],"Jordan":[31,36],"Kazakhstan":[48,68],"Kenya":[1,38],"Kiribati":[1.4,173],
"Kosovo":[42.6,20.9],"Kuwait":[29.3,47.7],"Kyrgyzstan":[41,75],"Laos":[18,103],"Latvia":[57,25],
"Lebanon":[33.9,35.5],"Lesotho":[-29.5,28.5],"Liberia":[6.5,-9.5],"Libya":[25,17],"Liechtenstein":[47.1,9.5],
"Lithuania":[56,24],"Luxembourg":[49.8,6.1],"Madagascar":[-20,47],"Malawi":[-13.5,34],"Malaysia":[3,109],
"Maldives":[3.2,73.2],"Mali":[17,-4],"Malta":[35.9,14.5],"Marshall Islands":[7,171],"Mauritania":[20,-12],
"Mauritius":[-20.2,57.5],"Mexico":[23,-102],"Micronesia":[7,150],"Moldova":[47,29],"Monaco":[43.7,7.4],
"Mongolia":[46,105],"Montenegro":[42.5,19.3],"Morocco":[32,-5],"Mozambique":[-18,35],"Myanmar":[17,96],
"Namibia":[-22,17],"Nauru":[-0.5,166.9],"Nepal":[28,84],"Netherlands":[52.5,5.3],"New Zealand":[-41,174],
"Nicaragua":[13,-85],"Niger":[17,8],"Nigeria":[10,8],"North Korea":[40,127],"North Macedonia":[41.8,22],
"Norway":[62,10],"Oman":[22,57.5],"Pakistan":[30,70],"Palau":[7.5,134.6],"Palestine":[32,35.2],
"Panama":[9,-80],"Papua New Guinea":[-6,147],"Paraguay":[-23,-58],"Peru":[-10,-76],"Philippines":[13,122],
"Poland":[52,20],"Portugal":[39.5,-8],"Qatar":[25.3,51.2],"Romania":[46,25],"Russia":[60,100],
"Rwanda":[-2,30],"Saint Kitts and Nevis":[17.3,-62.7],"Saint Lucia":[13.9,-60.9],
"Saint Vincent and the Grenadines":[13.3,-61.2],"Samoa":[-13.9,-172],"San Marino":[43.9,12.5],
"Sao Tome and Principe":[1,7],"Saudi Arabia":[25,45],"Senegal":[14,-14],"Serbia":[44,21],
"Seychelles":[-4.7,55.5],"Sierra Leone":[8.5,-11.5],"Singapore":[1.4,103.8],"Slovakia":[48.7,19.5],
"Slovenia":[46.1,14.9],"Solomon Islands":[-9,160],"Somalia":[10,49],"South Africa":[-29,25],
"South Korea":[37,127.5],"South Sudan":[7,30],"Spain":[40,-3.7],"Sri Lanka":[7,81],"Sudan":[15,30],
"Suriname":[4,-56],"Sweden":[62,15],"Switzerland":[47,8],"Syria":[35,38],"Tajikistan":[39,71],
"Tanzania":[-6,35],"Thailand":[15,101],"Togo":[8,1],"Tonga":[-21,-175],"Trinidad and Tobago":[10.5,-61.2],
"Tunisia":[34,9],"Turkey":[39,35],"Turkmenistan":[40,60],"Tuvalu":[-8,178],"Uganda":[1,32],
"Ukraine":[49,32],"United Arab Emirates":[24,54],"United Kingdom":[55,-3],"United States":[38,-97],
"Uruguay":[-33,-56],"Uzbekistan":[41,64],"Vanuatu":[-16,167],"Vatican City":[41.9,12.5],
"Venezuela":[8,-66],"Vietnam":[16,108],"Yemen":[15,48],"Zambia":[-13,28],"Zimbabwe":[-20,30]
};`;

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
</head><body>
<canvas id="c" width="1080" height="1920"></canvas>
<script>
(function(){
var D=${data};
${CENTROIDS_JS}
var W=1080,H=1920,GX=540,GY=610,GR=420;
var cv=document.getElementById('c'),ctx=cv.getContext('2d');

function proj(lat,lon){
  var L0=10*Math.PI/180,P0=20*Math.PI/180;
  var p=lat*Math.PI/180,l=lon*Math.PI/180,dl=l-L0;
  var cosc=Math.sin(P0)*Math.sin(p)+Math.cos(P0)*Math.cos(p)*Math.cos(dl);
  if(cosc<0)return null;
  return[GX+GR*Math.cos(p)*Math.sin(dl), GY-GR*(Math.cos(P0)*Math.sin(p)-Math.sin(P0)*Math.cos(p)*Math.cos(dl))];
}
function send(m){try{window.ReactNativeWebView.postMessage(m);}catch(e){try{window.parent.postMessage(m,'*');}catch(e2){}}}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

ctx.fillStyle='#0F172A';ctx.fillRect(0,0,W,H);

var gl=ctx.createRadialGradient(GX,GY,GR*0.3,GX,GY,GR*1.6);
gl.addColorStop(0,'rgba(96,165,250,0.08)');gl.addColorStop(1,'rgba(96,165,250,0)');
ctx.fillStyle=gl;ctx.fillRect(0,0,W,H);

ctx.beginPath();ctx.arc(GX,GY,GR,0,Math.PI*2);
var oc=ctx.createRadialGradient(GX-60,GY-70,0,GX,GY,GR);
oc.addColorStop(0,'#1e3f6e');oc.addColorStop(1,'#0d1e34');
ctx.fillStyle=oc;ctx.fill();

function gline(pts){var on=false;ctx.beginPath();pts.forEach(function(pt){if(!pt){on=false;return;}if(!on){ctx.moveTo(pt[0],pt[1]);on=true;}else ctx.lineTo(pt[0],pt[1]);});ctx.stroke();}
ctx.strokeStyle='rgba(96,165,250,0.13)';ctx.lineWidth=1.3;
[-60,-30,0,30,60].forEach(function(lat){var a=[];for(var lo=-180;lo<=180;lo+=3)a.push(proj(lat,lo));gline(a);});
[-150,-120,-90,-60,-30,0,30,60,90,120,150,180].forEach(function(lo){var a=[];for(var la=-88;la<=88;la+=3)a.push(proj(la,lo));gline(a);});

Object.keys(C).forEach(function(name){
  if(D.visited.indexOf(name)>=0)return;
  var cd=C[name],pt=proj(cd[0],cd[1]);if(!pt)return;
  ctx.beginPath();ctx.arc(pt[0],pt[1],5,0,Math.PI*2);ctx.fillStyle='rgba(96,165,250,0.20)';ctx.fill();
});

D.visited.forEach(function(name){
  var cd=C[name];if(!cd)return;
  var pt=proj(cd[0],cd[1]);if(!pt)return;
  ctx.beginPath();ctx.arc(pt[0],pt[1],22,0,Math.PI*2);ctx.fillStyle='rgba(251,146,60,0.25)';ctx.fill();
  ctx.beginPath();ctx.arc(pt[0],pt[1],14,0,Math.PI*2);ctx.fillStyle='#FB923C';ctx.fill();
  ctx.beginPath();ctx.arc(pt[0],pt[1],6,0,Math.PI*2);ctx.fillStyle='#FED7AA';ctx.fill();
});

ctx.beginPath();ctx.arc(GX,GY,GR,0,Math.PI*2);
var rim=ctx.createLinearGradient(GX-GR,GY,GX+GR,GY);
rim.addColorStop(0,'rgba(96,165,250,0.5)');rim.addColorStop(0.5,'rgba(96,165,250,0.1)');rim.addColorStop(1,'rgba(96,165,250,0.45)');
ctx.strokeStyle=rim;ctx.lineWidth=2.5;ctx.stroke();

ctx.fillStyle='rgba(15,23,42,0.72)';ctx.fillRect(0,0,W,190);
ctx.fillStyle='#60A5FA';ctx.font='bold 52px -apple-system,system-ui,Arial,sans-serif';ctx.textAlign='left';
ctx.fillText('TRAVEL MAP',60,112);
var ag=ctx.createLinearGradient(60,0,440,0);ag.addColorStop(0,'#60A5FA');ag.addColorStop(1,'rgba(96,165,250,0)');
ctx.fillStyle=ag;ctx.fillRect(60,130,380,3);

var fd=ctx.createLinearGradient(0,GY+GR*0.3,0,H);
fd.addColorStop(0,'rgba(15,23,42,0)');fd.addColorStop(0.18,'rgba(15,23,42,0.92)');fd.addColorStop(0.28,'rgba(15,23,42,1)');fd.addColorStop(1,'rgba(15,23,42,1)');
ctx.fillStyle=fd;ctx.fillRect(0,GY+GR*0.28,W,H-GY-GR*0.28);

var sY=1080,ns=String(D.countries),fs=ns.length<=1?260:ns.length<=2?230:200;
var ng=ctx.createLinearGradient(0,sY,0,sY+fs);ng.addColorStop(0,'#FB923C');ng.addColorStop(1,'#EA580C');
ctx.fillStyle=ng;ctx.font='bold '+fs+'px -apple-system,system-ui,Arial,sans-serif';ctx.textAlign='center';
ctx.fillText(ns,W/2,sY+fs*0.82);
ctx.fillStyle='rgba(248,250,252,0.40)';ctx.font='400 50px -apple-system,system-ui,Arial,sans-serif';
ctx.fillText('countries explored',W/2,sY+fs+24);

var by=sY+fs+102,bw=(W-108-60)/4,bh=155;
[{v:D.streak>0?D.streak+' mo':'-',l:'STREAK',c:'#F97316'},{v:D.best>0?D.best+' mo':'-',l:'BEST',c:'#A78BFA'},{v:D.months>0?String(D.months):'-',l:'MONTHS',c:'#60A5FA'},{v:String(D.bucket),l:'BUCKET',c:'#34D399'}]
.forEach(function(b,i){
  var bx=54+i*(bw+20);
  ctx.fillStyle='rgba(30,41,59,0.85)';rr(bx,by,bw,bh,18);ctx.fill();
  ctx.fillStyle=b.c;ctx.font='bold 58px -apple-system,system-ui,Arial,sans-serif';ctx.textAlign='center';
  ctx.fillText(b.v,bx+bw/2,by+100);
  ctx.fillStyle='rgba(100,116,139,0.9)';ctx.font='600 23px -apple-system,system-ui,Arial,sans-serif';
  ctx.fillText(b.l,bx+bw/2,by+140);
});

if(D.visited.length>0){
  var ly=by+bh+68;
  ctx.textAlign='left';ctx.fillStyle='rgba(100,116,139,0.72)';ctx.font='600 28px -apple-system,system-ui,Arial,sans-serif';
  ctx.fillText('VISITED',54,ly);
  D.visited.slice(0,8).forEach(function(name,i){
    var col=Math.floor(i/4),row=i%4;
    ctx.fillStyle='rgba(248,250,252,0.82)';ctx.font='400 34px -apple-system,system-ui,Arial,sans-serif';
    ctx.fillText('\u2022 '+name,54+col*(W/2-20),ly+52+row*57);
  });
  if(D.visited.length>8){
    ctx.fillStyle='rgba(100,116,139,0.65)';ctx.font='400 28px -apple-system,system-ui,Arial,sans-serif';
    ctx.fillText('+ '+(D.visited.length-8)+' more countries',54,ly+52+4*57);
  }
}

ctx.fillStyle='rgba(96,165,250,0.1)';ctx.fillRect(0,H-80,W,80);
ctx.fillStyle='rgba(248,250,252,0.3)';ctx.font='400 28px -apple-system,system-ui,Arial,sans-serif';ctx.textAlign='center';
ctx.fillText('Travel Map \u2014 Track your world adventures',W/2,H-24);

try{
  var url=cv.toDataURL('image/jpeg',0.88);
  send(JSON.stringify({type:'shareCardReady',data:url}));
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
                    Share to WhatsApp / Instagram
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
