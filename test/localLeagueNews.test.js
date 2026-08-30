import { describe, expect, test } from "vitest";
import { generateLocalLeagueNews } from "../src/lib/localLeagueNews.ts";

describe("generateLocalLeagueNews", () => {
  test("creates in-season league news from standings, weekly highlights, and scoring context", () => {
    const result = generateLocalLeagueNews(
      [
        {
          league: {
            lastScoredWeek: 7,
            weeksRemaining: 6,
            scoringFormat: 1,
            scoringSettings: { rec: 1, pass_td: 4 },
            scoringLabel: "PPR",
          },
          stories: {
            standings: {
              leader: {
                name: "Alpha",
                record: "6-1",
                rank: 1,
                pfRank: 2,
              },
              firstTeamOut: {
                name: "Bravo",
                record: "3-4",
                rank: 5,
              },
            },
            weeklyHighlights: {
              highestScore: { name: "Charlie", score: 151.4 },
              topPlayerPerformance: {
                name: "Charlie",
                player: "Ja'Marr Chase",
                points: 34.2,
                leagueAdjustedPoints: 34.2,
              },
              biggestBenchMiss: {
                name: "Delta",
                benchPoints: 88,
                starterPoints: 101,
              },
            },
            scoringLeaders: [{ name: "Echo", pf: 912.7, pfRank: 1 }],
          },
          previousSeason: {
            season: "2025",
            scoringFormat: 1,
            topScoringTeam: { name: "Foxtrot", pointsFor: 1725.5 },
            averagePointsFor: 1502.4,
          },
        },
      ],
      145,
      4,
      "in_season"
    );

    expect(result.bulletPoints).toHaveLength(4);
    expect(result.bulletPoints.join(" ")).toContain("Alpha");
    expect(result.bulletPoints.join(" ")).toContain("PPR");
    expect(result.bulletPoints.join(" ")).toContain("2025");
    expect(result.bulletPoints.join(" ")).toContain("Foxtrot");
  });

  test("creates draft news with league-adjusted projected points", () => {
    const result = generateLocalLeagueNews(
      [
        {
          league: {
            totalTeams: 10,
            season: "2026",
            scoringFormat: 0.5,
            scoringSettings: { rec: 0.5, pass_td: 6 },
            scoringLabel: "Half PPR",
            seasonType: "Redraft",
          },
          earlyDraftPicks: [
            {
              draftSlot: 5,
              round: 1,
              name: "Bijan Robinson",
              position: "RB",
              projectedPoints: 286.4,
              userName: "Alpha",
              adp: 2,
              pickVsAdp: -3,
            },
            {
              draftSlot: 16,
              round: 2,
              name: "Amon-Ra St. Brown",
              position: "WR",
              projectedPoints: 275.2,
              userName: "Bravo",
              adp: 22,
              pickVsAdp: 6,
            },
          ],
        },
      ],
      125,
      3,
      "preseason"
    );

    expect(result.bulletPoints).toHaveLength(3);
    expect(result.bulletPoints.join(" ")).toContain("Half PPR");
    expect(result.bulletPoints.join(" ")).toContain("Amon-Ra St. Brown");
    expect(result.bulletPoints.join(" ")).toContain("league-adjusted");
  });
});
