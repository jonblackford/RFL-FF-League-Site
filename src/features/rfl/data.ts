import type {
  RflLeague,
  RflRoster,
  RflPlayer,
  RflSnapshot,
  Stats,
} from "./types";
import { scoreStats, estimateReturns, statLabel } from "./scoring";
export const RFL_LEAGUE_ID = "1394364555710181376";
export const RFL_ROSTER_ID = 1;
type PlayerInfo = {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  position?: string;
  fantasy_positions?: string[];
  team?: string;
  injury_status?: string;
};
export type FeedRow = {
  player_id: string;
  stats: Stats;
  player?: PlayerInfo;
  opponent?: string;
  date?: string;
  updated_at?: number;
  week: number;
  season: string;
};
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function normalizeFeed(
  input: unknown,
  season: string,
  week: number,
): FeedRow[] {
  if (!Array.isArray(input)) throw new Error("Invalid weekly data response");
  const rows = new Map<string, FeedRow>();
  for (const value of input) {
    if (
      !record(value) ||
      typeof value.player_id !== "string" ||
      !record(value.stats) ||
      String(value.season) !== season ||
      value.week !== week
    )
      continue;
    const stats = Object.fromEntries(
      Object.entries(value.stats).filter(
        ([, n]) => typeof n === "number" && Number.isFinite(n),
      ),
    ) as Stats;
    const row = { ...value, stats } as FeedRow;
    const prev = rows.get(row.player_id);
    if (!prev || (row.updated_at ?? 0) > (prev.updated_at ?? 0))
      rows.set(row.player_id, row);
  }
  return [...rows.values()];
}
export function buildPlayers(
  directory: Record<string, PlayerInfo>,
  projections: FeedRow[],
  history: FeedRow[][],
  settings: Stats,
  reserveIds: string[],
): RflPlayer[] {
  const projectionsById = new Map(projections.map((p) => [p.player_id, p]));
  const histories = history.map(
    (week) => new Map(week.map((p) => [p.player_id, p.stats])),
  );
  const ids = new Set([...Object.keys(directory), ...projectionsById.keys()]);
  return [...ids].flatMap((id) => {
    const row = projectionsById.get(id);
    const info = { ...directory[id], ...row?.player };
    const position = info.position ?? "";
    if (!["QB", "RB", "WR", "TE", "K", "DEF"].includes(position)) return [];
    const stats = { ...row?.stats };
    const estimates: string[] = [];
    if (row && position !== "DEF" && position !== "K")
      for (const key of ["kr_yd", "pr_yd"] as const) {
        if (typeof stats[key] === "number" || !settings[key]) continue;
        const estimate = estimateReturns(
          histories.map((h) => h.get(id) ?? {}),
          key,
        );
        if (estimate) {
          stats[key] = estimate.yards;
          estimates.push(
            `${statLabel(key)} estimated from ${estimate.games} recent active games; role changes may invalidate this estimate.`,
          );
        }
      }
    const score = scoreStats(stats, settings, position);
    const injury = info.injury_status ?? "";
    const reserve = reserveIds.includes(id);
    const available =
      !!row &&
      !!row.opponent &&
      row.stats.gp !== 0 &&
      !reserve &&
      !["out", "ir", "pup", "sus", "suspended", "doubtful"].includes(
        injury.toLowerCase(),
      );
    return [
      {
        id,
        name:
          info.full_name ||
          [info.first_name, info.last_name].filter(Boolean).join(" ") ||
          id,
        position,
        positions: info.fantasy_positions?.length
          ? info.fantasy_positions
          : [position],
        team: info.team ?? "",
        injury,
        opponent: row?.opponent ?? "",
        gameDate: row?.date ?? "",
        projection: score.total,
        score,
        returnPoints: score.breakdown
          .filter((b) => ["kr_yd", "pr_yd"].includes(b.key))
          .reduce((s, b) => s + b.points, 0),
        estimates,
        available,
        reserve,
        sourceUpdated: row?.updated_at ?? null,
      },
    ];
  });
}
const cache = new Map<string, { at: number; data: unknown }>();
async function getJson(
  path: string,
  signal: AbortSignal,
  ttl = 300_000,
  force = false,
): Promise<unknown> {
  const url = `https://api.sleeper.app${path}`;
  const hit = cache.get(url);
  if (!force && hit && Date.now() - hit.at < ttl) return hit.data;
  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error(
      `Sleeper request failed (${response.status}). Try refreshing shortly.`,
    );
  const data: unknown = await response.json();
  if (cache.size > 20) cache.delete(cache.keys().next().value!);
  cache.set(url, { at: Date.now(), data });
  return data;
}
function parseRoster(value: unknown): RflRoster {
  if (
    !record(value) ||
    typeof value.roster_id !== "number" ||
    !Array.isArray(value.players)
  )
    throw new Error("Invalid league roster data");
  const ids = (key: string) =>
    Array.isArray(value[key])
      ? (value[key] as unknown[]).filter(
          (p): p is string => typeof p === "string",
        )
      : [];
  return {
    roster_id: value.roster_id,
    owner_id: String(value.owner_id ?? ""),
    players: ids("players"),
    starters: ids("starters"),
    reserve: ids("reserve"),
    taxi: ids("taxi"),
  };
}
export async function loadRflSnapshot(
  requestedWeek?: number,
  signal?: AbortSignal,
  force = false,
): Promise<RflSnapshot> {
  const requestSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(25000)])
    : AbortSignal.timeout(25000);
  const [rawLeague, state, rawRosters] = await Promise.all([
    getJson(`/v1/league/${RFL_LEAGUE_ID}`, requestSignal, 300000, force),
    getJson("/v1/state/nfl", requestSignal, 300000, force),
    getJson(
      `/v1/league/${RFL_LEAGUE_ID}/rosters`,
      requestSignal,
      300000,
      force,
    ),
  ]);
  if (
    !record(rawLeague) ||
    rawLeague.league_id !== RFL_LEAGUE_ID ||
    !record(rawLeague.scoring_settings) ||
    !Array.isArray(rawLeague.roster_positions) ||
    !record(rawLeague.settings) ||
    typeof rawLeague.season !== "string"
  )
    throw new Error("Sleeper did not return the expected RFL league");
  if (!Array.isArray(rawRosters)) throw new Error("Invalid league rosters");
  const league = rawLeague as unknown as RflLeague;
  const rosters = rawRosters.map(parseRoster);
  const roster = rosters.find((r) => r.roster_id === RFL_ROSTER_ID);
  if (!roster) throw new Error("Dart Vader roster was not found");
  const currentWeek =
    record(state) && String(state.season) === league.season
      ? Number(state.week)
      : Number(league.settings.leg);
  const week = requestedWeek ?? currentWeek;
  if (!Number.isInteger(week) || week < 1 || week > 18)
    throw new Error("Select a regular-season week from 1 to 18");
  const warnings: string[] = [];
  const lastCompleted = Math.min(
    week - 1,
    Number(league.settings.last_scored_leg) || 0,
  );
  const historyWeeks = Array.from(
    { length: Math.min(3, lastCompleted) },
    (_, i) => lastCompleted - i,
  );
  const [rawDirectory, rawProjections, historyResults] = await Promise.all([
    getJson("/v1/players/nfl", requestSignal, 86400000),
    getJson(
      `/projections/nfl/${league.season}/${week}?season_type=regular`,
      requestSignal,
      300000,
      force,
    ),
    Promise.allSettled(
      historyWeeks.map((w) =>
        getJson(
          `/stats/nfl/${league.season}/${w}?season_type=regular`,
          requestSignal,
          300000,
          force,
        ).then((data) => normalizeFeed(data, league.season, w)),
      ),
    ),
  ]);
  if (!record(rawDirectory)) throw new Error("Invalid player directory");
  const projections = normalizeFeed(rawProjections, league.season, week);
  if (!projections.length)
    warnings.push(
      "No projections are available for this week. Rankings are unavailable; missing data is not a zero forecast.",
    );
  const history = historyResults.flatMap((r) => {
    if (r.status === "fulfilled") return [r.value];
    warnings.push(
      "Recent return history could not be loaded. Estimates may be unavailable.",
    );
    return [];
  });
  const players = buildPlayers(
    rawDirectory as Record<string, PlayerInfo>,
    projections,
    history,
    league.scoring_settings,
    [...roster.reserve, ...roster.taxi],
  );
  warnings.push(
    "Game locks and claim eligibility are not verified. Check Sleeper before making changes.",
  );
  warnings.push(
    "Totals use available projected stats. Missing categories and historical return estimates reduce confidence.",
  );
  if (requestedWeek && requestedWeek !== currentWeek)
    warnings.push(
      "Rosters reflect current ownership, not historical or future ownership.",
    );
  return {
    league,
    roster,
    rosters,
    players,
    week,
    fetchedAt: Date.now(),
    warnings,
    source: "Sleeper league API + weekly raw-stat feed",
    historyWeeks,
  };
}
export function createLatestLoader() {
  let generation = 0;
  let controller: AbortController | undefined;
  return {
    cancel() {
      generation++;
      controller?.abort();
    },
    async run<T>(
      load: (signal: AbortSignal) => Promise<T>,
      apply: (value: T) => void,
    ) {
      const current = ++generation;
      controller?.abort();
      controller = new AbortController();
      try {
        const value = await load(controller.signal);
        if (current === generation) apply(value);
      } catch (error) {
        if (current === generation) throw error;
      }
    },
  };
}
