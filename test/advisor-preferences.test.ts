import { expect, it, vi, afterEach } from "vitest";
import {
  readAdvisorPreferences,
  writeAdvisorPreferences,
} from "../src/features/advisor/preferences";
afterEach(() => vi.unstubAllGlobals());
it("recovers from corrupt or unavailable storage", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => "{bad",
    setItem: () => {
      throw Error("denied");
    },
  });
  expect(readAdvisorPreferences("a").watchlist).toEqual([]);
  expect(() =>
    writeAdvisorPreferences("a", { rosterId: 1, watchlist: ["x"] }),
  ).not.toThrow();
});
it("keeps watchlists separate and normalizes untrusted saved values", () => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k),
    setItem: (k: string, v: string) => data.set(k, v),
  });
  writeAdvisorPreferences("sleeper:111:2026:1", {
    rosterId: 1,
    watchlist: ["x", "x"],
  });
  expect(readAdvisorPreferences("sleeper:111:2026:1").watchlist).toEqual(["x"]);
  expect(readAdvisorPreferences("sleeper:222:2026:1").watchlist).toEqual([]);
});
