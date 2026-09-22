import {
  getStartingRosterSlots,
  getEligiblePositionsForSlot,
} from "@/lib/lineup";
import type { Lineup, RflPlayer, RflSnapshot } from "./types";
export function optimizeLineup(
  players: RflPlayer[],
  rosterSlots: string[],
): Lineup {
  const slots = getStartingRosterSlots(rosterSlots);
  if (slots.length > 16)
    throw new Error("This advisor supports at most 16 starting slots");
  const unique = [...new Map(players.map((p) => [p.id, p])).values()].filter(
    (p) =>
      p.available &&
      !p.reserve &&
      p.projection !== null &&
      Number.isFinite(p.projection),
  );
  type State = { total: number; picks: (RflPlayer | null)[] };
  let states = new Map<number, State>([
    [0, { total: 0, picks: slots.map(() => null) }],
  ]);
  for (const player of unique) {
    const next = new Map(states);
    for (const [mask, state] of states)
      for (let i = 0; i < slots.length; i++) {
        if (
          mask & (1 << i) ||
          !player.positions.some((p) =>
            getEligiblePositionsForSlot(slots[i]).includes(p),
          )
        )
          continue;
        const key = mask | (1 << i);
        const total = state.total + player.projection!;
        if (!next.has(key) || total > next.get(key)!.total) {
          const picks = [...state.picks];
          picks[i] = player;
          next.set(key, { total, picks });
        }
      }
    states = next;
  }
  let best: State = { total: 0, picks: slots.map(() => null) };
  let filled = 0;
  for (const state of states.values()) {
    const count = state.picks.filter(Boolean).length;
    if (count > filled || (count === filled && state.total > best.total)) {
      best = state;
      filled = count;
    }
  }
  return {
    assignments: slots.map((slot, i) => ({ slot, player: best.picks[i] })),
    total: Math.round(best.total * 100) / 100,
    filled,
  };
}
export type WaiverRecommendation = {
  add: RflPlayer;
  drop: RflPlayer | null;
  gain: number;
  depthGain: number;
  fills: number;
  note: string;
};
export function rosterPlayers(snapshot: RflSnapshot): RflPlayer[] {
  const ids = new Set(snapshot.roster.players);
  return snapshot.players.filter((p) => ids.has(p.id));
}
export function recommendWaivers(
  snapshot: RflSnapshot,
): WaiverRecommendation[] {
  if (snapshot.league.settings.disable_adds === 1) return [];
  const { league, roster } = snapshot;
  const mine = rosterPlayers(snapshot);
  const active = mine.filter(
    (p) => !roster.reserve.includes(p.id) && !roster.taxi.includes(p.id),
  );
  const owned = new Set(
    snapshot.rosters.flatMap((r) => [...r.players, ...r.reserve, ...r.taxi]),
  );
  const baseline = optimizeLineup(active, league.roster_positions);
  const activeIds = roster.players.filter(
    (id) => !roster.reserve.includes(id) && !roster.taxi.includes(id),
  );
  // Unknown roster entries prevent safe size/position validation.
  if (activeIds.some((id) => !mine.some((p) => p.id === id))) return [];
  const capacity = league.roster_positions.filter(
    (s) => !["IR", "RESERVE", "TAXI"].includes(s),
  ).length;
  const candidates = snapshot.players.filter(
    (p) => !owned.has(p.id) && p.available && p.projection !== null,
  );
  const recommendations: WaiverRecommendation[] = [];
  for (const add of candidates) {
    let best: WaiverRecommendation | undefined;
    const safeDrops = active.filter(
      (p) => p.available && p.projection !== null,
    );
    const drops: (RflPlayer | null)[] =
      activeIds.length < capacity ? [null, ...safeDrops] : safeDrops;
    for (const drop of drops) {
      const after = [...active.filter((p) => p.id !== drop?.id), add];
      if (after.length > capacity) continue;
      // Count reserve/taxi as well: conservative until platform-specific cap exceptions are verified.
      const allAfter = [...mine.filter((p) => p.id !== drop?.id), add];
      const legal = ["QB", "RB", "WR", "TE", "K", "DEF"].every((pos) => {
        const cap = league.settings[`position_limit_${pos.toLowerCase()}`];
        return (
          !cap ||
          allAfter.filter((p) => p.positions.includes(pos)).length <= cap
        );
      });
      if (!legal) continue;
      const lineup = optimizeLineup(after, league.roster_positions);
      if (lineup.filled < baseline.filled) continue;
      const gain = Math.round((lineup.total - baseline.total) * 100) / 100;
      const depthGain =
        Math.round((add.projection! - (drop?.projection ?? 0)) * 100) / 100;
      const result = {
        add,
        drop,
        gain,
        depthGain,
        fills: lineup.filled - baseline.filled,
        note: "Current ownership checked. Position caps include reserve players conservatively; confirm locks and claim eligibility in Sleeper.",
      };
      if (drop === null) {
        best = result;
        break;
      }
      if (
        !best ||
        result.fills > best.fills ||
        (result.fills === best.fills &&
          (gain > best.gain ||
            (gain === best.gain && depthGain > best.depthGain)))
      )
        best = result;
    }
    if (best && (best.fills > 0 || best.gain > 0 || best.depthGain > 0))
      recommendations.push(best);
  }
  return recommendations.sort(
    (a, b) => b.fills - a.fills || b.gain - a.gain || b.depthGain - a.depthGain,
  );
}
