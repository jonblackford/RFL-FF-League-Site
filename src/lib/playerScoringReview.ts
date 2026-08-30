import type { TradeValuationMode } from "@/lib/tradeFinder";

type ReviewPlayer = {
  projectedPoints: number;
  replacementPoints: number;
  vorp: number;
};

export type PlayerPreviousSeasonStats = {
  points: number;
  ppg: number;
  rank: number;
  position: string;
};

export type PlayerScoringReviewItem = {
  label: string;
  value: string;
};

const formatNumber = (value: number, digits = 1): string =>
  Number.isFinite(value) ? value.toFixed(digits) : "-";

export const buildPlayerScoringReviewItems = ({
  player,
  valuationMode,
  scoringLabel,
  previousStats,
}: {
  player: ReviewPlayer;
  valuationMode: TradeValuationMode;
  scoringLabel: string;
  previousStats?: PlayerPreviousSeasonStats | null;
}): PlayerScoringReviewItem[] => {
  const primaryLabel =
    valuationMode === "season results"
      ? "League-adjusted season result"
      : "League-adjusted projection";

  const rows: PlayerScoringReviewItem[] = [
    {
      label: primaryLabel,
      value: `${formatNumber(player.projectedPoints)} ${scoringLabel} pts`,
    },
    {
      label: "Replacement baseline",
      value: `${formatNumber(player.replacementPoints)} pts`,
    },
    {
      label: "Value above replacement",
      value: `${formatNumber(player.vorp)} pts`,
    },
  ];

  if (previousStats) {
    const rank =
      previousStats.position && previousStats.rank > 0
        ? `, ${previousStats.position}${formatNumber(previousStats.rank, 0)}`
        : "";
    rows.push({
      label: "Previous season",
      value: `${formatNumber(previousStats.points)} pts, ${formatNumber(previousStats.ppg)} PPG${rank}`,
    });
  }

  return rows;
};
