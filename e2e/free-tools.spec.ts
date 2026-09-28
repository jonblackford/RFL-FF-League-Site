import { test, expect } from "@playwright/test";
import {
  installLeagueApiMocks,
  SLEEPER_LEAGUE_ID,
} from "./fixtures/league-api";
test("weekly results and every player value work without a paid backend", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await installLeagueApiMocks(page);
  await page.route(`**/v1/league/${SLEEPER_LEAGUE_ID}`, async (route) => {
    // Explicit league fixture, independent of the external service.
    await route.fulfill({
      json: {
        name: "Working League",
        league_id: SLEEPER_LEAGUE_ID,
        season: "2026",
        sport: "nfl",
        total_rosters: 2,
        status: "in_season",
        settings: {
          last_scored_leg: 2,
          playoff_week_start: 15,
          playoff_teams: 2,
          type: 0,
        },
        scoring_settings: { rec: 1 },
        roster_positions: ["WR", "BN"],
      },
    });
  });
  await page.route("**/v1/league/*/rosters", (route) =>
    route.fulfill({
      json: [1, 2].map((n) => ({
        roster_id: n,
        owner_id: `sleeper-owner-${n}`,
        players: n === 1 ? ["a", "c"] : ["b"],
        settings: { wins: 1, losses: 1, ties: 0, fpts: 100, ppts: 110 },
      })),
    }),
  );
  await page.route("**/v1/league/*/matchups/*", (route) => {
    const week = Number(route.request().url().split("/").pop());
    return route.fulfill({
      json: [1, 2].map((n) => ({
        roster_id: n,
        matchup_id: 1,
        points: week === 1 ? (n === 1 ? 20 : 10) : n === 1 ? 15 : 25,
        players: n === 1 ? ["a", "c"] : ["b"],
        starters: [n === 1 ? "a" : "b"],
        starters_points: [week === 1 ? (n === 1 ? 20 : 10) : n === 1 ? 15 : 25],
        players_points: {
          [n === 1 ? "a" : "b"]:
            week === 1 ? (n === 1 ? 20 : 10) : n === 1 ? 15 : 25,
        },
      })),
    });
  });
  await page.route("**/v1/league/*/transactions/*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/v1/players/nfl", (route) =>
    route.fulfill({
      json: {
        a: { full_name: "Alpha Receiver", position: "WR", team: "DET" },
        b: { full_name: "Beta Receiver", position: "WR", team: "BUF" },
        c: { full_name: "New Receiver", position: "WR", team: "KC" },
      },
    }),
  );
  const backendRequests: string[] = [];
  page.on("request", (r) => {
    if (/\/api\/(playerValues|weeklyReport|premiumWeeklyReport)/.test(r.url()))
      backendRequests.push(r.url());
  });
  await page.goto(
    `${process.env.TEST_PAGES === "true" ? "/#/" : "/"}?leagueId=${SLEEPER_LEAGUE_ID}&destination=weekly_report`,
  );
  await expect(
    page.getByRole("heading", { name: "Week 2 at a glance" }),
  ).toBeVisible();
  await expect(page.getByLabel("Weekly report")).toContainText(
    "Sleeper Team Two beat Sleeper Team One by 10.00 points.",
  );
  await page.getByLabel("Week", { exact: true }).selectOption("1");
  await expect(
    page.getByRole("heading", { name: "Week 1 at a glance" }),
  ).toBeVisible();
  await expect(page.getByLabel("Weekly report")).toContainText(
    "Sleeper Team One beat Sleeper Team Two by 10.00 points.",
  );
  await page
    .getByLabel("Manager notes & next steps")
    .fill("Review Alpha before the next waiver run.");
  const popupPromise = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Save PDF / print", exact: true })
    .click();
  const pdfPage = await popupPromise;
  await expect(pdfPage.locator("body")).toContainText("2026 season · Week 1");
  await expect(pdfPage.locator("body")).toContainText(
    "Review Alpha before the next waiver run.",
  );
  await pdfPage.pdf({
    path: "/tmp/rfl-weekly-report-preview.pdf",
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
  await pdfPage.close();
  await page.getByLabel("Week", { exact: true }).selectOption("2");
  await expect(page.getByLabel("Manager notes & next steps")).toHaveValue("");
  await page.getByLabel("Week", { exact: true }).selectOption("1");
  await expect(page.getByLabel("Manager notes & next steps")).toHaveValue(
    "Review Alpha before the next waiver run.",
  );
  await page.screenshot({
    path: "/tmp/weekly-report-desktop.png",
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download text", exact: true })
    .click();
  expect((await downloadPromise).suggestedFilename()).toBe("week-1-report.txt");
  await page.getByText("Player Values", { exact: true }).first().click();
  await expect(
    page.getByText("Alpha Receiver", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page
      .getByLabel("League trade value rankings")
      .getByText("New Receiver", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Search players").fill("New Receiver");
  await expect(page.getByLabel("League trade value rankings")).toContainText(
    "No data",
  );
  await page.getByLabel("Search players").fill("Beta");
  await expect(page.getByLabel("League trade value rankings")).toContainText(
    "Beta Receiver",
  );
  await expect(
    page.getByLabel("League trade value rankings"),
  ).not.toContainText("Alpha Receiver");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator("body")).not.toContainText(
    /Premium|subscription required|Unlock every/,
  );
  await page.screenshot({
    path: "/tmp/player-values-mobile.png",
    fullPage: true,
  });
  expect(backendRequests).toEqual([]);
  expect(errors).toEqual([]);
});
