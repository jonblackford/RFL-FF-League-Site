<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import type { RflSnapshot } from "@/features/rfl/types";
import {
  loadLeagueActivity,
  loadMatchups,
  type LeagueActivity,
  type Matchup,
} from "./activity";
import { openAdvisor } from "./aiSession";
const props = defineProps<{ snapshot: RflSnapshot }>();
const activity = ref<LeagueActivity[]>([]),
  matchups = ref<Matchup[]>([]),
  errors = ref<string[]>([]),
  loading = ref(false);
let controller: AbortController | undefined;
let generation = 0;
const name = (id: string) =>
  props.snapshot.players.find((p) => p.id === id)?.name || `Player ${id}`;
const team = (id: number) =>
  props.snapshot.rosters.find((r) => r.roster_id === id)?.teamName ||
  `Team ${id}`;
watch(
  () => [
    props.snapshot.league.league_id,
    props.snapshot.week,
    props.snapshot.fetchedAt,
  ],
  async () => {
    controller?.abort();
    controller = new AbortController();
    const current = ++generation;
    loading.value = true;
    errors.value = [];
    activity.value = [];
    matchups.value = [];
    const results = await Promise.allSettled([
      loadLeagueActivity(
        props.snapshot.league.league_id,
        props.snapshot.week,
        controller.signal,
      ),
      loadMatchups(
        props.snapshot.league.league_id,
        props.snapshot.week,
        controller.signal,
      ),
    ]);
    if (current !== generation) return;
    results.forEach((r, i) => {
      if (r.status === "rejected")
        errors.value.push(
          r.reason instanceof Error ? r.reason.message : "Feed unavailable",
        );
      else if (i === 0) activity.value = r.value as LeagueActivity[];
      else matchups.value = r.value as Matchup[];
    });
    loading.value = false;
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  generation++;
  controller?.abort();
});
function report() {
  openAdvisor(
    "Summarize this week’s actual scoring and completed league transactions. Do not treat in-progress points as final results.",
    {
      provider: "sleeper",
      leagueId: props.snapshot.league.league_id,
      season: props.snapshot.league.season,
      rosterId: props.snapshot.roster.roster_id,
      team: props.snapshot.roster.teamName,
      week: props.snapshot.week,
      fetchedAt: props.snapshot.fetchedAt,
      matchups: matchups.value.map((m) => ({ ...m, team: team(m.rosterId) })),
      transactions: activity.value
        .slice(0, 15)
        .map((a) => ({
          ...a,
          adds: Object.entries(a.adds).map(([id, r]) => ({
            player: name(id),
            team: team(r),
          })),
          drops: Object.entries(a.drops).map(([id, r]) => ({
            player: name(id),
            team: team(r),
          })),
        })),
      warnings: ["Official live points may not be final.", ...errors.value],
    },
  );
}
</script>
<template>
  <section class="ad-card">
    <div class="ad-row">
      <div>
        <p class="ad-kicker">LEAGUE PULSE</p>
        <h2>Weekly brief & activity</h2>
      </div>
      <button
        :disabled="loading || (!activity.length && !matchups.length)"
        @click="report"
      >
        Explain this week
      </button>
    </div>
    <p v-if="loading" role="status">Loading league activity…</p>
    <p v-for="e in errors" :key="e" class="ad-warning">{{ e }}</p>
    <p class="ad-muted">
      Official Sleeper points for week {{ snapshot.week }}; live totals can
      change until scoring is finalized.
    </p>
    <div class="ad-link-grid">
      <article v-for="m in matchups" :key="m.rosterId" class="ad-inset">
        <strong>{{ team(m.rosterId) }}</strong>
        <p class="ad-number">{{ m.points?.toFixed(2) ?? "—" }}</p>
        <p class="ad-muted">Matchup {{ m.matchupId ?? "unassigned" }}</p>
      </article>
    </div>
    <h3 class="ad-subheading">Completed transactions</h3>
    <article
      v-for="a in activity.slice(0, 25)"
      :key="a.id"
      class="ad-alert-row"
    >
      <div class="ad-row">
        <strong>{{ a.type.replaceAll("_", " ") }}</strong
        ><small>{{
          a.timestamp
            ? new Date(a.timestamp).toLocaleString()
            : "Time unavailable"
        }}</small>
      </div>
      <p v-for="(roster, id) in a.adds" :key="`a${id}`">
        + {{ name(String(id)) }} → {{ team(roster) }}
      </p>
      <p v-for="(roster, id) in a.drops" :key="`d${id}`">
        − {{ name(String(id)) }} from {{ team(roster) }}
      </p>
      <p
        v-if="!Object.keys(a.adds).length && !Object.keys(a.drops).length"
        class="ad-muted"
      >
        No player movement details supplied; this transaction may involve picks
        or budget.
      </p>
    </article>
    <p v-if="!loading && !activity.length && !errors.length" class="ad-muted">
      No completed transactions this week.
    </p>
  </section>
</template>
