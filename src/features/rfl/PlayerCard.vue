<script setup lang="ts">
import type { RflPlayer } from "./types";
import { statLabel } from "./scoring";
defineProps<{ player: RflPlayer; slot?: string; current?: boolean }>();
const points = (n: number | null) => (n === null ? "—" : n.toFixed(1));
</script>
<template>
  <article class="player-card">
    <div class="player-heading">
      <span class="position-tag">{{ slot || player.position }}</span>
      <div class="player-identity">
        <h3>{{ player.name }}</h3>
        <p>
          {{ player.team || "No team" }} · {{ player.position }}
          <span v-if="player.opponent">vs {{ player.opponent }}</span>
        </p>
      </div>
      <div class="player-score">
        <strong>{{ points(player.projection) }}</strong
        ><span>available-stat pts</span>
      </div>
    </div>
    <div class="player-tags">
      <span v-if="current" class="quiet-tag">Current starter</span
      ><span v-if="player.reserve" class="warning-tag">Reserve / taxi</span
      ><span v-else-if="!player.available" class="warning-tag">{{
        player.injury || "No playable forecast"
      }}</span
      ><span v-else-if="player.injury" class="warning-tag">{{
        player.injury
      }}</span
      ><span v-if="player.returnPoints" class="return-tag"
        >{{ points(player.returnPoints) }} return pts{{
          player.estimates.length ? " · estimated" : ""
        }}</span
      >
    </div>
    <details class="player-details">
      <summary>
        Scoring &amp; confidence
        <span
          >{{
            player.score.missing.length || player.score.unsupported.length
              ? "Partial coverage"
              : "Stats covered"
          }}{{ player.estimates.length ? " · estimated" : "" }}</span
        >
      </summary>
      <p v-if="player.projection === null">
        No usable projected stats. This is not a zero-point forecast.
      </p>
      <div
        class="breakdown"
        v-for="part in player.score.breakdown.filter((b) => b.value !== 0)"
        :key="part.key"
      >
        <span
          >{{ statLabel(part.key) }}
          <small>{{ part.value.toFixed(2) }} × {{ part.rate }}</small></span
        ><b>{{ part.points.toFixed(2) }}</b>
      </div>
      <p
        v-for="estimate in player.estimates"
        :key="estimate"
        class="coverage-note"
      >
        {{ estimate }}
      </p>
      <p v-if="player.score.missing.length" class="coverage-note">
        Not included: {{ player.score.missing.map(statLabel).join(", ") }}.
        Missing stats are not assumed to be zero.
      </p>
      <p v-if="player.score.unsupported.length" class="coverage-note">
        Unsupported rules:
        {{ player.score.unsupported.map(statLabel).join(", ") }}.
      </p>
      <p v-if="player.sourceUpdated" class="source-note">
        Projection updated {{ new Date(player.sourceUpdated).toLocaleString() }}
      </p>
    </details>
  </article>
</template>
