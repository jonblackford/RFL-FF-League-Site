import { afterEach, expect, it, vi } from "vitest";
import {
  normalizeFeed,
  buildPlayers,
  loadRflSnapshot,
  createLatestLoader,
} from "../src/features/rfl/data";
const row = (stats = {}, extra = {}) => ({
  player_id: "a",
  season: "2026",
  week: 3,
  stats,
  player: {
    first_name: "Test",
    last_name: "Player",
    position: "WR",
    fantasy_positions: ["WR"],
    team: "DET",
  },
  opponent: "GB",
  ...extra,
});
afterEach(() => vi.unstubAllGlobals());
it("rejects malformed and mismatched feeds and prefers newest duplicates", () => {
  expect(() => normalizeFeed({}, "2026", 3)).toThrow();
  expect(normalizeFeed([row({}, { week: 2 })], "2026", 3)).toEqual([]);
  expect(
    normalizeFeed(
      [row({ rec: 1 }, { updated_at: 1 }), row({ rec: 2 }, { updated_at: 2 })],
      "2026",
      3,
    )[0].stats.rec,
  ).toBe(2);
});
it("preserves valid zero, marks missing projection and excludes out/reserve players", () => {
  const players = buildPlayers(
    {
      a: { position: "WR" },
      b: { position: "QB" },
      c: { position: "RB", injury_status: "Out" },
    },
    normalizeFeed([row({ rec: 0, gp: 1 })], "2026", 3),
    [],
    { rec: 1 },
    ["a"],
  );
  expect(players.find((p) => p.id === "a")).toMatchObject({
    projection: 0,
    available: false,
    reserve: true,
  });
  expect(players.find((p) => p.id === "b")?.projection).toBeNull();
  expect(players.find((p) => p.id === "c")?.available).toBe(false);
});
it("does not mistake defensive kick return stat for individual KR", () => {
  const p = buildPlayers(
    {},
    normalizeFeed([row({ rec: 1, def_kr_yd: 100, gp: 1 })], "2026", 3),
    [],
    { rec: 1, kr_yd: 0.1 },
    [],
  )[0];
  expect(p.projection).toBe(1);
  expect(p.score.missing).toContain("kr_yd");
});
it("adds labeled recent return estimate only to a current projection", () => {
  const history = [
    normalizeFeed([row({ gp: 1, kr_yd: 100 }, { week: 2 })], "2026", 2),
    normalizeFeed([row({ gp: 1, kr_yd: 50 }, { week: 1 })], "2026", 1),
  ];
  const p = buildPlayers(
    {},
    normalizeFeed([row({ rec: 1, gp: 1 })], "2026", 3),
    history,
    { rec: 1, kr_yd: 0.1 },
    [],
  )[0];
  expect(p.projection).toBe(8.5);
  expect(p.returnPoints).toBe(7.5);
  expect(p.estimates[0]).toContain("2");
});
it("rejects HTTP errors instead of returning fabricated empty league data", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("", { status: 503 })),
  );
  await expect(loadRflSnapshot()).rejects.toThrow("503");
});
it("prevents a superseded request overwriting current state", async () => {
  const loader = createLatestLoader();
  let resolve!: (v: number) => void;
  const applied: number[] = [];
  const first = loader.run(
    () => new Promise<number>((r) => (resolve = r)),
    (v) => applied.push(v),
  );
  await loader.run(
    async () => 2,
    (v) => applied.push(v),
  );
  resolve(1);
  await first;
  expect(applied).toEqual([2]);
});
it("caches weekly data for five minutes and directory for a day while force-refreshing league data", async () => {
  vi.resetModules();
  const fresh = await import("../src/features/rfl/data");
  let now = Date.now();
  const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      let data: unknown;
      if (url.endsWith("/v1/state/nfl")) data = { season: "2026", week: 3 };
      else if (url.endsWith("/rosters"))
        data = [
          { roster_id: 1, owner_id: "me", players: ["a"], starters: ["a"] },
        ];
      else if (url.endsWith("/v1/players/nfl"))
        data = { a: { position: "WR" } };
      else if (url.includes("/projections/")) data = [row({ rec: 1, gp: 1 })];
      else if (url.endsWith("/1394364555710181376"))
        data = {
          league_id: "1394364555710181376",
          name: "RFL",
          season: "2026",
          status: "in_season",
          roster_positions: ["WR"],
          scoring_settings: { rec: 1 },
          settings: { leg: 3, last_scored_leg: 0 },
        };
      else throw new Error(`Unexpected URL: ${url}`);
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  try {
    expect((await fresh.loadRflSnapshot()).players[0].projection).toBe(1);
    await fresh.loadRflSnapshot();
    expect(calls.filter((u) => u.includes("/projections/"))).toHaveLength(1);
    now += 300001;
    await fresh.loadRflSnapshot();
    expect(calls.filter((u) => u.includes("/projections/"))).toHaveLength(2);
    expect(calls.filter((u) => u.endsWith("/v1/players/nfl"))).toHaveLength(1);
    await fresh.loadRflSnapshot(3, undefined, true);
    expect(calls.filter((u) => u.includes("/projections/"))).toHaveLength(3);
    now += 86400001;
    await fresh.loadRflSnapshot();
    expect(calls.filter((u) => u.endsWith("/v1/players/nfl"))).toHaveLength(2);
  } finally {
    clock.mockRestore();
  }
});
