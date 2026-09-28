<script setup lang="ts">
import { openAdvisor } from "@/features/advisor/aiSession";
import { computed, ref, onMounted } from "vue";
import { useStore } from "../../store/store";
import { TableDataType, LeagueInfoType } from "../../types/types";
import Button from "../ui/button/Button.vue";
import { renderMarkdown } from "@/lib/markdown";

const preview = ref<string>("");
const loading = ref<boolean>(false);

onMounted(() => {
  preview.value =
    store.currentLeague?.weeklyPreview ?? "";
});

const getPreview = () => openAdvisor('Explain these projected matchups and the main uncertainties.', {provider:store.currentLeague?.platform || 'sleeper',leagueId:store.currentLeague?.leagueId,season:store.currentLeague?.season,team:'Matchup preview',fetchedAt:Date.now(),preview:promptData.value});

const renderedPreview = computed(() => {
  return renderMarkdown(preview.value);
});

interface PlayerType {
  name: string;
  player_id: string;
  position: string;
  projection: number;
  team: string;
}

interface PlayerNameType {
  id: number;
  players: PlayerType[];
  total: number;
}

const store = useStore();
const props = defineProps<{
  matchups: TableDataType[][];
  playerNames: PlayerNameType[];
}>();

const getStarters = (id: number) => {
  const playerObj = props.playerNames.find((user) => user.id === id);
  if (playerObj) {
    return playerObj.players.map((player) => {
      return {
        name: player.name,
        position: player.position,
        projectedPoints: player.projection,
        team: player.team,
      };
    });
  }
};

const getPreviewWeek = (league: LeagueInfoType | undefined) => {
  if (!league) return 1;
  if (league.lastScoredWeek <= 0) return 1;
  if (league.status === "complete") return league.lastScoredWeek;
  return league.currentWeek || league.lastScoredWeek;
};

const promptData = computed(() => {
  const matchupData = props.matchups.filter(m => m.length === 2).map((matchup: any) => {
    const team1 = {
      name: store.showUsernames ? matchup[0].username : matchup[0].name,
      losses: matchup[0].losses,
      wins: matchup[0].wins,
      starters: getStarters(matchup[0].rosterId),
      previousWeekScores: matchup[0].points,
      currentRanking: matchup[0].regularSeasonRank,
      recordByWeek: matchup[0].recordByWeek,
    };
    const team2 = {
      name: store.showUsernames ? matchup[1].username : matchup[1].name,
      losses: matchup[1].losses,
      wins: matchup[1].wins,
      starters: getStarters(matchup[1].rosterId),
      previousWeekScores: matchup[1].points,
      currentRanking: matchup[1].regularSeasonRank,
      recordByWeek: matchup[1].recordByWeek,
    };
    return [team1, team2];
  });

  const currentLeague = store.currentLeague;
  const currentWeek = getPreviewWeek(currentLeague);

  const playoffMatchup = currentWeek > currentLeague?.regularSeasonLength;

  if (playoffMatchup) {
    return {
      leagueMetadata: {
        regularSeasonLength: currentLeague?.regularSeasonLength,
        playoffTeams: currentLeague?.playoffTeams,
        currentWeek: currentWeek,
        playoffMatchup: playoffMatchup,
      },
      matchupData,
    };
  }
  return {
    leagueMetadata: {
      regularSeasonLength: currentLeague?.regularSeasonLength,
      playoffTeams: currentLeague?.playoffTeams,
      currentWeek: currentWeek,
    },
    matchupData,
  };
});
</script>
<template>
  <div class="w-full mb-4">
    <div class="flex justify-between">
      <h3 class="text-xl font-semibold tracking-tight">Matchup Forecast</h3>
      <Button class="" v-if="preview === ''" @click="getPreview">
        Ask advisor
      </Button>
    </div>
    <div v-if="preview" class="mt-1">
      <p v-html="renderedPreview"></p>
      <p
        v-if="preview !== 'Unable to generate preview. Please try again later.'"
        class="mt-1 text-xs text-muted-foreground"
      >
        AI-generated summary. Information provided may not always be accurate.
      </p>
    </div>
    <p v-if="loading">Loading...</p>
  </div>
</template>
