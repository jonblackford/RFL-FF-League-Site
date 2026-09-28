import type { TableDataType } from "@/types/types";
export function buildWeeklyDigest(
  rows: TableDataType[],
  week: number,
  usernames: boolean,
) {
  const index = week - 1;
  const teams = rows
    .filter((row) => Number.isFinite(row.points?.[index]))
    .map((row) => ({
      id: row.rosterId,
      name:
        (usernames ? row.username || row.name : row.name || row.username) ||
        `Team ${row.rosterId}`,
      points: row.points[index],
      matchup: row.matchups?.[index],
    }))
    .sort((a, b) => b.points - a.points || a.id - b.id);
  const groups = new Map<number, typeof teams>();
  for (const team of teams)
    if (team.matchup && team.matchup > 0)
      groups.set(team.matchup, [...(groups.get(team.matchup) || []), team]);
  const matchups = [...groups.entries()]
    .filter(([, pair]) => pair.length === 2)
    .map(([id, pair]) => {
      const margin = Math.round((pair[0].points - pair[1].points) * 100) / 100;
      return {
        id,
        teams: pair,
        margin,
        summary:
          margin === 0
            ? `${pair[0].name} and ${pair[1].name} tied at ${pair[0].points.toFixed(2)}.`
            : `${pair[0].name} beat ${pair[1].name} by ${margin.toFixed(2)} points.`,
      };
    });
  return {
    teams,
    matchups,
    average: teams.length
      ? teams.reduce((sum, t) => sum + t.points, 0) / teams.length
      : null,
    closest: [...matchups].sort((a, b) => a.margin - b.margin)[0] ?? null,
  };
}
