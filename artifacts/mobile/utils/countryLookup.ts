import COUNTRY_BORDERS from "@/data/countryBorders";

// Offline point-in-country lookup against bundled, simplified Natural Earth
// borders. Lets photo scans resolve the country with zero network calls.
//
// The 110m simplification can push coastal cities (Istanbul!) outside their
// polygon, so we probe the point plus 8 neighbors at ±0.1° (~11km) and accept
// the answer only when every hit agrees. Coastal points then land inland and
// resolve, while points near real land borders return null instead of a
// guess; callers treat null as "ask the reverse geocoder instead".
function inRing(lon: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function strictCountryAt(lat: number, lon: number): string | null {
  for (const c of COUNTRY_BORDERS) {
    const [minX, minY, maxX, maxY] = c.b;
    if (lon < minX || lon > maxX || lat < minY || lat > maxY) continue;
    for (const poly of c.p) {
      // Even-odd across all rings of the polygon handles holes correctly.
      let inside = false;
      for (const ring of poly) {
        if (inRing(lon, lat, ring)) inside = !inside;
      }
      if (inside) return c.n;
    }
  }
  return null;
}

const PROBE_OFFSETS: [number, number][] = [
  [0, 0],
  [0.1, 0], [-0.1, 0], [0, 0.1], [0, -0.1],
  [0.1, 0.1], [0.1, -0.1], [-0.1, 0.1], [-0.1, -0.1],
];

export function countryAt(lat: number, lon: number): string | null {
  let hit: string | null = null;
  for (const [dLat, dLon] of PROBE_OFFSETS) {
    const c = strictCountryAt(lat + dLat, lon + dLon);
    if (!c) continue;
    if (hit && hit !== c) return null; // disagreement near a land border
    hit = c;
  }
  return hit;
}
