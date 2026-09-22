import { expect, test } from "@playwright/test";
test("live RFL advisor loads Dart Vader and works on mobile", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const rawRosters = await (
    await page.request.get(
      "https://api.sleeper.app/v1/league/1394364555710181376/rosters",
    )
  ).json();
  const expectedRoster = rawRosters.find(
    (r: { roster_id: number }) => r.roster_id === 1,
  );
  await page.goto("/");
  await expect(page).toHaveURL(/\/rfl$/);
  await expect(
    page.getByRole("heading", { name: "Your recommended lineup" }),
  ).toBeVisible({ timeout: 45000 });
  await expect(
    page.getByRole("heading", { name: "Dart Vader", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("10 kick return yards = 1.0 points.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".player-card")).toHaveCount(9);
  await page.screenshot({
    path: "test-results/rfl-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Analysis week").selectOption("2");
  await expect(page.locator(".dashboard-toolbar h2")).toContainText("Week 2");
  await expect(
    page.getByRole("button", { name: "Refresh data" }),
  ).toBeEnabled();
  await page.getByLabel("Analysis week").selectOption("3");
  await expect(page.locator(".dashboard-toolbar h2")).toContainText("Week 3");
  await page.getByRole("tab", { name: /Waiver wire/ }).click();
  await expect(
    page.getByRole("heading", { name: "Waiver opportunities" }),
  ).toBeVisible();
  await expect(page.locator(".waiver-card").first()).toBeVisible();
  await page.getByRole("tab", { name: "My roster" }).click();
  await expect(page.locator(".player-card")).toHaveCount(
    expectedRoster.players.length,
  );
  await page.getByRole("button", { name: "See rules" }).click();
  await expect(page).toHaveURL(/\/rfl$/);
  await expect(
    page.getByRole("heading", { name: "Roster limits" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Start / sit" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/rfl-mobile.png",
    fullPage: true,
  });
  // Exercise the missing-service UI against an explicit unavailable API response.
  await page.route("**/api/rfl-advisor", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error:
          "AI is not configured. Calculated recommendations remain available.",
      }),
    }),
  );
  await page.getByRole("button", { name: "Explain my lineup" }).click();
  await expect(page.getByRole("alert")).toContainText("AI is not configured");
  await expect(
    page.getByRole("heading", { name: "Your recommended lineup" }),
  ).toBeVisible();
  await page.route("**/v1/league/1394364555710181376", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.getByRole("button", { name: "Refresh data" }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "Showing the last loaded snapshot",
  );
  await expect(page.locator(".player-card")).toHaveCount(9);
  expect(errors).toEqual([]);
});
