export type LeagueActivity = {
  id: string;
  timestamp: number;
  type: string;
  adds: Record<string, number>;
  drops: Record<string, number>;
  rosterIds: number[];
};
export type Matchup = {
  rosterId: number;
  matchupId: number | null;
  points: number | null;
};
async function request(
  leagueId: string,
  week: number,
  path: string,
  signal?: AbortSignal,
): Promise<unknown[]> {
  if (
    !/^\d{1,25}$/.test(leagueId) ||
    !Number.isInteger(week) ||
    week < 1 ||
    week > 18
  )
    throw Error("Invalid league or week");
  const r = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/${path}/${week}`,
    {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    },
  );
  if (!r.ok) throw Error(`League activity unavailable (${r.status})`);
  const data = await r.json();
  if (!Array.isArray(data)) throw Error("Invalid league activity");
  return data;
}
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const moves = (v: unknown): Record<string, number> =>
  obj(v)
    ? (Object.fromEntries(
        Object.entries(v).filter(
          ([, id]) => Number.isInteger(id) && Number(id) > 0,
        ),
      ) as Record<string, number>)
    : {};
export async function loadLeagueActivity(
  leagueId: string,
  week: number,
  signal?: AbortSignal,
): Promise<LeagueActivity[]> {
  const data = await request(leagueId, week, "transactions", signal);
  const unique = new Map<string, LeagueActivity>();
  for (const v of data) {
    if (
      !obj(v) ||
      typeof v.transaction_id !== "string" ||
      v.status !== "complete" ||
      unique.has(v.transaction_id)
    )
      continue;
    unique.set(v.transaction_id, {
      id: v.transaction_id,
      timestamp: typeof v.status_updated === "number" ? v.status_updated : 0,
      type: typeof v.type === "string" ? v.type : "transaction",
      adds: moves(v.adds),
      drops: moves(v.drops),
      rosterIds: Array.isArray(v.roster_ids)
        ? v.roster_ids.filter(
            (n): n is number => typeof n === "number" && Number.isInteger(n),
          )
        : [],
    });
  }
  return [...unique.values()]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100);
}
export async function loadMatchups(
  leagueId: string,
  week: number,
  signal?: AbortSignal,
): Promise<Matchup[]> {
  return (await request(leagueId, week, "matchups", signal)).flatMap((v) =>
    obj(v) && Number.isInteger(v.roster_id)
      ? [
          {
            rosterId: Number(v.roster_id),
            matchupId: Number.isInteger(v.matchup_id)
              ? Number(v.matchup_id)
              : null,
            points:
              typeof v.points === "number" && Number.isFinite(v.points)
                ? v.points
                : null,
          },
        ]
      : [],
  );
}
