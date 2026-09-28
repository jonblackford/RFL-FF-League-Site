import { expect, it, vi, afterEach } from "vitest";
import {
  loadLeagueActivity,
  loadMatchups,
} from "../src/features/advisor/activity";
afterEach(() => vi.unstubAllGlobals());
it("deduplicates completed transactions and retains real matchup totals", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      Response.json(
        String(url).includes("transactions")
          ? [
              {
                transaction_id: "a",
                status: "complete",
                type: "waiver",
                status_updated: 100,
                adds: { p: 1 },
                drops: null,
              },
              {
                transaction_id: "a",
                status: "complete",
                type: "waiver",
                status_updated: 100,
              },
              { transaction_id: "b", status: "failed" },
            ]
          : [
              { roster_id: 1, matchup_id: 1, points: 12.25 },
              { roster_id: 2, matchup_id: 1, points: 9 },
            ],
      ),
    ),
  );
  const activity = await loadLeagueActivity("111", 3);
  expect(activity).toHaveLength(1);
  expect(activity[0].adds).toEqual({ p: 1 });
  expect((await loadMatchups("111", 3))[0].points).toBe(12.25);
});
it("reports a failed feed rather than empty activity", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("", { status: 503 })),
  );
  await expect(loadLeagueActivity("111", 3)).rejects.toThrow("503");
});
