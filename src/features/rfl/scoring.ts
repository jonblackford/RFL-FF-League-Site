import type { Score, Stats } from "./types";
const offense = new Set(
  "pass_yd pass_td pass_fd pass_2pt pass_int pass_int_td rush_yd rush_td rush_2pt rush_40p rec rec_yd rec_td rec_2pt rec_40p kr_yd pr_yd st_td st_tkl_solo st_ff st_fum_rec fum_lost fum_rec_td".split(
    " ",
  ),
);
const defense = new Set(
  "sack int fum_rec safe ff blk_kick def_2pt def_td def_st_td def_st_ff def_st_fum_rec def_kr_yd def_pr_yd int_ret_yd".split(
    " ",
  ),
);
const kicking = new Set(
  "xpm xpmiss fgm fgmiss fgm_0_19 fgm_20_29 fgm_30_39 fgm_40_49 fgm_50p fgm_50_59 fgm_60p fgmiss_0_19 fgmiss_20_29 fgmiss_30_39 fgmiss_40_49 fgmiss_50p fgmiss_50_59 fgmiss_60p".split(
    " ",
  ),
);
const buckets = new Set(
  "pts_allow_0 pts_allow_1_6 pts_allow_7_13 pts_allow_14_20 pts_allow_21_27 pts_allow_28_34 pts_allow_35p yds_allow_0_100 yds_allow_100_199 yds_allow_200_299 yds_allow_300_349 yds_allow_350_399 yds_allow_400_449 yds_allow_450_499 yds_allow_500_549 yds_allow_550p".split(
    " ",
  ),
);
export const statLabel = (key: string) =>
  ({
    kr_yd: "Kick return yards",
    pr_yd: "Punt return yards",
    rec: "Receptions",
    pass_yd: "Passing yards",
    pass_td: "Passing TD",
    pass_fd: "Passing first downs",
    rush_yd: "Rushing yards",
    rec_yd: "Receiving yards",
    rush_td: "Rushing TD",
    rec_td: "Receiving TD",
    fum_lost: "Fumbles lost",
    fgmiss: "Missed field goals",
    xpm: "Extra points made",
  })[key] ?? key.replaceAll("_", " ");
const numeric = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);
export function scoreStats(
  stats: Stats,
  settings: Stats,
  position: string,
): Score {
  const result: Score = {
    total: null,
    breakdown: [],
    missing: [],
    unsupported: [],
  };
  for (const [key, rate] of Object.entries(settings)) {
    if (!numeric(rate) || rate === 0) continue;
    const known =
      offense.has(key) ||
      defense.has(key) ||
      kicking.has(key) ||
      buckets.has(key);
    if (!known) {
      result.unsupported.push(key);
      continue;
    }
    const applicable =
      position === "DEF"
        ? defense.has(key) || buckets.has(key)
        : position === "K"
          ? kicking.has(key) || ["fum_lost", "fum_rec_td"].includes(key)
          : offense.has(key);
    if (!applicable) continue;
    let value = stats[key];
    if (
      key === "fgmiss" &&
      !numeric(value) &&
      numeric(stats.fga) &&
      numeric(stats.fgm)
    )
      value = Math.max(0, stats.fga - stats.fgm);
    // A supplied bucket distribution is authoritative. Never threshold a projected mean.
    if (!numeric(value) && buckets.has(key)) {
      const family = key.startsWith("pts_") ? "pts_allow_" : "yds_allow_";
      if (
        Object.keys(stats).some(
          (k) => k.startsWith(family) && numeric(stats[k]),
        )
      )
        value = 0;
    }
    if (!numeric(value)) {
      result.missing.push(key);
      continue;
    }
    result.breakdown.push({ key, value, rate, points: value * rate });
  }
  if (result.breakdown.length)
    result.total =
      Math.round(result.breakdown.reduce((s, b) => s + b.points, 0) * 100) /
      100;
  return result;
}
export function estimateReturns(
  history: Stats[],
  key: "kr_yd" | "pr_yd",
): { yards: number; games: number } | null {
  const active = history
    .filter((s) => s.gp > 0 || s.gms_active > 0)
    .slice(0, 3);
  if (active.length < 2 || !active.some((s) => numeric(s[key]))) return null;
  return {
    yards:
      active.reduce((n, s) => n + (numeric(s[key]) ? s[key] : 0), 0) /
      active.length,
    games: active.length,
  };
}
