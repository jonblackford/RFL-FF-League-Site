<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "@/store/store";
import { useRouter, useRoute } from "vue-router";
import { preferenceStorage } from "@/lib/storage";
import { openAdvisor } from "@/features/advisor/aiSession";
import type { TableDataType } from "@/types/types";
const props = defineProps<{ rows: TableDataType[] }>();
const store = useStore(),
  router = useRouter(),
  route = useRoute();
const guides: Record<
  string,
  { question: string; description: string; terms: string[] }
> = {
  Standings: {
    question: "How is my league doing?",
    description:
      "Start with wins and losses. Then compare points to see the performance behind each record.",
    terms: [
      "Points for: what a team scored.",
      "Points against: what its opponents scored.",
      "Record: wins, losses and ties in your league.",
    ],
  },
  "Power Rankings": {
    question: "Who is performing best?",
    description:
      "Compare strength beyond the standings. Use the ratings alongside results, not as a guaranteed forecast.",
    terms: [
      "Power rating: a relative performance measure.",
      "Trend: how that rating changes over time.",
      "A high rank does not guarantee the next matchup.",
    ],
  },
  "Expected Wins": {
    question: "How much has the schedule mattered?",
    description:
      "Compare actual wins with how often a score would beat the rest of the league.",
    terms: [
      "Expected wins: results against every possible opponent.",
      "Positive luck: more actual wins than expected.",
      "This describes past schedules, not future odds.",
    ],
  },
  "Roster Management": {
    question: "Where did points get left behind?",
    description:
      "See how starters, bench decisions and roster moves affected the results.",
    terms: [
      "Efficiency: scored points compared with a legal best lineup.",
      "Bench points are hindsight, not a promise you should have started that player.",
      "Review repeat patterns before changing your strategy.",
    ],
  },
  Playoffs: {
    question: "What does the playoff picture look like?",
    description:
      "Explore the bracket, standings and paths to qualification under your league rules.",
    terms: [
      "Seeds come from the imported league standings.",
      "Forecast odds are model estimates.",
      "Check ties and league-specific playoff rules.",
    ],
  },
  "Player Values": {
    question: "What are my players contributing?",
    description:
      "Search your whole league and compare recorded production with a clear, explainable value index.",
    terms: [
      "Value index: a 0–100 relative production score.",
      "Average points: points per recorded roster week.",
      "No data means unknown, not worthless.",
    ],
  },
  "Trade Lab": {
    question: "Does this trade help both teams?",
    description:
      "Build a deal, compare each side and use the advisor to examine roster fit and uncertainty.",
    terms: [
      "Fairness measures the selected value assumptions.",
      "A balanced price can still hurt your starting lineup.",
      "Consider depth, available replacements and both teams’ needs.",
    ],
  },
  "Start/Sit": {
    question: "Who should I start?",
    description:
      "Compare this week’s projected options and review availability before setting your lineup.",
    terms: [
      "Projection: an estimate, not points already earned.",
      "Projected gain: the difference between two lineup choices.",
      "Confirm kickoff, injuries and scoring coverage.",
    ],
  },
  "Season Forecast": {
    question: "How could the rest of the season unfold?",
    description:
      "Explore scenarios and see what has to happen for your team to climb the standings.",
    terms: [
      "Simulations are possible outcomes, not promises.",
      "Results depend on the model’s inputs.",
      "Use ranges and scenarios alongside current standings.",
    ],
  },
  Draft: {
    question: "How did the draft shape each roster?",
    description:
      "Compare draft cost, player outcomes and positional choices in your league.",
    terms: [
      "ADP: average draft position in the source market.",
      "Draft grade: a comparison within this league.",
      "Later results can differ from draft-day expectations.",
    ],
  },
  "League History": {
    question: "What is the story across seasons?",
    description:
      "Explore manager records and rivalries using the seasons imported for this league.",
    terms: [
      "Totals depend on available imported seasons.",
      "Per-season averages help compare different tenures.",
      "Use manager comparisons to explore head-to-head history.",
    ],
  },
  "Manager Profiles": {
    question: "How does each manager play?",
    description:
      "Understand roster habits, draft tendencies and strengths, then prepare for your next move.",
    terms: [
      "Profiles describe observed management patterns.",
      "Draft Room scouting is available to everyone.",
      "Small histories support fewer conclusions.",
    ],
  },
  Wrapped: {
    question: "What defined this season?",
    description:
      "Review the season’s story and the performances worth remembering.",
    terms: [
      "Season summaries use imported results.",
      "Share only the league information you want others to see.",
      "Weekly reports provide a PDF-friendly alternative.",
    ],
  },
};
const guide = computed(() => guides[store.currentTab]);
function report() {
  store.currentTab = "Weekly Report";
  preferenceStorage.setItem("currentTab", "Weekly Report");
  router.replace({
    path: "/",
    query: { ...route.query, destination: "weekly_report" },
  });
}
function explain() {
  openAdvisor(
    `Explain ${store.currentTab} in simple language and identify useful takeaways from these recorded league summaries. Do not invent unavailable ratings or forecasts.`,
    {
      provider: store.currentLeague?.platform || "sleeper",
      leagueId: store.currentLeague?.leagueId,
      season: store.currentLeague?.season,
      week: store.currentLeague?.lastScoredWeek,
      team: store.currentTab,
      fetchedAt: store.currentLeague?.lastUpdated || Date.now(),
      scoring: store.currentLeague?.scoringSettings,
      teams: props.rows
        .slice(0, 32)
        .map((t) => ({
          name: t.name,
          rosterId: t.rosterId,
          wins: t.wins,
          losses: t.losses,
          points: t.points,
        })),
      metricDefinitions: guide.value?.terms,
    },
  );
}
</script>
<template>
  <section v-if="guide" class="feature-guide">
    <div>
      <p class="feature-eyebrow">
        {{ store.currentLeague?.name || "Explore the demo league" }} ·
        {{ store.currentTab }}
      </p>
      <h1>{{ guide.question }}</h1>
      <p class="feature-description">{{ guide.description }}</p>
      <details>
        <summary>How to read this page</summary>
        <ul>
          <li v-for="term in guide.terms" :key="term">{{ term }}</li>
        </ul>
      </details>
    </div>
    <div class="feature-guide-actions">
      <button @click="explain">Explain the numbers</button
      ><button @click="report">Weekly PDF report →</button>
    </div>
  </section>
</template>
