import { PhotoAsset } from "@/context/TravelContext";

export interface Streaks {
  longest: number;
  current: number;
  total: number;
}

/** Returns a Map from "YYYY-MM" → number of unique countries visited that month */
export function buildMonthMap(photos: PhotoAsset[]): Map<string, number> {
  const m = new Map<string, Set<string>>();
  for (const p of photos) {
    if (!p.country) continue;
    const d = new Date(p.creationTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!m.has(key)) m.set(key, new Set());
    m.get(key)!.add(p.country);
  }
  const result = new Map<string, number>();
  for (const [k, s] of m) result.set(k, s.size);
  return result;
}

export function calcStreaks(monthMap: Map<string, number>): Streaks {
  const sorted = Array.from(monthMap.keys()).sort();
  if (!sorted.length) return { longest: 0, current: 0, total: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const [py, pm] = sorted[i - 1].split("-").map(Number);
    const [cy, cm] = sorted[i].split("-").map(Number);
    if ((cy - py) * 12 + (cm - pm) === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const latest = sorted[sorted.length - 1];

  let current = 0;
  if (latest === thisMonth || latest === prevMonth) {
    current = 1;
    let [cy2, cm2] = latest.split("-").map(Number);
    while (true) {
      cm2--;
      if (cm2 === 0) { cm2 = 12; cy2--; }
      if (monthMap.has(`${cy2}-${String(cm2).padStart(2, "0")}`)) current++;
      else break;
    }
  }

  return { longest, current, total: monthMap.size };
}

export function getStreakPeriod(
  monthMap: Map<string, number>
): { start: string; end: string } {
  const sorted = Array.from(monthMap.keys()).sort();
  if (!sorted.length) return { start: "", end: "" };
  let best = { start: sorted[0], end: sorted[0], len: 1 };
  let runStart = sorted[0];
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const [py, pm] = sorted[i - 1].split("-").map(Number);
    const [cy, cm] = sorted[i].split("-").map(Number);
    if ((cy - py) * 12 + (cm - pm) === 1) {
      run++;
      if (run > best.len) best = { start: runStart, end: sorted[i], len: run };
    } else {
      runStart = sorted[i];
      run = 1;
    }
  }
  return { start: best.start, end: best.end };
}
