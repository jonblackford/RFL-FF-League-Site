import { expect, it } from "vitest";
import {
  parseEnrichment,
  trendBeforeWeek,
} from "../src/features/advisor/enrichment";
it("rejects a wrong season and never leaks future weeks into trends", () => {
  const feed = {
    schemaVersion: 1,
    season: 2026,
    generatedAt: "2026-09-20T12:00:00Z",
    source: "nflverse",
    players: {
      p: {
        games: 2,
        throughWeek: 2,
        targets: 50,
        weeks: [
          {
            week: 1,
            targets: 0,
            carries: null,
            receptions: 0,
            receivingYards: 0,
            rushingYards: null,
          },
          {
            week: 2,
            targets: 100,
            carries: 1,
            receptions: 1,
            receivingYards: 1,
            rushingYards: 1,
          },
        ],
      },
    },
  };
  expect(() => parseEnrichment(feed, 2025)).toThrow();
  const parsed = parseEnrichment(feed, 2026);
  expect(trendBeforeWeek(parsed.players.p, 2)?.targets).toBe(0);
  expect(trendBeforeWeek(parsed.players.p, 1)).toBeNull();
});
