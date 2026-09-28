<script setup lang="ts">
import type { RflPlayer } from "@/features/rfl/types";
import { statLabel } from "@/features/rfl/scoring";
defineProps<{ players: RflPlayer[] }>();
defineEmits<{ remove: [id: string]; ask: [] }>();
</script>
<template>
  <section class="ad-card" aria-label="Player comparison">
    <div class="ad-row">
      <div>
        <p class="ad-kicker">SIDE BY SIDE</p>
        <h2>Player comparison</h2>
      </div>
      <button v-if="players.length" @click="$emit('ask')">
        Ask AI to compare
      </button>
    </div>
    <p v-if="!players.length" class="ad-muted">
      Select Compare on up to three players to see their league-scored
      projections and coverage.
    </p>
    <div class="ad-comparisons">
      <article v-for="p in players" :key="p.id" class="ad-inset">
        <div class="ad-row">
          <h3>{{ p.name }}</h3>
          <button
            :aria-label="`Remove ${p.name}`"
            @click="$emit('remove', p.id)"
          >
            ×
          </button>
        </div>
        <p class="ad-muted">
          {{ p.position }} · {{ p.team }} ·
          {{ p.opponent ? `vs ${p.opponent}` : "Opponent unavailable" }}
        </p>
        <strong class="ad-number">{{ p.projection?.toFixed(1) ?? "—" }}</strong>
        <p class="ad-muted">Available-stat projection</p>
        <p v-if="p.injury">Status: {{ p.injury }}</p>
        <p>Return contribution: {{ p.returnPoints.toFixed(1) }}</p>
        <dl class="ad-breakdown">
          <template v-for="b in p.score.breakdown" :key="b.key"
            ><dt>{{ statLabel(b.key) }}</dt>
            <dd>{{ b.points.toFixed(1) }}</dd></template
          >
        </dl>
        <p v-if="p.score.missing.length" class="ad-warning">
          Missing: {{ p.score.missing.map(statLabel).join(", ") }}
        </p>
        <p v-if="p.score.unsupported.length" class="ad-warning">
          Unsupported: {{ p.score.unsupported.map(statLabel).join(", ") }}
        </p>
        <p v-for="estimate in p.estimates" :key="estimate" class="ad-muted">
          {{ estimate }}
        </p>
      </article>
    </div>
  </section>
</template>
