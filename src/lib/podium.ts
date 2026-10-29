import type { RankedCostume } from "./admin-types";

export type PodiumPlace = 1 | 2 | 3;
export type PodiumGroup = { place: PodiumPlace; entries: RankedCostume[] };
export type RevealStep = PodiumGroup & ({ phase: "suspense"; duration: number } | { phase: "reveal"; duration: null });

export function rankCostumes(ranking: readonly RankedCostume[]): RankedCostume[] {
  // A fixed ID order breaks equal scores without changing anyone's stars.
  const ordered = [...ranking].sort((a, b) => b.totalStars - a.totalStars || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let place = 0;
  return ordered.map((entry) => ({ ...entry, place: entry.votes > 0 && entry.totalStars > 0 ? ++place : null }));
}

export function podiumGroups(ranking: RankedCostume[]): PodiumGroup[] {
  const ranked = rankCostumes(ranking);
  return ([3, 2, 1] as const).map((place) => ({ place, entries: ranked.filter((entry) => entry.place === place) })).filter((group) => group.entries.length > 0);
}

export function revealSteps(ranking: RankedCostume[]): RevealStep[] {
  return podiumGroups(ranking).flatMap((group) => [
    { ...group, phase: "suspense" as const, duration: group.place === 1 ? 2800 : group.place === 2 ? 1900 : 1600 },
    { ...group, phase: "reveal" as const, duration: null },
  ]);
}

export function previouslyRevealed(steps: RevealStep[], index: number): PodiumGroup[] {
  return steps.slice(0, Math.max(0, index)).filter((step) => step.phase === "reveal");
}

export function placeLabel(place: PodiumPlace) {
  return place === 1 ? "Primer puesto" : place === 2 ? "Segundo puesto" : "Tercer puesto";
}

export function costumeImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/costumes/${path.split("/").map(encodeURIComponent).join("/")}`;
}
