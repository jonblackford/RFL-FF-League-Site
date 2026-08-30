type NewsRecord = Record<string, unknown>;

type NewsResult = {
  bulletPoints: string[];
};

const isRecord = (value: unknown): value is NewsRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): NewsRecord =>
  isRecord(value) ? value : {};

const asArray = (value: unknown): NewsRecord[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const formatNumber = (value: unknown, digits = 1): string => {
  const number = asNumber(value);
  if (number === null) return "";
  return number.toFixed(digits).replace(/\.0$/, "");
};

const getScoringLabel = (league: NewsRecord): string => {
  const label = asString(league.scoringLabel);
  if (label) return label;

  const scoringFormat = asNumber(league.scoringFormat);
  if (scoringFormat === 1) return "PPR";
  if (scoringFormat === 0.5) return "Half PPR";
  if (scoringFormat === 0) return "standard";
  return "league";
};

const getLeagueEntry = (data: NewsRecord[]): NewsRecord => asRecord(data[0]);

const pushIfUseful = (items: string[], value: string | null | undefined) => {
  if (value && !items.includes(value)) items.push(value);
};

const limitWords = (text: string, wordLimit: number): string => {
  if (wordLimit <= 0) return text;
  const words = text.split(/\s+/);
  if (words.length <= wordLimit) return text;
  return `${words.slice(0, wordLimit).join(" ")}...`;
};

const getDraftNews = (
  entry: NewsRecord,
  wordLimit: number,
  bulletCount: number
): NewsResult => {
  const league = asRecord(entry.league);
  const scoringLabel = getScoringLabel(league);
  const picks = asArray(entry.earlyDraftPicks);
  const bullets: string[] = [];

  const topProjection = [...picks]
    .filter((pick) => asNumber(pick.projectedPoints) !== null)
    .sort(
      (left, right) =>
        (asNumber(right.projectedPoints) ?? 0) -
        (asNumber(left.projectedPoints) ?? 0)
    )[0];

  const bestValue = [...picks]
    .filter((pick) => asNumber(pick.pickVsAdp) !== null)
    .sort(
      (left, right) =>
        (asNumber(right.pickVsAdp) ?? -999) -
        (asNumber(left.pickVsAdp) ?? -999)
    )[0];

  const openingPick = picks[0];

  if (openingPick) {
    pushIfUseful(
      bullets,
      `**Draft board:** ${asString(openingPick.userName) || "The first manager"} opened with ${asString(openingPick.name) || "the top pick"}, setting the early tone for a ${getScoringLabel(league)} ${asString(league.seasonType) || "league"} draft.`
    );
  }

  if (topProjection) {
    pushIfUseful(
      bullets,
      `**Projection watch:** ${asString(topProjection.name)} carries the biggest league-adjusted projection in the early rounds at ${formatNumber(topProjection.projectedPoints)} ${scoringLabel} points for ${asString(topProjection.userName) || "their roster"}.`
    );
  }

  if (bestValue && (asNumber(bestValue.pickVsAdp) ?? 0) > 0) {
    pushIfUseful(
      bullets,
      `**Value pick:** ${asString(bestValue.userName) || "One roster"} landed ${asString(bestValue.name)} ${formatNumber(bestValue.pickVsAdp)} picks after ADP, the clearest early discount after adjusting the board to ${scoringLabel} scoring.`
    );
  }

  pushIfUseful(
    bullets,
    `**Scoring context:** Projected player points are imported against this league's ${scoringLabel} setup, so members can compare picks using the same scoring lens the standings will use.`
  );

  return {
    bulletPoints: bullets
      .slice(0, bulletCount)
      .map((bullet) => limitWords(bullet, wordLimit)),
  };
};

const getInSeasonNews = (
  entry: NewsRecord,
  wordLimit: number,
  bulletCount: number
): NewsResult => {
  const league = asRecord(entry.league);
  const stories = asRecord(entry.stories);
  const standings = asRecord(stories.standings);
  const weeklyHighlights = asRecord(stories.weeklyHighlights);
  const previousSeason = asRecord(entry.previousSeason);
  const scoringLabel = getScoringLabel(league);
  const bullets: string[] = [];

  const leader = asRecord(standings.leader);
  if (asString(leader.name)) {
    const record = asString(leader.record);
    const pfRank = asNumber(leader.pfRank);
    pushIfUseful(
      bullets,
      `**Standings lead:** ${asString(leader.name)} is out front${record ? ` at ${record}` : ""}${pfRank ? ` while ranking #${pfRank} in scoring` : ""}, with ${formatNumber(league.weeksRemaining, 0) || "the remaining"} weeks left to protect the spot.`
    );
  }

  const highestScore = asRecord(weeklyHighlights.highestScore);
  if (asString(highestScore.name)) {
    pushIfUseful(
      bullets,
      `**Week ${formatNumber(league.lastScoredWeek, 0) || "update"} hammer:** ${asString(highestScore.name)} posted the top team score at ${formatNumber(highestScore.score)} points in ${scoringLabel} scoring.`
    );
  }

  const previousLeader = asRecord(previousSeason.topScoringTeam);
  if (asString(previousSeason.season) && asString(previousLeader.name)) {
    pushIfUseful(
      bullets,
      `**Last year benchmark:** ${asString(previousLeader.name)} led ${asString(previousSeason.season)} scoring with ${formatNumber(previousLeader.pointsFor)} points; this year's ${scoringLabel} pace can be reviewed against that mark.`
    );
  }

  const firstTeamOut = asRecord(standings.firstTeamOut);
  if (asString(firstTeamOut.name)) {
    pushIfUseful(
      bullets,
      `**Bubble watch:** ${asString(firstTeamOut.name)} is first outside the playoff line${asString(firstTeamOut.record) ? ` at ${asString(firstTeamOut.record)}` : ""}, so every lineup call matters from here.`
    );
  }

  const benchMiss = asRecord(weeklyHighlights.biggestBenchMiss);
  if (asString(benchMiss.name)) {
    pushIfUseful(
      bullets,
      `**Lineup review:** ${asString(benchMiss.name)} had ${formatNumber(benchMiss.benchPoints)} bench points against ${formatNumber(benchMiss.starterPoints)} starter points, the biggest review flag in this update.`
    );
  }

  if (bullets.length === 0) {
    pushIfUseful(
      bullets,
      `**League news:** Scoring, standings, and lineup data are loaded locally, so members can review the league without a separate news service.`
    );
  }

  return {
    bulletPoints: bullets
      .slice(0, bulletCount)
      .map((bullet) => limitWords(bullet, wordLimit)),
  };
};

export const generateLocalLeagueNews = (
  data: NewsRecord[],
  wordLimit: number,
  bulletCount: number,
  leagueState: string = "in_season"
): NewsResult => {
  const entry = getLeagueEntry(data);

  if (
    leagueState === "preseason" ||
    leagueState === "dynasty" ||
    asArray(entry.earlyDraftPicks).length > 0
  ) {
    return getDraftNews(entry, wordLimit, bulletCount);
  }

  return getInSeasonNews(entry, wordLimit, bulletCount);
};
