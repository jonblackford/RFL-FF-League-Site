export type UsageWeek = {
  week: number;
  targets: number | null;
  carries: number | null;
  receptions: number | null;
  receivingYards: number | null;
  rushingYards: number | null;
};
export type PlayerTrend = Omit<UsageWeek, "week"> & {
  games: number;
  throughWeek: number;
  weeks: UsageWeek[];
};
export type EnrichmentFeed = {
  schemaVersion: 1;
  season: number;
  generatedAt: string;
  source: string;
  players: Record<string, PlayerTrend>;
};
const fields = [
  "targets",
  "carries",
  "receptions",
  "receivingYards",
  "rushingYards",
] as const;
export function parseEnrichment(
  value: unknown,
  season: number,
): EnrichmentFeed {
  const v = value as EnrichmentFeed;
  if (
    !v ||
    v.schemaVersion !== 1 ||
    v.season !== season ||
    !Number.isFinite(Date.parse(v.generatedAt)) ||
    typeof v.source !== "string" ||
    !v.players ||
    typeof v.players !== "object" ||
    Array.isArray(v.players)
  )
    throw Error("Historical feed unavailable for this season");
  for (const p of Object.values(v.players))
    if (
      !p ||
      !Array.isArray(p.weeks) ||
      p.weeks.length > 18 ||
      new Set(p.weeks.map((w) => w.week)).size !== p.weeks.length ||
      p.weeks.some(
        (w) =>
          !w ||
          !Number.isInteger(w.week) ||
          w.week < 1 ||
          w.week > 18 ||
          fields.some(
            (k) =>
              w[k] !== null &&
              (typeof w[k] !== "number" || !Number.isFinite(w[k])),
          ),
      )
    )
      throw Error("Historical feed has invalid player records");
  return v;
}
export function trendBeforeWeek(
  p: PlayerTrend | undefined,
  week: number,
): PlayerTrend | null {
  if (!p) return null;
  const weeks = p.weeks
    .filter((w) => w.week < week)
    .sort((a, b) => a.week - b.week)
    .slice(-3);
  if (!weeks.length) return null;
  const values = Object.fromEntries(
    fields.map((k) => [
      k,
      weeks.every((w) => w[k] !== null)
        ? Math.round(
            (weeks.reduce((s, w) => s + (w[k] || 0), 0) / weeks.length) * 100,
          ) / 100
        : null,
    ]),
  );
  return {
    ...values,
    games: weeks.length,
    throughWeek: weeks[weeks.length - 1].week,
    weeks,
  } as PlayerTrend;
}
export async function loadEnrichment(
  season: number,
  signal?: AbortSignal,
): Promise<EnrichmentFeed> {
  const r = await fetch(
    `${import.meta.env.BASE_URL}data/football-${season}.json`,
    { signal },
  );
  if (!r.ok)
    throw Error("Historical usage feed is not available for this season yet");
  return parseEnrichment(await r.json(), season);
}
