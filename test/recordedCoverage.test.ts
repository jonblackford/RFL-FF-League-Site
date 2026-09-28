import { afterEach, expect, it, vi } from "vitest";
import { getWeeklyPoints } from "../src/api/helper";
import { buildTradeValueRequest } from "../src/lib/leagueTradeValues";
import { buildPerformanceSignals } from "../src/features/advisor/intelligence";
import { getPlayerValue } from "../src/lib/tradeFinder";
afterEach(() => vi.unstubAllGlobals());
it("preserves missing bench observations through import without discarding real zeroes", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [
        {
          roster_id: 1,
          matchup_id: 1,
          points: 20,
          players: ["a", "missing", "zero"],
          starters: ["a"],
          starters_points: [20],
          players_points: { a: 20, zero: 0 },
        },
      ],
    })),
  );
  const rows = await getWeeklyPoints("coverage-test", 3);
  const request = buildTradeValueRequest({
    league: {
      leagueId: "coverage-test",
      season: "2026",
      lastScoredWeek: 3,
      status: "in_season",
      rosterPositions: ["WR"],
      totalRosters: 1,
    } as any,
    tableData: rows.map((r) => ({
      ...r,
      players: ["a", "missing", "zero"],
    })) as any,
    selectedWeek: 4,
    showUsernames: false,
  });
  expect(request.production?.missing).toEqual({ points: 0, weeks: 0 });
  expect(request.production?.zero).toEqual({ points: 0, weeks: 3 });
});
it("does not infer a buy-low signal from an absent latest score", () => {
  const row = {
    starters: [],
    starterPoints: [],
    benchPlayers: [["a"], ["a"], ["a"]],
    benchPoints: [[20], [20], [0]],
    missingPlayerScores: [[], [], ["a"]],
  };
  expect(buildPerformanceSignals([row], 4)).toEqual([]);
  expect(
    buildPerformanceSignals(
      [{ ...row, missingPlayerScores: [[], [], []] }],
      4,
    )[0]?.kind,
  ).toBe("buy-low");
  // Old cached zeroes have no provenance and cannot establish an observation.
  const { missingPlayerScores, ...legacy } = row;
  expect(buildPerformanceSignals([legacy], 4)).toEqual([]);
});
it("keeps a recorded zero value in both trade pricing paths instead of using rank or ADP", () => {
  expect(
    getPlayerValue({
      tradeValue: 0,
      dataAvailable: true,
      overallRank: 3,
      dynastyAdp: 1,
    } as any),
  ).toBe(0);
  expect(getPlayerValue({ dataAvailable: false, overallRank: 3 } as any)).toBe(
    0,
  );
  expect(getPlayerValue({ overallRank: 3 } as any)).toBe(107);
});
