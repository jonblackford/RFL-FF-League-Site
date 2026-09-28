import { expect, test } from "@playwright/test";
test("live league advisor uses current RFL data and retains stale data on failure", async ({
  page,
}) => {
  test.skip(
    process.env.RUN_LIVE_TESTS !== "true",
    "Opt-in verification against live Sleeper data",
  );
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const prefix = process.env.TEST_PAGES === "true" ? "/#/" : "/";
  await page.goto(
    `${prefix}?leagueId=1394364555710181376&destination=advisor&team=1`,
  );
  await expect(
    page.getByRole("heading", { name: "Your next decisions" }),
  ).toBeVisible({ timeout: 60000 });
  await expect(page.locator(".ad-meta")).toContainText("Dart Vader");
  await page
    .getByRole("navigation", { name: "Advisor sections" })
    .getByRole("button", { name: "Lineup", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Recommended starters" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/live-league-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.route("**/v1/league/1394364555710181376", (r) =>
    r.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.getByRole("button", { name: "↻ Refresh" }).click();
  await expect(page.getByRole("alert")).toContainText("previous snapshot");
  await expect(
    page.getByRole("heading", { name: "Recommended starters" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
