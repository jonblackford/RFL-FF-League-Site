import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { sidebarLeagueFeatures } from "../src/lib/features";

describe("sidebar navigation", () => {
  test("does not show informational or subscription links", () => {
    const source = readFileSync("src/components/layout/AppSidebar.vue", "utf8");

    expect(source).not.toContain("path: '/about'");
    expect(source).not.toContain('path: "/about"');
    expect(source).not.toContain("path: '/changelog'");
    expect(source).not.toContain('path: "/changelog"');
    expect(source).not.toContain("path: '/privacy'");
    expect(source).not.toContain('path: "/privacy"');
    expect(source).not.toContain("path: '/terms'");
    expect(source).not.toContain('path: "/terms"');
    expect(source).not.toContain("path: '/account'");
    expect(source).not.toContain('path: "/account"');
  });

  test("does not show the weekly report feature in league navigation", () => {
    expect(sidebarLeagueFeatures.map(({ id }) => id)).not.toContain(
      "Weekly Report"
    );
  });

  test("does not render the weekly report screen from league tabs", () => {
    const source = readFileSync("src/components/standings/Table.vue", "utf8");

    expect(source).not.toContain("../weekly_report/WeeklyReport.vue");
    expect(source).not.toContain("isActiveFeature('Weekly Report')");
  });
});
