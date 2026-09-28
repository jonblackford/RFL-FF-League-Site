<script setup lang="ts">
import type { PlayerTrend } from "./enrichment";
defineProps<{
  players: { id: string; name: string; trend: PlayerTrend }[];
  generatedAt: string;
}>();
</script>
<template>
  <section class="ad-card">
    <p class="ad-kicker">HISTORICAL EVIDENCE</p>
    <h2>Recent usage</h2>
    <p class="ad-muted">
      Per-game averages across up to three recorded games before the selected
      week. Usage is historical, not a forecast. Feed generated
      {{ new Date(generatedAt).toLocaleString() }}.
    </p>
    <div class="ad-link-grid">
      <article v-for="p in players.slice(0, 12)" :key="p.id" class="ad-inset">
        <h3>{{ p.name }}</h3>
        <p class="ad-muted">
          {{ p.trend.games }} games · through week {{ p.trend.throughWeek }}
        </p>
        <dl class="ad-breakdown">
          <dt>Targets/game</dt>
          <dd>{{ p.trend.targets ?? "—" }}</dd>
          <dt>Carries/game</dt>
          <dd>{{ p.trend.carries ?? "—" }}</dd>
          <dt>Receiving yards/game</dt>
          <dd>{{ p.trend.receivingYards ?? "—" }}</dd>
          <dt>Rushing yards/game</dt>
          <dd>{{ p.trend.rushingYards ?? "—" }}</dd>
        </dl>
      </article>
    </div>
    <p v-if="!players.length" class="ad-muted">
      No mapped earlier-game usage is available for these players.
    </p>
  </section>
</template>
