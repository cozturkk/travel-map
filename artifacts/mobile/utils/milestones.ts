import type { CountryVisit } from "@/context/TravelContext";
import { notify } from "@/lib/notifications";

const TOTAL_COUNTRIES = 195;
const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

const real = (tree: CountryVisit[]) => tree.filter((c) => c.country !== "Unknown");

// Milestone lines for a photo-detected change from prevTree to nextTree:
//   "That's your 10th country." / "Your first new country in over 2 years." /
//   "You've now seen 12% of the world."
export function milestoneMessages(
  prevTree: CountryVisit[],
  nextTree: CountryVisit[],
  now: number = Date.now()
): string[] {
  const prev = real(prevTree);
  const next = real(nextTree);
  const msgs: string[] = [];
  if (next.length > prev.length) {
    msgs.push(`That's your ${ordinal(next.length)} country.`);
    // "First new country in N years": time since ANY previously known country
    // first appeared. Approximated from first-photo dates.
    if (prev.length > 0) {
      const lastNewCountryAt = Math.max(...prev.map((c) => c.firstDate));
      if (isFinite(lastNewCountryAt) && now - lastNewCountryAt > TWO_YEARS_MS) {
        msgs.push("Your first new country in over 2 years.");
      }
    }
    const prevPct = Math.floor((prev.length / TOTAL_COUNTRIES) * 100);
    const nextPct = Math.floor((next.length / TOTAL_COUNTRIES) * 100);
    if (nextPct > prevPct) {
      msgs.push(`You've now seen ${nextPct}% of the world.`);
    }
  }
  return msgs;
}

// Milestone line for a country marked visited by hand on the map.
export function manualAddMilestone(newCount: number): string {
  const pct = Math.max(1, Math.floor((newCount / TOTAL_COUNTRIES) * 100));
  return `That's your ${ordinal(newCount)} country. You've now seen ${pct}% of the world.`;
}

// Called from the delta scan when new photos changed the trip tree: fires a
// local notification naming the new place(s), with milestone flavor when a
// new country pushed a threshold.
export function announceNewTrips(
  prevTree: CountryVisit[],
  nextTree: CountryVisit[]
): void {
  const prevKeys = new Set(real(prevTree).flatMap((c) => c.cities.map((ci) => ci.key)));
  const newCities = real(nextTree).flatMap((c) =>
    c.cities
      .filter((ci) => !prevKeys.has(ci.key))
      .map((ci) => ({ city: ci.city, country: c.country }))
  );
  if (newCities.length === 0) return;
  const first = newCities[0];
  const extra = newCities.length - 1;
  let body =
    `${first.city}, ${first.country}` +
    (extra > 0 ? ` and ${extra} more ${extra === 1 ? "place" : "places"}` : "") +
    " added to your travel map.";
  const milestones = milestoneMessages(prevTree, nextTree);
  if (milestones.length > 0) body += " " + milestones.join(" ");
  notify("New trip detected", body);
}
