import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const visibleLeagueFiles = [
  "src/components/league_history/ManagerComparison.vue",
  "src/components/league_narratives/ManagerArchetypesCard.vue",
  "src/components/player_values/PlayerValues.vue",
  "src/components/start_sit/StartSitDashboard.vue",
  "src/components/trade_lab/TradeLab.vue",
  "src/components/trade_lab/TradeRankings.vue",
];

describe("subscription visibility", () => {
  test.each(visibleLeagueFiles)(
    "%s does not show account upgrade links",
    (file) => {
      const source = readFileSync(file, "utf8");

      expect(source).not.toContain("path: '/account'");
      expect(source).not.toContain('path: "/account"');
      expect(source).not.toContain("Unlock Premium");
      expect(source).not.toContain("Premium adds");
      expect(source).not.toContain("Premium subscription");
    }
  );
});
