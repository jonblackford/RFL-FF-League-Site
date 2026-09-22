import { expect, it } from "vitest";
import {
  optimizeLineup,
  recommendWaivers,
} from "../src/features/rfl/recommendations";
import type { RflPlayer, RflSnapshot } from "../src/features/rfl/types";
const p = (
  id: string,
  position: string,
  projection: number | null,
  extra: Partial<RflPlayer> = {},
): RflPlayer => ({
  id,
  name: id,
  position,
  positions: [position],
  projection,
  available: true,
  reserve: false,
  team: "DET",
  injury: "",
  opponent: "GB",
  gameDate: "",
  score: { total: projection, breakdown: [], missing: [], unsupported: [] },
  returnPoints: 0,
  estimates: [],
  sourceUpdated: null,
  ...extra,
});
it("optimizes superflex without reusing a multi-position player", () => {
  const result = optimizeLineup(
    [
      p("q1", "QB", 20),
      p("q2", "QB", 18),
      p("r", "RB", 19),
      p("dual", "WR", 21, { positions: ["WR", "RB"] }),
    ],
    ["QB", "RB", "WR", "SUPER_FLEX"],
  );
  expect(result.total).toBe(78);
  expect(new Set(result.assignments.map((a) => a.player?.id)).size).toBe(4);
});
it("fills negative required slots while flagging truly unfillable slots", () => {
  const result = optimizeLineup([p("d", "DEF", -3)], ["DEF", "K"]);
  expect(result.filled).toBe(1);
  expect(result.total).toBe(-3);
  expect(result.assignments[1].player).toBeNull();
});
it("excludes missing, unavailable, reserve and duplicate candidates", () => {
  const result = optimizeLineup(
    [
      p("a", "QB", 20),
      p("a", "QB", 20),
      p("b", "QB", 30, { available: false }),
      p("c", "QB", 40, { reserve: true }),
      p("d", "QB", null),
    ],
    ["QB", "SUPER_FLEX"],
  );
  expect(result.filled).toBe(1);
  expect(result.total).toBe(20);
});
const snapshot = (
  players: RflPlayer[],
  extra: Record<string, number> = {},
): RflSnapshot => ({
  players,
  week: 3,
  fetchedAt: 0,
  warnings: [],
  historyWeeks: [],
  source: "test",
  league: {
    league_id: "1394364555710181376",
    name: "RFL",
    season: "2026",
    status: "in_season",
    scoring_settings: {},
    settings: { position_limit_qb: 1, ...extra },
    roster_positions: ["QB", "WR", "BN"],
  },
  roster: {
    roster_id: 1,
    owner_id: "me",
    players: ["q", "w", "bench"],
    starters: ["q", "w"],
    reserve: [],
    taxi: [],
  },
  rosters: [
    {
      roster_id: 1,
      owner_id: "me",
      players: ["q", "w", "bench"],
      starters: ["q", "w"],
      reserve: [],
      taxi: [],
    },
    {
      roster_id: 2,
      owner_id: "other",
      players: [],
      starters: [],
      reserve: ["owned"],
      taxi: ["taxi"],
    },
  ],
});
it("excludes owned reserve/taxi players and picks a drop respecting caps", () => {
  const result = recommendWaivers(
    snapshot([
      p("q", "QB", 10),
      p("w", "WR", 10),
      p("bench", "WR", 5),
      p("new", "QB", 20),
      p("owned", "QB", 99),
      p("taxi", "WR", 99),
    ]),
  );
  expect(result.map((r) => r.add.id)).toEqual(["new"]);
  expect(result[0].drop?.id).toBe("q");
  expect(result[0].gain).toBe(10);
});
it("uses a free bench slot without unnecessary dropping", () => {
  const s = snapshot([p("q", "QB", 10), p("w", "WR", 10), p("new", "WR", 20)]);
  s.roster.players = ["q", "w"];
  s.rosters[0] = s.roster;
  expect(recommendWaivers(s)[0].drop).toBeNull();
});
it("does not suggest adds when the league disables them", () => {
  expect(
    recommendWaivers(
      snapshot([p("q", "QB", 10), p("w", "WR", 10), p("new", "WR", 20)], {
        disable_adds: 1,
      }),
    ),
  ).toEqual([]);
});
it("does not manufacture drop value for an unprojected bench player", () => {
  const s = snapshot([
    p("q", "QB", 10),
    p("w", "WR", 10),
    p("bench", "WR", null),
    p("new", "WR", 6),
  ]);
  expect(recommendWaivers(s)).toEqual([]);
});
it("keeps a negative bench player when an open slot is usable", () => {
  const s = snapshot([
    p("q", "QB", 10),
    p("w", "WR", 10),
    p("bench", "WR", -3),
    p("new", "WR", 6),
  ]);
  s.league.roster_positions.push("BN");
  expect(recommendWaivers(s)[0].drop).toBeNull();
});
it("retains upgrades beyond twelve overall so position filters can find them", () => {
  const s = snapshot([
    p("q", "QB", 10),
    p("w", "WR", 10),
    p("bench", "WR", 0),
    ...Array.from({ length: 13 }, (_, i) => p(`wr${i}`, "WR", 30 + i)),
    p("qb-upgrade", "QB", 11),
  ]);
  expect(recommendWaivers(s).some((w) => w.add.id === "qb-upgrade")).toBe(true);
});
