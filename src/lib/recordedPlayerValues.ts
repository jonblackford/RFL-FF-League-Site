import type { Player } from "@/types/apiTypes";
import type { TradeFinderPlayer } from "./tradeFinder";
export type RecordedProduction = Record<
  string,
  { points: number; weeks: number }
>;
export function rankRecordedPlayers(
  players: Player[],
  production: RecordedProduction,
  slots: string[],
  teams: number,
): TradeFinderPlayer[] {
  const rows = players.map((player) => {
    const record = production[player.player_id];
    const average = record?.weeks > 0 ? record.points / record.weeks : 0;
    return {
      playerId: player.player_id,
      name: player.name,
      position: player.position,
      team: player.team,
      projectedPoints: average,
      replacementPoints: 0,
      vorp: 0,
      tradeValue: 0,
      positionRank: 0,
      overallRank: 0,
      observedAverage: average,
      observedWeeks: record?.weeks ?? 0,
      dataAvailable: Boolean(record?.weeks > 0),
    };
  });
  const groups = new Map<string, typeof rows>();
  for (const row of rows)
    groups.set(row.position, [...(groups.get(row.position) || []), row]);
  for (const [position, group] of groups) {
    group.sort(
      (a, b) =>
        Number(b.dataAvailable) - Number(a.dataAvailable) ||
        b.observedAverage - a.observedAverage ||
        a.name.localeCompare(b.name),
    );
    const starters =
      Math.max(1, slots.filter((s) => s === position).length) *
      Math.max(1, teams);
    const covered = group.filter((p) => p.dataAvailable);
    const baseline =
      covered[Math.min(starters, covered.length - 1)]?.observedAverage ?? 0;
    group.forEach((row, index) => {
      row.positionRank = index + 1;
      row.replacementPoints = baseline;
      row.vorp = row.observedAverage - baseline;
    });
  }
  // A transparent relative index, not a market price or a forecast.
  const strength = (row: (typeof rows)[number]) =>
    Math.max(0, row.observedAverage) + Math.max(0, row.vorp);
  const maximum = Math.max(1, ...rows.map(strength));
  rows.forEach((row) => {
    row.tradeValue = row.dataAvailable
      ? Math.round((100 * strength(row)) / maximum)
      : 0;
  });
  rows.sort(
    (a, b) =>
      Number(b.dataAvailable) - Number(a.dataAvailable) ||
      b.tradeValue - a.tradeValue ||
      b.observedAverage - a.observedAverage ||
      a.name.localeCompare(b.name),
  );
  rows.forEach((row, index) => {
    row.overallRank = index + 1;
  });
  return rows;
}
