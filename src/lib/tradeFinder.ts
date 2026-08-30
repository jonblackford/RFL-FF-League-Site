export type DynastyPerspective = "balanced" | "contender" | "rebuilder";

export type TradeValuationMode =
  | "ros projection"
  | "season results"
  | "dynasty";

export type TradeFinderPlayer = {
  playerId: string;
  position: string;
  name: string;
  team: string;
  projectedPoints: number;
  replacementPoints: number;
  vorp: number;
  tradeValue: number;
  positionRank: number;
  overallRank: number;
  dynastyAdp?: number | null;
};

export type TradeFinderRoster = {
  id: number;
  managerName: string;
  players: TradeFinderPlayer[];
};

export type LocalTradeFinderPlayer = Omit<
  TradeFinderPlayer,
  "projectedPoints" | "replacementPoints" | "vorp" | "tradeValue"
> &
  Partial<
    Pick<
      TradeFinderPlayer,
      "projectedPoints" | "replacementPoints" | "vorp" | "tradeValue"
    >
  > & {
    player_id?: string;
  };

export type LocalTradeFinderRoster = Omit<TradeFinderRoster, "players"> & {
  players: LocalTradeFinderPlayer[];
  draftPicks?: TradeFinderPick[];
};

export type TradeFinderPick = {
  id: string;
  season: number;
  round: number;
};

export type TradeSuggestion = {
  id: string;
  tradeType: "1-for-1" | "2-for-1" | "multi-asset";
  teamAId: number;
  teamAName: string;
  teamBId: number;
  teamBName: string;
  teamASends: TradeFinderPlayer[];
  teamBSends: TradeFinderPlayer[];
  teamAPicks?: TradeFinderPick[];
  teamBPicks?: TradeFinderPick[];
  teamAValue: number;
  teamBValue: number;
  teamAGain: number;
  teamBGain: number;
  teamAGainPerWeek: number;
  teamBGainPerWeek: number;
  fairnessPercent: number;
  valueGapPercent: number;
  score: number;
};

export type LocalTradeQuoteInput = {
  teamAValue: number;
  teamBValue: number;
};

export type LocalTradeQuote = {
  fairnessLabel:
    | "Very fair"
    | "Reasonably fair"
    | "Slightly uneven"
    | "Very uneven";
  favoredSide: "team_a" | "team_b" | "even";
  gapBand:
    | "within_10_percent"
    | "10_to_20_percent"
    | "20_to_35_percent"
    | "greater_than_35_percent";
};

export type LocalTradeSuggestionOptions = {
  rosters: LocalTradeFinderRoster[];
  forRosterId: number;
  assetFilter?: "all" | "draft-picks";
  starterPlayerIdsByRoster?: Record<number, string[]>;
  maxSuggestions?: number;
};

const getFiniteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const getPlayerValue = (player: LocalTradeFinderPlayer) => {
  const tradeValue = getFiniteNumber(player.tradeValue);
  if (tradeValue > 0) return tradeValue;

  const dynastyAdp = getFiniteNumber(player.dynastyAdp);
  if (dynastyAdp > 0) return Math.max(1, 120 - dynastyAdp);

  const overallRank = getFiniteNumber(player.overallRank);
  if (overallRank > 0) return Math.max(1, 110 - overallRank);

  const positionRank = getFiniteNumber(player.positionRank);
  if (positionRank > 0) return Math.max(1, 65 - positionRank);

  return 1;
};

const toFinderPlayer = (player: LocalTradeFinderPlayer): TradeFinderPlayer => {
  const tradeValue = getPlayerValue(player);
  const projectedPoints =
    getFiniteNumber(player.projectedPoints) || tradeValue * 2.5;
  const replacementPoints =
    getFiniteNumber(player.replacementPoints) || Math.max(0, projectedPoints - tradeValue);
  const vorp = getFiniteNumber(player.vorp) || Math.max(0, projectedPoints - replacementPoints);

  return {
    ...player,
    playerId: player.playerId || player.player_id || "",
    name: player.name || `${player.team} Defense`,
    team: player.team || "FA",
    projectedPoints,
    replacementPoints,
    vorp,
    tradeValue,
  };
};

const getPickValue = (pick: TradeFinderPick) => {
  const roundValues = [0, 48, 30, 18, 10, 6, 3];
  return roundValues[pick.round] ?? Math.max(1, 8 - pick.round);
};

const packageValue = (
  players: TradeFinderPlayer[],
  picks: TradeFinderPick[] = []
) =>
  players.reduce((total, player) => total + getPlayerValue(player), 0) +
  picks.reduce((total, pick) => total + getPickValue(pick), 0);

const getStarterPlayers = (
  roster: LocalTradeFinderRoster,
  starterPlayerIdsByRoster: Record<number, string[]> | undefined
) => {
  const starterIds = new Set(starterPlayerIdsByRoster?.[roster.id] ?? []);
  return roster.players.filter((player) => starterIds.has(player.playerId));
};

const getPositionNeed = (
  roster: LocalTradeFinderRoster,
  incomingPlayer: LocalTradeFinderPlayer,
  starterPlayerIdsByRoster: Record<number, string[]> | undefined
) => {
  const samePositionStarters = getStarterPlayers(
    roster,
    starterPlayerIdsByRoster
  ).filter((player) => player.position === incomingPlayer.position);

  if (samePositionStarters.length === 0) return getPlayerValue(incomingPlayer) * 0.12;

  const worstStarterValue = Math.min(
    ...samePositionStarters.map((player) => getPlayerValue(player))
  );
  return Math.max(0, getPlayerValue(incomingPlayer) - worstStarterValue) * 0.65;
};

const getOutgoingPenalty = (
  roster: LocalTradeFinderRoster,
  outgoingPlayer: LocalTradeFinderPlayer,
  starterPlayerIdsByRoster: Record<number, string[]> | undefined
) => {
  const isStarter = new Set(starterPlayerIdsByRoster?.[roster.id] ?? []).has(
    outgoingPlayer.playerId
  );
  return getPlayerValue(outgoingPlayer) * (isStarter ? 0.4 : 0.15);
};

const getRosterFitGain = ({
  roster,
  receives,
  sends,
  starterPlayerIdsByRoster,
}: {
  roster: LocalTradeFinderRoster;
  receives: TradeFinderPlayer[];
  sends: TradeFinderPlayer[];
  starterPlayerIdsByRoster?: Record<number, string[]>;
}) => {
  const incomingFit = receives.reduce(
    (total, player) => total + getPositionNeed(roster, player, starterPlayerIdsByRoster),
    0
  );
  const outgoingPenalty = sends.reduce(
    (total, player) => total + getOutgoingPenalty(roster, player, starterPlayerIdsByRoster),
    0
  );
  return Math.max(0, incomingFit - outgoingPenalty);
};

const getFairness = (teamAValue: number, teamBValue: number) => {
  const maxValue = Math.max(teamAValue, teamBValue, 1);
  const gap = Math.abs(teamAValue - teamBValue);
  const valueGapPercent = (gap / maxValue) * 100;
  return {
    valueGapPercent,
    fairnessPercent: Math.max(0, 100 - valueGapPercent),
  };
};

export const estimateLocalTradeQuote = ({
  teamAValue,
  teamBValue,
}: LocalTradeQuoteInput): LocalTradeQuote => {
  const { valueGapPercent } = getFairness(teamAValue, teamBValue);
  const gapBand: LocalTradeQuote["gapBand"] =
    valueGapPercent <= 10
      ? "within_10_percent"
      : valueGapPercent <= 20
        ? "10_to_20_percent"
        : valueGapPercent <= 35
          ? "20_to_35_percent"
          : "greater_than_35_percent";
  const fairnessLabel: LocalTradeQuote["fairnessLabel"] =
    valueGapPercent <= 10
      ? "Very fair"
      : valueGapPercent <= 20
        ? "Reasonably fair"
        : valueGapPercent <= 35
          ? "Slightly uneven"
          : "Very uneven";

  return {
    fairnessLabel,
    favoredSide:
      valueGapPercent <= 3
        ? "even"
        : teamAValue > teamBValue
          ? "team_b"
          : "team_a",
    gapBand,
  };
};

const createSuggestion = ({
  teamA,
  teamB,
  teamASends,
  teamBSends,
  teamAPicks = [],
  teamBPicks = [],
  starterPlayerIdsByRoster,
}: {
  teamA: LocalTradeFinderRoster;
  teamB: LocalTradeFinderRoster;
  teamASends: TradeFinderPlayer[];
  teamBSends: TradeFinderPlayer[];
  teamAPicks?: TradeFinderPick[];
  teamBPicks?: TradeFinderPick[];
  starterPlayerIdsByRoster?: Record<number, string[]>;
}): TradeSuggestion | null => {
  const teamAValue = packageValue(teamASends, teamAPicks);
  const teamBValue = packageValue(teamBSends, teamBPicks);
  const { fairnessPercent, valueGapPercent } = getFairness(
    teamAValue,
    teamBValue
  );
  if (fairnessPercent < 65) return null;

  const teamAGain = getRosterFitGain({
    roster: teamA,
    receives: teamBSends,
    sends: teamASends,
    starterPlayerIdsByRoster,
  });
  const teamBGain = getRosterFitGain({
    roster: teamB,
    receives: teamASends,
    sends: teamBSends,
    starterPlayerIdsByRoster,
  });
  if (teamAGain <= 0 || teamBGain <= 0) return null;

  const score = fairnessPercent + Math.min(35, teamAGain + teamBGain);
  const idParts = [
    teamA.id,
    ...teamASends.map((player) => player.playerId),
    ...teamAPicks.map((pick) => pick.id),
    teamB.id,
    ...teamBSends.map((player) => player.playerId),
    ...teamBPicks.map((pick) => pick.id),
  ];

  return {
    id: idParts.join(":"),
    tradeType:
      teamASends.length + teamBSends.length + teamAPicks.length + teamBPicks.length > 2
        ? "multi-asset"
        : "1-for-1",
    teamAId: teamA.id,
    teamAName: teamA.managerName,
    teamBId: teamB.id,
    teamBName: teamB.managerName,
    teamASends,
    teamBSends,
    teamAPicks,
    teamBPicks,
    teamAValue,
    teamBValue,
    teamAGain,
    teamBGain,
    teamAGainPerWeek: Number((teamAGain / 3).toFixed(1)),
    teamBGainPerWeek: Number((teamBGain / 3).toFixed(1)),
    fairnessPercent,
    valueGapPercent,
    score,
  };
};

export const generateLocalTradeSuggestions = ({
  rosters,
  forRosterId,
  assetFilter = "all",
  starterPlayerIdsByRoster,
  maxSuggestions = 24,
}: LocalTradeSuggestionOptions): TradeSuggestion[] => {
  const preparedRosters = rosters.map((roster) => ({
    ...roster,
    players: roster.players.map(toFinderPlayer),
  }));
  const targetRoster = preparedRosters.find((roster) => roster.id === forRosterId);
  if (!targetRoster) return [];

  const suggestions: TradeSuggestion[] = [];
  const targetPlayers = targetRoster.players.slice(0, 16);

  for (const opponent of preparedRosters) {
    if (opponent.id === targetRoster.id) continue;
    const opponentPlayers = opponent.players.slice(0, 16);

    for (const targetPlayer of targetPlayers) {
      for (const opponentPlayer of opponentPlayers) {
        const suggestion = createSuggestion({
          teamA: targetRoster,
          teamB: opponent,
          teamASends: [targetPlayer],
          teamBSends: [opponentPlayer],
          starterPlayerIdsByRoster,
        });
        if (suggestion) suggestions.push(suggestion);

        if (assetFilter === "draft-picks") {
          for (const targetPick of targetRoster.draftPicks ?? []) {
            const targetPickSuggestion = createSuggestion({
              teamA: targetRoster,
              teamB: opponent,
              teamASends: [targetPlayer],
              teamBSends: [opponentPlayer],
              teamAPicks: [targetPick],
              starterPlayerIdsByRoster,
            });
            if (targetPickSuggestion) suggestions.push(targetPickSuggestion);
          }
          for (const opponentPick of opponent.draftPicks ?? []) {
            const opponentPickSuggestion = createSuggestion({
              teamA: targetRoster,
              teamB: opponent,
              teamASends: [targetPlayer],
              teamBSends: [opponentPlayer],
              teamBPicks: [opponentPick],
              starterPlayerIdsByRoster,
            });
            if (opponentPickSuggestion) suggestions.push(opponentPickSuggestion);
          }
        }
      }
    }
  }

  const uniqueSuggestions = new Map<string, TradeSuggestion>();
  suggestions.forEach((suggestion) => {
    if (assetFilter === "draft-picks" && !suggestion.teamAPicks?.length && !suggestion.teamBPicks?.length) {
      return;
    }
    const existing = uniqueSuggestions.get(suggestion.id);
    if (!existing || suggestion.score > existing.score) {
      uniqueSuggestions.set(suggestion.id, suggestion);
    }
  });

  return [...uniqueSuggestions.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.fairnessPercent - a.fairnessPercent ||
        b.teamAGainPerWeek + b.teamBGainPerWeek -
          (a.teamAGainPerWeek + a.teamBGainPerWeek)
    )
    .slice(0, maxSuggestions);
};
