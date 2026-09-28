import { isRecordedScore } from "@/lib/recordedScore";
import type { RflSnapshot } from "../rfl/types";
import { trendBeforeWeek, type EnrichmentFeed } from "./enrichment";
import type { PointsType } from "@/types/types";
type Scores = Pick<
  PointsType,
  | "starters"
  | "starterPoints"
  | "benchPlayers"
  | "benchPoints"
  | "missingPlayerScores"
>;
export type PerformanceSignal = {
  id: string;
  kind: "buy-low" | "sell-high";
  latest: number;
  priorAverage: number;
  difference: number;
  throughWeek: number;
  priorWeeks: number;
  deviation: number;
};
// Adapted workflow: fantasy-football-ai/reporting.py (Apache-2.0). New ID-based implementation.
export function buildPerformanceSignals(
  rows: Scores[],
  beforeWeek: number,
): PerformanceSignal[] {
  const observations = new Map<string, Map<number, number>>();
  for (const row of rows)
    for (let i = 0; i < beforeWeek - 1; i++) {
      const groups = [
        [row.starters?.[i] || [], row.starterPoints?.[i] || [], false],
        [row.benchPlayers?.[i] || [], row.benchPoints?.[i] || [], true],
      ] as const;
      for (const [ids, scores, isBench] of groups)
        ids.forEach((id, j) => {
          if (
            !id ||
            id === "0" ||
            !isRecordedScore(
              scores[j],
              id,
              row.missingPlayerScores?.[i],
              isBench,
            )
          )
            return;
          const series = observations.get(id) || new Map<number, number>();
          series.set(i + 1, scores[j]);
          observations.set(id, series);
        });
    }
  const result: PerformanceSignal[] = [];
  for (const [id, series] of observations) {
    const latest = series.get(beforeWeek - 1),
      prior = [...series.entries()]
        .filter(([w]) => w < beforeWeek - 1)
        .map(([, p]) => p);
    if (latest === undefined || prior.length < 2) continue;
    const priorAverage = prior.reduce((a, b) => a + b, 0) / prior.length,
      difference = latest - priorAverage;
    if (difference > 10 || difference < -5)
      result.push({
        id,
        kind: difference > 10 ? "sell-high" : "buy-low",
        latest,
        priorAverage,
        difference,
        throughWeek: beforeWeek - 1,
        priorWeeks: prior.length,
        deviation: Math.sqrt(
          prior.reduce((s, p) => s + (p - priorAverage) ** 2, 0) / prior.length,
        ),
      });
  }
  return result.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}
// Original implementation of the source project's observed/modeled/unavailable evidence boundary.
export function buildIntelligence(
  snapshot: RflSnapshot,
  feed: EnrichmentFeed | null,
  rows: Scores[],
) {
  const own = new Set(snapshot.roster.players),
    owned = new Set(snapshot.rosters.flatMap((r) => r.players));
  const roster = snapshot.players.filter((p) => own.has(p.id));
  const unsupported = [...new Set(roster.flatMap((p) => p.score.unsupported))];
  const missing = [...new Set(roster.flatMap((p) => p.score.missing))];
  const alerts = roster
    .filter(
      (p) =>
        snapshot.roster.starters.includes(p.id) &&
        (!p.available || p.injury || p.projection === null),
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
      reason: p.injury
        ? `Listed ${p.injury}; verify game-day status.`
        : !p.available
          ? "Availability or opponent not confirmed."
          : "No usable projection.",
    }));
  const emptySlots = snapshot.roster.starters.filter(
    (id) => !id || id === "0",
  ).length;
  const validFeed =
    feed?.season === Number(snapshot.league.season) ? feed : null;
  const waiverWatch = snapshot.players
    .filter(
      (p) =>
        !owned.has(p.id) &&
        p.available &&
        ["RB", "WR", "TE"].includes(p.position),
    )
    .flatMap((p) => {
      const trend = trendBeforeWeek(validFeed?.players[p.id], snapshot.week);
      if (!trend || trend.weeks.length < 2) return [];
      const counts = trend.weeks.map((w) =>
        w.targets !== null && w.carries !== null ? w.targets + w.carries : null,
      );
      if (counts.some((n) => n === null)) return [];
      const latest = counts[counts.length - 1]!,
        prior = counts.slice(0, -1) as number[];
      const average = prior.reduce((a, b) => a + b, 0) / prior.length;
      if (latest < 8 || latest - average < 2) return [];
      return [
        {
          id: p.id,
          name: p.name,
          position: p.position,
          latestOpportunities: latest,
          previousAverage: average,
          throughWeek: trend.throughWeek,
          observedWeeks: trend.weeks.length,
          projection: p.projection,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.latestOpportunities -
        b.previousAverage -
        (a.latestOpportunities - a.previousAverage),
    )
    .slice(0, 8);
  const signals = buildPerformanceSignals(rows, snapshot.week)
    .flatMap((signal) => {
      const player = snapshot.players.find((p) => p.id === signal.id);
      return player
        ? [{ ...signal, name: player.name, onMyTeam: own.has(player.id) }]
        : [];
    })
    .slice(0, 12);
  const complete = roster.filter(
    (p) =>
      p.projection !== null &&
      !p.score.unsupported.length &&
      !p.score.missing.length,
  ).length;
  return {
    leagueId: snapshot.league.league_id,
    season: snapshot.league.season,
    week: snapshot.week,
    coverage: {
      rosterPlayers: own.size,
      completeProjections: complete,
      unsupported,
      missing,
      usageGeneratedAt: validFeed?.generatedAt ?? null,
      fetchedAt: snapshot.fetchedAt,
    },
    alerts,
    emptySlots,
    waiverWatch,
    tradeSignals: signals,
    interpretation:
      "Usage and scoring changes are observed signals, not forecasts or automatic trade/waiver recommendations. Confirm availability, sample size, role and roster fit. Historical ranges are not calibrated prediction intervals.",
    analysisSources: [
      "fantasy-football-ai: two-sided trade and usage-based waiver workflows",
      "Fantasy-Intelligence: league identity, evidence semantics and missing-scoring safeguards",
      "Sleeper-Watchdog: empty-slot and starter availability checks",
    ],
  };
}
export const advisorAnalysisModes = [
  {
    id: "weekly",
    label: "Weekly plan",
    question:
      "Give me a prioritized weekly plan: immediate lineup issues, best supported waiver option with a drop cost, then one trade idea to investigate. Explain evidence and missing information.",
  },
  {
    id: "roster",
    label: "Roster check",
    question:
      "Audit my roster by position, starting lineup and bench depth. Identify empty slots, availability concerns and scoring gaps. Prioritize the next three actions.",
  },
  {
    id: "waivers",
    label: "Waiver research",
    question:
      "Review the usage-based waiver watch and calculated waiver options. Verify the players are unowned, compare opportunity changes, explain a legal drop and distinguish observed usage from expected fantasy points.",
  },
  {
    id: "trades",
    label: "Trade research",
    question:
      "Review buy-low and sell-high signals as research leads only. Compare latest scoring with prior average and consistency. For any proposed trade evaluate both teams, lineup and depth, then use ACCEPT, DECLINE, NEGOTIATE or NEED MORE DATA with reasons.",
  },
  {
    id: "quality",
    label: "Evidence check",
    question:
      "Explain which evidence is observed, projected, estimated or missing. Check league identity, scoring gaps, sample sizes and timestamps. For kickers and defenses, do not substitute generic scoring for the configured rules.",
  },
] as const;
