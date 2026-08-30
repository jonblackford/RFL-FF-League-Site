import { getPlayersByIdsMap } from "@/api/playerApi";
import {
  getDraftProjections,
  getStats,
  getTradedPicks,
  type SleeperTradedPick,
} from "@/api/sleeperApi";
import {
  getPlayerValues,
  type PlayerValuesResponse,
  type TradeValueRequestPayload,
} from "@/api/tradeValuesApi";
import {
  estimateLocalTradeQuote,
  generateLocalTradeSuggestions,
  type DynastyPerspective,
  type LocalTradeFinderPlayer,
  type TradeFinderPlayer,
  type TradeFinderRoster,
  type TradeValuationMode,
} from "@/lib/tradeFinder";
import { mapWithConcurrency } from "@/lib/async";
import { isSuperflexLeague } from "@/lib/lineup";
import type { Player } from "@/types/apiTypes";
import type { LeagueInfoType, TableDataType } from "@/types/types";

export type LeagueTradeValueRoster = TradeFinderRoster;

export { estimateLocalTradeQuote, generateLocalTradeSuggestions };

export type LeaguePlayerValuesResult = PlayerValuesResponse & {
  rosters: LeagueTradeValueRoster[];
  request: TradeValueRequestPayload;
};

export type DynastyDraftPickAsset = {
  id: string;
  season: number;
  round: number;
  originalRosterId: number;
  ownerRosterId: number;
  label: string;
};

export const isDynastyLeague = (league?: LeagueInfoType | null) =>
  league?.seasonType?.toLowerCase() === "dynasty";

export const getTradeValuationMode = (
  league?: LeagueInfoType | null
): TradeValuationMode =>
  isDynastyLeague(league)
    ? "dynasty"
    : league?.status === "complete"
      ? "season results"
      : "ros projection";

export const buildDynastyDraftPickAssets = ({
  league,
  rosters,
  tradedPicks,
}: {
  league: LeagueInfoType;
  rosters: Array<{ id: number; managerName: string }>;
  tradedPicks: SleeperTradedPick[];
}): DynastyDraftPickAsset[] => {
  const leagueSeason = Number(league.season) || new Date().getFullYear();
  const firstPickSeason = ["pre_draft", "drafting"].includes(league.status)
    ? leagueSeason
    : leagueSeason + 1;
  const seasons = Array.from(
    new Set([
      firstPickSeason,
      firstPickSeason + 1,
      firstPickSeason + 2,
      ...tradedPicks
        .map((pick) => Number(pick.season))
        .filter((season) => season >= firstPickSeason),
    ])
  ).sort((a, b) => a - b);
  const rookieDraftPickCount = league.draftPicks?.length ?? 0;
  const recentDraftRounds =
    rookieDraftPickCount > 0 &&
    rookieDraftPickCount <= Math.max(1, league.totalRosters) * 8
      ? Math.max(
          ...(league.draftPicks ?? []).map((pick) => Number(pick.round) || 0)
        )
      : 0;
  const tradedPickRounds = Math.max(
    0,
    ...tradedPicks.map((pick) => pick.round)
  );
  const roundCount = Math.min(
    6,
    recentDraftRounds > 0
      ? Math.max(recentDraftRounds, tradedPickRounds)
      : Math.max(4, tradedPickRounds)
  );
  const rosterNameById = new Map(
    rosters.map((roster) => [roster.id, roster.managerName])
  );
  const currentOwnerByPick = new Map(
    tradedPicks.map((pick) => [
      `${pick.season}:${pick.round}:${pick.rosterId}`,
      pick.ownerId,
    ])
  );

  return seasons.flatMap((season) =>
    rosters.flatMap((originalRoster) =>
      Array.from({ length: roundCount }, (_, index) => {
        const round = index + 1;
        const id = `${season}:${round}:${originalRoster.id}`;
        const ownerRosterId = currentOwnerByPick.get(id) ?? originalRoster.id;
        const originalManager =
          rosterNameById.get(originalRoster.id) ??
          `Roster ${originalRoster.id}`;

        return {
          id,
          season,
          round,
          originalRosterId: originalRoster.id,
          ownerRosterId,
          label: `${season} Round ${round}${
            ownerRosterId !== originalRoster.id
              ? ` (from ${originalManager})`
              : ""
          }`,
        };
      })
    )
  );
};

export const loadDynastyDraftPickAssets = async ({
  league,
  rosters,
}: {
  league: LeagueInfoType;
  rosters: Array<{ id: number; managerName: string }>;
}): Promise<DynastyDraftPickAsset[]> => {
  if (!isDynastyLeague(league) || league.platform === "espn") return [];

  const tradedPicks = await getTradedPicks(league.leagueId);
  return buildDynastyDraftPickAssets({ league, rosters, tradedPicks });
};

const getWeekLineup = (team: TableDataType, weekIndex: number) => {
  const starters =
    Array.isArray(team.starters?.[weekIndex]) && team.starters[weekIndex]
      ? team.starters[weekIndex]
      : [];
  const benchByWeek = Array.isArray(team.benchPlayers?.[weekIndex])
    ? team.benchPlayers[weekIndex]
    : [];
  const bench =
    benchByWeek.length > 0
      ? benchByWeek
      : (team.players || []).filter((id) => !starters.includes(id));

  return { starters, bench };
};

export const getTradeValueWeek = (league: LeagueInfoType) => {
  const nextWeek = Math.min((league.lastScoredWeek || 0) + 1, 18);
  return Math.max(1, nextWeek);
};

export const buildTradeValueRequest = ({
  league,
  tableData,
  selectedWeek,
  showUsernames,
  dynastyPerspective = "balanced",
}: {
  league: LeagueInfoType;
  tableData: TableDataType[];
  selectedWeek: number;
  showUsernames: boolean;
  dynastyPerspective?: DynastyPerspective;
}): TradeValueRequestPayload => {
  const weekIndex = selectedWeek - 1;
  const rosters = tableData.map((team) => {
    const { starters, bench } = getWeekLineup(team, weekIndex);
    const managerName = showUsernames
      ? team.username || team.name
      : team.name || team.username;
    return {
      id: team.rosterId,
      managerName: managerName || `Roster ${team.rosterId}`,
      playerIds: [...new Set([...starters, ...bench])],
    };
  });

  return {
    league: {
      leagueId: league.leagueId,
      season: league.season,
      status: league.status,
      scoringType: league.scoringType,
      scoringSettings: league.scoringSettings ?? {},
      rosterPositions: league.rosterPositions,
      totalRosters: league.totalRosters || tableData.length,
      seasonType: league.seasonType ?? "",
      platform: league.platform ?? "",
    },
    rosters,
    selectedWeek,
    remainingWeeks:
      league.status === "complete" ? 18 : Math.max(1, 18 - selectedWeek + 1),
    dynastyPerspective,
    finderForRosterId: null,
  };
};

const groupRankingsByRoster = (
  request: TradeValueRequestPayload,
  rankings: TradeFinderPlayer[]
): LeagueTradeValueRoster[] => {
  const rankingById = new Map(
    rankings.map((ranking) => [ranking.playerId, ranking])
  );
  return request.rosters.map((roster) => ({
    id: roster.id,
    managerName: roster.managerName,
    players: roster.playerIds
      .map((playerId) => rankingById.get(playerId))
      .filter((player): player is TradeFinderPlayer => player !== undefined)
      .map((player) => ({ ...player }))
      .sort((a, b) => a.overallRank - b.overallRank),
  }));
};

const getFallbackTradeValue = ({
  projectedPoints,
  replacementPoints,
  overallRank,
  positionRank,
  dynastyAdp,
}: {
  projectedPoints: number;
  replacementPoints: number;
  overallRank: number;
  positionRank: number;
  dynastyAdp: number | null;
}) => {
  const vorpValue = Math.max(0, projectedPoints - replacementPoints);
  const rankValue =
    dynastyAdp && dynastyAdp > 0
      ? Math.max(1, 120 - dynastyAdp)
      : overallRank > 0
        ? Math.max(1, 110 - overallRank)
        : positionRank > 0
          ? Math.max(1, 65 - positionRank)
          : 1;

  return Number(Math.max(rankValue, vorpValue / 2).toFixed(1));
};

const getReplacementBaselines = (
  players: LocalTradeFinderPlayer[],
  rosterPositions: string[]
) => {
  const startersByPosition = rosterPositions
    .filter((slot) => !["BN", "IR", "TAXI"].includes(slot.toUpperCase()))
    .reduce<Record<string, number>>((counts, slot) => {
      const position = slot.toUpperCase();
      if (["FLEX", "SUPER_FLEX", "REC_FLEX", "WRRB_FLEX"].includes(position)) {
        return counts;
      }
      counts[position] = (counts[position] ?? 0) + 1;
      return counts;
    }, {});

  const baselines = new Map<string, number>();
  Object.keys(startersByPosition).forEach((position) => {
    const sorted = players
      .filter((player) => player.position?.toUpperCase() === position)
      .sort((a, b) => (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0));
    const replacementIndex = Math.max(0, startersByPosition[position] - 1);
    const replacementPlayer = sorted[replacementIndex];
    baselines.set(position, replacementPlayer?.projectedPoints ?? 0);
  });

  return baselines;
};

const buildLocalPlayerValues = async (
  request: TradeValueRequestPayload
): Promise<PlayerValuesResponse> => {
  const playerIds = [...new Set(request.rosters.flatMap((r) => r.playerIds))];
  const playerMap = await getPlayersByIdsMap(playerIds);
  const dynasty = request.league.seasonType.toLowerCase() === "dynasty";
  const superflex = isSuperflexLeague(request.league.rosterPositions);
  const idpPositions = new Set(["DB", "DL", "LB", "CB", "DE", "DT", "NT", "S"]);

  const entries = await mapWithConcurrency(
    playerIds,
    TRADE_BUILDER_RANKING_CONCURRENCY,
    async (playerId): Promise<LocalTradeFinderPlayer> => {
      const player = playerMap.get(playerId);
      const stats = dynasty
        ? null
        : await getStats(
            playerId,
            request.league.season,
            request.league.scoringType
          );
      const projection = await getDraftProjections(
        playerId,
        request.league.season,
        request.league.scoringType,
        dynasty ? "Dynasty" : request.league.seasonType,
        superflex,
        idpPositions.has(player?.position?.toUpperCase() ?? "")
      );

      return {
        playerId,
        player_id: playerId,
        name:
          player?.name ||
          [stats?.firstName, stats?.lastName].filter(Boolean).join(" ") ||
          `${player?.team ?? stats?.team ?? "FA"} Defense`,
        position: player?.position || stats?.position || "",
        team: player?.team || stats?.team || "FA",
        projectedPoints:
          projection.projectedPoints ?? Number(stats?.points || 0),
        replacementPoints: 0,
        vorp: 0,
        tradeValue: 0,
        positionRank: Number(stats?.rank || 0),
        overallRank: Number(stats?.overallRank || 0),
        dynastyAdp: projection.adp,
      };
    }
  );
  const baselines = getReplacementBaselines(entries, request.league.rosterPositions);
  const rankings: TradeFinderPlayer[] = entries
    .map((player): TradeFinderPlayer => {
      const projectedPoints = player.projectedPoints ?? 0;
      const replacementPoints =
        baselines.get(player.position.toUpperCase()) ??
        Math.max(0, projectedPoints * 0.6);
      const vorp = Math.max(0, projectedPoints - replacementPoints);
      return {
        ...player,
        projectedPoints,
        replacementPoints: Number(replacementPoints.toFixed(1)),
        vorp: Number(vorp.toFixed(1)),
        tradeValue: getFallbackTradeValue({
          projectedPoints,
          replacementPoints,
          overallRank: player.overallRank ?? 0,
          positionRank: player.positionRank ?? 0,
          dynastyAdp: player.dynastyAdp ?? null,
        }),
      };
    })
    .sort(
      (a, b) =>
        a.overallRank - b.overallRank ||
        b.tradeValue - a.tradeValue ||
        b.projectedPoints - a.projectedPoints
    );

  return {
    access: "premium",
    previewLimit: rankings.length,
    totalPlayers: rankings.length,
    rankings,
  };
};

export const loadLeaguePlayerValues = async (options: {
  league: LeagueInfoType;
  tableData: TableDataType[];
  selectedWeek: number;
  showUsernames: boolean;
  dynastyPerspective?: DynastyPerspective;
}): Promise<LeaguePlayerValuesResult> => {
  const request = buildTradeValueRequest(options);
  let response: PlayerValuesResponse;
  try {
    response = await getPlayerValues(request);
  } catch (error) {
    console.warn("Unable to load remote player values:", error);
    response = await buildLocalPlayerValues(request);
  }
  return {
    ...response,
    request,
    rosters: groupRankingsByRoster(request, response.rankings),
  };
};

export type TradeBuilderPlayer = Player & {
  playerId: string;
  positionRank: number;
  overallRank: number;
  dynastyAdp: number | null;
};

export type TradeBuilderRoster = {
  id: number;
  managerName: string;
  players: TradeBuilderPlayer[];
};

type TradeBuilderBasicRanking = {
  positionRank: number;
  overallRank: number;
  dynastyAdp: number | null;
};

const TRADE_BUILDER_RANKING_CONCURRENCY = 8;

export const sortTradeBuilderPlayers = (
  players: TradeBuilderPlayer[]
): TradeBuilderPlayer[] => {
  const useOverallRank = players.some((player) => player.overallRank > 0);
  const rankValue = (player: TradeBuilderPlayer) => {
    const value = useOverallRank ? player.overallRank : player.dynastyAdp;
    return Number.isFinite(value) && Number(value) > 0
      ? Number(value)
      : Number.POSITIVE_INFINITY;
  };

  return [...players].sort(
    (a, b) =>
      rankValue(a) - rankValue(b) ||
      (a.positionRank > 0 ? a.positionRank : Number.POSITIVE_INFINITY) -
        (b.positionRank > 0 ? b.positionRank : Number.POSITIVE_INFINITY) ||
      (a.name || `${a.team} Defense`).localeCompare(
        b.name || `${b.team} Defense`
      )
  );
};

export const mergeTradeBuilderRankings = (
  rosters: TradeBuilderRoster[],
  rankings: TradeFinderPlayer[]
): TradeBuilderRoster[] => {
  const rankingById = new Map(
    rankings.map((ranking) => [ranking.playerId, ranking])
  );
  return rosters.map((roster) => ({
    ...roster,
    players: sortTradeBuilderPlayers(
      roster.players.map((player) => {
        const ranking = rankingById.get(player.playerId);
        return {
          ...player,
          positionRank: ranking?.positionRank ?? player.positionRank,
          overallRank: ranking?.overallRank ?? player.overallRank,
        };
      })
    ),
  }));
};

export const applyTradeBuilderRankingResponse = (
  rosters: TradeBuilderRoster[],
  response: Pick<PlayerValuesResponse, "access" | "rankings">
): TradeBuilderRoster[] =>
  response.access === "premium"
    ? mergeTradeBuilderRankings(rosters, response.rankings)
    : rosters;

export const loadTradeBuilderRosters = async (options: {
  league: LeagueInfoType;
  tableData: TableDataType[];
  selectedWeek: number;
  showUsernames: boolean;
}): Promise<TradeBuilderRoster[]> => {
  const request = buildTradeValueRequest({
    ...options,
    dynastyPerspective: "balanced",
  });
  const playerIds = [...new Set(request.rosters.flatMap((r) => r.playerIds))];
  const playerMap = await getPlayersByIdsMap(playerIds);
  const dynasty = isDynastyLeague(options.league);
  const superflex = isSuperflexLeague(options.league.rosterPositions);
  const idpPositions = new Set(["DB", "DL", "LB", "CB", "DE", "DT", "NT", "S"]);
  const basicRankingEntries = await mapWithConcurrency(
    playerIds,
    TRADE_BUILDER_RANKING_CONCURRENCY,
    async (playerId): Promise<readonly [string, TradeBuilderBasicRanking]> => {
      if (dynasty) {
        const player = playerMap.get(playerId);
        const projection = await getDraftProjections(
          playerId,
          options.league.season,
          options.league.scoringType,
          "Dynasty",
          superflex,
          idpPositions.has(player?.position?.toUpperCase() ?? "")
        );
        return [
          playerId,
          {
            positionRank: 0,
            overallRank: 0,
            dynastyAdp: projection.adp,
          },
        ] as const;
      }

      const stats = await getStats(
        playerId,
        options.league.season,
        options.league.scoringType
      );
      return [
        playerId,
        {
          positionRank: Number(stats?.rank || 0),
          overallRank: Number(stats?.overallRank || 0),
          dynastyAdp: null,
        },
      ] as const;
    }
  );
  const basicRankingById = new Map(basicRankingEntries);
  return request.rosters.map((roster) => ({
    id: roster.id,
    managerName: roster.managerName,
    players: sortTradeBuilderPlayers(
      roster.playerIds
        .map((playerId) => {
          const player = playerMap.get(playerId);
          if (!player) return null;
          const basicRanking = basicRankingById.get(playerId);
          return {
            ...player,
            playerId,
            positionRank: basicRanking?.positionRank ?? 0,
            overallRank: basicRanking?.overallRank ?? 0,
            dynastyAdp: basicRanking?.dynastyAdp ?? null,
          };
        })
        .filter((player): player is TradeBuilderPlayer => player !== null)
    ),
  }));
};
