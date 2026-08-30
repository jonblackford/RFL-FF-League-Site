import { afterEach, describe, expect, test, vi } from "vitest";
import * as playerApi from "../src/api/playerApi";
import * as sleeperApi from "../src/api/sleeperApi";
import * as tradeValuesApi from "../src/api/tradeValuesApi";
import {
  estimateLocalTradeQuote,
  generateLocalTradeSuggestions,
  applyTradeBuilderRankingResponse,
  buildDynastyDraftPickAssets,
  buildTradeValueRequest,
  getTradeValuationMode,
  loadLeaguePlayerValues,
  mergeTradeBuilderRankings,
  sortTradeBuilderPlayers,
} from "../src/lib/leagueTradeValues";
import { getViteBasePath } from "../vite.config.ts";

const player = ({
  id,
  name,
  position,
  rank,
  tradeValue,
  dynastyAdp = null,
}) => ({
  playerId: id,
  player_id: id,
  name,
  position,
  team: "RFL",
  positionRank: rank,
  overallRank: rank,
  dynastyAdp,
  tradeValue,
});

describe("trade value request boundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("generates local trade suggestions from roster fit without backend access", () => {
    const suggestions = generateLocalTradeSuggestions({
      forRosterId: 1,
      rosters: [
        {
          id: 1,
          managerName: "Alpha",
          players: [
            player({
              id: "alpha-rb",
              name: "Thin RB",
              position: "RB",
              rank: 90,
              tradeValue: 25,
            }),
            player({
              id: "alpha-wr",
              name: "Wideout Depth",
              position: "WR",
              rank: 25,
              tradeValue: 60,
            }),
          ],
        },
        {
          id: 2,
          managerName: "Beta",
          players: [
            player({
              id: "beta-rb",
              name: "Running Back Depth",
              position: "RB",
              rank: 24,
              tradeValue: 62,
            }),
            player({
              id: "beta-wr",
              name: "Thin WR",
              position: "WR",
              rank: 95,
              tradeValue: 24,
            }),
          ],
        },
      ],
      starterPlayerIdsByRoster: {
        1: ["alpha-rb"],
        2: ["beta-wr"],
      },
    });

    expect(suggestions[0]).toMatchObject({
      teamAId: 1,
      teamAName: "Alpha",
      teamBId: 2,
      teamBName: "Beta",
      tradeType: "1-for-1",
      teamASends: [expect.objectContaining({ playerId: "alpha-wr" })],
      teamBSends: [expect.objectContaining({ playerId: "beta-rb" })],
    });
    expect(suggestions[0].teamAGainPerWeek).toBeGreaterThan(0);
    expect(suggestions[0].teamBGainPerWeek).toBeGreaterThan(0);
    expect(suggestions[0].fairnessPercent).toBeGreaterThanOrEqual(90);
  });

  test("generates local draft-pick suggestions when the finder is filtered to picks", () => {
    const suggestions = generateLocalTradeSuggestions({
      forRosterId: 1,
      assetFilter: "draft-picks",
      rosters: [
        {
          id: 1,
          managerName: "Alpha",
          draftPicks: [{ id: "2027:2:1", season: 2027, round: 2 }],
          players: [
            player({
              id: "alpha-rb",
              name: "Thin Alpha RB",
              position: "RB",
              rank: 95,
              tradeValue: 18,
            }),
            player({
              id: "alpha-player",
              name: "Alpha Player",
              position: "WR",
              rank: 25,
              tradeValue: 70,
            }),
          ],
        },
        {
          id: 2,
          managerName: "Beta",
          draftPicks: [{ id: "2027:1:2", season: 2027, round: 1 }],
          players: [
            player({
              id: "beta-wr",
              name: "Thin Beta WR",
              position: "WR",
              rank: 95,
              tradeValue: 18,
            }),
            player({
              id: "beta-player",
              name: "Beta Player",
              position: "RB",
              rank: 45,
              tradeValue: 45,
            }),
          ],
        },
      ],
      starterPlayerIdsByRoster: {
        1: ["alpha-rb"],
        2: ["beta-wr"],
      },
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(
      suggestions.every(
        (suggestion) =>
          suggestion.teamAPicks?.length || suggestion.teamBPicks?.length
      )
    ).toBe(true);
  });

  test("uses relative asset paths for GitHub Pages builds", () => {
    expect(getViteBasePath({ GITHUB_PAGES: "true" })).toBe("./");
    expect(getViteBasePath({})).toBe("/");
  });

  test("estimates trade fairness locally for static hosting", () => {
    expect(
      estimateLocalTradeQuote({
        teamAValue: 100,
        teamBValue: 94,
      })
    ).toEqual({
      fairnessLabel: "Very fair",
      favoredSide: "team_b",
      gapBand: "within_10_percent",
    });

    expect(
      estimateLocalTradeQuote({
        teamAValue: 35,
        teamBValue: 100,
      })
    ).toMatchObject({
      fairnessLabel: "Very uneven",
      favoredSide: "team_a",
      gapBand: "greater_than_35_percent",
    });
  });

  test("orders Trade Builder rosters by overall rank with unranked players last", () => {
    const players = [
      {
        playerId: "p3",
        player_id: "p3",
        name: "Unranked Player",
        position: "WR",
        team: "MIN",
        positionRank: 0,
        overallRank: 0,
        dynastyAdp: null,
      },
      {
        playerId: "p2",
        player_id: "p2",
        name: "Second Player",
        position: "RB",
        team: "DET",
        positionRank: 4,
        overallRank: 18,
        dynastyAdp: null,
      },
      {
        playerId: "p1",
        player_id: "p1",
        name: "First Player",
        position: "QB",
        team: "BUF",
        positionRank: 2,
        overallRank: 6,
        dynastyAdp: null,
      },
    ];

    expect(sortTradeBuilderPlayers(players).map((player) => player.playerId)).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
  });

  test("uses dynasty ADP when overall ranks are unavailable", () => {
    const players = [
      {
        playerId: "late",
        player_id: "late",
        name: "Later ADP",
        position: "WR",
        team: "MIN",
        positionRank: 0,
        overallRank: 0,
        dynastyAdp: 42,
      },
      {
        playerId: "early",
        player_id: "early",
        name: "Earlier ADP",
        position: "RB",
        team: "DET",
        positionRank: 0,
        overallRank: 0,
        dynastyAdp: 8,
      },
    ];

    expect(sortTradeBuilderPlayers(players).map((player) => player.playerId)).toEqual([
      "early",
      "late",
    ]);
  });

  test("derives the valuation mode from league settings", () => {
    expect(getTradeValuationMode({ seasonType: "Dynasty" })).toBe("dynasty");
    expect(
      getTradeValuationMode({ seasonType: "Redraft", status: "complete" })
    ).toBe("season results");
    expect(
      getTradeValuationMode({ seasonType: "Redraft", status: "in_season" })
    ).toBe("ros projection");
  });

  test("builds the bounded backend snapshot without player values", () => {
    const request = buildTradeValueRequest({
      league: {
        leagueId: "league-1",
        season: "2026",
        status: "in_season",
        scoringType: 1,
        scoringSettings: { rec: 1 },
        rosterPositions: ["QB", "RB", "WR", "BN"],
        totalRosters: 2,
        seasonType: "Dynasty",
        platform: "sleeper",
      },
      tableData: [
        {
          rosterId: 1,
          name: "Alpha",
          username: "alpha-user",
          starters: [["p1"]],
          benchPlayers: [["p2"]],
          players: ["p1", "p2"],
        },
        {
          rosterId: 2,
          name: "Beta",
          username: "beta-user",
          starters: [["p3"]],
          benchPlayers: [["p4"]],
          players: ["p3", "p4"],
        },
      ],
      selectedWeek: 1,
      showUsernames: false,
      dynastyPerspective: "balanced",
    });

    expect(request.rosters).toEqual([
      { id: 1, managerName: "Alpha", playerIds: ["p1", "p2"] },
      { id: 2, managerName: "Beta", playerIds: ["p3", "p4"] },
    ]);
    expect(JSON.stringify(request)).not.toContain("tradeValue");
    expect(JSON.stringify(request)).not.toContain("projectedPoints");
  });

  test("falls back to local player values when the backend is unavailable", async () => {
    vi.spyOn(tradeValuesApi, "getPlayerValues").mockRejectedValue(
      new Error("missing backend")
    );
    vi.spyOn(playerApi, "getPlayersByIdsMap").mockResolvedValue(
      new Map([
        [
          "p1",
          { player_id: "p1", name: "Alpha RB", position: "RB", team: "DET" },
        ],
        [
          "p2",
          { player_id: "p2", name: "Alpha WR", position: "WR", team: "MIN" },
        ],
        [
          "p3",
          { player_id: "p3", name: "Beta QB", position: "QB", team: "BUF" },
        ],
      ])
    );
    vi.spyOn(sleeperApi, "getDraftProjections").mockImplementation(
      async (playerId) => ({
        adp: playerId === "p3" ? 15 : null,
        projectedPoints: playerId === "p3" ? 310 : playerId === "p1" ? 210 : 190,
      })
    );
    vi.spyOn(sleeperApi, "getStats").mockImplementation(async (playerId) => ({
      rank: playerId === "p3" ? 2 : playerId === "p1" ? 12 : 18,
      points: playerId === "p3" ? 285 : playerId === "p1" ? 174 : 160,
      overallRank: playerId === "p3" ? 8 : playerId === "p1" ? 36 : 48,
      ppg: 0,
      firstName: "",
      lastName: "",
      position: "",
      team: "",
      id: playerId,
      gp: 0,
    }));

    const result = await loadLeaguePlayerValues({
      league: {
        leagueId: "league-1",
        season: "2026",
        status: "in_season",
        scoringType: 1,
        scoringSettings: { rec: 1 },
        rosterPositions: ["QB", "RB", "WR", "FLEX", "BN"],
        totalRosters: 2,
        seasonType: "Redraft",
        platform: "sleeper",
      },
      tableData: [
        {
          rosterId: 1,
          name: "Alpha",
          username: "alpha-user",
          starters: [["p1"]],
          benchPlayers: [["p2"]],
          players: ["p1", "p2"],
        },
        {
          rosterId: 2,
          name: "Beta",
          username: "beta-user",
          starters: [["p3"]],
          benchPlayers: [[]],
          players: ["p3"],
        },
      ],
      selectedWeek: 1,
      showUsernames: false,
    });

    expect(result.access).toBe("premium");
    expect(result.totalPlayers).toBe(3);
    expect(result.rosters[0].players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: "p1",
          name: "Alpha RB",
          projectedPoints: 210,
          tradeValue: expect.any(Number),
        }),
      ])
    );
  });

  test("assigns future picks to their current dynasty owner", () => {
    const league = {
      season: "2025",
      status: "complete",
      totalRosters: 2,
      draftPicks: [],
      rosters: [
        { rosterId: 1, potentialPoints: 1200 },
        { rosterId: 2, potentialPoints: 1500 },
      ],
    };
    const rosters = [
      { id: 1, managerName: "Alpha" },
      { id: 2, managerName: "Beta" },
    ];
    const assets = buildDynastyDraftPickAssets({
      league,
      rosters,
      tradedPicks: [
        {
          season: "2026",
          round: 1,
          rosterId: 1,
          previousOwnerId: 1,
          ownerId: 2,
        },
      ],
    });

    expect(
      assets.find(
        (pick) =>
          pick.season === 2026 &&
          pick.round === 1 &&
          pick.originalRosterId === 1
      )
    ).toMatchObject({
      ownerRosterId: 2,
      label: "2026 Round 1 (from Alpha)",
    });
  });

  test("does not add a fourth round to a known three-round dynasty draft", () => {
    const assets = buildDynastyDraftPickAssets({
      league: {
        season: "2025",
        status: "complete",
        totalRosters: 2,
        draftPicks: [{ round: 1 }, { round: 2 }, { round: 3 }],
      },
      rosters: [
        { id: 1, managerName: "Alpha" },
        { id: 2, managerName: "Beta" },
      ],
      tradedPicks: [],
    });

    expect([...new Set(assets.map((pick) => pick.round))]).toEqual([1, 2, 3]);
  });

  test("keeps basic ranks for players omitted from premium rankings", () => {
    const rosters = [
      {
        id: 1,
        managerName: "Alpha",
        players: [
          {
            playerId: "p1",
            player_id: "p1",
            name: "Preview Player",
            position: "WR",
            team: "MIN",
            positionRank: 8,
            overallRank: 20,
          },
          {
            playerId: "p2",
            player_id: "p2",
            name: "Basic Rank Player",
            position: "RB",
            team: "DET",
            positionRank: 18,
            overallRank: 54,
          },
        ],
      },
    ];

    const merged = mergeTradeBuilderRankings(rosters, [
      {
        playerId: "p1",
        player_id: "p1",
        name: "Preview Player",
        position: "WR",
        team: "MIN",
        projectedPoints: 200,
        replacementPoints: 100,
        vorp: 100,
        tradeValue: 90,
        positionRank: 2,
        overallRank: 4,
      },
    ]);

    expect(merged[0].players).toEqual([
      expect.objectContaining({
        playerId: "p1",
        positionRank: 2,
        overallRank: 4,
      }),
      expect.objectContaining({
        playerId: "p2",
        positionRank: 18,
        overallRank: 54,
      }),
    ]);
  });

  test("does not mix league adjusted preview ranks into the free builder", () => {
    const rosters = [
      {
        id: 1,
        managerName: "Alpha",
        players: [
          {
            playerId: "p1",
            player_id: "p1",
            name: "Preview Player",
            position: "WR",
            team: "MIN",
            positionRank: 8,
            overallRank: 20,
          },
        ],
      },
    ];
    const rankings = [
      {
        playerId: "p1",
        player_id: "p1",
        name: "Preview Player",
        position: "WR",
        team: "MIN",
        projectedPoints: 200,
        replacementPoints: 100,
        vorp: 100,
        tradeValue: 90,
        positionRank: 2,
        overallRank: 4,
      },
    ];

    expect(
      applyTradeBuilderRankingResponse(rosters, {
        access: "preview",
        rankings,
      })[0].players[0]
    ).toMatchObject({ positionRank: 8, overallRank: 20 });
    expect(
      applyTradeBuilderRankingResponse(rosters, {
        access: "premium",
        rankings,
      })[0].players[0]
    ).toMatchObject({ positionRank: 2, overallRank: 4 });
  });
});
