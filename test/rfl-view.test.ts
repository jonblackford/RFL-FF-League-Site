import { expect, it } from "vitest";
import { buildEvidence, lineupChanges } from "../src/features/rfl/presentation";
it("reports membership changes without misleading slot-to-slot comparisons", () => {
  const lineup = {
    total: 30,
    filled: 2,
    assignments: [
      { slot: "QB", player: { id: "b", name: "B" } },
      { slot: "SUPER_FLEX", player: { id: "a", name: "A" } },
    ],
  };
  expect(lineupChanges(["a", "b"], lineup as any)).toEqual({
    start: [],
    sit: [],
  });
  expect(lineupChanges(["a", "c"], lineup as any)).toEqual({
    start: ["b"],
    sit: ["c"],
  });
});
it("sends bounded team evidence with uncertainty and no directory or secrets", () => {
  const player = {
    id: "a",
    name: "A",
    position: "WR",
    positions: ["WR"],
    team: "GB",
    projection: 12,
    returnPoints: 8,
    injury: "",
    opponent: "DET",
    available: true,
    estimates: ["2 games"],
    score: { missing: ["st_td"], unsupported: [], breakdown: [] },
  };
  const snapshot = {
    league: {
      league_id: "1394364555710181376",
      season: "2026",
      scoring_settings: { kr_yd: 0.1 },
    },
    week: 3,
    fetchedAt: 123,
    roster: { players: ["a"], starters: ["a"] },
    players: [player, { ...player, id: "unowned" }],
    warnings: ["Locks unverified"],
  };
  const evidence = buildEvidence(
    snapshot as any,
    { total: 12, filled: 1, assignments: [{ slot: "WR", player }] } as any,
    [],
  );
  expect(evidence.players).toHaveLength(1);
  expect(evidence.players[0].missing).toEqual(["st_td"]);
  expect(evidence.warnings).toContain("Locks unverified");
  expect(evidence.team).toBe("Dart Vader");
  expect(evidence.currentStarters).toEqual(["a"]);
});
it("does not compare against a forecast for an unavailable current starter", async () => {
  const { currentLineupTotal } =
    await import("../src/features/rfl/presentation");
  expect(
    currentLineupTotal(["a"], [
      { id: "a", projection: 20, available: false },
    ] as any),
  ).toBeNull();
  expect(
    currentLineupTotal(["a"], [
      { id: "a", projection: 20, available: true },
    ] as any),
  ).toBe(20);
  expect(currentLineupTotal(["missing"], [])).toBeNull();
});
