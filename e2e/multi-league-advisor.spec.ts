import { test, expect } from "@playwright/test";
import {
  installLeagueApiMocks,
  SLEEPER_LEAGUE_ID,
} from "./fixtures/league-api";
test("advisor connects team selection, comparisons, watchlists and AI on mobile", async ({
  page,
}) => {
  await installLeagueApiMocks(page);
  await page.addInitScript(() => localStorage.setItem("currentTab", "Advisor"));
  await page.route("**/v1/state/nfl", (r) =>
    r.fulfill({ json: { season: "2026", week: 3 } }),
  );
  await page.route("**/v1/players/nfl", (r) =>
    r.fulfill({
      json: {
        a: { full_name: "Alpha Receiver", position: "WR", team: "DET" },
        b: { full_name: "Beta Receiver", position: "WR", team: "GB" },
      },
    }),
  );
  await page.route("**/projections/nfl/**", (r) =>
    r.fulfill({
      json: [
        {
          player_id: "a",
          season: "2026",
          week: 3,
          opponent: "GB",
          stats: { rec: 4, gp: 1 },
        },
        {
          player_id: "b",
          season: "2026",
          week: 3,
          opponent: "DET",
          stats: { rec: 6, gp: 1 },
        },
      ],
    }),
  );
  await page.route("**/stats/nfl/**", (r) => r.fulfill({ json: [] }));
  await page.goto(
    `${process.env.TEST_PAGES === "true" ? "/#/" : "/"}?leagueId=${SLEEPER_LEAGUE_ID}`,
  );
  await page.getByText("Advisor", { exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Every league. A clearer next move." }),
  ).toBeVisible();
  await expect(page.getByLabel("Team", { exact: true })).toHaveValue("1");
  await page.getByRole('navigation',{name:'Advisor sections'}).getByRole('button',{name:'Insights',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your weekly research desk'})).toBeVisible();
  await expect(page.getByLabel('Football intelligence')).toContainText(/SCORING COVERAGE/i);
  await page.getByLabel("Team", { exact: true }).selectOption("2");
  await expect(
    page.getByText("Sleeper Team Two · Week 3", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Advisor sections" })
    .getByRole("button", { name: "Players", exact: true })
    .click();
  await page.getByLabel("Search players").fill("Alpha");
  await expect(
    page.getByRole("heading", { name: "Alpha Receiver", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Watch Alpha Receiver", exact: true })
    .click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Player comparison" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ask AI to compare" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Your question")).toHaveValue(
    /Compare these players/,
  );
  await page.getByRole("button", { name: "Ask advisor ↗" }).click();
  await expect(page.getByRole("alert")).toContainText("Connect your Gemini");
  await page.getByRole("button", { name: "Close advisor" }).click();
  await page.getByText("Standings", { exact: true }).first().click();
  await page.getByText("Advisor", { exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Recent usage" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Advisor sections" })
    .getByRole("button", { name: "Players", exact: true })
    .click();
  await page.getByLabel("Search players").fill("Alpha");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Player comparison" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "/tmp/rfl-advisor-mobile.png",
    fullPage: true,
  });
});

test("saved leagues isolate team preferences and bounded AI conversations", async ({
  page,
}) => {
  const controls = await installLeagueApiMocks(page);
  await page.route("**/v1/state/nfl", (r) =>
    r.fulfill({ json: { season: "2026", week: 3 } }),
  );
  await page.route("**/v1/players/nfl", (r) =>
    r.fulfill({
      json: { a: { full_name: "Alpha Receiver", position: "WR", team: "DET" } },
    }),
  );
  await page.route("**/projections/nfl/**", (r) =>
    r.fulfill({
      json: [
        {
          player_id: "a",
          season: "2026",
          week: 3,
          opponent: "GB",
          stats: { rec: 4, gp: 1 },
        },
      ],
    }),
  );
  await page.route("**/stats/nfl/**", (r) => r.fulfill({ json: [] }));
  const requests: any[] = [];
  await page.route(
    "https://generativelanguage.googleapis.com/**",
    async (r) => {
      requests.push(r.request().postDataJSON());
      await r.fulfill({
        json: {
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [{ text: `Grounded answer ${requests.length}` }],
              },
            },
          ],
        },
      });
    },
  );
  const prefix = process.env.TEST_PAGES === "true" ? "/#/" : "/";
  await page.goto(
    `${prefix}?leagueId=${SLEEPER_LEAGUE_ID}&destination=advisor`,
  );
  await expect(page.getByLabel("Team", { exact: true })).toHaveValue("1");
  await page.getByLabel("Team", { exact: true }).selectOption("2");
  await expect(
    page.getByText("Sleeper Team Two · Week 3", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "✦ Ask advisor" }).click();
  await page.getByLabel("Gemini API key").fill("mock-key-not-real");
  await page.getByRole("button", { name: "Ask advisor ↗" }).click();
  await expect(
    page.getByText("Grounded answer 1", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Ask a follow-up").fill("What is missing?");
  await page.getByRole("button", { name: "Ask advisor ↗" }).click();
  await expect(
    page.getByText("Grounded answer 2", { exact: true }),
  ).toBeVisible();
  expect(requests[1].contents).toHaveLength(3);
  expect(JSON.parse(requests[1].contents[2].parts[0].text).evidence.team).toBe(
    "Sleeper Team Two",
  );
  await page.getByRole("button", { name: "Close advisor" }).click();
  controls.sleeperLeagueId = "222";
  controls.sleeperLeagueName = "Second Sleeper League";
  await page.goto(`${prefix}?leagueId=222&destination=advisor`);
  await expect(page.getByLabel("Team", { exact: true })).toHaveValue("1");
  await page.getByRole("button", { name: "✦ Ask advisor" }).click();
  await expect(
    page.getByText("Grounded answer 1", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Gemini API key")).toHaveValue(
    process.env.TEST_PAGES === "true" ? "mock-key-not-real" : "",
  );
  await page.getByRole("button", { name: "Close advisor" }).click();
  controls.sleeperLeagueId = SLEEPER_LEAGUE_ID;
  await page.goto(
    `${prefix}?leagueId=${SLEEPER_LEAGUE_ID}&destination=advisor`,
  );
  await expect(page.getByLabel("Team", { exact: true })).toHaveValue("2");
  await page.goto(
    `${prefix}?leagueId=${SLEEPER_LEAGUE_ID}&destination=advisor&team=1&week=4&advisor=Players`,
  );
  await expect(page.getByLabel("Team", { exact: true })).toHaveValue("1");
  await expect(page.getByLabel("Week", { exact: true })).toHaveValue("4");
  await expect(
    page
      .getByRole("navigation", { name: "Advisor sections" })
      .getByRole("button", { name: "Players", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "/tmp/rfl-advisor-desktop.png",
    fullPage: true,
  });
});

test("denied preference storage does not blank the app", async ({ page }) => {
  await installLeagueApiMocks(page);
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Access denied", "SecurityError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Access denied", "SecurityError");
    };
  });
  await page.goto(process.env.TEST_PAGES === "true" ? "/#/" : "/");
  await expect(
    page.getByRole("heading", { name: /fantasy football/i }).first(),
  ).toBeVisible();
});
