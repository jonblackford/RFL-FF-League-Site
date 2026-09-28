import { describe, it, expect } from "vitest";
import {
  buildPerformanceSignals,
  buildIntelligence,
} from "../src/features/advisor/intelligence";
import { weeklyReportHtml } from "../src/lib/weeklyReportDocument";
describe("integrated football intelligence", () => {
  it("uses only completed weeks and canonical player IDs for trade signals", () => {
    const rows = [
      {
        starters: [
          ["a", "b"],
          ["a", "b"],
          ["a", "b"],
          ["a", "b"],
        ],
        starterPoints: [
          [10, 20],
          [10, 20],
          [25, 10],
          [100, 100],
        ],
        benchPlayers: [],
        benchPoints: [],
      },
    ];
    const signals = buildPerformanceSignals(rows, 4);
    expect(signals.find((s) => s.id === "a")?.kind).toBe("sell-high");
    expect(signals.find((s) => s.id === "b")?.kind).toBe("buy-low");
    expect(signals[0].throughWeek).toBe(3);
    expect(buildPerformanceSignals(rows, 2)).toEqual([]);
  });
  it("never calls an owned or projection-unavailable player a waiver candidate", () => {
    const p = (id: string) => ({
      id,
      name: id,
      position: "WR",
      projection: 10,
      available: true,
      injury: "",
      score: { missing: [], unsupported: [] },
    });
    const snapshot: any = {
      week: 4,
      fetchedAt: Date.now(),
      league: { season: "2026", league_id: "x" },
      roster: { players: ["a"], starters: ["a"] },
      rosters: [{ players: ["a"] }, { players: ["b"] }],
      players: [p("a"), p("b"), p("c")],
      warnings: [],
    };
    const history: any = {
      season: 2026,
      generatedAt: new Date().toISOString(),
      players: Object.fromEntries(
        ["a", "b", "c"].map((id) => [
          id,
          {
            weeks: [
              { week: 1, targets: 3, carries: 0 },
              { week: 2, targets: 4, carries: 0 },
              { week: 3, targets: 10, carries: 0 },
            ],
          },
        ]),
      ),
    };
    expect(
      buildIntelligence(snapshot, history, []).waiverWatch.map((p) => p.id),
    ).toEqual(["c"]);
    snapshot.players[2].available = false;
    expect(buildIntelligence(snapshot, history, []).waiverWatch).toEqual([]);
  });
});
describe("weekly PDF source document", () => {
  it("escapes league-controlled names and includes selected week and notes", () => {
    const html = weeklyReportHtml({
      league: "<script>bad</script>",
      season: "2026",
      week: 2,
      teams: [{ name: "A & B", points: 10 }],
      matchups: ["A wins"],
      awards: [],
      notes: "Check waivers",
      generatedAt: "2026-09-28",
    });
    expect(html).not.toContain("<script>bad</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Week 2");
    expect(html).toContain("Check waivers");
    expect(html).toContain("@page");
  });
});
it("keeps bench scores attached to their IDs when a starter score is missing", () => {
  const rows = [
    {
      starters: [["a"], ["a"], ["a"]],
      starterPoints: [[], [], []],
      benchPlayers: [["b"], ["b"], ["b"]],
      benchPoints: [[10], [10], [25]],
    },
  ];
  expect(buildPerformanceSignals(rows, 4).map((s) => s.id)).toEqual(["b"]);
});
