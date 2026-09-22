import type { Lineup, RflPlayer, RflSnapshot } from "./types";
import type { WaiverRecommendation } from "./recommendations";
export function lineupChanges(starters: string[], lineup: Lineup) {
  const selected = lineup.assignments.flatMap((a) =>
    a.player ? [a.player.id] : [],
  );
  return {
    start: selected.filter((id) => !starters.includes(id)),
    sit: starters.filter((id) => id !== "0" && !selected.includes(id)),
  };
}
export function currentLineupTotal(
  starters: string[],
  players: RflPlayer[],
): number | null {
  if (!starters.length) return null;
  const current = starters.map((id) => players.find((p) => p.id === id));
  if (current.some((p) => !p || !p.available || p.projection === null))
    return null;
  return current.reduce((sum, p) => sum + p!.projection!, 0);
}
export function buildEvidence(
  snapshot: RflSnapshot,
  lineup: Lineup,
  waivers: WaiverRecommendation[],
) {
  const brief = (p: RflPlayer) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    team: p.team,
    projection: p.projection,
    returnPoints: p.returnPoints,
    injury: p.injury,
    opponent: p.opponent,
    available: p.available,
    estimates: p.estimates,
    missing: p.score.missing,
    unsupported: p.score.unsupported,
  });
  return {
    leagueId: snapshot.league.league_id,
    team: "Dart Vader",
    season: snapshot.league.season,
    week: snapshot.week,
    fetchedAt: snapshot.fetchedAt,
    scoring: snapshot.league.scoring_settings,
    currentStarters: snapshot.roster.starters,
    players: snapshot.players
      .filter((p) => snapshot.roster.players.includes(p.id))
      .slice(0, 30)
      .map(brief),
    lineup: lineup.assignments.map((a) => ({
      slot: a.slot,
      player: a.player ? brief(a.player) : null,
    })),
    waivers: waivers.slice(0, 6).map((w) => ({
      add: brief(w.add),
      drop: w.drop ? brief(w.drop) : null,
      lineupGain: w.gain,
      depthGain: w.depthGain,
      unfilledSlotsImproved: w.fills,
      note: w.note,
    })),
    warnings: snapshot.warnings,
  };
}
