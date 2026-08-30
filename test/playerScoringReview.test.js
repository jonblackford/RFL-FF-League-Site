import { describe, expect, test } from "vitest";
import { buildPlayerScoringReviewItems } from "../src/lib/playerScoringReview.ts";

describe("buildPlayerScoringReviewItems", () => {
  test("formats scoring-adjusted player review rows", () => {
    const rows = buildPlayerScoringReviewItems({
      player: {
        projectedPoints: 244.25,
        replacementPoints: 151.1,
        vorp: 93.15,
      },
      valuationMode: "ros projection",
      scoringLabel: "PPR",
      previousStats: {
        points: 201.44,
        ppg: 13.43,
        rank: 7,
        position: "WR",
      },
    });

    expect(rows).toEqual([
      { label: "League-adjusted projection", value: "244.3 PPR pts" },
      { label: "Replacement baseline", value: "151.1 pts" },
      { label: "Value above replacement", value: "93.2 pts" },
      { label: "Previous season", value: "201.4 pts, 13.4 PPG, WR7" },
    ]);
  });
});
