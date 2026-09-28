import { readFileSync } from "node:fs";
const firebaseConfig = JSON.parse(readFileSync(new URL("../src/config/firebase-ai.json", import.meta.url), "utf8"));
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
  await page
    .getByRole("navigation", { name: "Advisor sections" })
    .getByRole("button", { name: "Insights", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your weekly research desk" }),
  ).toBeVisible();
  await expect(page.getByLabel("Football intelligence")).toContainText(
    /SCORING COVERAGE/i,
  );
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
  if (!firebaseConfig.enabled) {
    await page.getByRole("button", { name: "Ask advisor ↗" }).click();
    await expect(page.getByRole("alert")).toContainText("Connect your Gemini");
  } else {
    await expect(page.getByLabel("Gemini API key")).toHaveCount(0);
  }
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
  await page.route("https://www.google.com/recaptcha/enterprise.js*", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: 'window.grecaptcha={enterprise:{ready:cb=>cb(),render:(_el,opts)=>{window.__rflCaptchaSuccess=opts.callback;return 1},execute:()=>{window.__rflCaptchaSuccess();return Promise.resolve("fixture-recaptcha")}}};',
    }),
  );
  await page.route("https://firebaseappcheck.googleapis.com/**", (r) =>
    r.fulfill({ json: { token: "fixture-app-check", ttl: "86400s" } }),
  );
  const requests: any[] = [];
  await page.route(
    /https:\/\/(generativelanguage|firebasevertexai)\.googleapis\.com\//,
    async (r) => {
      if (r.request().method() === "GET") {
        await r.fulfill({
          json: { supportedGenerationMethods: ["generateContent"] },
        });
        return;
      }
      requests.push(r.request().postDataJSON());
      await r.fulfill({
        json: {
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [{ text: `Grounded answer ${requests.length}\n\n### Summary\n\nConsider **Alpha Receiver**.\n\n### Next steps\n\n1. Check injuries.\n2. Review waivers.\n\n[Unsafe](javascript:alert(1))` }],
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
  if (!firebaseConfig.enabled) {
    await page.getByRole("button", { name: "Ask advisor ↗" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Connect your Gemini API key",
    );
    expect(requests).toHaveLength(0);
    await page.getByLabel("Gemini API key").fill("mock-key-not-real");
    await expect(
      page.getByText("Key entered — connection not verified", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Check Google connection", exact: true })
      .click();
    await expect(
      page.getByText("Google connection verified", { exact: true }),
    ).toBeVisible();
    expect(requests).toHaveLength(0);
  } else {
    await expect(page.getByLabel("Gemini API key")).toHaveCount(0);
    await expect(page.getByText(/No personal API key is needed/)).toBeVisible();
  }
  await page.getByRole("button", { name: "Ask advisor ↗" }).click();
  await expect(
    page.getByText("Grounded answer 1", { exact: true }),
  ).toBeVisible();
  const answer = page.locator(".ad-message.model").first();
  await expect(answer.getByRole("heading", {name:"Summary",exact:true})).toBeVisible();
  await expect(answer.locator("strong").filter({hasText:"Alpha Receiver"})).toBeVisible();
  await expect(answer.locator("ol li")).toHaveCount(2);
  await expect(answer.locator('a[href^="javascript:"]')).toHaveCount(0);
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
  if (!firebaseConfig.enabled) {
    await expect(page.getByLabel("Gemini API key")).toHaveValue(
      process.env.TEST_PAGES === "true" ? "mock-key-not-real" : "",
    );
  }
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
