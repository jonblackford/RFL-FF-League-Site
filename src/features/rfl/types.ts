export type Stats = Record<string, number>;
export type Score = {
  total: number | null;
  breakdown: { key: string; value: number; rate: number; points: number }[];
  missing: string[];
  unsupported: string[];
};
export type RflPlayer = {
  id: string;
  name: string;
  position: string;
  positions: string[];
  team: string;
  injury: string;
  opponent: string;
  gameDate: string;
  projection: number | null;
  score: Score;
  returnPoints: number;
  estimates: string[];
  available: boolean;
  reserve: boolean;
  sourceUpdated: number | null;
};
export type RflRoster = {
  roster_id: number;
  owner_id: string;
  players: string[];
  starters: string[];
  reserve: string[];
  taxi: string[];
};
export type RflLeague = {
  league_id: string;
  name: string;
  season: string;
  status: string;
  roster_positions: string[];
  scoring_settings: Stats;
  settings: Stats;
};
export type RflSnapshot = {
  league: RflLeague;
  roster: RflRoster;
  rosters: RflRoster[];
  players: RflPlayer[];
  week: number;
  fetchedAt: number;
  warnings: string[];
  source: string;
  historyWeeks: number[];
};
export type Lineup = {
  assignments: { slot: string; player: RflPlayer | null }[];
  total: number;
  filled: number;
};
