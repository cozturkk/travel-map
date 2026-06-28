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

var W=1080,H=1920,GX=540,GY=490,GR=395;
var cv=document.getElementById('c'),ctx=cv.getContext('2d');
function send(m){try{window.ReactNativeWebView.postMessage(m);}catch(e){try{window.parent.postMessage(m,'*');}catch(e2){}}}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

// Cloud puff
function cloud(cx,cy,sz){
  var pts=[[0,-0.05,1],[0.50,0.14,0.72],[-0.50,0.14,0.72],[0.90,0.34,0.55],[-0.90,0.34,0.55]];
  pts.forEach(function(p){ctx.beginPath();ctx.arc(cx+sz*p[0],cy+sz*p[1],sz*p[2],0,Math.PI*2);ctx.fill();});
}

// Top-down airplane silhouette
function bigPlane(x,y,rot,sz){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);
  ctx.fillStyle='rgba(228,175,52,0.97)';
  ctx.beginPath();ctx.ellipse(0,0,sz*0.115,sz,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-sz*0.06,sz*0.08);ctx.lineTo(-sz*0.82,sz*0.28);ctx.lineTo(-sz*0.78,sz*0.42);
  ctx.lineTo(-sz*0.06,sz*0.36);ctx.lineTo(sz*0.06,sz*0.36);ctx.lineTo(sz*0.78,sz*0.42);
  ctx.lineTo(sz*0.82,sz*0.28);ctx.lineTo(sz*0.06,sz*0.08);ctx.closePath();ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-sz*0.06,sz*0.72);ctx.lineTo(-sz*0.38,sz*0.82);ctx.lineTo(-sz*0.36,sz*0.94);
  ctx.lineTo(-sz*0.06,sz*0.90);ctx.lineTo(sz*0.06,sz*0.90);ctx.lineTo(sz*0.36,sz*0.94);
  ctx.lineTo(sz*0.38,sz*0.82);ctx.lineTo(sz*0.06,sz*0.72);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.ellipse(-sz*0.40,sz*0.26,sz*0.07,sz*0.14,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(sz*0.40,sz*0.26,sz*0.07,sz*0.14,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

// Fallback organic blob (used if D3 not loaded)
function organic(cx,cy,rx,ry,rot){
  ctx.save();ctx.translate(cx,cy);ctx.rotate(rot||0);
  var k=0.5522;
  ctx.beginPath();ctx.moveTo(0,-ry);
  ctx.bezierCurveTo(rx*k,-ry,rx,-ry*k,rx,0);ctx.bezierCurveTo(rx,ry*k,rx*k,ry,0,ry);
  ctx.bezierCurveTo(-rx*k,ry,-rx,ry*k,-rx,0);ctx.bezierCurveTo(-rx,-ry*k,-rx*k,-ry,0,-ry);
  ctx.closePath();ctx.fill();ctx.restore();
}

function drawFallbackContinents(){
  ctx.fillStyle='#c96318';
  organic(GX+0.09*GR,GY+0.09*GR,0.255*GR,0.355*GR,0.05);
  organic(GX-0.02*GR,GY-0.30*GR,0.170*GR,0.140*GR,-0.07);
  organic(GX-0.46*GR,GY+0.22*GR,0.155*GR,0.270*GR,0.14);
  organic(GX-0.63*GR,GY-0.12*GR,0.140*GR,0.200*GR,0.12);
  organic(GX+0.33*GR,GY-0.04*GR,0.095*GR,0.138*GR,0.18);
  organic(GX-0.28*GR,GY-0.52*GR,0.120*GR,0.100*GR,-0.16);
  organic(GX+0.09*GR,GY-0.46*GR,0.070*GR,0.130*GR,-0.03);
}

function drawCard(land){
  // ── Background ──────────────────────────────────────────────────────────────
  var bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0c1b2e');bg.addColorStop(0.44,'#0a1726');bg.addColorStop(1,'#07101d');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  // Globe atmosphere glow
  var glow=ctx.createRadialGradient(GX,GY,GR*0.28,GX,GY,GR*1.55);
  glow.addColorStop(0,'rgba(22,70,175,0.15)');glow.addColorStop(1,'rgba(22,70,175,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);

  // ── Globe clip ───────────────────────────────────────────────────────────────
  ctx.save();
  ctx.beginPath();ctx.arc(GX,GY,GR,0,Math.PI*2);ctx.clip();

  // Ocean
  var oc=ctx.createRadialGradient(GX-GR*0.32,GY-GR*0.30,0,GX,GY,GR);
  oc.addColorStop(0,'#1f4474');oc.addColorStop(0.50,'#132e5a');oc.addColorStop(1,'#0a1c3a');
  ctx.fillStyle=oc;ctx.fillRect(GX-GR,GY-GR,GR*2,GR*2);

  // Land — real D3 map or blob fallback
  if(land && typeof d3!=='undefined'){
    var proj=d3.geoOrthographic()
      .scale(GR).translate([GX,GY])
      .rotate([10,-20]).clipAngle(90).precision(0.5);
    var pg=d3.geoPath().projection(proj).context(ctx);
    ctx.fillStyle='#c96318';
    ctx.beginPath();pg(land);ctx.fill();
    // Subtle land border
    ctx.strokeStyle='rgba(160,72,16,0.45)';ctx.lineWidth=1.2;
    ctx.beginPath();pg(land);ctx.stroke();
  } else {
    drawFallbackContinents();
  }

  // Clouds at globe edges
  ctx.fillStyle='rgba(192,214,255,0.78)';
  cloud(GX-GR*0.60,GY-GR*0.54,36);
  cloud(GX-GR*0.70,GY+GR*0.38,30);
  cloud(GX+GR*0.54,GY-GR*0.52,30);
  cloud(GX+GR*0.60,GY+GR*0.36,26);

  // Dashed flight paths
  ctx.save();
  ctx.setLineDash([13,17]);ctx.lineWidth=4.2;
  ctx.strokeStyle='rgba(218,108,18,0.82)';ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(GX-GR*0.80,GY+GR*0.56);
  ctx.quadraticCurveTo(GX-GR*0.08,GY-GR*0.56,GX+GR*0.88,GY+GR*0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(GX+GR*0.12,GY-GR*0.74);
  ctx.quadraticCurveTo(GX+GR*0.90,GY-GR*0.18,GX+GR*0.74,GY+GR*0.64);
  ctx.stroke();
  ctx.restore();

  // Large airplane
  bigPlane(GX+GR*0.06,GY-GR*0.40,-0.68,90);

  ctx.restore(); // end globe clip

  // Globe rim + edge glow
  ctx.beginPath();ctx.arc(GX,GY,GR,0,Math.PI*2);
  var rim=ctx.createRadialGradient(GX,GY,GR*0.76,GX,GY,GR);
  rim.addColorStop(0,'rgba(18,72,210,0)');rim.addColorStop(1,'rgba(40,118,255,0.48)');
  ctx.fillStyle=rim;ctx.fill();
  ctx.strokeStyle='rgba(58,136,255,0.55)';ctx.lineWidth=3.5;ctx.stroke();

  // ── Top bar ──────────────────────────────────────────────────────────────────
  ctx.fillStyle='#1a46bb';ctx.beginPath();ctx.arc(72,62,40,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.translate(72,62);ctx.rotate(-0.5);ctx.fillStyle='rgba(228,175,52,0.97)';
  ctx.beginPath();ctx.ellipse(0,0,4,14,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(-14,-2);ctx.lineTo(14,-2);ctx.lineTo(5,5);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(-6,7);ctx.lineTo(6,7);ctx.lineTo(4,13);ctx.lineTo(-4,13);ctx.closePath();ctx.fill();
  ctx.restore();
  ctx.fillStyle='rgba(228,242,255,0.94)';
  ctx.font='bold 42px -apple-system,system-ui,Arial,sans-serif';
  ctx.textAlign='left';ctx.fillText('Travel Map',128,76);

  // ── Heading ───────────────────────────────────────────────────────────────────
  var hY=976;
  ctx.textAlign='left';ctx.fillStyle='#F8FAFC';
  ctx.font='bold 96px -apple-system,system-ui,Arial,sans-serif';
  var htxt='My travels so far';
  ctx.fillText(htxt,60,hY);
  ctx.fillStyle='#60A5FA';
  ctx.fillText('.',60+ctx.measureText(htxt).width,hY);

  // ── Stat boxes — matching BigStatCard in the app exactly ────────────────────
  // App: card {borderRadius:20, padding:18, minHeight:130, justifyContent:'flex-end'}
  //      icon {fontSize:52, position:'absolute', top:10, right:10, opacity:0.35}
  //      value {fontSize:44, fontFamily:'Inter_700Bold', color:'#fff', lineHeight:48}
  //      label {fontSize:14, fontFamily:'Inter_400Regular', color:'rgba(255,255,255,0.65)'}
  // Canvas scale ≈ 1080/390 = 2.77×
  var SC=2.77;
  var bY=hY+60, bH=Math.round(130*SC), bGap=Math.round(12*SC);
  var bW=Math.floor((W-120-bGap)/2);
  var bR=Math.round(20*SC);     // borderRadius
  var bP=Math.round(18*SC);     // padding
  var vFs=Math.round(44*SC);    // value fontSize
  var lFs=Math.round(14*SC);    // label fontSize
  var iFs=Math.round(52*SC);    // icon fontSize
  var iOff=Math.round(10*SC);   // icon offset from edges

  function drawStatBox(bx,by,bg,value,label,icon){
    // Card background
    ctx.fillStyle=bg;rr(bx,by,bW,bH,bR);ctx.fill();

    // Icon — absolute top-right, opacity 0.35
    ctx.save();ctx.globalAlpha=0.35;
    ctx.font=iFs+'px serif';ctx.textAlign='right';
    ctx.fillText(icon, bx+bW-iOff, by+iOff+Math.round(iFs*0.80));
    ctx.restore();

    // Value — bottom of card (justifyContent flex-end), bold white
    var vBase=by+bH-bP;   // label baseline
    var lLh=Math.round(lFs*1.3);
    var gap=Math.round(2*SC);
    var vBase2=vBase-lLh-gap; // value baseline (above label)

    ctx.fillStyle='#FFFFFF';
    // Adjust font size if value string is long
    var vStr=String(value);
    var adjFs=vFs;
    if(vStr.length>4) adjFs=Math.round(vFs*0.70);
    else if(vStr.length>3) adjFs=Math.round(vFs*0.82);
    ctx.font='bold '+adjFs+'px -apple-system,system-ui,Arial,sans-serif';
    ctx.textAlign='left';
    ctx.fillText(vStr, bx+bP, vBase2);

    // Label — small, muted white
    ctx.fillStyle='rgba(255,255,255,0.65)';
    ctx.font='400 '+lFs+'px -apple-system,system-ui,Arial,sans-serif';
    ctx.fillText(label, bx+bP, vBase);
  }

  var cStr=String(D.countries);
  var pct=Math.max(1,Math.round(D.countries/195*100));
  var pStr=pct+'%';

  drawStatBox(60,       bY, '#1B3A6A', cStr, 'countries visited', '⛰️');
  drawStatBox(60+bW+bGap, bY, '#7C2D12', pStr, 'of the world',       '🌍');

  // ── FLAGS COLLECTED ──────────────────────────────────────────────────────────
  var flY=bY+bH+80;
  ctx.textAlign='left';ctx.fillStyle='rgba(148,163,184,0.70)';
  ctx.font='600 34px -apple-system,system-ui,Arial,sans-serif';
  ctx.letterSpacing='2px';
  ctx.fillText('FLAGS COLLECTED',60,flY);

  var flags=D.visited.map(function(n){return flag(n);}).filter(function(f){return f!='';});
  var fSz=76,fStep=90,fPerRow=Math.floor((W-120)/fStep);
  ctx.font=fSz+'px serif';ctx.textAlign='left';
  var maxF=fPerRow*2;
  flags.slice(0,maxF).forEach(function(f,i){
    var row=Math.floor(i/fPerRow),col=i%fPerRow;
    ctx.fillText(f,60+col*fStep,flY+56+row*96+fSz);
  });
  if(flags.length>maxF){
    ctx.fillStyle='rgba(148,163,184,0.55)';
    ctx.font='400 38px -apple-system,system-ui,Arial,sans-serif';
    ctx.fillText('+'+(flags.length-maxF)+' more',60,flY+56+2*96+fSz+10);
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fillRect(0,H-84,W,84);
  ctx.fillStyle='rgba(148,163,184,0.40)';
  ctx.font='400 34px -apple-system,system-ui,Arial,sans-serif';
  ctx.textAlign='center';
  ctx.fillText('made with Travel Map',W/2,H-24);

  // ── Export ───────────────────────────────────────────────────────────────────
  try{send(JSON.stringify({type:'shareCardReady',data:cv.toDataURL('image/jpeg',0.92)}));}
  catch(e){try{send(JSON.stringify({type:'shareCardReady',data:cv.toDataURL('image/png')}));}
  catch(e2){send(JSON.stringify({type:'shareCardError',error:String(e2)}));}}
}

// ── Script loader ─────────────────────────────────────────────────────────────
function loadScript(src,cb){
  var s=document.createElement('script');
  s.src=src;s.onload=function(){cb(true);};s.onerror=function(){cb(false);};
  document.head.appendChild(s);
}

loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js',function(ok1){
  if(!ok1){drawCard(null);return;}
  loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js',function(ok2){
    if(!ok2){drawCard(null);return;}
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(function(r){return r.json();})
      .then(function(world){
        drawCard(topojson.feature(world,world.objects.land));
      })
      .catch(function(){drawCard(null);});
  });
});
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
            <Text style={styles.sub}>Loading world map & collecting flags</Text>
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
