import { describe, it, expect } from "vitest";
import { buildWeeklyDigest } from "../src/lib/weeklyDigest";
import { rankRecordedPlayers } from "../src/lib/recordedPlayerValues";

describe("weekly digest", () => {
  it("uses the selected week, handles ties and excludes missing scores", () => {
    const rows = [
      { rosterId: 1, name: "Alpha", points: [100, 70], matchups: [1, 1] },
      { rosterId: 2, name: "Beta", points: [90, 70], matchups: [1, 1] },
      { rosterId: 3, name: "Bye", points: [80], matchups: [0, 0] },
    ] as any;
    const digest = buildWeeklyDigest(rows, 2, false);
    expect(digest.teams).toHaveLength(2);
    expect(digest.average).toBe(70);
    expect(digest.matchups[0].summary).toContain("tied");
    expect(buildWeeklyDigest(rows, 1, false).matchups[0].margin).toBe(10);
  });
  it("does not invent results when no completed scores exist", () => {
    expect(buildWeeklyDigest([], 1, false).teams).toEqual([]);
  });
});
describe("recorded player values", () => {
  it("ranks every player without a preview limit and keeps unknown production distinct", () => {
    const players = [
      { player_id: "a", name: "Alpha", position: "WR", team: "NYJ" },
      { player_id: "b", name: "Beta", position: "WR", team: "DET" },
      { player_id: "c", name: "New", position: "RB", team: "BUF" },
    ];
    const rows = rankRecordedPlayers(
      players,
      { a: { points: 40, weeks: 2 }, b: { points: 10, weeks: 2 } },
      ["WR"],
      2,
    );
    expect(rows).toHaveLength(3);
    expect(rows[0].name).toBe("Alpha");
    expect(rows[0].tradeValue).toBeGreaterThan(rows[1].tradeValue);
    expect(rows[2].dataAvailable).toBe(false);
    expect(rows[0].observedAverage).toBe(20);
  });
});

import { getWeeklyAwards } from "../src/components/weekly_report/weeklyReportTransforms";
it("does not invent bad-luck or inefficient-lineup awards without evidence", () => {
  const rows = [
    {
      rosterId: 1,
      name: "A",
      username: "A",
      points: [20],
      matchups: [1],
      starterPoints: [[20]],
      benchPoints: [[]],
    },
    {
      rosterId: 2,
      name: "B",
      username: "B",
      points: [10],
      matchups: [1],
      starterPoints: [[10]],
      benchPoints: [[]],
    },
  ] as any;
  const awards = getWeeklyAwards({
    tableData: rows,
    playerNames: [
      [{ player_id: "a", name: "Alpha", position: "WR", team: "DET" }],
      [{ player_id: "b", name: "Beta", position: "WR", team: "BUF" }],
    ],
    benchPlayerNames: [[], []],
    weekIndex: 0,
    showUsernames: false,
    rosterPositions: ["WR"],
  });
  expect(awards.map((a) => a.id)).not.toContain("got-away-with-it");
  expect(awards.map((a) => a.id)).not.toContain("deserved-better");
});
