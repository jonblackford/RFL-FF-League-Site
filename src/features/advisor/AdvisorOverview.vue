<script setup lang="ts">
import type { RflSnapshot, Lineup } from "@/features/rfl/types";
import type { WaiverRecommendation } from "@/features/rfl/recommendations";
import { computed } from "vue";
import { rosterPlayers } from "@/features/rfl/recommendations";
import { currentLineupTotal } from "@/features/rfl/presentation";
const props = defineProps<{
  snapshot: RflSnapshot;
  lineup: Lineup;
  waivers: WaiverRecommendation[];
}>();
defineEmits<{ navigate: [tab: string]; ask: [question: string] }>();
const mine = computed(() => rosterPlayers(props.snapshot));
const current = computed(() =>
  currentLineupTotal(props.snapshot.roster.starters, mine.value),
);
const alerts = computed(() =>
  mine.value.filter((p) => p.injury || !p.available),
);
</script>
<template>
  <div class="ad-metrics">
    <article class="ad-card">
      <p class="ad-kicker">RECOMMENDED LINEUP</p>
      <strong class="ad-number">{{ lineup.total.toFixed(1) }}</strong>
      <p class="ad-muted">
        {{ lineup.filled }} filled slots · available-stat total
      </p>
    </article>
    <article class="ad-card">
      <p class="ad-kicker">LINEUP OPPORTUNITY</p>
      <strong class="ad-number">{{
        current === null
          ? "—"
          : `${lineup.total - current >= 0 ? "+" : ""}${(lineup.total - current).toFixed(1)}`
      }}</strong>
      <p class="ad-muted">
        {{
          current === null
            ? "Current starters have unavailable data"
            : "Projected difference from current starters"
        }}
      </p>
    </article>
    <article class="ad-card">
      <p class="ad-kicker">WAIVER OPTIONS</p>
      <strong class="ad-number">{{ waivers.length }}</strong>
      <p class="ad-muted">Independent add/drop alternatives</p>
    </article>
  </div>
  <div class="ad-two-col">
    <section class="ad-card">
      <p class="ad-kicker">THIS WEEK</p>
      <h2>Your next decisions</h2>
      <div class="ad-decision">
        <span>01</span>
        <div>
          <h3>Set your starting lineup</h3>
          <p class="ad-muted">
            Compare eligible players using this league's scoring.
          </p>
        </div>
        <button @click="$emit('navigate', 'Lineup')">Review →</button>
      </div>
      <div class="ad-decision">
        <span>02</span>
        <div>
          <h3>Improve your roster</h3>
          <p class="ad-muted">
            Evaluate available players and the cost of each drop.
          </p>
        </div>
        <button @click="$emit('navigate', 'Waivers')">Explore →</button>
      </div>
      <div class="ad-decision">
        <span>03</span>
        <div>
          <h3>Build a weekly plan</h3>
          <p class="ad-muted">
            Ask the advisor to explain the evidence and trade-offs.
          </p>
        </div>
        <button
          @click="
            $emit(
              'ask',
              'Build a prioritized weekly plan for this team using the supplied lineup and waiver evidence. Explain uncertainty.',
            )
          "
        >
          Ask AI →
        </button>
      </div>
    </section>
    <section class="ad-card">
      <p class="ad-kicker">ROSTER CHECK</p>
      <h2>Availability & coverage</h2>
      <p v-if="!alerts.length" class="ad-muted">
        No availability flags in this snapshot. Confirm game locks before making
        moves.
      </p>
      <div
        v-for="p in alerts.slice(0, 8)"
        :key="p.id"
        class="ad-row ad-alert-row"
      >
        <strong>{{ p.name }}</strong
        ><span class="ad-tag">{{
          p.injury || (p.reserve ? "Reserve" : "No usable projection")
        }}</span>
      </div>
      <p class="ad-muted">
        Statuses come from Sleeper. Missing projections and bye weeks may also
        make players unavailable.
      </p>
    </section>
  </div>
</template>
