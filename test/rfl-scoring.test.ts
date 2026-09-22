import { describe, expect, it } from "vitest";
import { scoreStats, estimateReturns } from "../src/features/rfl/scoring";
describe("RFL scoring", () => {
  it("scores return yards without using generic PPR totals", () => {
    expect(
      scoreStats(
        { kr_yd: 150, rec: 4, rec_yd: 50, pts_ppr: 100 },
        { kr_yd: 0.1, rec: 1, rec_yd: 0.1 },
        "WR",
      ).total,
    ).toBe(24);
  });
  it("distinguishes missing return yards from zero", () => {
    expect(scoreStats({}, { kr_yd: 0.1 }, "WR").missing).toContain("kr_yd");
    expect(scoreStats({ kr_yd: 0 }, { kr_yd: 0.1 }, "WR").missing).toEqual([]);
  });
  it("includes custom passing and long-play scoring", () => {
    expect(
      scoreStats(
        {
          pass_yd: 250,
          pass_td: 2,
          pass_fd: 15,
          pass_int: 1,
          pass_int_td: 1,
          rush_40p: 1,
        },
        {
          pass_yd: 0.04,
          pass_td: 4,
          pass_fd: 0.1,
          pass_int: -2,
          pass_int_td: -1,
          rush_40p: 0.25,
        },
        "QB",
      ).total,
    ).toBe(16.75);
  });
  it("uses supplied defense buckets without scoring mean yards again", () => {
    expect(
      scoreStats(
        { yds_allow: 350, yds_allow_300_349: 0.5, yds_allow_350_399: 0.5 },
        { yds_allow_300_349: 2, yds_allow_350_399: -1 },
        "DEF",
      ).total,
    ).toBe(0.5);
  });
  it("does not invent a defense bucket from average projected yards", () => {
    expect(
      scoreStats({ yds_allow: 350 }, { yds_allow_350_399: -1 }, "DEF").missing,
    ).toContain("yds_allow_350_399");
  });
  it("does not conflate 50+ with the 50–59 and 60+ kicker buckets", () => {
    const result = scoreStats(
      { fgm_50p: 2, xpm: 2 },
      { fgm_50_59: 5, fgm_60p: 6, xpm: 1 },
      "K",
    );
    expect(result.total).toBe(2);
    expect(result.missing).toEqual(["fgm_50_59", "fgm_60p"]);
    expect(
      scoreStats(
        { fgm_50_59: 1, fgm_60p: 1, fgmiss: 1 },
        { fgm_50_59: 5, fgm_60p: 6, fgmiss: -1 },
        "K",
      ).total,
    ).toBe(10);
  });
  it("derives missed kicks from attempts and makes", () => {
    expect(scoreStats({ fga: 3, fgm: 2 }, { fgmiss: -1 }, "K").total).toBe(-1);
  });
  it("does not count individual returns or passing against team defense", () => {
    expect(
      scoreStats(
        { kr_yd: 100, pr_yd: 100, pass_int_td: 1 },
        { kr_yd: 0.1, pr_yd: 0.1, pass_int_td: -1 },
        "DEF",
      ).total,
    ).toBeNull();
  });
  it("reports unsupported settings and rejects nonfinite stats", () => {
    const result = scoreStats({ rec: NaN }, { rec: 1, future_bonus: 5 }, "WR");
    expect(result.total).toBeNull();
    expect(result.unsupported).toEqual(["future_bonus"]);
  });
  it("estimates returns only from sufficient active-week evidence", () => {
    expect(
      estimateReturns(
        [{ gp: 1, kr_yd: 100 }, { gp: 1, kr_yd: 50 }, { gp: 0 }],
        "kr_yd",
      ),
    ).toEqual({ yards: 75, games: 2 });
    expect(
      estimateReturns([{ gp: 1, kr_yd: 100 }, { gp: 1 }], "kr_yd"),
    ).toEqual({ yards: 50, games: 2 });
    expect(estimateReturns([{ kr_yd: 100 }], "kr_yd")).toBeNull();
  });
});
